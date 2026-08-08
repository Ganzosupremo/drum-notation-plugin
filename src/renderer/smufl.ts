/** Runtime SMuFL registry. The full metadata catalogues are validated by tests
 * and intentionally kept out of the production bundle. */
export type GlyphName =
    | "noteheadBlack"
    | "noteheadHalf"
    | "noteheadXBlack"
    | "noteheadPlusBlack"
    | "noteheadCircleX"
    | "noteheadDiamondBlack"
    | "noteheadSlashedBlack1"
    | "articAccentAbove"
    | "restWhole"
    | "restHalf"
    | "restQuarter"
    | "rest8th"
    | "rest16th"
    | "rest32nd"
    | "augmentationDot"
    | "flag8thUp"
    | "flag8thDown"
    | "flag16thUp"
    | "flag16thDown"
    | "flag32ndUp"
    | "flag32ndDown";

export const GLYPHS: { readonly [K in GlyphName]: string } = {
    noteheadBlack: "\uE0A4",
    noteheadHalf: "\uE0A3",
    noteheadXBlack: "\uE0A9",
    noteheadPlusBlack: "\uE0AF",
    noteheadCircleX: "\uE0B3",
    noteheadDiamondBlack: "\uE0DB",
    noteheadSlashedBlack1: "\uE0CF",
    articAccentAbove: "\uE4A0",
    restWhole: "\uE4E3",
    restHalf: "\uE4E4",
    restQuarter: "\uE4E5",
    rest8th: "\uE4E6",
    rest16th: "\uE4E7",
    rest32nd: "\uE4E8",
    augmentationDot: "\uE1E7",
    flag8thUp: "\uE240",
    flag8thDown: "\uE241",
    flag16thUp: "\uE242",
    flag16thDown: "\uE243",
    flag32ndUp: "\uE244",
    flag32ndDown: "\uE245",
};

export function glyphChar(name: GlyphName): string {
    return GLYPHS[name];
}
