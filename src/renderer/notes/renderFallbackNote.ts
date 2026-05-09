import { createSVGElement } from "renderer/svgHelper";

import { GLYPHS } from "../smufl";

export function renderFallbackNote(
    svg: SVGSVGElement,
    x: number,
    y: number
) {
    const glyph = createSVGElement("text");
    glyph.setAttribute("x", x.toString());
    glyph.setAttribute("y", (y - 2).toString());
    glyph.classList.add("drum-glyph", "drum-note-fallback");
    glyph.textContent = GLYPHS.noteheadBlack;
    svg.appendChild(glyph);
}
