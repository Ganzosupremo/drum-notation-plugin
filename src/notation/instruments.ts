import { DrumVoice } from "../types";

export type DrumTechnique = "cross-stick" | "rimshot" | "bell";
export type DrumOrnament = "flam" | "drag" | "roll";

export interface InstrumentDefinition {
    id: string;
    aliases: string[];
    voice: DrumVoice;
    defaultStaffStep: number;
    notehead: "normal" | "x" | "circle-x" | "plus" | "diamond";
    techniques: DrumTechnique[];
}

export const INSTRUMENT_DEFINITIONS: readonly InstrumentDefinition[] = [
    { id: "CH", aliases: ["CH", "CHINA"], voice: "upper", defaultStaffStep: -7, notehead: "x", techniques: [] },
    { id: "SP", aliases: ["SP", "SPLASH"], voice: "upper", defaultStaffStep: -6, notehead: "circle-x", techniques: [] },
    { id: "CC", aliases: ["CC", "C"], voice: "upper", defaultStaffStep: -6, notehead: "circle-x", techniques: [] },
    { id: "HH", aliases: ["HH", "H"], voice: "upper", defaultStaffStep: -5, notehead: "x", techniques: [] },
    { id: "RC", aliases: ["RC", "R"], voice: "upper", defaultStaffStep: -4, notehead: "x", techniques: ["bell"] },
    { id: "HT", aliases: ["HT", "T1"], voice: "upper", defaultStaffStep: -3, notehead: "normal", techniques: [] },
    { id: "MT", aliases: ["MT", "T2"], voice: "upper", defaultStaffStep: -2, notehead: "normal", techniques: [] },
    { id: "SD", aliases: ["SD", "S"], voice: "upper", defaultStaffStep: -1, notehead: "normal", techniques: ["cross-stick", "rimshot"] },
    { id: "FT", aliases: ["FT", "T3"], voice: "lower", defaultStaffStep: 1, notehead: "normal", techniques: [] },
    { id: "BD", aliases: ["BD", "K"], voice: "lower", defaultStaffStep: 3, notehead: "normal", techniques: [] },
    { id: "HF", aliases: ["HF", "P"], voice: "lower", defaultStaffStep: 6, notehead: "plus", techniques: [] },
] as const;

const BY_ID = new Map(INSTRUMENT_DEFINITIONS.map(definition => [definition.id, definition]));
const BY_ALIAS = new Map(INSTRUMENT_DEFINITIONS.flatMap(definition => definition.aliases.map(alias => [alias, definition] as const)));

export function instrumentDefinition(value: string): InstrumentDefinition | undefined {
    return BY_ID.get(value.toUpperCase());
}

export function normalizeInstrument(value: string): string | undefined {
    return BY_ALIAS.get(value.toUpperCase())?.id;
}

export function defaultInstrumentPositions(): Record<string, number> {
    return Object.fromEntries(INSTRUMENT_DEFINITIONS.map(definition => [definition.id, definition.defaultStaffStep]));
}

export function instrumentVoice(instrument: string): DrumVoice {
    return instrumentDefinition(instrument)?.voice ?? "upper";
}

export function supportsTechnique(instrument: string, technique: DrumTechnique): boolean {
    return instrumentDefinition(instrument)?.techniques.includes(technique) ?? false;
}

function editDistance(left: string, right: string): number {
    const row = Array.from({ length: right.length + 1 }, (_, index) => index);
    for (let leftIndex = 1; leftIndex <= left.length; leftIndex++) {
        let diagonal = row[0]!;
        row[0] = leftIndex;
        for (let rightIndex = 1; rightIndex <= right.length; rightIndex++) {
            const above = row[rightIndex]!;
            row[rightIndex] = Math.min(
                row[rightIndex]! + 1,
                row[rightIndex - 1]! + 1,
                diagonal + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
            );
            diagonal = above;
        }
    }
    return row[right.length] ?? Math.max(left.length, right.length);
}

export function closestInstrument(value: string): string | undefined {
    const normalized = value.toUpperCase();
    const candidates = INSTRUMENT_DEFINITIONS.flatMap(definition => definition.aliases.map(alias => ({ alias, id: definition.id })));
    const closest = candidates.sort((left, right) => editDistance(normalized, left.alias) - editDistance(normalized, right.alias))[0];
    return closest && editDistance(normalized, closest.alias) <= 2 ? closest.id : undefined;
}
