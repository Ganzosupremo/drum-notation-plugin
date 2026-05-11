// Human-readable names for each instrument code
export const INSTRUMENT_NAMES: Record<string, string> = {
    HH: "Hi-Hat",
    RC: "Ride",
    CC: "Crash",
    HF: "HH Foot",
    HT: "Hi Tom",
    MT: "Mid Tom",
    FT: "Floor Tom",
    SD: "Snare",
    BD: "Kick",
};

// Instrument group membership for visual styling
export const CYMBAL_INSTRUMENTS = new Set(["HH", "RC", "CC", "HF"]);
export const TOM_INSTRUMENTS    = new Set(["HT", "MT", "FT"]);

// Default cell width (used as a fallback; prefer getCellWidth for adaptive sizing)
export const CELL_WIDTH = 40;

/**
 * Returns an adaptive cell width based on subdivisions per beat.
 * Narrower for denser subdivisions (16th notes), wider for sparser ones (quarter notes).
 * Formula: clamp(80 / subdivisionsPerBeat, 24, 64)
 */
export function getCellWidth(subdivisionsPerBeat: number): number {
    if (subdivisionsPerBeat <= 0) return CELL_WIDTH;
    return Math.min(64, Math.max(24, Math.round(80 / subdivisionsPerBeat)));
}

// Height of each row in the grid
export const ROW_HEIGHT = 32;

// X position for the first cell in the grid
export const START_X = 120;

// Y position for the first row
export const START_Y = 70;

// X position for the first row's label
export const LABEL_X = 20;

// Y position for the first row's label
export const LABEL_Y = 70;

// Top offset — headroom above the first row's staff line for stems, beams, accents.
export const TOP_OFFSET = 70;

// Total width of 16 cells + some padding
export const SVG_WIDTH = 1000;

// --- Vertical stem / articulation geometry (all in px at scale=1) ---

// Pixels above the row y-coordinate where the stem *starts* (near the notehead).
export const STEM_BOTTOM = 5;

// Pixels above the row y-coordinate where the stem *ends* (at the beam level).
// Must be < ROW_HEIGHT − STEM_BOTTOM so stems from row n do not cross row n−1.
// At ROW_HEIGHT=32: 32 − 5 = 27  →  row n stem top = y_n − 27 = y_{n−1} + 32 − 27 = y_{n−1} + 5  ✓
export const STEM_TOP = 27;

// Distance above the stem top at which the open-HH circle is centred.
export const OPEN_CIRCLE_ABOVE_STEM = 7;

// Distance above the stem top at which a regular accent baseline is placed.
export const ACCENT_ABOVE_STEM = 2;

// Radius of the open-HH circle marker (px at scale=1).
// Exported so accent-open tip placement can be derived without magic numbers.
export const OPEN_CIRCLE_RADIUS = 4;

// Extra gap (px at scale=1) between the top of the open-HH circle and the
// accent-mark baseline when both are shown (accent-open articulation).
export const ACCENT_OPEN_GAP = 5;
