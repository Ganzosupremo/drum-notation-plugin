/**
 * SMuFL glyph registry — resolves Bravura Unicode characters at module load.
 *
 * Two assets are cross-referenced:
 *   assets/bravura_metadata.json  Bravura glyph inventory (glyphBBoxes).
 *                                 Confirms each glyph is present in the font.
 *   assets/glyphnames.json        SMuFL canonical name→codepoint map (W3C).
 *                                 Provides the "U+XXXX" codepoint string.
 *
 * resolveGlyph() throws at startup if a name is missing from either file,
 * making misconfiguration fail fast rather than silently render blank boxes.
 */

import bravuraMetadata from "../../assets/bravura_metadata.json";
import glyphnames from "../../assets/glyphnames.json";

interface BBoxEntry {
    bBoxNE: number[];
    bBoxSW: number[];
}

interface GlyphnameEntry {
    codepoint: string;
    description: string;
}

const bravuraGlyphBBoxes = bravuraMetadata.glyphBBoxes as unknown as Record<string, BBoxEntry | undefined>;
const smuflGlyphnames = glyphnames as unknown as Record<string, GlyphnameEntry | undefined>;

/** Parse a SMuFL codepoint string ("U+E0A4") into a Unicode character. */
function resolveGlyph(name: string): string {
    const bbox = bravuraGlyphBBoxes[name];
    if (bbox === undefined) {
        throw new Error(`Glyph "${name}" is not present in assets/bravura_metadata.json — not shipped in Bravura`);
    }

    const entry = smuflGlyphnames[name];
    if (entry === undefined) {
        throw new Error(`Glyph "${name}" is not present in assets/glyphnames.json — not a valid SMuFL glyph name`);
    }

    const cp = parseInt(entry.codepoint.replace("U+", ""), 16);
    return String.fromCodePoint(cp);
}

export type GlyphName =
    | "noteheadBlack"
    | "noteheadHalf"
    | "noteheadXBlack"
    | "noteheadPlusBlack"
    | "noteheadCircleX"
    | "articAccentAbove";

/**
 * Pre-resolved Bravura glyph characters, looked up at module load time.
 * Each entry is validated against both bravura_metadata.json (Bravura
 * inventory) and glyphnames.json (SMuFL codepoint map).
 *
 * Defined as a typed literal const object (not a Record) so TypeScript knows
 * every property is always a string — safe with noUncheckedIndexedAccess.
 */
export const GLYPHS: { readonly [K in GlyphName]: string } = {
    noteheadBlack:     resolveGlyph("noteheadBlack"),
    noteheadHalf:      resolveGlyph("noteheadHalf"),
    noteheadXBlack:    resolveGlyph("noteheadXBlack"),
    noteheadPlusBlack: resolveGlyph("noteheadPlusBlack"),
    noteheadCircleX:   resolveGlyph("noteheadCircleX"),
    articAccentAbove:  resolveGlyph("articAccentAbove"),
};

/** Resolve any registered SMuFL glyph name to its Bravura Unicode character. */
export function glyphChar(name: GlyphName): string {
    return GLYPHS[name];
}
