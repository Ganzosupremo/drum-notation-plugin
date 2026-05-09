import { NoteEvent } from "types";

import { renderKickNote } from "./notes/renderKickNote";

import { renderHiHatNote } from "./notes/renderHiHatNote";

import { renderSnareNote } from "./notes/renderSnareNote";

import { renderRideNote } from "./notes/renderRideNote";

import { renderCrashNote } from "./notes/renderCrashNote";

import { renderTomNote } from "./notes/renderTomNote";

import { renderFallbackNote } from "./notes/renderFallbackNote";

import { renderHiHatFootNote } from "./notes/renderHiHatFootNote";

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
            case "HF":
                renderHiHatFootNote(svg, note.x, y);
                break;
            case "SD":
                renderSnareNote(svg, note.x, y);
                break;
            case "BD":
                renderKickNote(svg, note.x, y);
                break;
            case "RC":
                renderRideNote(svg, note.x, y);
                break;
            case "CC":
                renderCrashNote(svg, note.x, y);
                break;
            case "HT":
            case "MT":
            case "FT":
                renderTomNote(svg, note.instrument, note.x, y);
                break;
            default:
                renderFallbackNote(svg, note.x, y);
                break;
        }
    });
}
