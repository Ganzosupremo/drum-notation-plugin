export interface MidiNoteOn {
    timeSeconds: number;
    channel: number;
    note: number;
    velocity: number;
}

export interface MidiTempoChange {
    tick: number;
    microsecondsPerQuarter: number;
}

export interface MidiMarker {
    timeSeconds: number;
    text: string;
}

export interface ParsedMidiFile {
    format: number;
    ticksPerQuarter: number;
    notes: MidiNoteOn[];
    /** Tempo map sorted by tick; always starts at tick 0 (120 BPM when the file declares none). */
    tempos: MidiTempoChange[];
    /** Text and marker meta events, sorted by time. */
    markers: MidiMarker[];
    /** Numerator of the first time signature, when the file declares one. */
    beatsPerBar?: number;
}

interface RawText {
    tick: number;
    order: number;
    text: string;
}

interface RawNoteOn {
    tick: number;
    order: number;
    channel: number;
    note: number;
    velocity: number;
}

const DEFAULT_MICROSECONDS_PER_QUARTER = 500_000;
const TEXT_EVENT = 0x01;
const MARKER_EVENT = 0x06;
const TIME_SIGNATURE_EVENT = 0x58;

class ByteReader {
    position = 0;

    constructor(private readonly bytes: Uint8Array, private readonly end = bytes.length) {}

    get done(): boolean {
        return this.position >= this.end;
    }

    byte(): number {
        if (this.position >= this.end) throw new Error("Unexpected end of MIDI data.");
        return this.bytes[this.position++]!;
    }

    uint16(): number {
        return (this.byte() << 8) | this.byte();
    }

    uint32(): number {
        return ((this.byte() << 24) >>> 0) + (this.byte() << 16) + (this.byte() << 8) + this.byte();
    }

    variableLength(): number {
        let value = 0;
        for (let count = 0; count < 4; count++) {
            const next = this.byte();
            value = (value << 7) | (next & 0x7f);
            if ((next & 0x80) === 0) return value;
        }
        throw new Error("Invalid variable-length quantity in MIDI data.");
    }

    ascii(length: number): string {
        let text = "";
        for (let index = 0; index < length; index++) text += String.fromCharCode(this.byte());
        return text;
    }

    skip(length: number): void {
        if (this.position + length > this.end) throw new Error("Unexpected end of MIDI data.");
        this.position += length;
    }
}

function readTrack(
    bytes: Uint8Array,
    start: number,
    end: number,
    notes: RawNoteOn[],
    tempos: (MidiTempoChange & { order: number })[],
    texts: RawText[],
    timeSignatures: RawText[],
): void {
    const reader = new ByteReader(bytes, end);
    reader.position = start;
    let tick = 0;
    let runningStatus = 0;
    while (!reader.done) {
        tick += reader.variableLength();
        let status = reader.byte();
        if (status < 0x80) {
            if (runningStatus === 0) throw new Error("MIDI running status used before any status byte.");
            reader.position--;
            status = runningStatus;
        }

        if (status === 0xff) {
            const type = reader.byte();
            const length = reader.variableLength();
            if (type === 0x51 && length === 3) {
                const microsecondsPerQuarter = (reader.byte() << 16) | (reader.byte() << 8) | reader.byte();
                tempos.push({ tick, microsecondsPerQuarter, order: tempos.length });
            } else if ((type === TEXT_EVENT || type === MARKER_EVENT) && length > 0) {
                texts.push({ tick, order: texts.length, text: reader.ascii(length) });
            } else if (type === TIME_SIGNATURE_EVENT && length === 4) {
                timeSignatures.push({ tick, order: timeSignatures.length, text: String(reader.byte()) });
                reader.skip(3);
            } else {
                reader.skip(length);
            }
            if (type === 0x2f) return;
            continue;
        }
        if (status === 0xf0 || status === 0xf7) {
            reader.skip(reader.variableLength());
            continue;
        }

        runningStatus = status;
        const kind = status & 0xf0;
        const channel = status & 0x0f;
        if (kind === 0xc0 || kind === 0xd0) {
            reader.byte();
            continue;
        }
        const data1 = reader.byte();
        const data2 = reader.byte();
        if (kind === 0x90 && data2 > 0) {
            notes.push({ tick, order: notes.length, channel, note: data1, velocity: data2 });
        }
    }
}

