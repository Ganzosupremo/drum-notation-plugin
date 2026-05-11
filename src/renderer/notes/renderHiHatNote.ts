import { Articulation } from "types";

import { createSVGElement } from "renderer/svgHelper";

import { GLYPHS } from "../smufl";

import { renderStem } from "../renderStem";

import { renderAccentMark, renderGhostParens, renderOpenCircle } from "../renderArticulationHelpers";

export interface RenderNoteOpts {
    skipAccents?: boolean;
    accentsOnly?: boolean;
}

export function renderHiHatNote(
    svg: SVGSVGElement,
    x: number,
    y: number,
    articulation: Articulation = "normal",
    scale: number = 1,
    opts: RenderNoteOpts = {}
) {
    const { skipAccents = false, accentsOnly = false } = opts;

    if (articulation === "open") {
        if (!accentsOnly) {
            const glyph = createSVGElement("text");
            glyph.setAttribute("x", x.toString());
            glyph.setAttribute("y", y.toString());
            glyph.classList.add("drum-glyph");
            glyph.textContent = GLYPHS.noteheadXBlack;
            svg.appendChild(glyph);
            renderStem(svg, x, y, scale);
        }
        if (!skipAccents) {
            renderOpenCircle(svg, x, y, scale);
        }
        return;
    }

    if (articulation === "accent-open") {
        if (!accentsOnly) {
            const glyph = createSVGElement("text");
            glyph.setAttribute("x", x.toString());
            glyph.setAttribute("y", y.toString());
            glyph.classList.add("drum-glyph");
            glyph.textContent = GLYPHS.noteheadXBlack;
            svg.appendChild(glyph);
            renderStem(svg, x, y, scale);
        }
        if (!skipAccents) {
            renderOpenCircle(svg, x, y, scale);
            renderAccentMark(svg, x, y, y - 51 * scale, scale);
        }
        return;
    }

    if (articulation === "ghost") {
        if (accentsOnly) return;
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
    if (!accentsOnly) {
        const glyph = createSVGElement("text");
        glyph.setAttribute("x", x.toString());
        glyph.setAttribute("y", y.toString());
        glyph.classList.add("drum-glyph");
        glyph.textContent = GLYPHS.noteheadXBlack;
        svg.appendChild(glyph);
        renderStem(svg, x, y, scale);
    }

    if (!skipAccents && articulation === "accent") {
        renderAccentMark(svg, x, y, undefined, scale);
    }
}
