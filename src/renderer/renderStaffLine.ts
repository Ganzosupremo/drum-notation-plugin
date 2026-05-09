import { createSVGElement } from "./svgHelper";

import { START_X } from "./constants";

export function renderStaffLine(svg: SVGSVGElement, y: number, totalWidth: number) {
    const line = createSVGElement("line");
    line.setAttribute("x1", START_X.toString());
    line.setAttribute("y1", y.toString());
    line.setAttribute("x2", (totalWidth - 10).toString());
    line.setAttribute("y2", y.toString());
    line.classList.add("drum-staff-line");
    svg.appendChild(line);
}
