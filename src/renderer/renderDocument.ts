import {
    DrumDocument,
    DrumEvent,
    DrumMeasure,
    DrumVoice,
    MeasureEngravingLayout,
    RhythmAtom,
    RhythmBaseValue,
    RhythmBeamGroup,
    TICKS_PER_BEAT,
    VoiceTimeline,
} from "../types";
import { buildEngravingSystems } from "../notation/engravingLayout";
import { buildVoiceTimeline } from "../notation/rhythm";
import { GLYPHS } from "./smufl";
import { createSVGElement } from "./svgHelper";
import { defaultInstrumentPositions, instrumentDefinition } from "../notation/instruments";
import { STAFF_MID_Y, STAFF_S } from "./constants";
import { renderHairpin } from "./renderHairpin";
import { serializeCompactDocument } from "../notation/serializeCompact";

export interface DocumentRenderOptions {
    scale?: number;
    showLabels?: boolean;
    showCount?: boolean;
    instrumentPositions?: Record<string, number>;
}

export interface RenderedDocument {
    destroy(): void;
    rerender(): void;
    updateOptions(options: DocumentRenderOptions): void;
}

const UPPER_BEAM_Y = STAFF_MID_Y - 42;
const LOWER_BEAM_Y = STAFF_MID_Y + 42;

function svgText(svg: SVGSVGElement, text: string, x: number, y: number, className: string): SVGTextElement {
    const element = createSVGElement("text");
    element.setAttribute("x", x.toString());
    element.setAttribute("y", y.toString());
    element.classList.add(className);
    element.textContent = text;
    svg.appendChild(element);
    return element;
}

function svgLine(svg: SVGSVGElement, x1: number, y1: number, x2: number, y2: number, className: string): SVGLineElement {
    const line = createSVGElement("line");
    line.setAttribute("x1", x1.toString());
    line.setAttribute("y1", y1.toString());
    line.setAttribute("x2", x2.toString());
    line.setAttribute("y2", y2.toString());
    line.classList.add(className);
    svg.appendChild(line);
    return line;
}

function svgPath(svg: SVGSVGElement, pathData: string, className: string): SVGPathElement {
    const path = createSVGElement("path");
    path.setAttribute("d", pathData);
    path.classList.add(className);
    svg.appendChild(path);
    return path;
}

function eventY(event: DrumEvent, positions: Record<string, number>): number {
    return STAFF_MID_Y + (positions[event.instrument] ?? 0) * STAFF_S / 2;
}

function glyphFor(event: DrumEvent): string {
    if (event.technique === "cross-stick") return GLYPHS.noteheadXBlack;
    if (event.technique === "bell") return GLYPHS.noteheadDiamondBlack;
    const notehead = instrumentDefinition(event.instrument)?.notehead;
    if (notehead === "circle-x") return GLYPHS.noteheadCircleX;
    if (notehead === "x") return GLYPHS.noteheadXBlack;
    if (notehead === "plus") return GLYPHS.noteheadPlusBlack;
    if (notehead === "diamond") return GLYPHS.noteheadDiamondBlack;
    return GLYPHS.noteheadBlack;
}

function renderStaff(svg: SVGSVGElement, left: number, right: number): void {
    for (let index = -2; index <= 2; index++) {
        svgLine(svg, left, STAFF_MID_Y + index * STAFF_S, right, STAFF_MID_Y + index * STAFF_S, "drum-staff-line");
    }
}

function renderLocalLedgerLines(svg: SVGSVGElement, x: number, staffStep: number, scale: number): void {
    if (staffStep <= -6) {
        for (let step = -6; step >= staffStep; step -= 2) {
            const y = STAFF_MID_Y + step * STAFF_S / 2;
            svgLine(svg, x - 9 * scale, y, x + 9 * scale, y, "drum-ledger-line");
        }
    } else if (staffStep >= 6) {
        for (let step = 6; step <= staffStep; step += 2) {
            const y = STAFF_MID_Y + step * STAFF_S / 2;
            svgLine(svg, x - 9 * scale, y, x + 9 * scale, y, "drum-ledger-line");
        }
    }
}

