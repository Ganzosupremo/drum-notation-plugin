import { createSVGElement } from "renderer/svgHelper";

import { renderStem } from "../renderStem";

// Crash is drawn above the row baseline, higher than ride, for visual distinction
const CRASH_Y_OFFSET = -8;

export function renderCrashNote(
    svg: SVGSVGElement,
    x: number,
    y: number
) {
    const ny = y + CRASH_Y_OFFSET;
    const size = 7;

    const line1 = createSVGElement("line");
    line1.setAttribute("x1", (x - size).toString());
    line1.setAttribute("y1", (ny - size).toString());
    line1.setAttribute("x2", (x + size).toString());
    line1.setAttribute("y2", (ny + size).toString());
    line1.classList.add("drum-note", "drum-note-crash");
    svg.appendChild(line1);

    const line2 = createSVGElement("line");
    line2.setAttribute("x1", (x + size).toString());
    line2.setAttribute("y1", (ny - size).toString());
    line2.setAttribute("x2", (x - size).toString());
    line2.setAttribute("y2", (ny + size).toString());
    line2.classList.add("drum-note", "drum-note-crash");
    svg.appendChild(line2);

    // Small circle around the X to distinguish crash from ride
    const ring = createSVGElement("circle");
    ring.setAttribute("cx", x.toString());
    ring.setAttribute("cy", ny.toString());
    ring.setAttribute("r", (size + 4).toString());
    ring.classList.add("drum-note-crash-ring");
    svg.appendChild(ring);

    renderStem(svg, x, ny);
}
