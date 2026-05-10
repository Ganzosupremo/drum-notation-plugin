import { createSVGElement } from "./svgHelper";

import {
    CELL_WIDTH,
    START_X
} from "./constants";

export function renderBarLines(
    svg: SVGSVGElement,
    topY: number,
    bottomY: number,
    length: number,
    beatsPerBar = 4,
    subdivisionsPerBeat?: number,
    cellWidth: number = CELL_WIDTH
) {
    const subdiv = subdivisionsPerBeat && subdivisionsPerBeat > 0
        ? subdivisionsPerBeat
        : (beatsPerBar > 0 ? Math.round(length / beatsPerBar) : 4);

    // One barline per full measure (not per beat)
    const period = subdiv * beatsPerBar;

    for (let i = 0; i < length; i++) {
        if (period <= 0 || (i + 1) % period !== 0) continue;

        const x = START_X + i * cellWidth + cellWidth / 2;

        const bar = createSVGElement("line");
        bar.setAttribute("x1", x.toString());
        bar.setAttribute("y1", topY.toString());
        bar.setAttribute("x2", x.toString());
        bar.setAttribute("y2", bottomY.toString());
        bar.classList.add("drum-bar");
        svg.appendChild(bar);
    }
}

export function renderBracketLines(
    svg: SVGSVGElement,
    topY: number,
    bottomY: number,
    cellCount?: number,
    cellWidth: number = CELL_WIDTH
) {
    // Opening bracket at the left edge
    const open = createSVGElement("line");
    open.setAttribute("x1", START_X.toString());
    open.setAttribute("y1", topY.toString());
    open.setAttribute("x2", START_X.toString());
    open.setAttribute("y2", bottomY.toString());
    open.classList.add("drum-bar");
    svg.appendChild(open);

    // Closing bracket at the right edge of the last cell.
    // This must be drawn explicitly because barlines are now only emitted at
    // measure boundaries (not every beat), so it no longer coincides with a
    // beat barline when there is more than one measure.
    if (cellCount && cellCount > 0) {
        const closeX = START_X + (cellCount - 1) * cellWidth + cellWidth / 2;
        const close = createSVGElement("line");
        close.setAttribute("x1", closeX.toString());
        close.setAttribute("y1", topY.toString());
        close.setAttribute("x2", closeX.toString());
        close.setAttribute("y2", bottomY.toString());
        close.classList.add("drum-bar");
        svg.appendChild(close);
    }
}
