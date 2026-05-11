import { createSVGElement } from "renderer/svgHelper";

import { GLYPHS } from "../smufl";

import { renderStem } from "../renderStem";

// The y passed to renderRideNote is the pre-computed staff position
// (STAFF_MID_Y + STAFF_OFFSET["RC"]).  No internal offset is applied.
export function renderRideNote(
    svg: SVGSVGElement,
    x: number,
    y: number,
    scale: number = 1
) {
    const glyph = createSVGElement("text");
    glyph.setAttribute("x", x.toString());
    glyph.setAttribute("y", y.toString());
    glyph.classList.add("drum-glyph");
    glyph.textContent = GLYPHS.noteheadXBlack;
    svg.appendChild(glyph);

    renderStem(svg, x, y, scale);
}