function renderClefAndMeter(svg: SVGSVGElement, x: number, document: DrumDocument): void {
    svgLine(svg, x, STAFF_MID_Y - 15, x, STAFF_MID_Y + 15, "drum-percussion-clef");
    svgLine(svg, x + 6, STAFF_MID_Y - 15, x + 6, STAFF_MID_Y + 15, "drum-percussion-clef");
    svgText(svg, document.timeSignature.beatsPerMeasure.toString(), x + 25, STAFF_MID_Y - 3, "drum-time-signature");
    svgText(svg, document.timeSignature.beatUnit.toString(), x + 25, STAFF_MID_Y + 14, "drum-time-signature");
}

function renderNotehead(svg: SVGSVGElement, event: DrumEvent, x: number, scale: number, decorationIndex: number, positions: Record<string, number>, stemTip?: number): void {
    const y = eventY(event, positions);
    renderLocalLedgerLines(svg, x, positions[event.instrument] ?? 0, scale);
    const glyph = svgText(svg, glyphFor(event), x, y, "drum-glyph");
    glyph.setAttribute("data-instrument", event.instrument);
    if (event.technique) glyph.setAttribute("data-technique", event.technique);
    if (event.technique === "rimshot") {
        svgLine(svg, x - 5 * scale, y + 5 * scale, x + 5 * scale, y - 5 * scale, "drum-rimshot-mark");
    }
    if (event.articulation === "ghost") {
        glyph.classList.add("drum-glyph-ghost");
        svgText(svg, "(", x - 9 * scale, y + 3, "drum-note-ghost-paren");
        svgText(svg, ")", x + 9 * scale, y + 3, "drum-note-ghost-paren");
    }
    if (event.articulation === "open" || event.articulation === "accent-open") {
        const circle = createSVGElement("circle");
        circle.setAttribute("cx", x.toString());
        const markerY = event.voice === "upper"
            ? (stemTip ?? UPPER_BEAM_Y) - (9 + decorationIndex * 6) * scale
            : (stemTip ?? LOWER_BEAM_Y) + (9 + decorationIndex * 6) * scale;
        circle.setAttribute("cy", markerY.toString());
        circle.setAttribute("r", (3.5 * scale).toString());
        circle.classList.add("drum-open-marker");
        svg.appendChild(circle);
    }
    if (event.articulation === "accent" || event.articulation === "accent-open") {
        const openOffset = event.articulation === "accent-open" ? 8 : 0;
        const accentY = event.voice === "upper"
            ? (stemTip ?? UPPER_BEAM_Y) - (9 + openOffset + decorationIndex * 7) * scale
            : (stemTip ?? LOWER_BEAM_Y) + (13 + openOffset + decorationIndex * 7) * scale;
        const accent = svgText(svg, GLYPHS.articAccentAbove, x, accentY, "drum-glyph-accent");
        accent.classList.add("drum-glyph");
        accent.setAttribute("data-instrument", event.instrument);
        if (event.voice === "lower") accent.setAttribute("transform", `rotate(180 ${x} ${accentY})`);
    }
}

