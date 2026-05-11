import { createSVGElement } from "renderer/svgHelper";

import { GLYPHS } from "../smufl";

import { renderStem } from "../renderStem";

// The y passed to renderCrashNote is the pre-computed staff position
// (STAFF_MID_Y + STAFF_OFFSET["CC"]).  No internal offset is applied.
export function renderCrashNote(
    svg: SVGSVGElement,
    x: number,
    y: number,
    scale: number = 1
) {
    // noteheadCircleX (U+E0B3) is the SMuFL glyph for a circled X —
    // the standard crash cymbal notehead in drum notation.
    const glyph = createSVGElement("text");
    glyph.setAttribute("x", x.toString());
    glyph.setAttribute("y", y.toString());
    glyph.classList.add("drum-glyph");
    glyph.classList.add("drum-glyph-circle-x");
    glyph.textContent = GLYPHS.noteheadCircleX;
    svg.appendChild(glyph);

    renderStem(svg, x, y, scale);
}
