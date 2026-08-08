import {
    DrumDocument,
    DrumMeasure,
    ElementBounds,
    MeasureEngravingLayout,
    RhythmAtom,
    SystemEngravingLayout,
    TICKS_PER_BEAT,
} from "../types";
import { buildMeasureTimelines } from "./rhythm";

const MAX_MEASURES_PER_SYSTEM = 4;

interface ColumnDraft {
    tick: number;
    leftExtent: number;
    rightExtent: number;
    bounds: ElementBounds[];
}

function includeExtent(draft: ColumnDraft, left: number, right: number, bound: ElementBounds): void {
    draft.leftExtent = Math.max(draft.leftExtent, left);
    draft.rightExtent = Math.max(draft.rightExtent, right);
    draft.bounds.push(bound);
}

function atomExtent(draft: ColumnDraft, atom: RhythmAtom, scale: number): void {
    if (atom.continuation) return;
    if (atom.kind === "rest") {
        const right = (9 + atom.notation.dots * 8) * scale;
        includeExtent(draft, 9 * scale, right, { left: -9 * scale, right, top: -12 * scale, bottom: 12 * scale, kind: "rest" });
        return;
    }
    const ghost = atom.events.some(event => event.articulation === "ghost");
    const side = (ghost ? 12 : 7) * scale;
    includeExtent(draft, side, side, { left: -side, right: side, top: -8 * scale, bottom: 8 * scale, kind: "note" });
    const graceLeft = atom.events.some(event => event.ornament === "drag")
        ? 29 * scale
        : atom.events.some(event => event.ornament === "flam")
            ? 21 * scale
            : side;
    if (graceLeft > side) includeExtent(draft, graceLeft, side, { left: -graceLeft, right: side, top: -26 * scale, bottom: 16 * scale, kind: "articulation" });
    if (atom.events.some(event => event.ornament === "roll")) {
        includeExtent(draft, side, 11 * scale, { left: -7 * scale, right: 11 * scale, top: -25 * scale, bottom: 25 * scale, kind: "articulation" });
    }
    if (atom.notation.dots > 0) {
        const right = (9 + atom.notation.dots * 8) * scale;
        includeExtent(draft, side, right, { left: 7 * scale, right, top: -5 * scale, bottom: 5 * scale, kind: "dot" });
    }
    if (atom.notation.beamLevel > 0) {
        includeExtent(draft, side, 14 * scale, { left: 0, right: 14 * scale, top: -22 * scale, bottom: 22 * scale, kind: "flag" });
    }
}

function countTicks(measure: DrumMeasure): number[] {
    const ticks: number[] = [];
    for (let beat = 0; beat < measure.beats; beat++) {
        for (let subdivision = 0; subdivision < measure.subdivisionsPerBeat; subdivision++) {
            ticks.push(beat * TICKS_PER_BEAT + subdivision * TICKS_PER_BEAT / measure.subdivisionsPerBeat);
        }
    }
    return ticks;
}

function draftMeasure(document: DrumDocument, measure: DrumMeasure, scale: number, showCount: boolean): MeasureEngravingLayout {
    const drafts = new Map<number, ColumnDraft>();
    const ensure = (tick: number) => {
        const existing = drafts.get(tick);
        if (existing) return existing;
        const draft: ColumnDraft = { tick, leftExtent: 0, rightExtent: 0, bounds: [] };
        drafts.set(tick, draft);
        return draft;
    };
    buildMeasureTimelines(document, measure).forEach(timeline => timeline.atoms.forEach(atom => atomExtent(ensure(atom.tick), atom, scale)));
    if (showCount) countTicks(measure).forEach(tick => {
        const extent = 4 * scale;
        includeExtent(ensure(tick), extent, extent, { left: -extent, right: extent, top: -6 * scale, bottom: 6 * scale, kind: "count" });
    });
    const totalTicks = measure.beats * TICKS_PER_BEAT;
    ensure(0);
    ensure(totalTicks);
    const ordered = [...drafts.values()].sort((a, b) => a.tick - b.tick);
    const springMinimums: number[] = [];
    const springWeights: number[] = [];
    for (let index = 0; index < ordered.length - 1; index++) {
        const current = ordered[index]!;
        const next = ordered[index + 1]!;
        const delta = next.tick - current.tick;
        springMinimums.push(Math.max(
            current.rightExtent + next.leftExtent + 6 * scale,
            (12 + 8 * Math.sqrt(delta / 3)) * scale,
        ));
        springWeights.push(Math.max(1, Math.sqrt(delta)));
    }
    const margin = 16 * scale;
    const contentWidth = springMinimums.reduce((sum, value) => sum + value, 0)
        + (ordered[0]?.leftExtent ?? 0) + (ordered[ordered.length - 1]?.rightExtent ?? 0);
    const requiredWidth = Math.max(180 * scale, margin * 2 + contentWidth);
    return {
        measureIndex: measure.index,
        requiredWidth,
        width: requiredWidth,
        left: 0,
        right: requiredWidth,
        columns: ordered.map(draft => ({ ...draft, x: 0 })),
        springMinimums,
        springWeights,
        xAtTick: () => 0,
    };
}

