import { createSVGElement } from "renderer/svgHelper";

import { GLYPHS } from "../smufl";

export function renderHiHatFootNote(
    svg: SVGSVGElement,
    x: number,
    y: number
) {
    // noteheadPlusBlack (U+E0AF) is the SMuFL plus-sign notehead
    // used for hi-hat foot (pedal) notes in drum notation.
    const glyph = createSVGElement("text");
    glyph.setAttribute("x", x.toString());
    glyph.setAttribute("y", y.toString());
    glyph.classList.add("drum-glyph");
    glyph.classList.add("drum-glyph-plus");
    glyph.textContent = GLYPHS.noteheadPlusBlack;
    svg.appendChild(glyph);
}
