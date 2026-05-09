/**
 * SMuFL glyph registry for the drum notation plugin.
 *
 * Codepoints are resolved at module load time from the canonical SMuFL
 * glyph-name map (assets/glyphnames.json, sourced from w3c/smufl). Each
 * entry in that file maps a glyph name to its Unicode codepoint string
 * ("U+E0A4") and a human-readable description.
 *
 * Bravura bounding boxes are documented in assets/bravura_metadata.json:
 *  noteheadBlack:    SW=[0, -0.5]   NE=[1.18,  0.5]  (1 staff space tall)
 *  noteheadHalf:     SW=[0, -0.5]   NE=[1.18,  0.5]
 *  noteheadXBlack:   SW=[0, -0.5]   NE=[1.16,  0.5]
 *  noteheadPlusBlack:SW=[-0.004,-0.5] NE=[0.996, 0.5]
 *  noteheadCircleX:  SW=[0, -0.5]   NE=[0.996, 0.5]
 *  articAccentAbove: SW=[0,  0.004] NE=[1.356, 0.98]  (above-baseline only)
 */

import glyphnames from "../../assets/glyphnames.json";

interface GlyphnameEntry {
    codepoint: string;
    description: string;
}

/** Parse a SMuFL codepoint string ("U+E0A4") into a Unicode character. */
function resolveGlyph(name: string): string {
    const entry = (glyphnames as Record<string, GlyphnameEntry | undefined>)[name];
    if (entry === undefined) {
        throw new Error(`Unknown SMuFL glyph name: "${name}"`);
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
 * Pre-resolved Bravura glyph characters, looked up from the SMuFL
 * glyphnames.json metadata at module load time.
 *
 * Defined as a literal const object (not a Record) so TypeScript knows
 * each property is always a string — safe with noUncheckedIndexedAccess.
 */
export const GLYPHS: { readonly [K in GlyphName]: string } = {
    noteheadBlack:     resolveGlyph("noteheadBlack"),
    noteheadHalf:      resolveGlyph("noteheadHalf"),
    noteheadXBlack:    resolveGlyph("noteheadXBlack"),
    noteheadPlusBlack: resolveGlyph("noteheadPlusBlack"),
    noteheadCircleX:   resolveGlyph("noteheadCircleX"),
    articAccentAbove:  resolveGlyph("articAccentAbove"),
};

/** Resolve any SMuFL glyph name to its Bravura Unicode character. */
export function glyphChar(name: GlyphName): string {
    return GLYPHS[name];
}
