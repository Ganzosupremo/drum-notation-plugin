import { createSVGElement } from "./svgHelper";

import {
    LABEL_X,
    INSTRUMENT_NAMES,
    CYMBAL_INSTRUMENTS,
    TOM_INSTRUMENTS,
} from "./constants";

export function renderLabel(
    svg: SVGSVGElement,
    instrument: string,
    y: number) {
        const label = createSVGElement("text");

        label.setAttribute("x", LABEL_X.toString());

        label.setAttribute("y", y.toString());

        label.textContent = INSTRUMENT_NAMES[instrument] ?? instrument;

        label.classList.add("drum-label");

        if (CYMBAL_INSTRUMENTS.has(instrument)) {
            label.classList.add("drum-label--cymbal");
        } else if (TOM_INSTRUMENTS.has(instrument)) {
            label.classList.add("drum-label--tom");
        }

        svg.appendChild(label);
}