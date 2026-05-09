import { createSVGElement } from "./svgHelper";

import {
    CELL_WIDTH,
    START_X
} from "./constants";

export function renderBarLines(
    svg: SVGSVGElement,
    y: number,
    length: number,
    beatsPerBar = 4,
    subdivisionsPerBeat?: number
) {
    // When subdivisionsPerBeat is explicitly known, use it as the exact
    // cell-per-beat period so bar lines land on true beat boundaries even
    // when the pattern length is not a clean multiple of beatsPerBar.
    // Fall back to deriving the period from pattern length for auto-detected
    // time signatures.
    const period = subdivisionsPerBeat && subdivisionsPerBeat > 0
        ? subdivisionsPerBeat
        : (beatsPerBar > 0 ? Math.round(length / beatsPerBar) : 4);

    // When the period comes from an explicit subdiv, only draw bar lines
    // within the declared measure (beatsPerBar beats), so notes that spill
    // beyond the expected bar end do not generate phantom bar lines.
    const maxI = subdivisionsPerBeat && subdivisionsPerBeat > 0
        ? beatsPerBar * subdivisionsPerBeat
        : length;

    for (let i = 0; i < Math.min(length, maxI); i++) {
        if (period <= 0 || (i + 1) % period !== 0) continue;

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