function renderOrnament(svg: SVGSVGElement, event: DrumEvent, x: number, y: number, stemEnd: number, scale: number): void {
    if (!event.ornament) return;
    if (event.ornament === "roll") {
        const direction = event.voice === "upper" ? -1 : 1;
        const centerY = (y + stemEnd) / 2;
        for (let index = -1; index <= 1; index++) {
            const slashY = centerY + index * 5 * direction * scale;
            svgLine(svg, x - 5 * scale, slashY + 3 * scale, x + 5 * scale, slashY - 3 * scale, "drum-roll-stroke");
        }
        return;
    }
    const count = event.ornament === "drag" ? 2 : 1;
    const graceY = y + (event.voice === "upper" ? 5 : -5) * scale;
    const firstX = x - (count === 2 ? 23 : 15) * scale;
    for (let index = 0; index < count; index++) {
        const graceX = firstX + index * 9 * scale;
        const grace = svgText(svg, GLYPHS.noteheadBlack, graceX, graceY, "drum-glyph");
        grace.classList.add("drum-grace-note");
        grace.setAttribute("data-ornament", event.ornament);
        const graceTip = graceY + (event.voice === "upper" ? -16 : 16) * scale;
        svgLine(svg, graceX + 2 * scale, graceY, graceX + 2 * scale, graceTip, "drum-grace-stem");
        if (event.ornament === "flam") {
            svgLine(svg, graceX - 3 * scale, (graceY + graceTip) / 2 + 3 * scale, graceX + 5 * scale, (graceY + graceTip) / 2 - 3 * scale, "drum-grace-slash");
        }
    }
    const curveY = y + (event.voice === "upper" ? -10 : 10) * scale;
    svgPath(svg, `M ${firstX + 3 * scale} ${curveY} Q ${x - 6 * scale} ${curveY + (event.voice === "upper" ? -5 : 5) * scale} ${x - 3 * scale} ${y}`, "drum-grace-slur");
}

export interface Chord {
    tick: number;
    voice: DrumVoice;
    events: DrumEvent[];
    duration: number;
    x: number;
}

export function buildMeasureChords(measure: DrumMeasure, voice: DrumVoice, left: number, width: number): Chord[] {
    const grouped = new Map<number, DrumEvent[]>();
    measure.events.filter(event => event.voice === voice).forEach(event => {
        const events = grouped.get(event.tick) ?? [];
        events.push(event);
        grouped.set(event.tick, events);
    });
    const totalTicks = measure.beats * TICKS_PER_BEAT;
    return [...grouped.entries()].sort(([a], [b]) => a - b).map(([tick, events]) => ({
        tick,
        voice,
        events,
        duration: Math.min(...events.map(event => event.durationTicks)),
        x: left + 12 + (tick / totalTicks) * (width - 24),
    }));
}

function atomX(atom: RhythmAtom, layout: MeasureEngravingLayout): number {
    return layout.xAtTick(atom.tick);
}

function renderFlag(svg: SVGSVGElement, atom: RhythmAtom, x: number, stemEnd: number): void {
    const level = Math.min(3, atom.notation.beamLevel);
    if (level === 0) return;
    const up = atom.voice === "upper";
    const glyph = level === 1
        ? up ? GLYPHS.flag8thUp : GLYPHS.flag8thDown
        : level === 2
            ? up ? GLYPHS.flag16thUp : GLYPHS.flag16thDown
            : up ? GLYPHS.flag32ndUp : GLYPHS.flag32ndDown;
    const flag = svgText(svg, glyph, x, stemEnd, "drum-glyph");
    flag.classList.add("drum-flag-glyph");
    flag.setAttribute("data-beam-level", level.toString());
}

function restGlyph(value: RhythmBaseValue): string {
    if (value === "whole") return GLYPHS.restWhole;
    if (value === "half") return GLYPHS.restHalf;
    if (value === "eighth") return GLYPHS.rest8th;
    if (value === "sixteenth") return GLYPHS.rest16th;
    if (value === "thirty-second") return GLYPHS.rest32nd;
    return GLYPHS.restQuarter;
}

function renderDots(svg: SVGSVGElement, atom: RhythmAtom, x: number, y: number, scale: number): void {
    for (let index = 0; index < atom.notation.dots; index++) {
        svgText(svg, GLYPHS.augmentationDot, x + (9 + index * 5) * scale, y, "drum-glyph").classList.add("drum-rhythm-dot");
    }
}

function renderRest(svg: SVGSVGElement, atom: RhythmAtom, x: number, scale: number, collides: boolean): void {
    const adjustedX = x + (collides ? (atom.voice === "upper" ? -5 : 5) * scale : 0);
    const y = STAFF_MID_Y + (atom.voice === "upper" ? -10 : 17) * scale;
    const rest = svgText(svg, restGlyph(atom.notation.base), adjustedX, y, "drum-glyph");
    rest.classList.add("drum-rest");
    rest.setAttribute("data-voice", atom.voice);
    renderDots(svg, atom, adjustedX, y, scale);
}

