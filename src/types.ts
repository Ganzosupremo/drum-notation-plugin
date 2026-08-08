export type MeterType = "simple" | "compound";

export interface TimeSignature {
    beatsPerMeasure: number;
    beatUnit: number;
    meterType: MeterType;
    beatsPerBar: number;
}

export type Articulation = "normal" | "open" | "ghost" | "accent" | "accent-open";

export const TICKS_PER_BEAT = 12;

export type DrumVoice = "upper" | "lower";
export type DiagnosticSeverity = "warning" | "error";
export type NotationStyle = "standard" | "compact" | "practice";

export interface SourceLocation {
    line: number;
    column: number;
    endLine?: number;
    endColumn?: number;
    startOffset?: number;
    endOffset?: number;
    source?: "body" | "fence-header";
}

export interface DiagnosticFix {
    title: string;
    replacement: string;
    range: SourceLocation;
    applicability: "safe" | "suggestion";
}

export interface DrumDiagnostic {
    severity: DiagnosticSeverity;
    code: string;
    message: string;
    location: SourceLocation;
    instrument?: string;
    measure?: number;
    suggestion?: string;
    fixes?: DiagnosticFix[];
}

export interface DrumEvent {
    instrument: string;
    voice: DrumVoice;
    measure: number;
    tick: number;
    durationTicks: number;
    symbol: string;
    articulation: Articulation;
    technique?: "cross-stick" | "rimshot" | "bell";
    ornament?: "flam" | "drag" | "roll";
    source: SourceLocation;
    tied?: boolean;
}

export type RhythmAtomKind = "chord" | "rest";
export type RhythmBaseValue = "whole" | "half" | "quarter" | "eighth" | "sixteenth" | "thirty-second";

export interface RhythmNotation {
    base: RhythmBaseValue;
    dots: number;
    beamLevel: number;
    tuplet?: 3;
}

export interface RhythmAtom {
    kind: RhythmAtomKind;
    voice: DrumVoice;
    tick: number;
    durationTicks: number;
    events: DrumEvent[];
    notation: RhythmNotation;
    continuation?: boolean;
}

export interface RhythmBeamGroup {
    startTick: number;
    endTick: number;
    atomIndexes: number[];
    tuplet?: 3;
}

export interface RhythmTupletGroup {
    startTick: number;
    endTick: number;
    atomIndexes: number[];
    showBracket: boolean;
}

export interface VoiceTimeline {
    voice: DrumVoice;
    atoms: RhythmAtom[];
    beamGroups: RhythmBeamGroup[];
    tupletGroups: RhythmTupletGroup[];
}

export interface ElementBounds {
    left: number;
    right: number;
    top: number;
    bottom: number;
    kind: "note" | "rest" | "flag" | "dot" | "articulation" | "tuplet" | "count";
}

export interface NotationColumn {
    tick: number;
    x: number;
    leftExtent: number;
    rightExtent: number;
    bounds: ElementBounds[];
}

export interface MeasureEngravingLayout {
    measureIndex: number;
    requiredWidth: number;
    width: number;
    left: number;
    right: number;
    columns: NotationColumn[];
    springMinimums: number[];
    springWeights: number[];
    xAtTick(tick: number): number;
}

export interface SystemEngravingLayout {
    startMeasure: number;
    measures: MeasureEngravingLayout[];
    width: number;
    prefix: number;
}

export interface DrumMeasure {
    index: number;
    events: DrumEvent[];
    ticksPerBeat: number;
    beats: number;
    subdivisionsPerBeat: number;
    valid: boolean;
}

export interface InstrumentVoice {
    instrument: string;
    voice: DrumVoice;
    events: DrumEvent[];
}

export interface DrumDocument {
    version: 2;
    sourceMode: "positions" | "grid";
    timeSignature: TimeSignature;
    measures: DrumMeasure[];
    instruments: InstrumentVoice[];
    diagnostics: DrumDiagnostic[];
    feel?: "straight" | "swing" | "triplet";
    style: NotationStyle;
    showCount: boolean;
    showLabels?: boolean;
    hairpinPattern?: string;
    grouping: number[];
    instrumentPositions: Record<string, number>;
    positionOverrides: Record<string, number>;
    sourceText: string;
    headerText?: string;
}
