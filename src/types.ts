export interface DrumLine {
    instrument: string;
    pattern: string;
}

export interface DrumNotation {
    lines: DrumLine[];
}