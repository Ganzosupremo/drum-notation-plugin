import { createSVGElement } from "renderer/svgHelper";

import { GLYPHS } from "../smufl";

import { renderStem } from "../renderStem";

// The y passed to renderTomNote is the pre-computed staff position
// (STAFF_MID_Y + STAFF_OFFSET[instrument]).  No internal offset is applied.
//
// Stem direction follows standard drum notation:
//   HT, MT (on/above middle line) → stems up
//   FT     (below middle line)    → stems down
export function renderTomNote(
    svg: SVGSVGElement,
    instrument: string,
    x: number,
    y: number,
    scale: number = 1
) {
    const glyph = createSVGElement("text");
    glyph.setAttribute("x", x.toString());
    glyph.setAttribute("y", y.toString());
    glyph.classList.add("drum-glyph");
    glyph.textContent = GLYPHS.noteheadBlack;
    svg.appendChild(glyph);

    const stemUp = instrument !== "FT";
    renderStem(svg, x, y, scale, stemUp);
}
