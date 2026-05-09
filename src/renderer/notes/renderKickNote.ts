import { Articulation } from "types";

import { createSVGElement } from "renderer/svgHelper";

import { renderAccentMark, renderGhostParens } from "../renderArticulationHelpers";

export function renderKickNote(
    svg: SVGSVGElement,
    x: number,
    y: number,
    articulation: Articulation = "normal",
) {
    const cy = y - 2;
    const r = articulation === "ghost" ? 5 : 7;

    if (articulation === "ghost") {
        const g = createSVGElement("g");
        g.setAttribute("opacity", "0.45");

        const circle = createSVGElement("circle");
        circle.setAttribute("cx", x.toString());
        circle.setAttribute("cy", cy.toString());
        circle.setAttribute("r", r.toString());
        circle.classList.add("drum-note-fill");
        g.appendChild(circle);

        svg.appendChild(g);
        renderGhostParens(svg, x, y);
        return;
    }

    const circle = createSVGElement("circle");
    circle.setAttribute("cx", x.toString());
    circle.setAttribute("cy", cy.toString());
    circle.setAttribute("r", r.toString());
    circle.classList.add("drum-note-fill");
    svg.appendChild(circle);

    if (articulation === "accent") {
        renderAccentMark(svg, x, y);
    }
}
