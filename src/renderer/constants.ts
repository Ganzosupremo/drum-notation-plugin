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

// Width of each cell in the grid
export const CELL_WIDTH = 40;

// Height of each row in the grid
export const ROW_HEIGHT = 40;

// X position for the first cell in the grid
export const START_X = 120;

// Y position for the first row
export const START_Y = 40;

// X position for the first row's label
export const LABEL_X = 20;

// Y position for the first row's label
export const LABEL_Y = 40;

// Space for 4 rows + some padding
export const TOP_OFFSET = 40;

// Total width of 16 cells + some padding
export const SVG_WIDTH = 1000;