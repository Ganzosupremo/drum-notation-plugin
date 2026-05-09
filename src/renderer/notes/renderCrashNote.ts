import { createSVGElement } from "renderer/svgHelper";

import { GLYPHS } from "../smufl";

import { renderStem } from "../renderStem";

// Crash is drawn above the row baseline, higher than ride, for visual distinction
const CRASH_Y_OFFSET = -8;

export function renderCrashNote(
    svg: SVGSVGElement,
    x: number,
    y: number
) {
    const ny = y + CRASH_Y_OFFSET;

    // noteheadCircleX (U+E0B3) is the SMuFL glyph for a circled X —
    // the standard crash cymbal notehead in drum notation.
    const glyph = createSVGElement("text");
    glyph.setAttribute("x", x.toString());
    glyph.setAttribute("y", ny.toString());
    glyph.classList.add("drum-glyph");
    glyph.textContent = GLYPHS.noteheadCircleX;
    svg.appendChild(glyph);

    renderStem(svg, x, ny);
}
