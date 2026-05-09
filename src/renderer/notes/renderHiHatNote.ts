import { Articulation } from "types";

import { createSVGElement } from "renderer/svgHelper";

import { renderStem } from "../renderStem";

function renderAccentMark(svg: SVGSVGElement, x: number, y: number) {
    const tipX = x + 6;
    const tipY = y - 26;
    const wingSpread = 5;

    const top = createSVGElement("line");
    top.setAttribute("x1", (tipX - 10).toString());
    top.setAttribute("y1", (tipY - wingSpread).toString());
    top.setAttribute("x2", tipX.toString());
    top.setAttribute("y2", tipY.toString());
    top.classList.add("drum-note");
    svg.appendChild(top);

    const bottom = createSVGElement("line");
    bottom.setAttribute("x1", (tipX - 10).toString());
    bottom.setAttribute("y1", (tipY + wingSpread).toString());
    bottom.setAttribute("x2", tipX.toString());
    bottom.setAttribute("y2", tipY.toString());
    bottom.classList.add("drum-note");
    svg.appendChild(bottom);
}

function renderGhostParens(svg: SVGSVGElement, x: number, y: number) {
    const openParen = createSVGElement("text");
    openParen.setAttribute("x", (x - 12).toString());
    openParen.setAttribute("y", (y + 4).toString());
    openParen.setAttribute("font-size", "14");
    openParen.setAttribute("text-anchor", "middle");
    openParen.classList.add("drum-note-ghost-paren");
    openParen.textContent = "(";
    svg.appendChild(openParen);

    const closeParen = createSVGElement("text");
    closeParen.setAttribute("x", (x + 12).toString());
    closeParen.setAttribute("y", (y + 4).toString());
    closeParen.setAttribute("font-size", "14");
    closeParen.setAttribute("text-anchor", "middle");
    closeParen.classList.add("drum-note-ghost-paren");
    closeParen.textContent = ")";
    svg.appendChild(closeParen);
}

export function renderHiHatNote(
    svg: SVGSVGElement,
    x: number,
    y: number,
    articulation: Articulation = "normal",
) {
    if (articulation === "open") {
        // Hollow circle with stem
        const circle = createSVGElement("circle");
        circle.setAttribute("cx", x.toString());
        circle.setAttribute("cy", y.toString());
        circle.setAttribute("r", "6");
        circle.classList.add("drum-note-open-hh");
        svg.appendChild(circle);
        renderStem(svg, x, y);
        return;
    }

    const size = 7;

    if (articulation === "ghost") {
        // X cross at reduced opacity with parentheses
        const g = createSVGElement("g");
        g.setAttribute("opacity", "0.45");

        const line1 = createSVGElement("line");
        line1.setAttribute("x1", (x - size).toString());
        line1.setAttribute("y1", (y - size).toString());
        line1.setAttribute("x2", (x + size).toString());
        line1.setAttribute("y2", (y + size).toString());
        line1.classList.add("drum-note");
        g.appendChild(line1);

        const line2 = createSVGElement("line");
        line2.setAttribute("x1", (x + size).toString());
        line2.setAttribute("y1", (y - size).toString());
        line2.setAttribute("x2", (x - size).toString());
        line2.setAttribute("y2", (y + size).toString());
        line2.classList.add("drum-note");
        g.appendChild(line2);

        svg.appendChild(g);
        renderGhostParens(svg, x, y);
        renderStem(svg, x, y);
        return;
    }

    // Normal or accent: draw standard X cross
    const line1 = createSVGElement("line");
    line1.setAttribute("x1", (x - size).toString());
    line1.setAttribute("y1", (y - size).toString());
    line1.setAttribute("x2", (x + size).toString());
    line1.setAttribute("y2", (y + size).toString());
    line1.classList.add("drum-note");
    svg.appendChild(line1);

    const line2 = createSVGElement("line");
    line2.setAttribute("x1", (x + size).toString());
    line2.setAttribute("y1", (y - size).toString());
    line2.setAttribute("x2", (x - size).toString());
    line2.setAttribute("y2", (y + size).toString());
    line2.classList.add("drum-note");
    svg.appendChild(line2);

    renderStem(svg, x, y);

    if (articulation === "accent") {
        renderAccentMark(svg, x, y);
    }
}
