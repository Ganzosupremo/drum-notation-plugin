import {
    CELL_WIDTH,
    START_X
} from './constants';

import { TimeSignature } from "types";

import { createSVGElement } from './svgHelper';

export function renderSubdivisionLabels(
    svg: SVGSVGElement,
    length: number,
    timeSignature?: TimeSignature,
    subdivisionsOverride?: number,
) {
    const beatsPerBar = timeSignature?.beatsPerBar ?? 4;

    if (length === 0 || beatsPerBar <= 0) return;

    let subdivisionsPerBeat = 0;

    if (subdivisionsOverride && subdivisionsOverride > 0) {
        subdivisionsPerBeat = subdivisionsOverride;
    } else if (timeSignature?.meterType === "compound") {
        subdivisionsPerBeat = 3;
    } else {
        const rawSubdivisions = length / beatsPerBar;
        const supported = [2, 3, 4];
        const closest = supported.reduce((prev, current) =>
            Math.abs(current - rawSubdivisions) < Math.abs(prev - rawSubdivisions)
                ? current
                : prev
        );
        subdivisionsPerBeat = Number.isFinite(rawSubdivisions)
            ? closest
            : 0;
    }

    const labelSets: Record<number, string[]> = {
        2: ["1", "&"],
        3: ["1", "&", "a"],
        4: ["1", "e", "&", "a"],
    };

    const labelSet = labelSets[subdivisionsPerBeat] ?? ["1"];

    for (let i = 0; i < length; i++) {
        const beatIndex = subdivisionsPerBeat > 0
            ? Math.floor(i / subdivisionsPerBeat)
            : 0;

        // Stop labeling past the declared beatsPerBar so patterns longer than
        // expected (or compound meters such as 6/8 with beatsPerBar=2) do not
        // produce phantom beat numbers (3, 4 … in a 6/8 chart).
        if (beatIndex >= beatsPerBar) {
            continue;
        }

        const offset = subdivisionsPerBeat > 0
            ? i % subdivisionsPerBeat
            : 0;
        const isBeat = offset === 0;
        const rawLabel = labelSet[offset] ?? "";
        const labelText = isBeat
            ? (beatIndex + 1).toString()
            : rawLabel;

        const x = START_X + i * CELL_WIDTH;
        const label = createSVGElement('text');

        label.setAttribute('x', x.toString());
        label.setAttribute('y', '20');
        label.setAttribute('text-anchor', 'middle');

        label.textContent = labelText || null;

        label.classList.add('drum-subdivision');

        svg.appendChild(label);
    }

}