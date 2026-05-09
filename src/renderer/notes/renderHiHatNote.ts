import { Articulation } from "types";

import { createSVGElement } from "renderer/svgHelper";

import { GLYPHS } from "../smufl";

import { renderStem } from "../renderStem";

import { renderAccentMark, renderGhostParens } from "../renderArticulationHelpers";

export function renderHiHatNote(
    svg: SVGSVGElement,
    x: number,
    y: number,
    articulation: Articulation = "normal",
    scale: number = 1
) {
    // Open HH: noteheadHalf (U+E0A3) — open oval notehead, the standard
    // SMuFL glyph for an open hi-hat in drum notation.
    if (articulation === "open") {
        const glyph = createSVGElement("text");
        glyph.setAttribute("x", x.toString());
        glyph.setAttribute("y", y.toString());
        glyph.classList.add("drum-glyph");
        glyph.classList.add("drum-glyph-open-hh");
        glyph.textContent = GLYPHS.noteheadHalf;
        svg.appendChild(glyph);
        renderStem(svg, x, y, scale);
        return;
    }

    if (articulation === "accent-open") {
        const glyph = createSVGElement("text");
        glyph.setAttribute("x", x.toString());
        glyph.setAttribute("y", y.toString());
        glyph.classList.add("drum-glyph");
        glyph.classList.add("drum-glyph-open-hh");
        glyph.textContent = GLYPHS.noteheadHalf;
        svg.appendChild(glyph);
        renderStem(svg, x, y, scale);
        renderAccentMark(svg, x, y, undefined, scale);
        return;
    }

    if (articulation === "ghost") {
        const g = createSVGElement("g");
        g.setAttribute("opacity", "0.45");

        const glyph = createSVGElement("text");
        glyph.setAttribute("x", x.toString());
        glyph.setAttribute("y", y.toString());
        glyph.classList.add("drum-glyph");
        glyph.textContent = GLYPHS.noteheadXBlack;
        g.appendChild(glyph);

        svg.appendChild(g);
        renderGhostParens(svg, x, y);
        renderStem(svg, x, y, scale);
        return;
    }

    // Normal / accent: SMuFL X notehead (noteheadXBlack U+E0A9)
    const glyph = createSVGElement("text");
    glyph.setAttribute("x", x.toString());
    glyph.setAttribute("y", y.toString());
    glyph.classList.add("drum-glyph");
    glyph.textContent = GLYPHS.noteheadXBlack;
    svg.appendChild(glyph);

    renderStem(svg, x, y, scale);

    if (articulation === "accent") {
        renderAccentMark(svg, x, y, undefined, scale);
    }
}
