/**
 * SMuFL glyph registry for the drum notation plugin.
 *
 * Codepoints are from the SMuFL standard specification and verified against
 * the canonical glyph-name list in assets/glyphnames.json.
 *
 * Spec references:
 *  - Noteheads:     https://w3c.github.io/smufl/latest/tables/noteheads.html
 *  - Articulations: https://w3c.github.io/smufl/latest/tables/articulations.html
 *
 * Bravura bounding boxes (from assets/bravura_metadata.json, in staff spaces):
 *  noteheadBlack:    SW=[0, -0.5]   NE=[1.18,  0.5]  (1 staff space tall)
 *  noteheadHalf:     SW=[0, -0.5]   NE=[1.18,  0.5]
 *  noteheadXBlack:   SW=[0, -0.5]   NE=[1.16,  0.5]
 *  noteheadPlusBlack:SW=[-0.004,-0.5] NE=[0.996, 0.5]
 *  noteheadCircleX:  SW=[0, -0.5]   NE=[0.996, 0.5]
 *  articAccentAbove: SW=[0,  0.004] NE=[1.356, 0.98]  (above-baseline only)
 */

/**
 * Pre-resolved Bravura glyph characters.
 *
 * Defined as a literal object (not a Record) so TypeScript knows each
 * property is always a string — compatible with noUncheckedIndexedAccess.
 */
export const GLYPHS = {
    noteheadBlack:     String.fromCodePoint(0xE0A4),
    noteheadHalf:      String.fromCodePoint(0xE0A3),
    noteheadXBlack:    String.fromCodePoint(0xE0A9),
    noteheadPlusBlack: String.fromCodePoint(0xE0AF),
    noteheadCircleX:   String.fromCodePoint(0xE0B3),
    articAccentAbove:  String.fromCodePoint(0xE4A0),
} as const;

export type GlyphName = keyof typeof GLYPHS;

/** Resolve a SMuFL glyph name to its Unicode character. */
export function glyphChar(name: GlyphName): string {
    return GLYPHS[name];
}
