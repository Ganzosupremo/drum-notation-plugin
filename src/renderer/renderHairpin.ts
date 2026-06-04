import { createSVGElement } from "./svgHelper";

function addLine(
    svg: SVGSVGElement,
    x1: number,
    y1: number,
    x2: number,
    y2: number
) {
    const line = createSVGElement("line");
    line.setAttribute("x1", x1.toString());
    line.setAttribute("y1", y1.toString());
    line.setAttribute("x2", x2.toString());
    line.setAttribute("y2", y2.toString());
    line.classList.add("drum-hairpin");
    svg.appendChild(line);
}

export function renderHairpin(
    svg: SVGSVGElement,
    pattern: string,
    cellWidth: number,
    startX: number,
    y: number,
    scale: number = 1
) {
    const str = pattern.replace(/\s+/g, "");
    if (!str) return;

    const firstLt = str.indexOf("<");
    const firstGt = str.indexOf(">");

    if (firstLt === -1 && firstGt === -1) return;

    let startIndex = 0;
    let endIndex = str.length - 1;
    let direction: "crescendo" | "decrescendo" = "crescendo";

    if (firstLt !== -1 && (firstGt === -1 || firstLt < firstGt)) {
        direction = "crescendo";
        startIndex = firstLt;
        endIndex = firstGt !== -1 ? firstGt : str.length - 1;
    } else if (firstGt !== -1) {
        direction = "decrescendo";
        if (firstLt !== -1) {
            startIndex = firstGt;
            endIndex = firstLt;
        } else {
            startIndex = 0;
            endIndex = firstGt;
        }
    }

    if (endIndex <= startIndex) return;

    const xStart = startX + startIndex * cellWidth + cellWidth / 2;
    const xEnd = startX + endIndex * cellWidth + cellWidth / 2;
    const height = 6 * scale;

    if (direction === "crescendo") {
        addLine(svg, xStart, y, xEnd, y - height);
        addLine(svg, xStart, y, xEnd, y + height);
        return;
    }

    addLine(svg, xStart, y - height, xEnd, y);
    addLine(svg, xStart, y + height, xEnd, y);
}
