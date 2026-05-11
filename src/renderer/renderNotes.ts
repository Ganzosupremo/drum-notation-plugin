import { NoteEvent } from "types";

import { renderKickNote } from "./notes/renderKickNote";

import { renderHiHatNote, RenderNoteOpts } from "./notes/renderHiHatNote";

import { renderSnareNote } from "./notes/renderSnareNote";

import { renderRideNote } from "./notes/renderRideNote";

import { renderCrashNote } from "./notes/renderCrashNote";

import { renderTomNote } from "./notes/renderTomNote";

import { renderFallbackNote } from "./notes/renderFallbackNote";

import { renderHiHatFootNote } from "./notes/renderHiHatFootNote";

export function renderNotes(
    svg: SVGSVGElement,
    notes: NoteEvent[],
    y: number,
    scale: number = 1,
    opts: RenderNoteOpts = {}
) {
    notes.forEach((note) => {
        switch (note.instrument) {
            case "HH":
                renderHiHatNote(svg, note.x, y, note.articulation, scale, opts);
                break;
            case "HF":
                if (!opts.accentsOnly) renderHiHatFootNote(svg, note.x, y);
                break;
            case "SD":
                renderSnareNote(svg, note.x, y, note.articulation, scale, opts);
                break;
            case "BD":
                renderKickNote(svg, note.x, y, note.articulation, scale, opts);
                break;
            case "RC":
                if (!opts.accentsOnly) renderRideNote(svg, note.x, y, scale);
                break;
            case "CC":
                if (!opts.accentsOnly) renderCrashNote(svg, note.x, y, scale);
                break;
            case "HT":
            case "MT":
            case "FT":
                if (!opts.accentsOnly) renderTomNote(svg, note.instrument, note.x, y, scale);
                break;
            default:
                if (!opts.accentsOnly) renderFallbackNote(svg, note.x, y);
                break;
        }
    });
}
