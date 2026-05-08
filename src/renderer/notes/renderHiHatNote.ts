import { createSVGElement } from "renderer/svgHelper";

export function renderHiHatNote(
    svg: SVGSVGElement,
    x: number,
    y: number,
) {

    const size = 7;

    // line 1
    const line1 = createSVGElement("line");

    line1.setAttribute("x1", (x - size).toString());
    line1.setAttribute("y1", (y - size).toString());

    line1.setAttribute("x2", (x + size).toString());
    line1.setAttribute("y2", (y + size).toString());

    line1.classList.add("drum-note");

    svg.appendChild(line1);

    // line 2
    const line2 = createSVGElement("line");

    line2.setAttribute("x1", (x + size).toString());
    line2.setAttribute("y1", (y - size).toString());

    line2.setAttribute("x2", (x - size).toString());
    line2.setAttribute("y2", (y + size).toString());

    line2.classList.add("drum-note");

    svg.appendChild(line2);
}