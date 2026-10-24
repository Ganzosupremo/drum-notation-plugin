import { midiTempoBpm, ParsedMidiFile } from "./midiFile";
import { TranscribedDrumEvent, TranscribedInstrument } from "./toDrumSource";

/** General MIDI percussion channel 10, zero-based. */
export const GM_DRUM_CHANNEL = 9;

/** General MIDI percussion key map, limited to the instruments the notation supports. */
export const GM_DRUM_NOTES: Readonly<Record<number, TranscribedInstrument>> = {
    35: "kick",
    36: "kick",
    37: "snare",
    38: "snare",
    40: "snare",
    41: "low-tom",
    43: "low-tom",
    42: "hi-hat-closed",
    44: "hi-hat-pedal",
    46: "hi-hat-open",
    45: "mid-tom",
    47: "mid-tom",
    48: "high-tom",
    50: "high-tom",
    49: "crash",
    57: "crash",
    51: "ride",
    53: "ride",
    59: "ride",
    52: "china",
    55: "splash",
};

export interface MidiDrumEvents {
    events: TranscribedDrumEvent[];
    /** Tempo declared at the start of the file, rounded to a whole BPM. */
    initialTempoBpm: number;
    /** Time of the first mapped hit, a reasonable default for the first downbeat. */
    firstHitSeconds?: number;
    /** Time of a "downbeat" text or marker event, written by tools/drum-transcription. */
    downbeatSeconds?: number;
    /** Numerator of the file's time signature, when it declares one. */
    beatsPerBar?: number;
    /** Count of ignored hits by MIDI note number. */
    unmappedNotes: Map<number, number>;
    usedDrumChannelOnly: boolean;
}

/**
 * Converts parsed MIDI note-ons into transcription events using the General MIDI drum map.
 * When the file uses channel 10 only that channel is read; otherwise every channel is treated as
 * drums, which matches transcription tools that write their output on channel 1.
 */
export function midiToDrumEvents(midi: ParsedMidiFile): MidiDrumEvents {
    const usedDrumChannelOnly = midi.notes.some(note => note.channel === GM_DRUM_CHANNEL);
    const unmappedNotes = new Map<number, number>();
    const events: TranscribedDrumEvent[] = [];
    midi.notes.forEach(note => {
        if (usedDrumChannelOnly && note.channel !== GM_DRUM_CHANNEL) return;
        const instrument = GM_DRUM_NOTES[note.note];
        if (!instrument) {
            unmappedNotes.set(note.note, (unmappedNotes.get(note.note) ?? 0) + 1);
            return;
        }
        events.push({ timeSeconds: note.timeSeconds, instrument, confidence: note.velocity / 127 });
    });
    return {
        events,
        initialTempoBpm: Math.round(midiTempoBpm(midi.tempos[0]!)),
        firstHitSeconds: events[0]?.timeSeconds,
        downbeatSeconds: midi.markers.find(marker => marker.text.trim().toLowerCase() === "downbeat")?.timeSeconds,
        beatsPerBar: midi.beatsPerBar,
        unmappedNotes,
        usedDrumChannelOnly,
    };
}
