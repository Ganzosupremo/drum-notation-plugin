import { createSVGElement } from "renderer/svgHelper";

export function renderHiHatFootNote(
    svg: SVGSVGElement,
    x: number,
    y: number
) {
    const size = 7;

    const horizontal = createSVGElement("line");
    horizontal.setAttribute("x1", (x - size).toString());
    horizontal.setAttribute("y1", y.toString());
    horizontal.setAttribute("x2", (x + size).toString());
    horizontal.setAttribute("y2", y.toString());
    horizontal.classList.add("drum-note", "drum-note-hf");
    svg.appendChild(horizontal);

    const vertical = createSVGElement("line");
    vertical.setAttribute("x1", x.toString());
    vertical.setAttribute("y1", (y - size).toString());
    vertical.setAttribute("x2", x.toString());
    vertical.setAttribute("y2", (y + size).toString());
    vertical.classList.add("drum-note", "drum-note-hf");
    svg.appendChild(vertical);
}
