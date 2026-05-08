const svgNS = "http://www.w3.org/2000/svg";

export function createSVGElement<T extends keyof SVGElementTagNameMap>(
    tag : T
): SVGElementTagNameMap[T] {
    return document.createElementNS(svgNS, tag);
}
    
