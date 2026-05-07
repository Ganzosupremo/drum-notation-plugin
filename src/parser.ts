import { DrumNotation, DrumLine } from "./types";

export function parseDrumNotation(source: string): DrumNotation {

    const lines = source
        .split("\n")
        .map(l => l.trim())
        .filter(Boolean);

    const parsed: DrumLine[] = [];

    for (const line of lines) {
        const [instrument, pattern] = line.split("|").map(s => s.trim());

        if (!instrument || !pattern) continue;
        // const split = line.split("|");

        // if (split.length < 2) continue;

        // const instrument = split[0].trim();
        // const pattern = split[1].trim();

        parsed.push({
            instrument,
            pattern
        });
    }

    return {
        lines: parsed
    };
}