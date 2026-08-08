import { STAFF_S } from "./constants";
import { INSTRUMENT_DEFINITIONS } from "../notation/instruments";

export const CANONICAL_ORDER = INSTRUMENT_DEFINITIONS.map(definition => definition.id);

// Y offset from STAFF_MID_Y for each instrument (negative = above middle line).
// Based on standard drum notation staff positions (GrooveScribe / abc2svg conventions):
//   CC  -3.0 S → ledger line above top
//   HH  -2.5 S → space above line 5
//   RC  -2.0 S → line 5 (top)
//   HT  -1.5 S → space 4
//   MT  -1.0 S → line 4
//   SD  -0.5 S → space 3
//   FT  +0.5 S → space 2
//   BD  +1.5 S → space 1
//   HF  +3.0 S → ledger line below line 1
export const STAFF_OFFSET: Record<string, number> = Object.fromEntries(
    INSTRUMENT_DEFINITIONS.map(definition => [definition.id, definition.defaultStaffStep * STAFF_S / 2]),
);

// Stem direction per instrument: true = stem up (above notehead), false = stem down.
// Instruments on or above the middle line (SD and above) → stems up.
// Instruments below the middle line (FT, BD, HF) → stems down.
export const STEM_UP: Record<string, boolean> = Object.fromEntries(
    INSTRUMENT_DEFINITIONS.map(definition => [definition.id, definition.voice === "upper"]),
);

// Instruments that get horizontal beams connecting their stems.
export const BEAMED_INSTRUMENTS = new Set(["HH", "RC", "CC", "CH", "SP"]);

// Instruments whose staff position falls outside the 5-line staff
// and therefore require a full-width ledger line.
export const LEDGER_INSTRUMENTS = new Set(INSTRUMENT_DEFINITIONS.filter(definition => Math.abs(definition.defaultStaffStep) > 4).map(definition => definition.id));