function positionMeasure(draft: MeasureEngravingLayout, left: number, width: number, scale: number): MeasureEngravingLayout {
    const columns = draft.columns.map(column => ({ ...column, bounds: column.bounds.map(bound => ({ ...bound })) }));
    const margin = 16 * scale;
    const baseSprings = draft.springMinimums.reduce((sum, value) => sum + value, 0);
    const edgeExtents = (columns[0]?.leftExtent ?? 0) + (columns[columns.length - 1]?.rightExtent ?? 0);
    const distributable = Math.max(0, width - margin * 2 - edgeExtents - baseSprings);
    const totalWeight = draft.springWeights.reduce((sum, value) => sum + value, 0) || 1;
    if (columns[0]) columns[0].x = left + margin + columns[0].leftExtent;
    for (let index = 1; index < columns.length; index++) {
        const previous = columns[index - 1]!;
        columns[index]!.x = previous.x + (draft.springMinimums[index - 1] ?? 0)
            + distributable * (draft.springWeights[index - 1] ?? 0) / totalWeight;
    }
    const xAtTick = (tick: number): number => {
        const exact = columns.find(column => column.tick === tick);
        if (exact) return exact.x;
        const nextIndex = columns.findIndex(column => column.tick > tick);
        if (nextIndex <= 0) return columns[0]?.x ?? left + margin;
        if (nextIndex < 0) return columns[columns.length - 1]?.x ?? left + width - margin;
        const previous = columns[nextIndex - 1]!;
        const next = columns[nextIndex]!;
        return previous.x + (tick - previous.tick) / (next.tick - previous.tick) * (next.x - previous.x);
    };
    return { ...draft, width, left, right: left + width, columns, xAtTick };
}

export function buildEngravingSystems(
    document: DrumDocument,
    availableWidth: number,
    scale: number,
    showCount: boolean,
): SystemEngravingLayout[] {
    const drafts = document.measures.map(measure => draftMeasure(document, measure, scale, showCount));
    const systems: SystemEngravingLayout[] = [];
    let start = 0;
    while (start < drafts.length) {
        const prefix = start === 0 ? 70 : 28;
        const usable = Math.max(180 * scale, availableWidth - prefix - 14);
        const selected: MeasureEngravingLayout[] = [];
        let required = 0;
        while (start + selected.length < drafts.length && selected.length < MAX_MEASURES_PER_SYSTEM) {
            const next = drafts[start + selected.length]!;
            if (selected.length > 0 && (availableWidth < 520 || required + next.requiredWidth > usable)) break;
            selected.push(next);
            required += next.requiredWidth;
            if (availableWidth < 520) break;
        }
        const contentWidth = Math.max(required, usable);
        const extra = Math.max(0, contentWidth - required);
        let cursor = prefix;
        const positioned = selected.map(measure => {
            const share = required > 0 ? extra * measure.requiredWidth / required : 0;
            const layout = positionMeasure(measure, cursor, measure.requiredWidth + share, scale);
            cursor = layout.right;
            return layout;
        });
        systems.push({ startMeasure: start, measures: positioned, width: prefix + contentWidth + 14, prefix });
        start += selected.length;
    }
    return systems;
}
