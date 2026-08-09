const svgNS = "http://www.w3.org/2000/svg";

export function createSVGElement<T extends keyof SVGElementTagNameMap>(
    ownerDocument: Document,
    tag : T
): SVGElementTagNameMap[T] {
    return ownerDocument.createElementNS(svgNS, tag);
}
    
