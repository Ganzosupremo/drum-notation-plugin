import { NoteEvent } from "types";

import { 
    CELL_WIDTH,
    START_X,

} from "../../renderer/constants";

export function buildLayout(
    instrument: string,
    pattern: string
): NoteEvent[] {

    const notes: NoteEvent[] = [];

    const chars = pattern.replace(/\s+/g, "").split("");

    chars.forEach((char, index) => {

        if (char === "-") return;

        notes.push({

            instrument,
            symbol: char,
            index,
            x: START_X + index * CELL_WIDTH
        });
    });
    return notes;
}