function tickToSeconds(tempos: readonly MidiTempoChange[], ticksPerQuarter: number): (tick: number) => number {
    const segments: { tick: number; seconds: number; secondsPerTick: number }[] = [];
    let seconds = 0;
    tempos.forEach((tempo, index) => {
        const previous = segments[index - 1];
        if (previous) seconds += (tempo.tick - previous.tick) * previous.secondsPerTick;
        segments.push({ tick: tempo.tick, seconds, secondsPerTick: tempo.microsecondsPerQuarter / 1_000_000 / ticksPerQuarter });
    });
    return tick => {
        let segment = segments[0]!;
        for (const candidate of segments) {
            if (candidate.tick > tick) break;
            segment = candidate;
        }
        return segment.seconds + (tick - segment.tick) * segment.secondsPerTick;
    };
}

/**
 * Reads note-on events from a Standard MIDI File (format 0 or 1) with their absolute times.
 * Tempo changes in any track apply to the whole file, as the format specifies.
 */
export function parseMidiFile(data: ArrayBuffer | Uint8Array): ParsedMidiFile {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    const reader = new ByteReader(bytes);
    if (bytes.length < 14 || reader.ascii(4) !== "MThd") throw new Error("Not a MIDI file (missing MThd header).");
    const headerLength = reader.uint32();
    const headerEnd = reader.position + headerLength;
    const format = reader.uint16();
    const trackCount = reader.uint16();
    const division = reader.uint16();
    if (format > 1) throw new Error(`MIDI format ${format} is not supported. Export as format 0 or 1.`);
    if (division & 0x8000) throw new Error("SMPTE-timed MIDI files are not supported. Export with ticks per quarter note.");
    if (division === 0) throw new Error("MIDI file declares zero ticks per quarter note.");
    reader.position = headerEnd;

    const notes: RawNoteOn[] = [];
    const tempos: (MidiTempoChange & { order: number })[] = [];
    const texts: RawText[] = [];
    const timeSignatures: RawText[] = [];
    for (let track = 0; track < trackCount && reader.position + 8 <= bytes.length; track++) {
        const chunkType = reader.ascii(4);
        const length = reader.uint32();
        const start = reader.position;
        const end = Math.min(start + length, bytes.length);
        if (chunkType === "MTrk") readTrack(bytes, start, end, notes, tempos, texts, timeSignatures);
        else track--;
        reader.position = end;
    }

    tempos.sort((left, right) => left.tick - right.tick || left.order - right.order);
    const tempoMap: MidiTempoChange[] = tempos.map(({ tick, microsecondsPerQuarter }) => ({ tick, microsecondsPerQuarter }));
    if (tempoMap[0]?.tick !== 0) tempoMap.unshift({ tick: 0, microsecondsPerQuarter: DEFAULT_MICROSECONDS_PER_QUARTER });
    const toSeconds = tickToSeconds(tempoMap, division);
    const byTick = (left: RawText, right: RawText) => left.tick - right.tick || left.order - right.order;
    const beatsPerBar = Number(timeSignatures.sort(byTick)[0]?.text);

    return {
        format,
        ticksPerQuarter: division,
        tempos: tempoMap,
        notes: notes
            .sort((left, right) => left.tick - right.tick || left.order - right.order)
            .map(note => ({ timeSeconds: toSeconds(note.tick), channel: note.channel, note: note.note, velocity: note.velocity })),
        markers: texts.sort(byTick).map(text => ({ timeSeconds: toSeconds(text.tick), text: text.text })),
        beatsPerBar: beatsPerBar > 0 ? beatsPerBar : undefined,
    };
}

export function midiTempoBpm(tempo: MidiTempoChange): number {
    return 60_000_000 / tempo.microsecondsPerQuarter;
}
