import { buildTimeSignature, parseDrumNotation } from "../parser";
import {
    Articulation,
    DrumDiagnostic,
    DrumDocument,
    DrumEvent,
    DrumMeasure,
    DrumVoice,
    InstrumentVoice,
    NotationStyle,
    TICKS_PER_BEAT,
    TimeSignature,
} from "../types";

const INSTRUMENTS = new Set(["CC", "HH", "RC", "HT", "MT", "SD", "FT", "BD", "HF"]);
const LOWER_VOICE = new Set(["FT", "BD", "HF"]);
const HEADER = /^(?:time|timesig|timesignature|meter|ts|beatsperbar|beats-per-bar|beats|bpb|subdivisions|subdivision|subdiv|grid|resolution|feel|swing|style|count|labels)\b/i;
const PRESETS: Record<string, number[]> = {
    quarters: [0],
    eighths: [0, 6],
    sixteenths: [0, 3, 6, 9],
    triplets: [0, 4, 8],
};

interface ParsedLane {
    instrument: string;
    voice: DrumVoice;
    measures: DrumEvent[][];
    subdivisions: number[];
    line: number;
}

function diagnostic(
    diagnostics: DrumDiagnostic[],
    severity: "warning" | "error",
    code: string,
    message: string,
    line: number,
    column = 1,
    instrument?: string,
    measure?: number,
): void {
    diagnostics.push({ severity, code, message, location: { line, column }, instrument, measure });
}

function boolDirective(source: string, key: string): boolean | undefined {
    const match = source.match(new RegExp(`^\\s*${key}\\s*(?::|=|\\s)\\s*(true|false|yes|no|on|off)\\s*$`, "im"));
    if (!match?.[1]) return undefined;
    return /^(true|yes|on)$/i.test(match[1]);
}

function styleDirective(source: string): NotationStyle {
    const value = source.match(/^\s*style\s*(?::|=|\s)\s*(standard|compact|practice)\s*$/im)?.[1];
    return (value?.toLowerCase() as NotationStyle | undefined) ?? "standard";
}

function voiceFor(instrument: string): DrumVoice {
    return LOWER_VOICE.has(instrument) ? "lower" : "upper";
}

function articulationFor(instrument: string, token: string): { symbol: string; articulation: Articulation } | undefined {
    if (token === "." || token === "-") return undefined;
    if (token === "~") return { symbol: "~", articulation: "normal" };
    if (/^\([xo]\)$/i.test(token)) return { symbol: token[1]?.toLowerCase() ?? "o", articulation: "ghost" };
    if (/^>[xo]$/i.test(token)) {
        const symbol = token[1]?.toLowerCase() ?? "o";
        return { symbol, articulation: instrument === "HH" && symbol === "o" ? "accent-open" : "accent" };
    }
    if (/^[xo]\^$/i.test(token)) {
        const symbol = token[0]?.toLowerCase() ?? "o";
        return { symbol, articulation: instrument === "HH" && symbol === "o" ? "accent-open" : "accent" };
    }
    if (/^[xo]$/i.test(token)) {
        const symbol = token.toLowerCase();
        return { symbol, articulation: instrument === "HH" && symbol === "o" ? "open" : "normal" };
    }
    return undefined;
}

function tokenizeCompact(pattern: string): string[] | undefined {
    const tokens: string[] = [];
    for (let index = 0; index < pattern.length;) {
        const rest = pattern.slice(index);
        const composite = rest.match(/^(\([xo]\)|>[xo]|[xo]\^)/i)?.[1];
        if (composite) {
            tokens.push(composite);
            index += composite.length;
            continue;
        }
        const char = pattern[index];
        if (char && /[xo.~-]/i.test(char)) {
            tokens.push(char);
            index++;
            continue;
        }
        return undefined;
    }
    return tokens;
}

