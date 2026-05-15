import { DrumNotation, TimeSignature } from "types";

import {
    STAFF_MID_Y,
    STAFF_S,
    STAFF_SVG_HEIGHT,
    START_X_WITH_LABELS,
    START_X_NO_LABELS,
    getCellWidth,
} from "./constants";

import {
    CANONICAL_ORDER,
    STAFF_OFFSET,
    STEM_UP,
    BEAMED_INSTRUMENTS,
    LEDGER_INSTRUMENTS,
} from "./staffPositions";

import { createSVGElement } from "./svgHelper";

import { renderStaff } from "./renderStaffLine";

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
    scale: number = 1,
    showLabels: boolean = true
) {
    const beatsPerBar = timeSignature?.beatsPerBar ?? 4;
    const subdivisionsPerBeat = notation.subdivisionsPerBeat;

    const cellWidth = getCellWidth(subdivisionsPerBeat ?? 0);
    const startX = showLabels ? START_X_WITH_LABELS : START_X_NO_LABELS;

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
        ...buildLayout(line.instrument, line.pattern, cellWidth, startX),
    }));

    // Sort instruments into canonical staff order (CC top → HF bottom).
    // Unknown instruments fall to the end.
    layouts.sort((a, b) => {
        const ai = CANONICAL_ORDER.indexOf(a.line.instrument);
        const bi = CANONICAL_ORDER.indexOf(b.line.instrument);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });

    const maxCellCount = layouts.reduce((m, l) => Math.max(m, l.cellCount), 0);
    const svgWidth = Math.max(400, startX + (maxCellCount + 1) * cellWidth);

    const svg = createSVGElement("svg");
    svg.setAttribute("width", svgWidth.toString());
    svg.setAttribute("height", STAFF_SVG_HEIGHT.toString());
    svg.classList.add("drum-svg");

    const firstLayout = layouts[0];

    // Subdivision labels (beat numbers: 1 e & a …) — at y≈20, above the staff.
    renderSubdivisionLabels(
        svg,
        firstLayout?.cellCount ?? 0,
        timeSignature,
        subdivisionsPerBeat,
        cellWidth,
        startX
    );

    // Feel indicator (Swing / Triplet) — also at y≈20.
    renderFeelIndicator(svg, notation.feel);

    // Full-width ledger lines for instruments outside the 5-line staff (CC, HF).
    const ledgerYs = layouts
        .filter(l => LEDGER_INSTRUMENTS.has(l.line.instrument))
        .map(l => STAFF_MID_Y + (STAFF_OFFSET[l.line.instrument] ?? 0));

    // Draw the 5-line staff + any ledger lines.
    renderStaff(svg, svgWidth, ledgerYs, startX);

    // Bar lines and bracket span the 5 staff lines (line 5 → line 1).
    const staffTop    = STAFF_MID_Y - 2 * STAFF_S;
    const staffBottom = STAFF_MID_Y + 2 * STAFF_S;

    // Pass 1: instrument labels (optional), noteheads, stems (accents deferred).
    layouts.forEach(({ line, notes }) => {
        const y = STAFF_MID_Y + (STAFF_OFFSET[line.instrument] ?? 0);
        if (showLabels) {
            renderLabel(svg, line.instrument, y);
        }
        renderNotes(svg, notes, y, scale, { skipAccents: true });
    });

    // Pass 2: beams (rendered after noteheads, before accents).
    layouts.forEach(({ line, notes, cellCount }) => {
        if (!BEAMED_INSTRUMENTS.has(line.instrument)) return;
        const y = STAFF_MID_Y + (STAFF_OFFSET[line.instrument] ?? 0);
        const stemUp = STEM_UP[line.instrument] ?? true;
        const groups = buildBeamGroups(
            notes,
            y,
            cellCount,
            beatsPerBar,
            subdivisionsPerBeat,
            stemUp
        );
        renderBeams(svg, groups, scale);
    });

    // Pass 3: accents and open-circle markers (on top of beams).
    layouts.forEach(({ line, notes }) => {
        const y = STAFF_MID_Y + (STAFF_OFFSET[line.instrument] ?? 0);
        renderNotes(svg, notes, y, scale, { accentsOnly: true });
    });

    renderBarLines(svg, staffTop, staffBottom, maxCellCount, beatsPerBar, subdivisionsPerBeat, cellWidth, startX);
    renderBracketLines(svg, staffTop, staffBottom, maxCellCount, cellWidth, startX);

    wrapper.appendChild(svg);
    container.appendChild(wrapper);
}
