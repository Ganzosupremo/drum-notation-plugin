import { createSVGElement } from "./svgHelper";

import {
    CELL_WIDTH,
    START_X,
} from "./constants";

export function renderGrid(
    svg: SVGSVGElement,
    y: number,
    length: number) {
        for (let i = 0; i < length; i++) {

            const x = START_X + i * CELL_WIDTH;
            const grid = createSVGElement("line");

            grid.setAttribute("x1", x.toString());
            grid.setAttribute("y1", (y - 25).toString());

            grid.setAttribute("x2", x.toString());
            grid.setAttribute("y2", (y + 10).toString());

            grid.classList.add("drum-grid");

            svg.appendChild(grid);
        }
}