function parseGridLane(
    lineText: string,
    lineNumber: number,
    subdivisions: number,
    beats: number,
    explicitGrid: boolean,
    collapseLegacySpacing: boolean,
    diagnostics: DrumDiagnostic[],
): ParsedLane | undefined {
    const firstPipe = lineText.indexOf("|");
    if (firstPipe < 0) return undefined;
    const instrument = lineText.slice(0, firstPipe).trim().toUpperCase();
    if (!instrument) return undefined;
    if (!INSTRUMENTS.has(instrument)) {
        diagnostic(diagnostics, "error", "unknown-instrument", `Unknown instrument "${instrument}".`, lineNumber, 1, instrument);
        return undefined;
    }
    const rawMeasures = lineText.slice(firstPipe + 1).split("|");
    if (rawMeasures[rawMeasures.length - 1]?.trim() === "") rawMeasures.pop();
    const lane: ParsedLane = { instrument, voice: voiceFor(instrument), measures: [], subdivisions: [], line: lineNumber };

    rawMeasures.forEach((raw, measureIndex) => {
        const trimmed = raw.trim();
        let tokens: string[];
        const tokenMode = /\s/.test(trimmed);
        if (tokenMode) {
            tokens = trimmed.split(/\s+/).filter(Boolean);
        } else {
            const compact = tokenizeCompact(trimmed);
            if (!compact) {
                diagnostic(diagnostics, "error", "invalid-grid-token", `Invalid token in ${instrument}, measure ${measureIndex + 1}.`, lineNumber, firstPipe + 2, instrument, measureIndex + 1);
                lane.measures.push([]);
                lane.subdivisions.push(subdivisions);
                return;
            }
            tokens = compact;
        }

        if (!explicitGrid && collapseLegacySpacing && !tokenMode) {
            const collapsed: string[] = [];
            for (let i = 0; i < tokens.length; i += 2) {
                const pair = tokens.slice(i, i + 2);
                collapsed.push(pair.find(token => token !== "-") ?? "-");
            }
            tokens = collapsed;
        }

        const expected = beats * subdivisions;
        const measureEvents: DrumEvent[] = [];
        let lastEvent: DrumEvent | undefined;
        tokens.forEach((token, cell) => {
            if (token === "~") {
                if (lastEvent && lastEvent.tick + lastEvent.durationTicks === cell * (TICKS_PER_BEAT / subdivisions)) {
                    lastEvent.durationTicks += TICKS_PER_BEAT / subdivisions;
                    lastEvent.tied = true;
                } else {
                    diagnostic(diagnostics, "warning", "orphan-tie", `Tie without a preceding note in ${instrument}, measure ${measureIndex + 1}.`, lineNumber, firstPipe + 2, instrument, measureIndex + 1);
                }
                return;
            }
            const parsed = articulationFor(instrument, token);
            if (!parsed) {
                if (token !== "." && token !== "-") {
                    diagnostic(diagnostics, "error", "invalid-grid-token", `Unknown token "${token}" in ${instrument}.`, lineNumber, firstPipe + 2, instrument, measureIndex + 1);
                }
                return;
            }
            const event: DrumEvent = {
                instrument,
                voice: lane.voice,
                measure: measureIndex,
                tick: cell * (TICKS_PER_BEAT / subdivisions),
                durationTicks: TICKS_PER_BEAT / subdivisions,
                symbol: parsed.symbol,
                articulation: parsed.articulation,
                source: { line: lineNumber, column: firstPipe + 2 },
            };
            measureEvents.push(event);
            lastEvent = event;
        });
        if (tokens.length !== expected) {
            diagnostic(
                diagnostics,
                tokens.length > expected ? "error" : "warning",
                "measure-length",
                `${instrument}, measure ${measureIndex + 1}: expected ${expected} cells, found ${tokens.length}.`,
                lineNumber,
                firstPipe + 2,
                instrument,
                measureIndex + 1,
            );
        }
        lane.measures.push(measureEvents.filter(event => event.tick < beats * TICKS_PER_BEAT));
        lane.subdivisions.push(subdivisions);
    });
    return lane;
}

function positionTick(value: string, timeSignature: TimeSignature): number | undefined {
    const match = value.trim().match(/^(\d+)(e|&|a)?$/i);
    if (!match?.[1]) return undefined;
    const beat = Number.parseInt(match[1], 10);
    if (beat < 1 || beat > timeSignature.beatsPerBar) return undefined;
    const suffix = match[2]?.toLowerCase();
    const compound = timeSignature.meterType === "compound";
    const offset = suffix === "e" ? 3 : suffix === "&" ? (compound ? 4 : 6) : suffix === "a" ? (compound ? 8 : 9) : 0;
    return (beat - 1) * TICKS_PER_BEAT + offset;
}

