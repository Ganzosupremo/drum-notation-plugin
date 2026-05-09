import { createSVGElement } from "./svgHelper";

export function renderAccentMark(svg: SVGSVGElement, x: number, y: number) {
    const tipX = x + 6;
    const tipY = y - 26;
    const wingSpread = 5;

    const top = createSVGElement("line");
    top.setAttribute("x1", (tipX - 10).toString());
    top.setAttribute("y1", (tipY - wingSpread).toString());
    top.setAttribute("x2", tipX.toString());
    top.setAttribute("y2", tipY.toString());
    top.classList.add("drum-note");
    svg.appendChild(top);

    const bottom = createSVGElement("line");
    bottom.setAttribute("x1", (tipX - 10).toString());
    bottom.setAttribute("y1", (tipY + wingSpread).toString());
    bottom.setAttribute("x2", tipX.toString());
    bottom.setAttribute("y2", tipY.toString());
    bottom.classList.add("drum-note");
    svg.appendChild(bottom);
}

export function renderGhostParens(svg: SVGSVGElement, x: number, y: number) {
    const openParen = createSVGElement("text");
    openParen.setAttribute("x", (x - 12).toString());
    openParen.setAttribute("y", (y + 4).toString());
    openParen.setAttribute("font-size", "14");
    openParen.setAttribute("text-anchor", "middle");
    openParen.classList.add("drum-note-ghost-paren");
    openParen.textContent = "(";
    svg.appendChild(openParen);

    const closeParen = createSVGElement("text");
    closeParen.setAttribute("x", (x + 12).toString());
    closeParen.setAttribute("y", (y + 4).toString());
    closeParen.setAttribute("font-size", "14");
    closeParen.setAttribute("text-anchor", "middle");
    closeParen.classList.add("drum-note-ghost-paren");
    closeParen.textContent = ")";
    svg.appendChild(closeParen);
}
