/**
 * SMuFL glyph registry for the drum notation plugin.
 *
 * Codepoints are resolved at module load time from two authoritative sources:
 *
 *   assets/bravura_metadata.json — Bravura-specific glyph inventory (Steinberg).
 *     Contains glyphBBoxes (bounding boxes in staff spaces) and
 *     glyphAdvanceWidths for every glyph actually shipped in the Bravura font.
 *     Used here to confirm each glyph exists in the installed font binary.
 *
 *   assets/glyphnames.json — SMuFL canonical glyph-name→codepoint map (W3C).
 *     Maps every SMuFL glyph name to its Unicode codepoint ("U+E0A4") and
 *     a human-readable description.
 *
 * resolveGlyph() cross-references both files: it throws if the glyph is absent
 * from bravura_metadata.json (not in Bravura) and separately if the name is
 * absent from glyphnames.json (not a valid SMuFL glyph name).
 *
 * Bravura bounding boxes from assets/bravura_metadata.json (staff spaces):
 *   noteheadBlack:     SW=[0,    -0.5]  NE=[1.18,  0.5 ]
 *   noteheadHalf:      SW=[0,    -0.5]  NE=[1.18,  0.5 ]
 *   noteheadXBlack:    SW=[0,    -0.5]  NE=[1.16,  0.5 ]
 *   noteheadPlusBlack: SW=[-0.004,-0.5] NE=[0.996, 0.5 ]
 *   noteheadCircleX:   SW=[0,    -0.5]  NE=[0.996, 0.5 ]
 *   articAccentAbove:  SW=[0,   0.004]  NE=[1.356, 0.98 ]  (above baseline)
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
