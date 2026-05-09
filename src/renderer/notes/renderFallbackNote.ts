import { createSVGElement } from "renderer/svgHelper";

export function renderFallbackNote(
    svg: SVGSVGElement,
    x: number,
    y: number
) {
    const circle = createSVGElement("circle");
    circle.setAttribute("cx", x.toString());
    circle.setAttribute("cy", (y - 2).toString());
    circle.setAttribute("r", "5");
    circle.classList.add("drum-note-fill", "drum-note-fallback");
    svg.appendChild(circle);
}
