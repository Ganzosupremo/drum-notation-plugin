import { DrumDocument } from "../types";
import {
    DocumentRenderOptions,
    RenderedDocument,
    renderEngravingDocument,
} from "./engraving";

export type { DocumentRenderOptions, RenderedDocument } from "./engraving";

/** Stable public entry point for the v2 renderer. */
export function renderDrumDocument(
    documentModel: DrumDocument,
    container: HTMLElement,
    options: DocumentRenderOptions = {},
): RenderedDocument {
    return renderEngravingDocument(documentModel, container, options);
}
