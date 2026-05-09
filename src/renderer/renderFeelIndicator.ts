import { createSVGElement } from "./svgHelper";
import { LABEL_X } from "./constants";

export function renderFeelIndicator(
    svg: SVGSVGElement,
    feel: "straight" | "swing" | "triplet" | undefined
): void {
    if (!feel || feel === "straight") return;

    const label = feel === "swing" ? "Swing" : "Triplet";

    const text = createSVGElement("text");
    text.setAttribute("x", LABEL_X.toString());
    text.setAttribute("y", "20");
    text.setAttribute("text-anchor", "start");
    text.classList.add("drum-feel-indicator");
    text.textContent = label;

    svg.appendChild(text);
}