interface BeamGeometry {
    group: RhythmBeamGroup;
    noteIndexes: number[];
    startX: number;
    endX: number;
    startY: number;
    endY: number;
}

function beamYAt(geometry: BeamGeometry, x: number): number {
    if (geometry.endX === geometry.startX) return geometry.startY;
    return geometry.startY + (x - geometry.startX) / (geometry.endX - geometry.startX) * (geometry.endY - geometry.startY);
}

function beamGeometry(
    timeline: VoiceTimeline,
    layout: MeasureEngravingLayout,
    positions: Record<string, number>,
    scale: number,
): BeamGeometry[] {
    return timeline.beamGroups.map(group => {
        const noteIndexes = group.atomIndexes.filter(index => timeline.atoms[index]?.kind === "chord" && !timeline.atoms[index]?.continuation);
        const first = timeline.atoms[noteIndexes[0] ?? -1];
        const last = timeline.atoms[noteIndexes[noteIndexes.length - 1] ?? -1];
        if (!first || !last) return undefined;
        const startX = atomX(first, layout);
        const endX = atomX(last, layout);
        const firstYs = first.events.map(event => eventY(event, positions));
        const lastYs = last.events.map(event => eventY(event, positions));
        const firstReference = timeline.voice === "upper" ? Math.min(...firstYs) : Math.max(...firstYs);
        const lastReference = timeline.voice === "upper" ? Math.min(...lastYs) : Math.max(...lastYs);
        const delta = Math.max(-STAFF_S, Math.min(STAFF_S, (lastReference - firstReference) * 0.35));
        const center = timeline.voice === "upper"
            ? Math.min(UPPER_BEAM_Y, firstReference - 23 * scale, lastReference - 23 * scale)
            : Math.max(LOWER_BEAM_Y, firstReference + 23 * scale, lastReference + 23 * scale);
        return { group, noteIndexes, startX, endX, startY: center - delta / 2, endY: center + delta / 2 };
    }).filter((value): value is BeamGeometry => value !== undefined);
}

function drawBeams(
    svg: SVGSVGElement,
    timeline: VoiceTimeline,
    layout: MeasureEngravingLayout,
    scale: number,
    geometries: BeamGeometry[],
): Map<number, BeamGeometry> {
    const membership = new Map<number, BeamGeometry>();
    geometries.forEach(geometry => {
        svgLine(svg, geometry.startX, geometry.startY, geometry.endX, geometry.endY, "drum-beam");
        geometry.noteIndexes.forEach(index => membership.set(index, geometry));
        const ordered = geometry.group.atomIndexes;
        const maxLevel = Math.max(...geometry.noteIndexes.map(index => timeline.atoms[index]?.notation.beamLevel ?? 0));
        for (let level = 2; level <= maxLevel; level++) {
            geometry.noteIndexes.forEach((atomIndex, notePosition) => {
                const atom = timeline.atoms[atomIndex];
                if (!atom || atom.notation.beamLevel < level) return;
                const orderedPosition = ordered.indexOf(atomIndex);
                const nextIndex = ordered[orderedPosition + 1];
                const next = nextIndex === undefined ? undefined : timeline.atoms[nextIndex];
                const x = atomX(atom, layout);
                const offset = (timeline.voice === "upper" ? 1 : -1) * (level - 1) * 5 * scale;
                if (next?.kind === "chord" && next.notation.beamLevel >= level) {
                    const nextX = atomX(next, layout);
                    svgLine(svg, x, beamYAt(geometry, x) + offset, nextX, beamYAt(geometry, nextX) + offset, "drum-beam");
                    return;
                }
                const previousIndex = ordered[orderedPosition - 1];
                const previous = previousIndex === undefined ? undefined : timeline.atoms[previousIndex];
                if (previous?.kind === "chord" && previous.notation.beamLevel >= level) return;
                const pointsRight = notePosition < geometry.noteIndexes.length - 1;
                const hookEnd = x + (pointsRight ? 9 : -9) * scale;
                const hook = svgLine(svg, x, beamYAt(geometry, x) + offset, hookEnd, beamYAt(geometry, hookEnd) + offset, "drum-beam");
                hook.classList.add("drum-beam-hook");
            });
        }
    });
    return membership;
}

