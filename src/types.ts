export interface DrumLine {
    instrument: string;
    pattern: string;
}

export interface DrumNotation {
    lines: DrumLine[];
}

export interface NoteEvent {

    instrument: string;

    symbol: string;

    index: number;

    x: number;
}