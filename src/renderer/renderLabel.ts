import { createSVGElement } from "./svgHelper";

import { LABEL_X } from "./constants";

export function renderLabel(
    svg: SVGSVGElement,
    instrument: string,
    y: number) {
        const label = createSVGElement("text");
        label.setAttribute("x", LABEL_X.toString());
        label.setAttribute("y", y.toString());
        label.textContent = instrument;
        label.classList.add("drum-label");
        svg.appendChild(label);
}
