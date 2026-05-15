import { createSVGElement } from "./svgHelper";

import { START_X_WITH_LABELS, STAFF_MID_Y, STAFF_S } from "./constants";

// Draws the 5-line drum staff across the full SVG width.
// If ledgerYs are provided, also draws full-width ledger lines at those y positions
// (used for instruments that sit outside the standard 5-line staff, e.g. CC and HF).
export function renderStaff(
    svg: SVGSVGElement,
    totalWidth: number,
    ledgerYs: number[] = [],
    startX: number = START_X_WITH_LABELS
): void {
    const x1 = startX;
    const x2 = totalWidth - 10;

    for (let i = -2; i <= 2; i++) {
        const y = STAFF_MID_Y + i * STAFF_S;
        const line = createSVGElement("line");
        line.setAttribute("x1", x1.toString());
        line.setAttribute("y1", y.toString());
        line.setAttribute("x2", x2.toString());
        line.setAttribute("y2", y.toString());
        line.classList.add("drum-staff-line");
        svg.appendChild(line);
    }

    for (const ly of ledgerYs) {
        const line = createSVGElement("line");
        line.setAttribute("x1", x1.toString());
        line.setAttribute("y1", ly.toString());
        line.setAttribute("x2", x2.toString());
        line.setAttribute("y2", ly.toString());
        line.classList.add("drum-staff-line", "drum-ledger-line");
        svg.appendChild(line);
    }
}
