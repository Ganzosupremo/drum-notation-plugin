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
    subdivisionsPerBeat?: number
) {
    const period = subdivisionsPerBeat && subdivisionsPerBeat > 0
        ? subdivisionsPerBeat
        : (beatsPerBar > 0 ? Math.round(length / beatsPerBar) : 4);

    const maxI = subdivisionsPerBeat && subdivisionsPerBeat > 0
        ? beatsPerBar * subdivisionsPerBeat
        : length;

    for (let i = 0; i < Math.min(length, maxI); i++) {
        if (period <= 0 || (i + 1) % period !== 0) continue;

        const x = START_X + i * CELL_WIDTH + CELL_WIDTH / 2;

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
) {
    // Only the opening bracket is drawn here. The closing bracket coincides
    // with the last beat-boundary line already emitted by renderBarLines, so
    // drawing it again would cause a double-stroke at that position.
    const line = createSVGElement("line");
    line.setAttribute("x1", START_X.toString());
    line.setAttribute("y1", topY.toString());
    line.setAttribute("x2", START_X.toString());
    line.setAttribute("y2", bottomY.toString());
    line.classList.add("drum-bar");
    svg.appendChild(line);
}
