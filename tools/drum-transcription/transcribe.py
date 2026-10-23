"""Separate the drums from a song with Demucs and transcribe them to MIDI with Omnizart.

The MIDI is written on the General MIDI drum channel with a tempo estimated from the drum stem
(or the one passed with --bpm), so the plugin's import dialog starts with sensible values.
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
    import librosa
    import numpy as np

    samples, rate = librosa.load(str(wav), sr=22050, mono=True)
    tempo, _ = librosa.beat.beat_track(y=samples, sr=rate)
    return float(np.atleast_1d(tempo)[0])


def transcribe(drums_wav, work_dir):
    from omnizart.drum import app

    return app.transcribe(str(drums_wav), output=str(work_dir))


def rewrite_midi(midi, bpm, target):
    """Copies the notes into a fresh file whose only tempo is `bpm`; note times stay in seconds."""
    import pretty_midi

    result = pretty_midi.PrettyMIDI(initial_tempo=bpm)
    drums = pretty_midi.Instrument(program=0, is_drum=True, name="drums")
    for instrument in midi.instruments:
        drums.notes.extend(instrument.notes)
    drums.notes.sort(key=lambda note: note.start)
    result.instruments.append(drums)
    result.write(str(target))
    return drums.notes


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("audio", type=Path, help="Song or drum stem (wav, mp3, m4a, flac, ...)")
    parser.add_argument("-o", "--output-dir", type=Path, default=Path("/out"))
    parser.add_argument("--bpm", type=float, help="Tempo to store in the MIDI instead of the estimate")
    parser.add_argument("--no-separate", action="store_true", help="The input is already a drum stem")
    parser.add_argument("--keep-stem", action="store_true", help="Also save the separated drums as .wav")
    args = parser.parse_args()

    if not args.audio.is_file():
        parser.error(f"audio file not found: {args.audio}")
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

        bpm = args.bpm or estimate_bpm(drums_wav)
        bpm = round(bpm)
        target = args.output_dir / f"{name}.drums.mid"
        notes = rewrite_midi(midi, bpm, target)

        if args.keep_stem and not args.no_separate:
            shutil.copyfile(drums_wav, args.output_dir / f"{name}.drums.wav")

    counts = Counter(NOTE_NAMES.get(note.pitch, str(note.pitch)) for note in notes)
    log(f"Wrote {target.name}: {len(notes)} hits at {bpm} BPM ({dict(counts)})")
    if notes:
        log(f"First hit at {notes[0].start:.3f} s")
    log("Check the tempo and first downbeat in the plugin's import dialog before inserting.")


if __name__ == "__main__":
    main()
