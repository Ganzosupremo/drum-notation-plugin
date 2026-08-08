import {
    DrumDiagnostic,
    DrumDocument,
    DrumEvent,
    DrumMeasure,
    DrumVoice,
    RhythmAtom,
    RhythmBaseValue,
    RhythmBeamGroup,
    RhythmNotation,
    RhythmTupletGroup,
    TICKS_PER_BEAT,
    TimeSignature,
    VoiceTimeline,
} from "../types";

const VOICES: DrumVoice[] = ["upper", "lower"];

function pulseFamily(events: DrumEvent[], compound: boolean): "binary" | "ternary" | "mixed" {
    let binary = false;
    let ternary = compound;
    events.forEach(event => {
        const offset = event.tick % TICKS_PER_BEAT;
        if ([3, 6, 9].includes(offset) || [3, 6, 9].includes(event.durationTicks)) binary = true;
        if ([4, 8].includes(offset) || [4, 8].includes(event.durationTicks)) ternary = true;
    });
    return binary && ternary ? "mixed" : ternary ? "ternary" : "binary";
}

function baseForFraction(numerator: number, denominator: number): { base: RhythmBaseValue; dots: number; beamLevel: number } {
    const value = numerator / denominator;
    const candidates: Array<[number, RhythmBaseValue, number, number]> = [
        [1, "whole", 0, 0],
        [1 / 2, "half", 0, 0],
        [3 / 8, "quarter", 1, 0],
        [1 / 4, "quarter", 0, 0],
        [3 / 16, "eighth", 1, 1],
        [1 / 8, "eighth", 0, 1],
        [3 / 32, "sixteenth", 1, 2],
        [1 / 16, "sixteenth", 0, 2],
        [1 / 32, "thirty-second", 0, 3],
    ];
    const exact = candidates.find(([candidate]) => Math.abs(candidate - value) < 0.00001);
    const selected = exact ?? candidates.reduce((best, candidate) =>
        Math.abs(candidate[0] - value) < Math.abs(best[0] - value) ? candidate : best);
    return { base: selected[1], dots: selected[2], beamLevel: selected[3] };
}

function notationFor(durationTicks: number, family: "binary" | "ternary", time: TimeSignature): RhythmNotation {
    const pulseNumerator = time.meterType === "compound" ? 3 : 1;
    let writtenNumerator = durationTicks * pulseNumerator;
    let writtenDenominator = TICKS_PER_BEAT * time.beatUnit;
    const tuplet = family === "ternary" && time.meterType !== "compound" ? 3 : undefined;
    if (tuplet) {
        writtenNumerator *= 3;
        writtenDenominator *= 2;
    }
    const value = baseForFraction(writtenNumerator, writtenDenominator);
    return { ...value, tuplet };
}

function pushRest(
    atoms: RhythmAtom[],
    voice: DrumVoice,
    tick: number,
    durationTicks: number,
    family: "binary" | "ternary",
    time: TimeSignature,
): void {
    if (durationTicks <= 0) return;
    atoms.push({
        kind: "rest",
        voice,
        tick,
        durationTicks,
        events: [],
        notation: notationFor(durationTicks, family, time),
    });
}

function positionPulseAtoms(
    events: DrumEvent[],
    voice: DrumVoice,
    pulseStart: number,
    family: "binary" | "ternary",
    time: TimeSignature,
): RhythmAtom[] {
    const atoms: RhythmAtom[] = [];
    const grouped = new Map<number, DrumEvent[]>();
    events.forEach(event => grouped.set(event.tick, [...(grouped.get(event.tick) ?? []), event]));
    const onsets = [...grouped.keys()].sort((a, b) => a - b);
    if (onsets.length === 0) {
        pushRest(atoms, voice, pulseStart, TICKS_PER_BEAT, family, time);
        return atoms;
    }
    const first = onsets[0] ?? pulseStart;
    pushRest(atoms, voice, pulseStart, first - pulseStart, family, time);
    onsets.forEach((tick, index) => {
        const end = onsets[index + 1] ?? pulseStart + TICKS_PER_BEAT;
        atoms.push({
            kind: "chord",
            voice,
            tick,
            durationTicks: end - tick,
            events: grouped.get(tick) ?? [],
            notation: notationFor(end - tick, family, time),
        });
    });
    return atoms;
}

