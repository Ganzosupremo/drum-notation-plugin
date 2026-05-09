export interface DrumLine {
    instrument: string;
    pattern: string;
}

export type MeterType = "simple" | "compound";

export interface TimeSignature {
    beatsPerMeasure: number;
    beatUnit: number;
    meterType: MeterType;
    beatsPerBar: number;
}

export interface DrumNotation {
    lines: DrumLine[];
    beatsPerBar?: number;
    timeSignature?: TimeSignature;
    subdivisionsPerBeat?: number;
    feel?: "straight" | "swing" | "triplet";
    warnings?: string[];
}

export type Articulation = "normal" | "open" | "ghost" | "accent" | "accent-open";

export interface NoteEvent {

    instrument: string;

    symbol: string;

    articulation: Articulation;

    index: number;

    x: number;
}

export interface BeamGroup {

    startX: number;

    endX: number;

    y: number;

    beamCount: number;
}
