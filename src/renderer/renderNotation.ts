import { DrumNotation } from "types";

import {
    ROW_HEIGHT,
    TOP_OFFSET,
    SVG_WIDTH,
} from "./constants";

import { createSVGElement } from "./svgHelper";

import { renderGrid } from "./renderGrid";

import { renderLabel } from "./renderLabel";

import { renderNotes } from "./renderNotes";

import { renderBarLines } from "./renderBarLines";

export function renderDrumNotation(
    notation: DrumNotation,
    container: HTMLElement
) {
    const height = notation.lines.length * ROW_HEIGHT + 40;

    const wrapper = document.createElement("div");

    wrapper.className = "drum-container";

    const svg = createSVGElement("svg");

    svg.setAttribute("width", SVG_WIDTH.toString());

    svg.setAttribute("height", height.toString());

    svg.classList.add("drum-svg");

    notation.lines.forEach((line, rowIndex) => {
        const y = rowIndex * ROW_HEIGHT + TOP_OFFSET;

        renderLabel(svg, line.instrument, y);

        renderGrid(svg, y, line.pattern.length);

        renderNotes(svg, line.instrument, line.pattern, y);

        renderBarLines(svg, y, line.pattern.length);
    });

    wrapper.appendChild(svg);

    container.appendChild(wrapper);
}
