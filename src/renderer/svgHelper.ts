const svgNS = "http://www.w3.org/2000/svg";

export function createSVGElement<T extends keyof SVGElementTagNameMap>(
    tag : T
): SVGElementTagNameMap[T] {
    // Tests provide a minimal DOM without Obsidian's activeDocument export.
    // eslint-disable-next-line obsidianmd/prefer-active-doc
    return document.createElementNS(svgNS, tag);
}
    