function gridPulseAtoms(
    events: DrumEvent[],
    voiceEvents: DrumEvent[],
    voice: DrumVoice,
    pulseStart: number,
    family: "binary" | "ternary",
    time: TimeSignature,
): RhythmAtom[] {
    const atoms: RhythmAtom[] = [];
    const grouped = new Map<number, DrumEvent[]>();
    events.forEach(event => grouped.set(event.tick, [...(grouped.get(event.tick) ?? []), event]));
    let cursor = pulseStart;
    const continuing = voiceEvents.filter(event => event.tick < pulseStart && event.tick + event.durationTicks > pulseStart);
    if (continuing.length > 0) {
        const continuationEnd = Math.min(
            pulseStart + TICKS_PER_BEAT,
            Math.max(...continuing.map(event => event.tick + event.durationTicks)),
        );
        atoms.push({
            kind: "chord",
            voice,
            tick: pulseStart,
            durationTicks: continuationEnd - pulseStart,
            events: [],
            notation: notationFor(continuationEnd - pulseStart, family, time),
            continuation: true,
        });
        cursor = continuationEnd;
    }
    const ordered = [...grouped.entries()].sort(([a], [b]) => a - b);
    ordered.forEach(([tick, attacks], index) => {
        pushRest(atoms, voice, cursor, tick - cursor, family, time);
        const nextOnset = ordered[index + 1]?.[0] ?? pulseStart + TICKS_PER_BEAT;
        const explicitTieEnd = Math.max(...attacks.map(event => event.tick + event.durationTicks));
        const end = attacks.every(event => event.tied)
            ? explicitTieEnd
            : nextOnset;
        const duration = Math.min(pulseStart + TICKS_PER_BEAT, end) - tick;
        atoms.push({
            kind: "chord",
            voice,
            tick,
            durationTicks: duration,
            events: attacks,
            notation: notationFor(duration, family, time),
        });
        cursor = Math.max(cursor, tick + duration);
    });
    pushRest(atoms, voice, cursor, pulseStart + TICKS_PER_BEAT - cursor, family, time);
    return atoms;
}

function groupingBoundaries(document: DrumDocument): number[] {
    const unitTicks = document.timeSignature.meterType === "compound" ? TICKS_PER_BEAT / 3 : TICKS_PER_BEAT;
    const boundaries = [0];
    document.grouping.forEach(size => boundaries.push((boundaries[boundaries.length - 1] ?? 0) + size * unitTicks));
    return boundaries;
}

function buildBeamGroups(atoms: RhythmAtom[], document: DrumDocument): RhythmBeamGroup[] {
    const boundaries = groupingBoundaries(document);
    const groups: RhythmBeamGroup[] = [];
    for (let boundary = 0; boundary < boundaries.length - 1; boundary++) {
        const start = boundaries[boundary] ?? 0;
        const end = boundaries[boundary + 1] ?? start;
        const candidates = atoms.map((atom, index) => ({ atom, index }))
            .filter(({ atom }) => atom.tick >= start && atom.tick < end);
        let run: Array<{ atom: RhythmAtom; index: number }> = [];
        const flush = () => {
            const notes = run.filter(({ atom }) => atom.kind === "chord" && !atom.continuation && atom.notation.beamLevel > 0);
            if (notes.length >= 2) {
                groups.push({
                    startTick: notes[0]?.atom.tick ?? start,
                    endTick: notes[notes.length - 1]?.atom.tick ?? end,
                    atomIndexes: run.map(item => item.index),
                    tuplet: run.some(({ atom }) => atom.notation.tuplet === 3) ? 3 : undefined,
                });
            }
            run = [];
        };
        candidates.forEach(candidate => {
            const { atom } = candidate;
            const shortRest = atom.kind === "rest" && atom.notation.beamLevel > 0;
            if (atom.kind === "chord" && !atom.continuation && atom.notation.beamLevel > 0 || shortRest) run.push(candidate);
            else flush();
        });
        flush();
    }
    return groups;
}