function renderTuplets(
    svg: SVGSVGElement,
    timeline: VoiceTimeline,
    layout: MeasureEngravingLayout,
    scale: number,
    geometries: BeamGeometry[],
): void {
    timeline.tupletGroups.forEach(group => {
        const start = layout.xAtTick(group.startTick);
        const end = layout.xAtTick(group.endTick);
        const beamEdge = geometries.length > 0
            ? timeline.voice === "upper"
                ? Math.min(...geometries.flatMap(geometry => [geometry.startY, geometry.endY]))
                : Math.max(...geometries.flatMap(geometry => [geometry.startY, geometry.endY]))
            : timeline.voice === "upper" ? UPPER_BEAM_Y : LOWER_BEAM_Y;
        const y = timeline.voice === "upper" ? beamEdge - 18 * scale : beamEdge + 22 * scale;
        svgText(svg, "3", (start + end) / 2, y + (timeline.voice === "upper" ? 0 : 4), "drum-tuplet-number");
        if (!group.showBracket) return;
        const gap = 8 * scale;
        svgLine(svg, start, y, (start + end) / 2 - gap, y, "drum-tuplet-bracket");
        svgLine(svg, (start + end) / 2 + gap, y, end, y, "drum-tuplet-bracket");
        const edge = timeline.voice === "upper" ? 4 : -4;
        svgLine(svg, start, y, start, y + edge, "drum-tuplet-bracket");
        svgLine(svg, end, y, end, y + edge, "drum-tuplet-bracket");
    });
}

function renderVoice(
    svg: SVGSVGElement,
    document: DrumDocument,
    measure: DrumMeasure,
    layout: MeasureEngravingLayout,
    voice: DrumVoice,
    scale: number,
    oppositeOnsets: Set<number>,
    positions: Record<string, number>,
): void {
    const timeline = buildVoiceTimeline(document, measure, voice);
    if (!timeline) return;
    const geometries = beamGeometry(timeline, layout, positions, scale);
    const beamed = drawBeams(svg, timeline, layout, scale, geometries);

    timeline.atoms.forEach((atom, atomIndex) => {
        const x = atomX(atom, layout);
        if (atom.kind === "rest") {
            renderRest(svg, atom, x, scale, oppositeOnsets.has(atom.tick));
            return;
        }
        if (atom.continuation) return;
        const geometry = beamed.get(atomIndex);
        const ys = atom.events.map(event => eventY(event, positions));
        const isolatedEnd = voice === "upper" ? Math.min(...ys) - 23 * scale : Math.max(...ys) + 23 * scale;
        const stemEnd = geometry ? beamYAt(geometry, x) : isolatedEnd;
        let decorationIndex = 0;
        atom.events.forEach(event => {
            const currentDecoration = event.articulation === "normal" ? 0 : decorationIndex++;
            renderNotehead(svg, event, x, scale, currentDecoration, positions, stemEnd);
            renderOrnament(svg, event, x, eventY(event, positions), stemEnd, scale);
            if (event.tied) {
                const endX = Math.min(layout.right - 6, layout.xAtTick(event.tick + event.durationTicks));
                const y = eventY(event, positions) + (voice === "upper" ? 8 : -8) * scale;
                const curve = (voice === "upper" ? 5 : -5) * scale;
                svgPath(svg, `M ${x + 4} ${y} Q ${(x + endX) / 2} ${y + curve} ${endX} ${y}`, "drum-tie");
            }
        });
        const dotAnchor = atom.events[atom.events.length - 1];
        if (dotAnchor) renderDots(svg, atom, x, eventY(dotAnchor, positions), scale);
        if (atom.events.every(event => event.instrument === "HF")) return;
        const stemStart = voice === "upper" ? Math.max(...ys) - 4 * scale : Math.min(...ys) + 4 * scale;
        svgLine(svg, x, stemStart, x, stemEnd, "drum-note");
        if (!geometry) renderFlag(svg, atom, x, stemEnd);
    });
    renderTuplets(svg, timeline, layout, scale, geometries);
}

