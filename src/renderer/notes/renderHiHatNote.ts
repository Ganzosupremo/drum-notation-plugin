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
) {
    // Open HH: drawn as a circle (open notehead convention).
    // Kept as an SVG circle rather than noteheadHalf so it reads
    // unambiguously as "open" and to retain the stroke-only appearance.
    if (articulation === "open") {
        const circle = createSVGElement("circle");
        circle.setAttribute("cx", x.toString());
        circle.setAttribute("cy", y.toString());
        circle.setAttribute("r", "6");
        circle.classList.add("drum-note-open-hh");
        svg.appendChild(circle);
        renderStem(svg, x, y);
        return;
    }

    if (articulation === "accent-open") {
        const circle = createSVGElement("circle");
        circle.setAttribute("cx", x.toString());
        circle.setAttribute("cy", y.toString());
        circle.setAttribute("r", "6");
        circle.classList.add("drum-note-open-hh");
        svg.appendChild(circle);
        renderStem(svg, x, y);
        renderAccentMark(svg, x, y);
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
        renderStem(svg, x, y);
        return;
    }

    // Normal / accent: SMuFL X notehead (noteheadXBlack U+E0A9)
    const glyph = createSVGElement("text");
    glyph.setAttribute("x", x.toString());
    glyph.setAttribute("y", y.toString());
    glyph.classList.add("drum-glyph");
    glyph.textContent = GLYPHS.noteheadXBlack;
    svg.appendChild(glyph);

    renderStem(svg, x, y);

    if (articulation === "accent") {
        renderAccentMark(svg, x, y);
    }
}
