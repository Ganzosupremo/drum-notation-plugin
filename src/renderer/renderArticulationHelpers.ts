import { createSVGElement } from "./svgHelper";

import { GLYPHS } from "./smufl";

import {
    STEM_TOP,
    OPEN_CIRCLE_ABOVE_STEM,
    OPEN_CIRCLE_RADIUS,
    ACCENT_ABOVE_STEM,
} from "./constants";

export function renderOpenCircle(svg: SVGSVGElement, x: number, y: number, scale: number = 1) {
    const circle = createSVGElement("circle");
    circle.setAttribute("cx", x.toString());
    circle.setAttribute("cy", (y - (STEM_TOP + OPEN_CIRCLE_ABOVE_STEM) * scale).toString());
    circle.setAttribute("r", (OPEN_CIRCLE_RADIUS * scale).toString());
    circle.setAttribute("fill", "none");
    circle.setAttribute("stroke", "#111");
    circle.setAttribute("stroke-width", "1.5");
    svg.appendChild(circle);
}

export function renderAccentMark(svg: SVGSVGElement, x: number, y: number, tipYOverride?: number, scale: number = 1) {
    // articAccentAbove (U+E4A0) sits entirely above its text baseline.
    // Default: baseline placed ACCENT_ABOVE_STEM px above the stem top.
    // tipYOverride lets callers shift the glyph (e.g. for accent-open HH).
    const baselineY = tipYOverride !== undefined
        ? tipYOverride
        : y - (STEM_TOP + ACCENT_ABOVE_STEM) * scale;

    const text = createSVGElement("text");
    text.setAttribute("x", x.toString());
    text.setAttribute("y", baselineY.toString());
    text.classList.add("drum-glyph");
    text.classList.add("drum-glyph-accent");
    text.textContent = GLYPHS.articAccentAbove;
    svg.appendChild(text);
}

export function renderGhostParens(svg: SVGSVGElement, x: number, y: number) {
    const openParen = createSVGElement("text");
    openParen.setAttribute("x", (x - 12).toString());
    openParen.setAttribute("y", (y + 4).toString());
    openParen.classList.add("drum-note-ghost-paren");
    openParen.textContent = "(";
    svg.appendChild(openParen);

    const closeParen = createSVGElement("text");
    closeParen.setAttribute("x", (x + 12).toString());
    closeParen.setAttribute("y", (y + 4).toString());
    closeParen.classList.add("drum-note-ghost-paren");
    closeParen.textContent = ")";
    svg.appendChild(closeParen);
}
