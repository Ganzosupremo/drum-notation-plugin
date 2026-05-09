import { DrumNotation, TimeSignature } from "types";

import {
    ROW_HEIGHT,
    TOP_OFFSET,
    START_X,
    CELL_WIDTH,
} from "./constants";

import { createSVGElement } from "./svgHelper";

import { renderStaffLine } from "./renderStaffLine";

import { renderLabel } from "./renderLabel";

import { renderNotes } from "./renderNotes";

import { renderBarLines, renderBracketLines } from "./renderBarLines";

import { renderSubdivisionLabels } from "./renderSubdivisionLabels";

import { buildBeamGroups } from "notation/layout/buildBeamGroups";

import { renderBeams } from "./renderBeams";

import { buildLayout } from "notation/layout/buildLayout";

import { renderFeelIndicator } from "./renderFeelIndicator";

// Extra vertical space above the first row so 30px stems don't collide
// with the subdivision-label row at y=20.
const EXTRA_TOP = 20;

export function renderDrumNotation(
    notation: DrumNotation,
    container: HTMLElement,
    timeSignature?: TimeSignature
) {
    const beatsPerBar = timeSignature?.beatsPerBar ?? 4;
    const subdivisionsPerBeat = notation.subdivisionsPerBeat;
    const height = notation.lines.length * ROW_HEIGHT + TOP_OFFSET + EXTRA_TOP;

    const wrapper = document.createElement("div");
    wrapper.className = "drum-container";

    if (notation.warnings && notation.warnings.length > 0) {
        const warningEl = document.createElement("div");
        warningEl.className = "drum-warning";
        warningEl.textContent = `Warning: ${notation.warnings.join(" | ")}`;
        wrapper.appendChild(warningEl);
    }

    const layouts = notation.lines.map((line) => ({
        line,
        ...buildLayout(line.instrument, line.pattern),
    }));

    const maxCellCount = layouts.reduce((m, l) => Math.max(m, l.cellCount), 0);
    const svgWidth = Math.max(400, START_X + (maxCellCount + 1) * CELL_WIDTH);

    const svg = createSVGElement("svg");
    svg.setAttribute("width", svgWidth.toString());
    svg.setAttribute("height", height.toString());
    svg.classList.add("drum-svg");

    const firstLayout = layouts[0];

    renderSubdivisionLabels(
        svg,
        firstLayout?.cellCount ?? 0,
        timeSignature,
        subdivisionsPerBeat
    );

    renderFeelIndicator(svg, notation.feel);

    // Collect per-row y values for later use in bar lines and brackets.
    const rowYs: number[] = [];

    layouts.forEach(({ line, notes, cellCount }, rowIndex) => {
        const y = rowIndex * ROW_HEIGHT + TOP_OFFSET + EXTRA_TOP;
        rowYs.push(y);

        renderLabel(svg, line.instrument, y);

        renderStaffLine(svg, y, svgWidth);

        renderNotes(svg, notes, y);

        if (line.instrument === "HH" || line.instrument === "RC" || line.instrument === "CC") {
            const groups = buildBeamGroups(
                notes,
                y,
                cellCount,
                beatsPerBar,
                subdivisionsPerBeat
            );
            renderBeams(svg, groups);
        }
    });

    // Full-height bar lines and bracket after all rows are rendered.
    if (rowYs.length > 0) {
        const firstY = rowYs[0] as number;
        const lastY = rowYs[rowYs.length - 1] as number;
        const topY = firstY - 18;
        const bottomY = lastY + 12;

        renderBarLines(svg, topY, bottomY, maxCellCount, beatsPerBar, subdivisionsPerBeat);
        renderBracketLines(svg, topY, bottomY, maxCellCount);
    }

    wrapper.appendChild(svg);
    container.appendChild(wrapper);
}
