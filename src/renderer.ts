import { DrumNotation } from "./types";

const CELL_WIDTH = 40;
const ROW_HEIGHT = 40;

export function renderDrumNotation(
    notation: DrumNotation,
    container: HTMLElement
) {

    const width = 900;
    const height = notation.lines.length * ROW_HEIGHT + 40;

    const svgNS = "http://www.w3.org/2000/svg";

    const wrapper = document.createElement("div");
    wrapper.className = "drum-container";

    const svg = document.createElementNS(svgNS, "svg");

    svg.setAttribute("width", width.toString());
    svg.setAttribute("height", height.toString());

    svg.classList.add("drum-svg");

    notation.lines.forEach((line, rowIndex) => {

        const y = rowIndex * ROW_HEIGHT + 40;

        // Instrument Label
        const label = document.createElementNS(svgNS, "text");

        label.setAttribute("x", "10");
        label.setAttribute("y", y.toString());

        label.textContent = line.instrument;

        label.classList.add("drum-label");

        svg.appendChild(label);

        // Horizontal line
        const horizontal = document.createElementNS(svgNS, "line");

        horizontal.setAttribute("x1", "80");
        horizontal.setAttribute("y1", (y - 5).toString());

        horizontal.setAttribute("x2", "850");
        horizontal.setAttribute("y2", (y - 5).toString());

        horizontal.classList.add("drum-grid");

        svg.appendChild(horizontal);

        const chars = line.pattern.split("");

        chars.forEach((char, index) => {

            const x = 100 + index * CELL_WIDTH;

            // Vertical grid
            const grid = document.createElementNS(svgNS, "line");

            grid.setAttribute("x1", x.toString());
            grid.setAttribute("y1", (y - 25).toString());

            grid.setAttribute("x2", x.toString());
            grid.setAttribute("y2", (y + 10).toString());

            grid.classList.add("drum-grid");

            svg.appendChild(grid);

            // Hit symbol
            if (char !== "-") {

                const note = document.createElementNS(svgNS, "text");

                note.setAttribute("x", x.toString());
                note.setAttribute("y", y.toString());

                note.textContent = char;

                note.classList.add("drum-hit");

                svg.appendChild(note);
            }

            // Bar lines every 4
            if ((index + 1) % 4 === 0) {

                const bar = document.createElementNS(svgNS, "line");

                bar.setAttribute("x1", (x + 20).toString());
                bar.setAttribute("y1", (y - 25).toString());

                bar.setAttribute("x2", (x + 20).toString());
                bar.setAttribute("y2", (y + 10).toString());

                bar.classList.add("drum-bar");

                svg.appendChild(bar);
            }
        });
    });

    wrapper.appendChild(svg);

    container.appendChild(wrapper);
}