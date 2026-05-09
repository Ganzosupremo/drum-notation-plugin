import { Articulation } from "types";

import { createSVGElement } from "renderer/svgHelper";

import { GLYPHS } from "../smufl";

import { renderStem } from "../renderStem";

import { renderAccentMark, renderGhostParens } from "../renderArticulationHelpers";

export function renderKickNote(
    svg: SVGSVGElement,
    x: number,
    y: number,
    articulation: Articulation = "normal",
) {
    if (articulation === "ghost") {
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

    const glyph = createSVGElement("text");
    glyph.setAttribute("x", x.toString());
    glyph.setAttribute("y", y.toString());
    glyph.classList.add("drum-glyph");
    glyph.textContent = GLYPHS.noteheadBlack;
    svg.appendChild(glyph);

    renderStem(svg, x, y);

    if (articulation === "accent") {
        renderAccentMark(svg, x, y);
    }
}
