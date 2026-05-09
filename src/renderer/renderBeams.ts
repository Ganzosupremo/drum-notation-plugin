import { BeamGroup } from "../types";

import { createSVGElement } from "./svgHelper";

export function renderBeams(
    svg: SVGSVGElement,
    groups: BeamGroup[]
) {
    groups.forEach(group => {
        const count = group.beamCount ?? 1;

        for (let b = 0; b < count; b++) {
            const beam = createSVGElement("line");

            // Primary beam sits at the stem top (y - 35).
            // Additional beams stack 4 px below (toward noteheads).
            const yPos = group.y - 35 + b * 4;

            beam.setAttribute("x1", group.startX.toString());
            beam.setAttribute("y1", yPos.toString());
            beam.setAttribute("x2", group.endX.toString());
            beam.setAttribute("y2", yPos.toString());
            beam.classList.add("drum-beam");
            svg.appendChild(beam);
        }
    });
}
