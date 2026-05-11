import { BeamGroup } from "../types";

import { createSVGElement } from "./svgHelper";

import { STEM_TOP } from "./constants";

export function renderBeams(
    svg: SVGSVGElement,
    groups: BeamGroup[],
    scale: number = 1
) {
    groups.forEach(group => {
        const count = group.beamCount ?? 1;

        for (let b = 0; b < count; b++) {
            const beam = createSVGElement("line");

            // Primary beam anchors at the stem top.
            // Additional beams stack 4 * scale px below (toward noteheads).
            const yPos = group.y - STEM_TOP * scale + b * 4 * scale;

            beam.setAttribute("x1", group.startX.toString());
            beam.setAttribute("y1", yPos.toString());
            beam.setAttribute("x2", group.endX.toString());
            beam.setAttribute("y2", yPos.toString());
            beam.classList.add("drum-beam");
            svg.appendChild(beam);
        }
    });
}
