import { createSVGElement } from "./svgHelper";

export function renderStem(
    svg: SVGSVGElement,
    x: number,
    y: number,
    scale: number = 1
) {
    const stem = createSVGElement("line");
    stem.setAttribute("x1", x.toString());
    stem.setAttribute("y1", (y - 5 * scale).toString());
    stem.setAttribute("x2", x.toString());
    stem.setAttribute("y2", (y - 35 * scale).toString());
    stem.classList.add("drum-note");
    svg.appendChild(stem);
}