function countLabels(subdivisions: number): string[] {
    if (subdivisions === 4) return ["1", "e", "&", "a"];
    if (subdivisions === 3) return ["1", "&", "a"];
    if (subdivisions === 2) return ["1", "&"];
    return ["1"];
}

function renderMeasure(
    svg: SVGSVGElement,
    document: DrumDocument,
    measure: DrumMeasure,
    layout: MeasureEngravingLayout,
    scale: number,
    showCount: boolean,
    positions: Record<string, number>,
): void {
    const { left, right, width } = layout;
    svgLine(svg, left, STAFF_MID_Y - 2 * STAFF_S, left, STAFF_MID_Y + 2 * STAFF_S, "drum-bar");
    svgLine(svg, right, STAFF_MID_Y - 2 * STAFF_S, right, STAFF_MID_Y + 2 * STAFF_S, "drum-bar");
    if (!measure.valid) {
        const marker = createSVGElement("rect");
        marker.setAttribute("x", left.toString());
        marker.setAttribute("y", (STAFF_MID_Y - 2 * STAFF_S).toString());
        marker.setAttribute("width", width.toString());
        marker.setAttribute("height", (4 * STAFF_S).toString());
        marker.classList.add("drum-invalid-measure");
        svg.appendChild(marker);
    }
    const upperOnsets = new Set(measure.events.filter(event => event.voice === "upper").map(event => event.tick));
    const lowerOnsets = new Set(measure.events.filter(event => event.voice === "lower").map(event => event.tick));
    renderVoice(svg, document, measure, layout, "upper", scale, lowerOnsets, positions);
    renderVoice(svg, document, measure, layout, "lower", scale, upperOnsets, positions);
    if (showCount) {
        const labels = countLabels(measure.subdivisionsPerBeat);
        for (let beat = 0; beat < measure.beats; beat++) {
            labels.forEach((label, offset) => {
                const tick = beat * TICKS_PER_BEAT + offset * (TICKS_PER_BEAT / measure.subdivisionsPerBeat);
                const x = layout.xAtTick(tick);
                svgText(svg, offset === 0 ? (beat + 1).toString() : label, x, 21, "drum-subdivision");
            });
        }
    }
    if (document.feel && document.feel !== "straight" && measure.index === 0) {
        svgText(svg, document.feel === "swing" ? "Swing" : "Triplet", left, 21, "drum-feel-indicator");
    }
    if (document.hairpinPattern && measure.index === 0) {
        const patternLength = document.hairpinPattern.replace(/\s+/g, "").length;
        if (patternLength > 0) {
            renderHairpin(svg, document.hairpinPattern, width / patternLength, left, STAFF_MID_Y + 2 * STAFF_S + 18, scale);
        }
    }
}

function systemVerticalBounds(document: DrumDocument, measures: DrumMeasure[], scale: number, positions: Record<string, number>): { top: number; height: number } {
    const baseBottom = document.style === "compact" ? 142 : document.style === "practice" ? 178 : 155;
    const chordSize = (voice: DrumVoice) => {
        const counts = measures.flatMap(measure => {
            const grouped = new Map<number, number>();
            measure.events.filter(event => event.voice === voice).forEach(event => grouped.set(event.tick, (grouped.get(event.tick) ?? 0) + 1));
            return [...grouped.values()];
        });
        return Math.max(1, ...counts);
    };
    const upperDecorations = chordSize("upper");
    const lowerDecorations = chordSize("lower");
    const hasSimpleTuplets = document.timeSignature.meterType !== "compound"
        && measures.some(measure => measure.events.some(event => event.durationTicks === 4 || event.durationTicks === 8));
    const upperExtent = UPPER_BEAM_Y - (20 + (upperDecorations - 1) * 7) * scale - 8;
    const tupletExtent = hasSimpleTuplets ? UPPER_BEAM_Y - 22 * scale - 8 : 0;
    const top = Math.floor(Math.min(0, upperExtent, tupletExtent));
    const allEvents = measures.flatMap(measure => measure.events);
    const highestHead = allEvents.length > 0 ? Math.min(...allEvents.map(event => eventY(event, positions))) : STAFF_MID_Y;
    const ornamentTop = allEvents.some(event => event.ornament === "flam" || event.ornament === "drag") ? 22 * scale : 0;
    const lowerEvents = allEvents.filter(event => event.voice === "lower");
    const lowestHead = lowerEvents.length > 0 ? Math.max(...lowerEvents.map(event => eventY(event, positions))) : STAFF_MID_Y;
    const lowerExtent = lowestHead + (25 + (lowerDecorations - 1) * 7) * scale + 7;
    const bottom = Math.ceil(Math.max(baseBottom, lowerExtent));
    const contentTop = Math.floor(highestHead - 52 * scale - ornamentTop);
    return { top: Math.min(top, contentTop), height: bottom - Math.min(top, contentTop) };
}

