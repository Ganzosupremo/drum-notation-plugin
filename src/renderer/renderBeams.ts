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
        const up = group.stemUp !== false;

        for (let b = 0; b < count; b++) {
            const beam = createSVGElement("line");

            // Stems up: primary beam anchors at stem top (above noteheads);
            //   additional beams stack downward (toward noteheads), +4px each.
            // Stems down: primary beam anchors at stem bottom (below noteheads);
            //   additional beams stack upward (toward noteheads), -4px each.
            const yPos = up
                ? group.y - STEM_TOP * scale + b * 4 * scale
                : group.y + STEM_TOP * scale - b * 4 * scale;

            beam.setAttribute("x1", group.startX.toString());
            beam.setAttribute("y1", yPos.toString());
            beam.setAttribute("x2", group.endX.toString());
            beam.setAttribute("y2", yPos.toString());
            beam.classList.add("drum-beam");
            svg.appendChild(beam);
        }
    });
}
