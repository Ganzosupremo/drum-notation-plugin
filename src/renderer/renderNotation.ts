import { DrumNotation, TimeSignature } from "types";

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

import { renderSubdivisionLabels } from "./renderSubdivisionLabels";

import { buildBeamGroups } from "notation/layout/buildBeamGroups";

import { renderBeams } from "./renderBeams";

import { buildLayout } from "notation/layout/buildLayout";

export function renderDrumNotation(
    notation: DrumNotation,
    container: HTMLElement,
    timeSignature?: TimeSignature
) {
    const beatsPerBar = timeSignature?.beatsPerBar ?? 4;
    const subdivisionsPerBeat = notation.subdivisionsPerBeat;
    const height = notation.lines.length * ROW_HEIGHT + 40;

    const wrapper = document.createElement("div");

    wrapper.className = "drum-container";

    if (notation.warnings && notation.warnings.length > 0) {
        const warningEl = document.createElement("div");
        warningEl.className = "drum-warning";
        warningEl.textContent = `Warning: ${notation.warnings.join(" | ")}`;
        wrapper.appendChild(warningEl);
    }

    const svg = createSVGElement("svg");

    svg.setAttribute("width", SVG_WIDTH.toString());

    svg.setAttribute("height", height.toString());

    svg.classList.add("drum-svg");

    const firstLine = notation.lines[0];

    renderSubdivisionLabels(
        svg,
        firstLine?.pattern.length ?? 0,
        timeSignature,
        subdivisionsPerBeat
    );

    notation.lines.forEach((line, rowIndex) => {
        const y = rowIndex * ROW_HEIGHT + TOP_OFFSET;

        renderLabel(svg, line.instrument, y);

        renderGrid(svg, y, line.pattern.length);

        // Build layout once per line to avoid duplicate parsing.
        const notes = buildLayout(line.instrument, line.pattern);

        renderNotes(svg, notes, y);

        renderBarLines(svg, y, line.pattern.length, beatsPerBar);

        // RENDER BEAMS
        if (line.instrument === "HH") {

            const groups = buildBeamGroups(
                notes,
                y,
                line.pattern.length,
                beatsPerBar,
                subdivisionsPerBeat
            );
            renderBeams(svg, groups);
        }
    });

    wrapper.appendChild(svg);

    container.appendChild(wrapper);
}
