"""Separate the drums from a song with Demucs and transcribe them to MIDI with Omnizart.

madmom tracks the beats and downbeats of the drum stem. By default the hits are then moved onto a
steady grid at the song's tempo, starting at the first downbeat, so the plugin can quantize the
whole song with one tempo even when the drummer drifts. The MIDI also carries the time signature
and a "downbeat" marker that the plugin's import dialog uses as defaults.
"""
import argparse
import shutil
import subprocess
import sys
import tempfile
from collections import Counter
from pathlib import Path

NOTE_NAMES = {35: "kick", 38: "snare", 42: "hi-hat"}


def log(message):
    print(f"[drum-transcription] {message}", flush=True)


def run(command):
    log(" ".join(command))
    subprocess.run(command, check=True)


def to_wav(source, target):
    run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(source), "-ac", "2", "-ar", "44100", str(target)])


def host_mount_point(path):
    """Returns the bind mount that holds `path`, or None when it lives only inside the container."""
    mount_points = []
    with open("/proc/self/mountinfo") as mountinfo:
        for line in mountinfo:
            mount_points.append(line.split()[4].replace("\\040", " "))
    resolved = path.resolve()
    candidates = [Path(point) for point in mount_points if point != "/"]
    holding = [point for point in candidates if point == resolved or point in resolved.parents]
    # Kernel/runtime mounts are never where the user expects their files.
    holding = [point for point in holding if not str(point).startswith(("/proc", "/sys", "/dev", "/etc", "/tmp"))]
    return max(holding, key=lambda point: len(point.parts), default=None)


def separate_drums(audio, work_dir):
    run([
        sys.executable, "-m", "demucs",
        "-n", "htdemucs",
        "--two-stems", "drums",
        "--filename", "{stem}.{ext}",
        "-o", str(work_dir),
        str(audio),
    ])
    return work_dir / "htdemucs" / "drums.wav"


def estimate_bpm(wav):
    """librosa's estimate picks the right double/half tempo more often than madmom alone."""
    import librosa
    import numpy as np

    samples, rate = librosa.load(str(wav), sr=22050, mono=True)
    tempo, _ = librosa.beat.beat_track(y=samples, sr=rate)
    return float(np.atleast_1d(tempo)[0])


def madmom_compat():
    """madmom 0.16 predates Python 3.10 and NumPy 2; restore the aliases it still imports."""
    import collections
    import collections.abc
    import numpy as np

    for name in ("MutableSequence", "MutableMapping", "Sequence", "Iterable"):
        setattr(collections, name, getattr(collections.abc, name))
    for name, alias in (("float", float), ("int", int), ("complex", complex)):
        setattr(np, name, alias)


def track_beats(wav, bpm_hint):
    """Returns madmom's beats as (seconds, position in bar) rows within 10% of `bpm_hint`."""
    madmom_compat()
    from madmom.features.downbeats import DBNDownBeatTrackingProcessor, RNNDownBeatProcessor

    activations = RNNDownBeatProcessor()(str(wav))
    tracker = DBNDownBeatTrackingProcessor(
        beats_per_bar=[3, 4], fps=100, min_bpm=bpm_hint * 0.9, max_bpm=bpm_hint * 1.1,
    )
    return tracker(activations)


def beat_index(times, beat_times):
    """Maps seconds to fractional beat numbers, extrapolating with the edge beat lengths."""
    import numpy as np

    indices = np.arange(len(beat_times), dtype=float)
    result = np.interp(times, beat_times, indices)
    first_length = beat_times[1] - beat_times[0]
    last_length = beat_times[-1] - beat_times[-2]
    before = times < beat_times[0]
    after = times > beat_times[-1]
    result[before] = (times[before] - beat_times[0]) / first_length
    result[after] = len(beat_times) - 1 + (times[after] - beat_times[-1]) / last_length
    return result


def transcribe(drums_wav, work_dir):
    from omnizart.drum import app

    return app.transcribe(str(drums_wav), output=str(work_dir))


def rewrite_midi(notes, bpm, beats_per_bar, downbeat, target):
    """Writes the notes on the GM drum channel with one tempo, a time signature and a downbeat marker."""
    import pretty_midi

    result = pretty_midi.PrettyMIDI(initial_tempo=bpm)
    result.time_signature_changes.append(pretty_midi.TimeSignature(beats_per_bar, 4, 0))
    result.text_events.append(pretty_midi.Text("downbeat", downbeat))
    drums = pretty_midi.Instrument(program=0, is_drum=True, name="drums")
    drums.notes.extend(sorted(notes, key=lambda note: note.start))
    result.instruments.append(drums)
    result.write(str(target))
    return drums.notes


