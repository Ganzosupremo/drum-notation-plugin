import { Articulation, NoteEvent } from "types";

import {
    CELL_WIDTH,
    START_X,
} from "../../renderer/constants";

export interface LayoutResult {
    notes: NoteEvent[];
    cellCount: number;
}

// Instruments that support ghost () and accent > / ^ syntax.
const ARTICULATED_INSTRUMENTS = new Set(["HH", "SD", "BD"]);

// Only HH maps standalone 'o' to the "open" articulation.
const OPEN_ARTICULATION_INSTRUMENTS = new Set(["HH"]);

export function buildLayout(
    instrument: string,
    pattern: string
): LayoutResult {
    const notes: NoteEvent[] = [];
    const str = pattern.replace(/\s+/g, "");
    let i = 0;
    let cellIndex = 0;

    const articulated = ARTICULATED_INSTRUMENTS.has(instrument);
    const supportsOpen = OPEN_ARTICULATION_INSTRUMENTS.has(instrument);

    while (i < str.length) {
        const ch: string = str[i] ?? "";

        // Ghost note: (x) or (o) — supported for HH, SD, BD
        if (articulated && ch === "(") {
            const close = str.indexOf(")", i);
            if (close !== -1) {
                const inner = str.substring(i + 1, close);
                const sym: string = inner.length > 0 ? (inner[0] ?? "o") : "o";
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
                // Malformed unclosed paren — drop the '(' and continue
                i++;
            }
            continue;
        }

        // Accent prefix: >x or >o — supported for HH, SD, BD
        if (articulated && ch === ">") {
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
                // > followed by - or end: treat as a rest cell
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

        // Accent suffix: x^ or o^ — supported for HH, SD, BD
        if (articulated) {
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
        }

        // Open articulation (HH-only standalone 'o') or normal note
        const articulation: Articulation = (supportsOpen && ch === "o") ? "open" : "normal";
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