function buildTuplets(atoms: RhythmAtom[], beamGroups: RhythmBeamGroup[]): RhythmTupletGroup[] {
    const byPulse = new Map<number, number[]>();
    atoms.forEach((atom, index) => {
        if (atom.notation.tuplet !== 3) return;
        const pulse = Math.floor(atom.tick / TICKS_PER_BEAT);
        byPulse.set(pulse, [...(byPulse.get(pulse) ?? []), index]);
    });
    return [...byPulse.entries()].map(([pulse, atomIndexes]) => ({
        startTick: pulse * TICKS_PER_BEAT,
        endTick: (pulse + 1) * TICKS_PER_BEAT,
        atomIndexes,
        showBracket: !beamGroups.some(group => group.tuplet === 3
            && group.startTick >= pulse * TICKS_PER_BEAT && group.endTick < (pulse + 1) * TICKS_PER_BEAT),
    }));
}

export function buildVoiceTimeline(document: DrumDocument, measure: DrumMeasure, voice: DrumVoice): VoiceTimeline | undefined {
    const voiceEvents = measure.events.filter(event => event.voice === voice);
    if (voiceEvents.length === 0) return undefined;
    const atoms: RhythmAtom[] = [];
    for (let pulse = 0; pulse < measure.beats; pulse++) {
        const start = pulse * TICKS_PER_BEAT;
        const events = voiceEvents.filter(event => event.tick >= start && event.tick < start + TICKS_PER_BEAT);
        const detected = pulseFamily(events, document.timeSignature.meterType === "compound");
        const family = detected === "mixed" ? (document.timeSignature.meterType === "compound" ? "ternary" : "binary") : detected;
        atoms.push(...(document.sourceMode === "positions"
            ? positionPulseAtoms(events, voice, start, family, document.timeSignature)
            : gridPulseAtoms(events, voiceEvents, voice, start, family, document.timeSignature)));
    }
    const beamGroups = buildBeamGroups(atoms, document);
    return { voice, atoms, beamGroups, tupletGroups: buildTuplets(atoms, beamGroups) };
}

export function buildMeasureTimelines(document: DrumDocument, measure: DrumMeasure): VoiceTimeline[] {
    return VOICES.map(voice => buildVoiceTimeline(document, measure, voice)).filter((value): value is VoiceTimeline => value !== undefined);
}

export function rhythmDiagnostics(document: DrumDocument): DrumDiagnostic[] {
    const diagnostics: DrumDiagnostic[] = [];
    document.measures.forEach(measure => {
        VOICES.forEach(voice => {
            for (let pulse = 0; pulse < measure.beats; pulse++) {
                const start = pulse * TICKS_PER_BEAT;
                const events = measure.events.filter(event => event.voice === voice && event.tick >= start && event.tick < start + TICKS_PER_BEAT);
                if (pulseFamily(events, document.timeSignature.meterType === "compound") !== "mixed") continue;
                const source = events[0]?.source ?? { line: 1, column: 1 };
                diagnostics.push({
                    severity: "error",
                    code: "mixed-subdivision",
                    message: `${voice} voice, measure ${measure.index + 1}, pulse ${pulse + 1}: binary and ternary subdivisions cannot share one pulse.`,
                    location: source,
                    measure: measure.index + 1,
                });
            }
        });
    });
    return diagnostics;
}