function parsePositionLane(
    lineText: string,
    lineNumber: number,
    timeSignature: TimeSignature,
    diagnostics: DrumDiagnostic[],
): ParsedLane | undefined {
    const match = lineText.match(/^\s*([a-z]+)\s*:\s*(.+)$/i);
    if (!match?.[1] || !match[2]) return undefined;
    const instrument = match[1].toUpperCase();
    if (!INSTRUMENTS.has(instrument)) {
        diagnostic(diagnostics, "error", "unknown-instrument", `Unknown instrument "${instrument}".`, lineNumber, 1, instrument);
        return undefined;
    }
    const lane: ParsedLane = { instrument, voice: voiceFor(instrument), measures: [], subdivisions: [], line: lineNumber };
    const ensureMeasure = (index: number) => {
        while (lane.measures.length <= index) {
            lane.measures.push([]);
            lane.subdivisions.push(timeSignature.meterType === "compound" ? 3 : 1);
        }
    };

    const measureExpressions = match[2].split("|");
    measureExpressions.forEach((measureExpression, measureIndex) => {
        ensureMeasure(measureIndex);
        const clauses = measureExpression.split(";").map(value => value.trim()).filter(Boolean);
        clauses.forEach(clause => {
            const modifier = clause.match(/^(open|accent|ghost|normal)\s*:\s*(.*)$/i);
            const articulationName = modifier?.[1]?.toLowerCase();
            const body = modifier?.[2] ?? clause;
            const values = body.split(",").map(value => value.trim()).filter(Boolean);
            values.forEach(value => {
                const preset = PRESETS[value.toLowerCase()];
                const ticks = preset
                    ? Array.from({ length: timeSignature.beatsPerBar }, (_, beat) => preset.map(offset => beat * TICKS_PER_BEAT + offset)).flat()
                    : [positionTick(value, timeSignature)];
                if (ticks.some(tick => tick === undefined)) {
                    diagnostic(diagnostics, "error", "invalid-position", `Invalid position "${value}" in ${instrument}.`, lineNumber, lineText.indexOf(value) + 1, instrument, measureIndex + 1);
                    return;
                }
                const subdivision = preset === PRESETS.triplets || (timeSignature.meterType === "compound" && /[&a]$/i.test(value))
                    ? 3
                    : preset === PRESETS.sixteenths || /[ea]$/i.test(value)
                        ? 4
                        : preset === PRESETS.eighths || /&$/i.test(value)
                            ? 2
                            : 1;
                lane.subdivisions[measureIndex] = Math.max(lane.subdivisions[measureIndex] ?? 1, subdivision);
                ticks.forEach(tick => {
                    if (tick === undefined) return;
                    let articulation: Articulation = "normal";
                    if (articulationName === "ghost") articulation = "ghost";
                    if (articulationName === "accent") articulation = "accent";
                    if (articulationName === "open") articulation = instrument === "HH" ? "open" : "normal";
                    const existing = lane.measures[measureIndex]?.find(event => event.tick === tick);
                    if (existing) {
                        if (articulationName === "open" && existing.articulation === "accent") {
                            existing.articulation = "accent-open";
                        } else if (articulationName === "accent" && existing.articulation === "open") {
                            existing.articulation = "accent-open";
                        } else if (articulationName !== undefined) {
                            existing.articulation = articulation;
                        }
                        return;
                    }
                    lane.measures[measureIndex]?.push({
                        instrument,
                        voice: lane.voice,
                        measure: measureIndex,
                        tick,
                        durationTicks: TICKS_PER_BEAT / subdivision,
                        symbol: instrument === "HH" || instrument === "RC" || instrument === "CC" ? "x" : "o",
                        articulation,
                        source: { line: lineNumber, column: lineText.indexOf(value) + 1 },
                    });
                });
            });
        });
    });
    return lane;
}

function shouldCollapseLegacy(lines: string[], beats: number): boolean {
    const compactPatterns = lines
        .filter(line => line.includes("|"))
        .map(line => line.slice(line.indexOf("|") + 1).replace(/\|/g, "").replace(/\s+/g, ""));
    if (compactPatterns.length === 0 || !compactPatterns.every(pattern => pattern.length === beats * 4)) return false;
    return compactPatterns.every(pattern => {
        const tokens = tokenizeCompact(pattern);
        return tokens !== undefined && tokens.every((token, index) => index % 2 === 0 || token === "-");
    });
}

