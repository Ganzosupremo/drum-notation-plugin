/** Runtime SMuFL registry. The full metadata catalogues are validated by tests
 * and intentionally kept out of the production bundle. */
export type GlyphName =
    | "noteheadBlack"
    | "noteheadHalf"
    | "noteheadXBlack"
    | "noteheadPlusBlack"
    | "noteheadCircleX"
    | "articAccentAbove";

export const GLYPHS: { readonly [K in GlyphName]: string } = {
    noteheadBlack: "\uE0A4",
    noteheadHalf: "\uE0A3",
    noteheadXBlack: "\uE0A9",
    noteheadPlusBlack: "\uE0AF",
    noteheadCircleX: "\uE0B3",
    articAccentAbove: "\uE4A0",
};

export function glyphChar(name: GlyphName): string {
    return GLYPHS[name];
}
