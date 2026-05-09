import { NoteEvent } from "types";

import { renderKickNote } from "./notes/renderKickNote";

import { renderHiHatNote } from "./notes/renderHiHatNote";

import { renderSnareNote } from "./notes/renderSnareNote";

export function renderNotes(
    svg: SVGSVGElement,
    notes: NoteEvent[],
    y: number
) {
    notes.forEach((note) => {
        switch (note.instrument) {
            case "HH":
                renderHiHatNote(svg, note.x, y, note.articulation);
                break;
            case "SD":
                renderSnareNote(svg, note.x, y);
                break;
            case "BD":
                renderKickNote(svg, note.x, y);
                break;
        }
    });
}
