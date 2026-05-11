import { createSVGElement } from "./svgHelper";

import { STEM_BOTTOM, STEM_TOP } from "./constants";

export function renderStem(
    svg: SVGSVGElement,
    x: number,
    y: number,
    scale: number = 1
) {
    const stem = createSVGElement("line");
    stem.setAttribute("x1", x.toString());
    stem.setAttribute("y1", (y - STEM_BOTTOM * scale).toString());
    stem.setAttribute("x2", x.toString());
    stem.setAttribute("y2", (y - STEM_TOP * scale).toString());
    stem.classList.add("drum-note");
    svg.appendChild(stem);
}