function htmlChild<K extends keyof HTMLElementTagNameMap>(parent: HTMLElement, tag: K, className?: string): HTMLElementTagNameMap[K] {
    // Tests provide a minimal DOM without Obsidian's activeDocument export.
    // eslint-disable-next-line obsidianmd/prefer-active-doc
    const element = document.createElementNS("http://www.w3.org/1999/xhtml", tag) as unknown as HTMLElementTagNameMap[K];
    if (className) {
        element.className = className;
        element.classList.add(...className.split(/\s+/));
    }
    parent.appendChild(element);
    return element;
}

function renderDiagnostics(documentModel: DrumDocument, wrapper: HTMLElement): void {
    if (documentModel.diagnostics.length === 0) return;
    const panel = htmlChild(wrapper, "div", "drum-diagnostics");
    const ordered = [...documentModel.diagnostics].sort((left, right) => left.severity === right.severity ? 0 : left.severity === "error" ? -1 : 1);
    ordered.forEach((item, index) => {
        const details = htmlChild(panel, "details", `drum-diagnostic drum-diagnostic-${item.severity}`);
        details.open = index === 0;
        const summary = htmlChild(details, "summary", "drum-diagnostic-summary");
        const context = [item.instrument, item.measure ? `measure ${item.measure}` : undefined].filter(Boolean).join(" · ");
        summary.textContent = `${item.severity === "error" ? "Error" : "Warning"} · ${item.code}${context ? ` · ${context}` : ""}`;
        const message = htmlChild(details, "div", "drum-diagnostic-message");
        message.textContent = item.message;
        const source = item.location.source === "fence-header" ? documentModel.headerText ?? "" : documentModel.sourceText;
        const sourceLine = source.split(/\r?\n/)[Math.max(0, item.location.line - 1)];
        if (sourceLine !== undefined) {
            const frame = htmlChild(details, "pre", "drum-diagnostic-frame");
            const before = sourceLine.slice(0, Math.max(0, item.location.column - 1));
            const endColumn = item.location.endColumn ?? item.location.column + 1;
            const marked = sourceLine.slice(Math.max(0, item.location.column - 1), Math.max(item.location.column, endColumn - 1));
            const prefix = htmlChild(frame, "span");
            prefix.textContent = before;
            const mark = htmlChild(frame, "mark", "drum-diagnostic-highlight");
            mark.textContent = marked || " ";
            const suffix = htmlChild(frame, "span");
            suffix.textContent = sourceLine.slice(Math.max(item.location.column, endColumn - 1));
        }
        if (item.suggestion) {
            const suggestion = htmlChild(details, "div", "drum-diagnostic-suggestion");
            suggestion.textContent = item.suggestion;
        }
        item.fixes?.forEach(fix => {
            const button = htmlChild(details, "button", "drum-diagnostic-copy");
            button.type = "button";
            button.textContent = fix.title;
            button.addEventListener("click", () => {
                const lines = documentModel.sourceText.split(/\r?\n/);
                const line = lines[fix.range.line - 1] ?? "";
                lines[fix.range.line - 1] = line.slice(0, fix.range.column - 1)
                    + fix.replacement
                    + line.slice((fix.range.endColumn ?? fix.range.column + 1) - 1);
                void navigator.clipboard.writeText(lines.join("\n")).then(() => {
                    button.textContent = "Copied";
                }).catch(() => { button.textContent = "Copy failed"; });
            });
        });
        const copyText = documentModel.sourceMode === "legacy" && item.code === "legacy-syntax"
            ? serializeCompactDocument(documentModel)
            : undefined;
        if (copyText) {
            const button = htmlChild(details, "button", "drum-diagnostic-copy");
            button.type = "button";
            button.textContent = "Copy v2 syntax";
            button.addEventListener("click", () => {
                void navigator.clipboard.writeText(copyText).then(() => {
                    button.textContent = "Copied";
                    window.setTimeout(() => { button.textContent = "Copy v2 syntax"; }, 1600);
                }).catch(() => { button.textContent = "Copy failed"; });
            });
        }
    });
}

