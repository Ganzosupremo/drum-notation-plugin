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
    const cy = y + offset;

    const ellipse = createSVGElement("ellipse");
    ellipse.setAttribute("cx", x.toString());
    ellipse.setAttribute("cy", cy.toString());
    ellipse.setAttribute("rx", "7");
    ellipse.setAttribute("ry", "5");
    ellipse.classList.add("drum-note-fill");
    svg.appendChild(ellipse);

    renderStem(svg, x, y + offset);
}
