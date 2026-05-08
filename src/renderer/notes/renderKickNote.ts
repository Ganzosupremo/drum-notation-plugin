import { createSVGElement } from "renderer/svgHelper";

export function renderKickNote(
    svg: SVGSVGElement,
    x: number,
    y: number
) {

    const circle = createSVGElement("circle");

    circle.setAttribute("cx", x.toString());

    circle.setAttribute("cy", (y - 2).toString());

    circle.setAttribute("r", "7");

    circle.classList.add("drum-note-fill");

    svg.appendChild(circle);
}