import { createSVGElement } from "./svgHelper";

import {
    CELL_WIDTH,
    START_X
} from "./constants";

export function renderBarLines(
    svg: SVGSVGElement,
    y: number,
    length: number
) {
    for (let i = 0; i < length; i++) {
        if ((i + 1) % 4 !== 0) continue;

        const x = START_X + i * CELL_WIDTH;

        const bar = createSVGElement("line");

        bar.setAttribute("x1", (x + 20).toString());

        bar.setAttribute("y1", (y - 25).toString());

        bar.setAttribute("x2", (x + 20).toString());

        bar.setAttribute("y2", (y + 10).toString());

        bar.classList.add("drum-bar");

        svg.appendChild(bar);
    }
}