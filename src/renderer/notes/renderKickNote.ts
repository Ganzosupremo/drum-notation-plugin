import { Articulation } from "types";

import { createSVGElement } from "renderer/svgHelper";

import { GLYPHS } from "../smufl";

import { renderStem } from "../renderStem";

import { renderAccentMark, renderGhostParens } from "../renderArticulationHelpers";

import { RenderNoteOpts } from "./renderHiHatNote";

// Kick drum stems go down (below the notehead).
const KICK_STEM_UP = false;

export function renderKickNote(
    svg: SVGSVGElement,
    x: number,
    y: number,
    articulation: Articulation = "normal",
    scale: number = 1,
    opts: RenderNoteOpts = {}
) {
    const { skipAccents = false, accentsOnly = false } = opts;

    if (articulation === "ghost") {
        if (accentsOnly) return;
        const g = createSVGElement("g");
        g.setAttribute("opacity", "0.45");

        const glyph = createSVGElement("text");
        glyph.setAttribute("x", x.toString());
        glyph.setAttribute("y", y.toString());
        glyph.classList.add("drum-glyph");
        glyph.textContent = GLYPHS.noteheadBlack;
        g.appendChild(glyph);

        svg.appendChild(g);
        renderGhostParens(svg, x, y);
        return;
    }

    if (!accentsOnly) {
        const glyph = createSVGElement("text");
        glyph.setAttribute("x", x.toString());
        glyph.setAttribute("y", y.toString());
        glyph.classList.add("drum-glyph");
        glyph.textContent = GLYPHS.noteheadBlack;
        svg.appendChild(glyph);

        renderStem(svg, x, y, scale, KICK_STEM_UP);
    }

    if (!skipAccents && articulation === "accent") {
        renderAccentMark(svg, x, y, undefined, scale);
    }
}
