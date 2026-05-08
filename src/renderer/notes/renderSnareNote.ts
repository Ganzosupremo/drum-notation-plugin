import { createSVGElement } from "renderer/svgHelper";

export function renderSnareNote(
    svg: SVGSVGElement,
    x: number,
    y: number
) {

    const circle = createSVGElement("circle");

    circle.setAttribute("cx", x.toString());

    circle.setAttribute("cy", (y - 2).toString());

    circle.setAttribute("r", "6");

    circle.classList.add("drum-note-fill");

    svg.appendChild(circle);
}