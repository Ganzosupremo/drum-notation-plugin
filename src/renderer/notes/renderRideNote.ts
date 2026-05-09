import { createSVGElement } from "renderer/svgHelper";

import { GLYPHS } from "../smufl";

import { renderStem } from "../renderStem";

// Ride is drawn slightly above the row baseline to distinguish it from HH
const RIDE_Y_OFFSET = -4;

export function renderRideNote(
    svg: SVGSVGElement,
    x: number,
    y: number
) {
    const ny = y + RIDE_Y_OFFSET;

    const glyph = createSVGElement("text");
    glyph.setAttribute("x", x.toString());
    glyph.setAttribute("y", ny.toString());
    glyph.classList.add("drum-glyph");
    glyph.textContent = GLYPHS.noteheadXBlack;
    svg.appendChild(glyph);

    renderStem(svg, x, ny);
}