export function parseDrumDocument(source: string, headerLine?: string, defaultBeatsPerBar = 4): DrumDocument {
    const legacyMeta = parseDrumNotation(source, headerLine);
    const timeSignature = legacyMeta.timeSignature ?? buildTimeSignature(legacyMeta.beatsPerBar ?? defaultBeatsPerBar, 4);
    const diagnostics: DrumDiagnostic[] = [];
    (legacyMeta.warnings ?? []).filter((warning, index, all) => all.indexOf(warning) === index).forEach(warning =>
        diagnostic(diagnostics, "warning", "header", warning, 1));
    const lines = source.split(/\r?\n/);
    const contentLines = lines.filter(line => line.trim() && !HEADER.test(line.trim()) && !/^hairpin\s*\|/i.test(line.trim()));
    const positionMode = contentLines.some(line => /^\s*[a-z]+\s*:/i.test(line));
    const explicitGrid = legacyMeta.subdivisionsPerBeat !== undefined || /^\s*(?:grid|subdiv)/im.test(source) || /\b(?:grid|subdiv)\b/i.test(headerLine ?? "");
    const collapseLegacy = !positionMode && !explicitGrid && shouldCollapseLegacy(contentLines, timeSignature.beatsPerBar);
    const rawSubdivisions = legacyMeta.subdivisionsPerBeat;
    const normalizedSubdivisions = rawSubdivisions === 16 ? 4 : rawSubdivisions === 8 ? 2 : rawSubdivisions;
    const subdivisions = explicitGrid
        ? normalizedSubdivisions ?? 4
        : collapseLegacy
            ? 2
            : timeSignature.meterType === "compound" ? 3 : 4;
    const lanes: ParsedLane[] = [];

    lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (!trimmed || HEADER.test(trimmed) || /^hairpin\s*\|/i.test(trimmed)) return;
        const lane = positionMode
            ? parsePositionLane(line, index + 1, timeSignature, diagnostics)
            : parseGridLane(line, index + 1, subdivisions, timeSignature.beatsPerBar, explicitGrid, collapseLegacy, diagnostics);
        if (lane) lanes.push(lane);
    });

    const measureCount = Math.max(1, ...lanes.map(lane => lane.measures.length));
    lanes.forEach(lane => {
        if (lane.measures.length !== measureCount) {
            diagnostic(diagnostics, "warning", "voice-measure-count", `${lane.instrument}: expected ${measureCount} measures, found ${lane.measures.length}.`, lane.line, 1, lane.instrument);
        }
    });
    const measures: DrumMeasure[] = Array.from({ length: measureCount }, (_, index) => {
        const events = lanes.flatMap(lane => lane.measures[index] ?? []).sort((a, b) => a.tick - b.tick);
        const measureDiagnostics = diagnostics.filter(item => item.measure === index + 1
            && (item.severity === "error" || item.code === "measure-length"));
        return {
            index,
            events,
            ticksPerBeat: TICKS_PER_BEAT,
            beats: timeSignature.beatsPerBar,
            subdivisionsPerBeat: Math.max(timeSignature.meterType === "compound" ? 3 : 1, ...lanes.map(lane => lane.subdivisions[index] ?? 1)),
            valid: measureDiagnostics.length === 0,
        };
    });
    const instruments: InstrumentVoice[] = lanes.map(lane => ({
        instrument: lane.instrument,
        voice: lane.voice,
        events: lane.measures.flat(),
    }));
    const compactLegacy = contentLines.every(line => {
        const pipe = line.indexOf("|");
        return pipe >= 0 && !/\s/.test(line.slice(pipe + 1).trim());
    });
    const sourceMode = positionMode ? "positions" : collapseLegacy || !explicitGrid && compactLegacy ? "legacy" : "grid";
    if (sourceMode === "legacy") {
        diagnostic(diagnostics, "warning", "legacy-syntax", "Legacy compact syntax was interpreted automatically. Prefer token grid or position syntax for unambiguous notation.", 1);
    }
    const directiveSource = `${headerLine ?? ""}\n${source}`;
    const style = styleDirective(directiveSource);
    return {
        version: 2,
        sourceMode,
        timeSignature,
        measures,
        instruments,
        diagnostics,
        feel: legacyMeta.feel,
        style,
        showCount: boolDirective(directiveSource, "count") ?? style === "practice",
        showLabels: boolDirective(directiveSource, "labels"),
        legacySuggestion: sourceMode === "legacy" ? "Add `grid: 8`/`grid: 16`, or migrate to position syntax." : undefined,
        hairpinPattern: legacyMeta.hairpinPattern,
    };
}
