import { Articulation, NoteEvent } from "types";

import { 
    CELL_WIDTH,
    START_X,

} from "../../renderer/constants";

export interface LayoutResult {
    notes: NoteEvent[];
    cellCount: number;
}

export function buildLayout(
    instrument: string,
    pattern: string
): LayoutResult {

    const notes: NoteEvent[] = [];
    const str = pattern.replace(/\s+/g, "");
    let i = 0;
    let cellIndex = 0;

    if (instrument !== "HH") {
        // Non-HH instruments: simple char-by-char, no articulation consumed
        while (i < str.length) {
            const ch: string = str[i] ?? "";
            if (ch !== "-") {
                notes.push({
                    instrument,
                    symbol: ch,
                    articulation: "normal",
                    index: cellIndex,
                    x: START_X + cellIndex * CELL_WIDTH,
                });
            }
            i++;
            cellIndex++;
        }
        return { notes, cellCount: cellIndex };
    }

    // HH instrument: full articulation tokenizer
    while (i < str.length) {
        const ch: string = str[i] ?? "";

        // Ghost note: (x) or (o) — consumes all chars through the closing paren
        if (ch === "(") {
            const close = str.indexOf(")", i);
            if (close !== -1) {
                const inner = str.substring(i + 1, close);
                const sym: string = inner.length > 0 ? (inner[0] ?? "x") : "x";
                notes.push({
                    instrument,
                    symbol: sym,
                    articulation: "ghost",
                    index: cellIndex,
                    x: START_X + cellIndex * CELL_WIDTH,
                });
                i = close + 1;
                cellIndex++;
            } else {
                // Malformed — unclosed paren: drop the '(' and re-parse next char
                // as a normal note on the following iteration (no cellIndex bump here)
                i++;
            }
            continue;
        }

        // Accent prefix: >x or >o (> followed by a non-rest character)
        if (ch === ">") {
            const nextChar: string | null = i + 1 < str.length ? (str[i + 1] ?? null) : null;
            if (nextChar !== null && nextChar !== "-") {
                notes.push({
                    instrument,
                    symbol: nextChar,
                    articulation: "accent",
                    index: cellIndex,
                    x: START_X + cellIndex * CELL_WIDTH,
                });
                i += 2;
                cellIndex++;
            } else {
                // > followed by - or end of string: treat as rest cell
                i++;
                cellIndex++;
            }
            continue;
        }

        // Rest
        if (ch === "-") {
            i++;
            cellIndex++;
            continue;
        }

        // Accent suffix: x^ or o^
        const nextChar: string | null = i + 1 < str.length ? (str[i + 1] ?? null) : null;
        if (nextChar === "^") {
            notes.push({
                instrument,
                symbol: ch,
                articulation: "accent",
                index: cellIndex,
                x: START_X + cellIndex * CELL_WIDTH,
            });
            i += 2;
            cellIndex++;
            continue;
        }

        // Open HH (standalone 'o') or normal note
        const articulation: Articulation = ch === "o" ? "open" : "normal";
        notes.push({
            instrument,
            symbol: ch,
            articulation,
            index: cellIndex,
            x: START_X + cellIndex * CELL_WIDTH,
        });
        i++;
        cellIndex++;
    }

    return { notes, cellCount: cellIndex };
}