export function renderDrumDocument(
    documentModel: DrumDocument,
    container: HTMLElement,
    options: DocumentRenderOptions = {},
): RenderedDocument {
    let currentOptions = { ...options };
    const wrapper = container.createDiv();
    wrapper.className = `drum-container drum-style-${documentModel.style}`;

    const draw = () => {
        const scale = currentOptions.scale ?? 1;
        const showLabels = documentModel.showLabels ?? currentOptions.showLabels ?? false;
        const showCount = documentModel.showCount || currentOptions.showCount === true;
        const positions = {
            ...defaultInstrumentPositions(),
            ...(currentOptions.instrumentPositions ?? {}),
            ...documentModel.positionOverrides,
        };
        wrapper.setCssProps({ "--drum-notation-scale": scale.toString() });
        wrapper.replaceChildren();
        renderDiagnostics(documentModel, wrapper);
        const availableWidth = container.clientWidth > 0 ? container.clientWidth : 720;
        const systems = buildEngravingSystems(documentModel, availableWidth, scale, showCount);
        systems.forEach(system => {
            const measures = system.measures
                .map(layout => documentModel.measures[layout.measureIndex])
                .filter((measure): measure is DrumMeasure => measure !== undefined);
            const svgWidth = system.width;
            const vertical = systemVerticalBounds(documentModel, measures, scale, positions);
            const svgHeight = vertical.height;
            const svg = createSVGElement("svg");
            svg.setAttribute("viewBox", `0 ${vertical.top} ${svgWidth} ${svgHeight}`);
            svg.setAttribute("width", svgWidth > availableWidth ? svgWidth.toString() : "100%");
            svg.setAttribute("height", svgHeight.toString());
            svg.classList.add("drum-svg", "drum-system");
            const first = system.measures[0];
            const last = system.measures[system.measures.length - 1];
            if (first && last) renderStaff(svg, first.left, last.right);
            if (system.startMeasure === 0) renderClefAndMeter(svg, 13, documentModel);
            system.measures.forEach(layout => {
                const measure = documentModel.measures[layout.measureIndex];
                if (measure) renderMeasure(svg, documentModel, measure, layout, scale, showCount, positions);
            });
            const prefix = system.prefix;
            if (showLabels && system.startMeasure === 0) {
                svgText(svg, documentModel.instruments.map(item => item.instrument).join(" · "), prefix, svgHeight - 12, "drum-instrument-legend");
            }
            wrapper.appendChild(svg);
        });
    };

    let frame = 0;
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => {
        if (frame !== 0) cancelAnimationFrame(frame);
        frame = requestAnimationFrame(draw);
    }) : undefined;
    observer?.observe(container);
    draw();
    return {
        destroy() {
            observer?.disconnect();
            if (frame !== 0) cancelAnimationFrame(frame);
            wrapper.remove();
        },
        rerender: draw,
        updateOptions(nextOptions) {
            currentOptions = { ...currentOptions, ...nextOptions };
            draw();
        },
    };
}
