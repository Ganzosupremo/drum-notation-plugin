import { Articulation } from "types";

import { createSVGElement } from "renderer/svgHelper";

import { renderStem } from "../renderStem";

import { renderAccentMark, renderGhostParens } from "../renderArticulationHelpers";

export function renderSnareNote(
    svg: SVGSVGElement,
    x: number,
    y: number,
    articulation: Articulation = "normal",
) {
    if (articulation === "ghost") {
        const g = createSVGElement("g");
        g.setAttribute("opacity", "0.45");

        const ellipse = createSVGElement("ellipse");
        ellipse.setAttribute("cx", x.toString());
        ellipse.setAttribute("cy", y.toString());
        ellipse.setAttribute("rx", "5");
        ellipse.setAttribute("ry", "3.5");
        ellipse.classList.add("drum-note-fill");
        g.appendChild(ellipse);

        svg.appendChild(g);
        renderGhostParens(svg, x, y);
        return;
    }

    const ellipse = createSVGElement("ellipse");
    ellipse.setAttribute("cx", x.toString());
    ellipse.setAttribute("cy", y.toString());
    ellipse.setAttribute("rx", "7");
    ellipse.setAttribute("ry", "5");
    ellipse.classList.add("drum-note-fill");
    svg.appendChild(ellipse);

    renderStem(svg, x, y);

    if (articulation === "accent") {
        renderAccentMark(svg, x, y);
    }
}
