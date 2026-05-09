import { createSVGElement } from "./svgHelper";

import { GLYPHS } from "./smufl";

export function renderAccentMark(svg: SVGSVGElement, x: number, y: number, tipYOverride?: number) {
    // articAccentAbove (U+E4A0) sits entirely above its text baseline.
    // Default: baseline at stem top (y-35) with a 2px gap → y-37.
    // tipYOverride lets callers shift the glyph for stemless noteheads.
    const baselineY = tipYOverride !== undefined ? tipYOverride : y - 37;

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
