import { BeamGroup } from "../types";

import { createSVGElement } from "./svgHelper";

export function renderBeams(
    svg: SVGSVGElement,
    groups: BeamGroup[]
) {

    groups.forEach(group => {

        const beam =
            createSVGElement("line");

        beam.setAttribute(
            "x1",
            group.startX.toString()
        );

        beam.setAttribute(
            "y1",
            (group.y - 18).toString()
        );

        beam.setAttribute(
            "x2",
            group.endX.toString()
        );

        beam.setAttribute(
            "y2",
            (group.y - 18).toString()
        );

        beam.classList.add(
            "drum-beam"
        );

        svg.appendChild(beam);
    });
}