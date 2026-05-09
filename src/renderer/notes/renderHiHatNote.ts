import { Articulation } from "types";

import { createSVGElement } from "renderer/svgHelper";

import { renderStem } from "../renderStem";

import { renderAccentMark, renderGhostParens } from "../renderArticulationHelpers";

export function renderHiHatNote(
    svg: SVGSVGElement,
    x: number,
    y: number,
    articulation: Articulation = "normal",
) {
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

    const size = 7;

    if (articulation === "ghost") {
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
