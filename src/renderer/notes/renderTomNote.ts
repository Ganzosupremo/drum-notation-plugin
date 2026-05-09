import { createSVGElement } from "renderer/svgHelper";

import { renderStem } from "../renderStem";

const TOM_Y_OFFSET: Record<string, number> = {
    HT: -4,
    MT: 0,
    FT: 4,
};

export function renderTomNote(
    svg: SVGSVGElement,
    instrument: string,
    x: number,
    y: number
) {
    const offset = TOM_Y_OFFSET[instrument] ?? 0;
    const cy = y - 2 + offset;

    const circle = createSVGElement("circle");
    circle.setAttribute("cx", x.toString());
    circle.setAttribute("cy", cy.toString());
    circle.setAttribute("r", "6");
    circle.classList.add("drum-note-fill", `drum-note-${instrument.toLowerCase()}`);
    svg.appendChild(circle);

    renderStem(svg, x, y + offset);
}
