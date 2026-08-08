import { DrumDocument, DrumEvent, DrumMeasure, DrumVoice, TICKS_PER_BEAT } from "../types";
import { GLYPHS } from "./smufl";
import { createSVGElement } from "./svgHelper";
import { STAFF_OFFSET } from "./staffPositions";
import { STAFF_MID_Y, STAFF_S } from "./constants";
import { renderHairpin } from "./renderHairpin";

export interface DocumentRenderOptions {
    scale?: number;
    showLabels?: boolean;
    showCount?: boolean;
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

function eventY(event: DrumEvent): number {
    return STAFF_MID_Y + (STAFF_OFFSET[event.instrument] ?? 0);
}

function glyphFor(event: DrumEvent): string {
    if (event.instrument === "CC") return GLYPHS.noteheadCircleX;
    if (event.instrument === "HH" || event.instrument === "RC") return GLYPHS.noteheadXBlack;
    if (event.instrument === "HF") return GLYPHS.noteheadPlusBlack;
    return GLYPHS.noteheadBlack;
}

function renderStaff(svg: SVGSVGElement, left: number, right: number): void {
    for (let index = -2; index <= 2; index++) {
        svgLine(svg, left, STAFF_MID_Y + index * STAFF_S, right, STAFF_MID_Y + index * STAFF_S, "drum-staff-line");
    }
}

function renderClefAndMeter(svg: SVGSVGElement, x: number, document: DrumDocument): void {
    svgLine(svg, x, STAFF_MID_Y - 15, x, STAFF_MID_Y + 15, "drum-percussion-clef");
    svgLine(svg, x + 6, STAFF_MID_Y - 15, x + 6, STAFF_MID_Y + 15, "drum-percussion-clef");
    svgText(svg, document.timeSignature.beatsPerMeasure.toString(), x + 25, STAFF_MID_Y - 3, "drum-time-signature");
    svgText(svg, document.timeSignature.beatUnit.toString(), x + 25, STAFF_MID_Y + 14, "drum-time-signature");
}

function renderNotehead(svg: SVGSVGElement, event: DrumEvent, x: number, scale: number, decorationIndex: number): void {
    const y = eventY(event);
    if (event.instrument === "CC" || event.instrument === "HF") {
        svgLine(svg, x - 9 * scale, y, x + 9 * scale, y, "drum-ledger-line");
    }
    const glyph = svgText(svg, glyphFor(event), x, y, "drum-glyph");
    glyph.setAttribute("data-instrument", event.instrument);
    if (event.articulation === "ghost") {
        glyph.classList.add("drum-glyph-ghost");
        svgText(svg, "(", x - 9 * scale, y + 3, "drum-note-ghost-paren");
        svgText(svg, ")", x + 9 * scale, y + 3, "drum-note-ghost-paren");
    }
    if (event.articulation === "open" || event.articulation === "accent-open") {
        const circle = createSVGElement("circle");
        circle.setAttribute("cx", x.toString());
        const markerY = event.voice === "upper" ? UPPER_BEAM_Y - 9 * scale : LOWER_BEAM_Y + 9 * scale;
        circle.setAttribute("cy", markerY.toString());
        circle.setAttribute("r", (3.5 * scale).toString());
        circle.classList.add("drum-open-marker");
        svg.appendChild(circle);
    }
    if (event.articulation === "accent" || event.articulation === "accent-open") {
        const openOffset = event.articulation === "accent-open" ? 8 : 0;
        const accentY = event.voice === "upper"
            ? UPPER_BEAM_Y - (9 + openOffset + decorationIndex * 7) * scale
            : LOWER_BEAM_Y + (13 + openOffset + decorationIndex * 7) * scale;
        const accent = svgText(svg, GLYPHS.articAccentAbove, x, accentY, "drum-glyph-accent");
        accent.classList.add("drum-glyph");
        accent.setAttribute("data-instrument", event.instrument);
        if (event.voice === "lower") accent.setAttribute("transform", `rotate(180 ${x} ${accentY})`);
    }
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

function renderFlag(svg: SVGSVGElement, chord: Chord, stemEnd: number, scale: number): void {
    if (chord.duration > 6) return;
    const direction = chord.voice === "upper" ? 1 : -1;
    svgLine(svg, chord.x, stemEnd, chord.x + 9 * scale, stemEnd + direction * 5 * scale, "drum-flag");
    if (chord.duration <= 3) {
        svgLine(svg, chord.x, stemEnd + direction * 5 * scale, chord.x + 9 * scale, stemEnd + direction * 10 * scale, "drum-flag");
    }
}

function renderVoice(svg: SVGSVGElement, measure: DrumMeasure, voice: DrumVoice, left: number, width: number, scale: number): void {
    const chords = buildMeasureChords(measure, voice, left, width);
    const beamed = new Set<Chord>();
    const beamY = voice === "upper" ? UPPER_BEAM_Y : LOWER_BEAM_Y;
    for (let beat = 0; beat < measure.beats; beat++) {
        const group = chords.filter(chord => chord.tick >= beat * TICKS_PER_BEAT
            && chord.tick < (beat + 1) * TICKS_PER_BEAT
            && chord.duration <= 6);
        if (group.length < 2) continue;
        const first = group[0];
        const last = group[group.length - 1];
        if (!first || !last) continue;
        svgLine(svg, first.x, beamY, last.x, beamY, "drum-beam");
        const sixteenths = group.filter(chord => chord.duration <= 3);
        for (let index = 0; index < sixteenths.length - 1; index++) {
            const current = sixteenths[index];
            const next = sixteenths[index + 1];
            if (!current || !next || next.tick - current.tick > 3) continue;
            const secondaryY = beamY + (voice === "upper" ? 5 : -5) * scale;
            svgLine(svg, current.x, secondaryY, next.x, secondaryY, "drum-beam");
        }
        group.forEach(chord => beamed.add(chord));
    }

    chords.forEach(chord => {
        chord.events.forEach((event, index) => {
            renderNotehead(svg, event, chord.x, scale, index);
            if (event.tied) {
                const durationY = eventY(event) + (voice === "upper" ? -7 : 7) * scale;
                const endX = Math.min(left + width - 6, chord.x + event.durationTicks / (measure.beats * TICKS_PER_BEAT) * width);
                svgLine(svg, chord.x + 4, durationY, endX, durationY, "drum-duration");
            }
        });
        if (chord.events.every(event => event.instrument === "HF")) return;
        const ys = chord.events.map(eventY);
        const stemStart = voice === "upper" ? Math.max(...ys) - 4 * scale : Math.min(...ys) + 4 * scale;
        const isolatedEnd = voice === "upper" ? Math.min(...ys) - 28 * scale : Math.max(...ys) + 28 * scale;
        const stemEnd = beamed.has(chord) ? beamY : isolatedEnd;
        svgLine(svg, chord.x, stemStart, chord.x, stemEnd, "drum-note");
        if (!beamed.has(chord)) renderFlag(svg, chord, stemEnd, scale);
    });
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
    left: number,
    width: number,
    scale: number,
    showCount: boolean,
): void {
    const right = left + width;
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
    renderVoice(svg, measure, "upper", left, width, scale);
    renderVoice(svg, measure, "lower", left, width, scale);
    if (showCount) {
        const labels = countLabels(measure.subdivisionsPerBeat);
        for (let beat = 0; beat < measure.beats; beat++) {
            labels.forEach((label, offset) => {
                const tick = beat * TICKS_PER_BEAT + offset * (TICKS_PER_BEAT / measure.subdivisionsPerBeat);
                const x = left + 12 + tick / (measure.beats * TICKS_PER_BEAT) * (width - 24);
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

function measuresPerSystem(width: number): number {
    if (width < 520) return 1;
    if (width < 820) return 2;
    if (width < 1100) return 3;
    return 4;
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
        wrapper.setCssProps({ "--drum-notation-scale": scale.toString() });
        wrapper.replaceChildren();
        if (documentModel.diagnostics.length > 0) {
            const diagnostics = wrapper.createDiv();
            diagnostics.className = "drum-diagnostics";
            documentModel.diagnostics.forEach(item => {
                const row = diagnostics.createDiv();
                row.className = `drum-diagnostic drum-diagnostic-${item.severity}`;
                row.textContent = `${item.severity === "error" ? "Error" : "Warning"} L${item.location.line}: ${item.message}`;
            });
        }
        const availableWidth = Math.max(320, container.clientWidth || 720);
        const perSystem = measuresPerSystem(availableWidth);
        for (let start = 0; start < documentModel.measures.length; start += perSystem) {
            const measures = documentModel.measures.slice(start, start + perSystem);
            const prefix = start === 0 ? 70 : 28;
            const measureWidth = Math.max(190, Math.min(310, (availableWidth - prefix - 20) / measures.length));
            const svgWidth = prefix + measureWidth * measures.length + 14;
            const svgHeight = Math.ceil((documentModel.style === "compact" ? 148 : documentModel.style === "practice" ? 190 : 170) * Math.max(1, scale));
            const svg = createSVGElement("svg");
            svg.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);
            svg.setAttribute("width", "100%");
            svg.setAttribute("height", svgHeight.toString());
            svg.classList.add("drum-svg", "drum-system");
            renderStaff(svg, prefix, prefix + measures.length * measureWidth);
            if (start === 0) renderClefAndMeter(svg, 13, documentModel);
            measures.forEach((measure, index) => renderMeasure(svg, documentModel, measure, prefix + index * measureWidth, measureWidth, scale, showCount));
            if (showLabels && start === 0) {
                svgText(svg, documentModel.instruments.map(item => item.instrument).join(" · "), prefix, svgHeight - 12, "drum-instrument-legend");
            }
            wrapper.appendChild(svg);
        }
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
