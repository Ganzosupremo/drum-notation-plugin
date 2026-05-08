import { renderKickNote } from "./notes/renderKickNote";

import { renderHiHatNote } from "./notes/renderHiHatNote";

import { renderSnareNote } from "./notes/renderSnareNote";

import {
    CELL_WIDTH,
    START_X
} from "./constants";

export function renderNotes(
    svg: SVGSVGElement,
    instrument: string,
    pattern: string,
    y: number
) {

    const chars = pattern.split("");

    chars.forEach((char, index) => {

        if (char === "-") return;

        const x =
            START_X + index * CELL_WIDTH;

        switch (instrument) {

            case "HH":

                renderHiHatNote(svg, x, y);

                break;

            case "SD":

                renderSnareNote(svg, x, y);

                break;

            case "BD":

                renderKickNote(svg, x, y);

                break;
        }
    });
}