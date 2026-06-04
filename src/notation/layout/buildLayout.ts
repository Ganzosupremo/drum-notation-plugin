import { Articulation, NoteEvent } from "types";

import {
    CELL_WIDTH,
    START_X_WITH_LABELS,
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
    pattern: string,
    cellWidth: number = CELL_WIDTH,
    startX: number = START_X_WITH_LABELS
): LayoutResult {
    const notes: NoteEvent[] = [];
    const str = pattern.replace(/\s+/g, "");
    let i = 0;
    let cellIndex = 0;
    let lastNote: NoteEvent | undefined;

    const articulated = ARTICULATED_INSTRUMENTS.has(instrument);
    const supportsOpen = OPEN_ARTICULATION_INSTRUMENTS.has(instrument);

    const pushNote = (symbol: string, articulation: Articulation) => {
        const note: NoteEvent = {
            instrument,
            symbol,
            articulation,
            index: cellIndex,
            x: startX + cellIndex * cellWidth + cellWidth / 2,
            duration: 1,
        };
        notes.push(note);
        lastNote = note;
    };

    const extendTie = () => {
        if (lastNote && lastNote.index + lastNote.duration === cellIndex) {
            lastNote.duration += 1;
        }
    };

    while (i < str.length) {
        const ch: string = str[i] ?? "";

        // Ghost note: (x) or (o) — supported for HH, SD, BD
        if (articulated && ch === "(") {
            const close = str.indexOf(")", i);
            if (close !== -1) {
                const inner = str.substring(i + 1, close);
                const sym: string = inner.length > 0 ? (inner[0] ?? "o") : "o";
                pushNote(sym, "ghost");
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
                const accentArticulation: Articulation =
                    (supportsOpen && nextChar === "o") ? "accent-open" : "accent";
                pushNote(nextChar, accentArticulation);
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

        // Tie extension: ~ extends the previous note by one cell
        if (ch === "~") {
            extendTie();
            i++;
            cellIndex++;
            continue;
        }

        // Accent suffix: x^ or o^ — supported for HH, SD, BD
        if (articulated) {
            const nextChar: string | null = i + 1 < str.length ? (str[i + 1] ?? null) : null;
            if (nextChar === "^") {
                const accentArticulation: Articulation =
                    (supportsOpen && ch === "o") ? "accent-open" : "accent";
                pushNote(ch, accentArticulation);
                i += 2;
                cellIndex++;
                continue;
            }
        }

        // Open articulation (HH-only standalone 'o') or normal note
        const articulation: Articulation = (supportsOpen && ch === "o") ? "open" : "normal";
        pushNote(ch, articulation);
        i++;
        cellIndex++;
    }

    return { notes, cellCount: cellIndex };
}
