import { createSVGElement } from "renderer/svgHelper";

import { renderStem } from "../renderStem";

// Ride is drawn slightly above the row baseline to distinguish it from HH
const RIDE_Y_OFFSET = -4;

export function renderRideNote(
    svg: SVGSVGElement,
    x: number,
    y: number
) {
    const ny = y + RIDE_Y_OFFSET;
    const size = 7;

    const line1 = createSVGElement("line");
    line1.setAttribute("x1", (x - size).toString());
    line1.setAttribute("y1", (ny - size).toString());
    line1.setAttribute("x2", (x + size).toString());
    line1.setAttribute("y2", (ny + size).toString());
    line1.classList.add("drum-note", "drum-note-ride");
    svg.appendChild(line1);

    const line2 = createSVGElement("line");
    line2.setAttribute("x1", (x + size).toString());
    line2.setAttribute("y1", (ny - size).toString());
    line2.setAttribute("x2", (x - size).toString());
    line2.setAttribute("y2", (ny + size).toString());
    line2.classList.add("drum-note", "drum-note-ride");
    svg.appendChild(line2);

    renderStem(svg, x, ny);
}
