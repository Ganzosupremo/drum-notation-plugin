import { createSVGElement } from "renderer/svgHelper";

import { GLYPHS } from "../smufl";

import { renderStem } from "../renderStem";

const TOM_Y_OFFSET: Record<string, number> = {
    HT: -4,
    MT: 0,
    FT: 4,
};

export function renderTomNote(
    svg: SVGSVGElement,
    instrument: string,
    x: number,
    y: number
) {
    const offset = TOM_Y_OFFSET[instrument] ?? 0;
    const cy = y + offset;

    const glyph = createSVGElement("text");
    glyph.setAttribute("x", x.toString());
    glyph.setAttribute("y", cy.toString());
    glyph.classList.add("drum-glyph");
    glyph.textContent = GLYPHS.noteheadBlack;
    svg.appendChild(glyph);

    renderStem(svg, x, cy);
}