def align_notes(midi, beats, bpm, warp):
    """Returns the notes, the time signature and the first downbeat for `rewrite_midi`."""
    import numpy as np
    import pretty_midi

    notes = sorted((note for instrument in midi.instruments for note in instrument.notes), key=lambda note: note.start)
    beat_times = beats[:, 0]
    positions = beats[:, 1].astype(int)
    beats_per_bar = int(positions.max())
    seconds_per_beat = 60 / bpm
    first_hit = notes[0].start if notes else 0
    downbeats = beat_times[positions == 1]
    playing = downbeats[downbeats >= first_hit - seconds_per_beat / 2]
    downbeat = float(playing[0] if len(playing) else downbeats[0])
    if not warp:
        return notes, beats_per_bar, downbeat

    starts = beat_index(np.array([note.start for note in notes]), beat_times)
    origin = beat_index(np.array([downbeat]), beat_times)[0]
    aligned = []
    for note, beat in zip(notes, starts):
        start = (beat - origin) * seconds_per_beat
        # Pickup hits before beat 1 would land before zero; the plugin skips them anyway.
        if start < -seconds_per_beat / 8:
            continue
        start = max(0.0, start)
        aligned.append(pretty_midi.Note(note.velocity, note.pitch, start, start + 0.05))
    return aligned, beats_per_bar, 0.0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("audio", type=Path, help="Song or drum stem (wav, mp3, m4a, flac, ...)")
    parser.add_argument("-o", "--output-dir", type=Path, default=Path("/out"))
    parser.add_argument("--bpm", type=float, help="Known tempo; guides the beat tracker instead of the estimate")
    parser.add_argument("--no-warp", action="store_true", help="Keep the original hit times instead of a steady grid")
    parser.add_argument("--no-separate", action="store_true", help="The input is already a drum stem")
    parser.add_argument("--keep-stem", action="store_true", help="Also save the separated drums as .wav")
    args = parser.parse_args()

    if not args.audio.is_file():
        parser.error(f"audio file not found: {args.audio}")
    if not host_mount_point(args.output_dir):
        parser.error(
            f"{args.output_dir} is not a folder shared with the host, so the MIDI would be deleted with "
            "the container. Mount one, e.g. docker run --rm -v \"C:\\Musica:/out\" ..., or use "
            "transcribe-drums.ps1 / docker compose, which do it for you."
        )
    args.output_dir.mkdir(parents=True, exist_ok=True)
    name = args.audio.stem

    with tempfile.TemporaryDirectory() as tmp:
        work_dir = Path(tmp)
        if args.no_separate:
            drums_wav = work_dir / "drums.wav"
            to_wav(args.audio, drums_wav)
        else:
            log("Separating drums with Demucs (this is the slow step on CPU)...")
            drums_wav = separate_drums(args.audio, work_dir)

        log("Transcribing drums with Omnizart...")
        midi = transcribe(drums_wav, work_dir)

        log("Tracking beats and downbeats with madmom...")
        beats = track_beats(drums_wav, args.bpm or estimate_bpm(drums_wav))
        if len(beats) < 2:
            sys.exit("Could not find a beat in this audio; is it a drum track?")
        import numpy as np

        # The plugin only accepts whole-number tempos; the steady grid makes the rounding harmless.
        bpm = round(args.bpm or 60 / float(np.median(np.diff(beats[:, 0]))))
        notes, beats_per_bar, downbeat = align_notes(midi, beats, bpm, warp=not args.no_warp)
        target = args.output_dir / f"{name}.drums.mid"
        notes = rewrite_midi(notes, bpm, beats_per_bar, downbeat, target)

        if args.keep_stem and not args.no_separate:
            shutil.copyfile(drums_wav, args.output_dir / f"{name}.drums.wav")

    counts = Counter(NOTE_NAMES.get(note.pitch, str(note.pitch)) for note in notes)
    log(f"Wrote {target.name}: {len(notes)} hits at {bpm} BPM in {beats_per_bar}/4 ({dict(counts)})")
    log(f"First downbeat at {downbeat:.3f} s" + ("" if args.no_warp else " (hits moved onto a steady grid)"))
    log("If the tempo looks doubled or halved, run again with --bpm.")


if __name__ == "__main__":
    main()
