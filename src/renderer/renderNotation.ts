import { DrumNotation, TimeSignature } from "types";

import {
    ROW_HEIGHT,
    TOP_OFFSET,
    STEM_TOP,
    START_X,
    getCellWidth,
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

export function renderDrumNotation(
    notation: DrumNotation,
    container: HTMLElement,
    timeSignature?: TimeSignature,
    scale: number = 1
) {
    const beatsPerBar = timeSignature?.beatsPerBar ?? 4;
    const subdivisionsPerBeat = notation.subdivisionsPerBeat;
    const height = TOP_OFFSET + notation.lines.length * ROW_HEIGHT + 20;

    // Compute adaptive cell width based on subdivision density
    const cellWidth = getCellWidth(subdivisionsPerBeat ?? 0);

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
        ...buildLayout(line.instrument, line.pattern, cellWidth),
    }));

    const maxCellCount = layouts.reduce((m, l) => Math.max(m, l.cellCount), 0);
    const svgWidth = Math.max(400, START_X + (maxCellCount + 1) * cellWidth);

    const svg = createSVGElement("svg");
    svg.setAttribute("width", svgWidth.toString());
    svg.setAttribute("height", height.toString());
    svg.classList.add("drum-svg");

    const firstLayout = layouts[0];

    renderSubdivisionLabels(
        svg,
        firstLayout?.cellCount ?? 0,
        timeSignature,
        subdivisionsPerBeat,
        cellWidth
    );

    renderFeelIndicator(svg, notation.feel);

    const rowYs: number[] = [];

    // Pass 1: labels, staff lines, stems, and noteheads (no accents yet)
    layouts.forEach(({ line, notes }, rowIndex) => {
        const y = rowIndex * ROW_HEIGHT + TOP_OFFSET;
        rowYs.push(y);

        renderLabel(svg, line.instrument, y);
        renderStaffLine(svg, y, svgWidth);
        renderNotes(svg, notes, y, scale, { skipAccents: true });
    });

    // Pass 2: beams (rendered after noteheads, before accents)
    layouts.forEach(({ line, notes, cellCount }, rowIndex) => {
        const y = rowIndex * ROW_HEIGHT + TOP_OFFSET;

        if (line.instrument === "HH" || line.instrument === "RC" || line.instrument === "CC") {
            const groups = buildBeamGroups(
                notes,
                y,
                cellCount,
                beatsPerBar,
                subdivisionsPerBeat
            );
            renderBeams(svg, groups, scale);
        }
    });

    // Pass 3: accents and open-circle markers (on top of beams)
    layouts.forEach(({ notes }, rowIndex) => {
        const y = rowIndex * ROW_HEIGHT + TOP_OFFSET;
        renderNotes(svg, notes, y, scale, { accentsOnly: true });
    });

    if (rowYs.length > 0) {
        const firstY = rowYs[0] as number;
        const lastY = rowYs[rowYs.length - 1] as number;
        const topY = firstY - (STEM_TOP + 20);
        const bottomY = lastY + 12;

        renderBarLines(svg, topY, bottomY, maxCellCount, beatsPerBar, subdivisionsPerBeat, cellWidth);
        renderBracketLines(svg, topY, bottomY, maxCellCount, cellWidth);
    }

    wrapper.appendChild(svg);
    container.appendChild(wrapper);
}
