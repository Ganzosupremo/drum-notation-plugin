import { buildTimeSignature, parseDirectives } from "./directives";
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
import { rhythmDiagnostics } from "./rhythm";
import {
    defaultInstrumentPositions,
    closestInstrument,
    DrumOrnament,
    DrumTechnique,
    instrumentVoice,
    normalizeInstrument,
    supportsTechnique,
} from "./instruments";

const HEADER = /^(?:time|timesig|timesignature|meter|ts|beatsperbar|beats-per-bar|beats|bpb|subdivisions|subdivision|subdiv|grid|resolution|feel|swing|style|count|labels|grouping|positions)\b/i;
const QUARTERS = [0];
const EIGHTHS = [0, 6];
const SIXTEENTHS = [0, 3, 6, 9];
const TRIPLETS = [0, 4, 8];
const PRESETS: Record<string, number[]> = {
    quarters: QUARTERS, "4ths": QUARTERS,
    eighths: EIGHTHS, "8ths": EIGHTHS,
    sixteenths: SIXTEENTHS, "16ths": SIXTEENTHS,
    triplets: TRIPLETS, tri: TRIPLETS,
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
    length = 1,
    suggestion?: string,
    fixes?: DrumDiagnostic["fixes"],
): void {
    diagnostics.push({
        severity,
        code,
        message,
        location: { line, column, endLine: line, endColumn: column + Math.max(1, length), source: "body" },
        instrument,
        measure,
        suggestion,
        fixes,
    });
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

function defaultGrouping(timeSignature: TimeSignature): number[] {
    if (timeSignature.meterType === "compound") return Array.from({ length: timeSignature.beatsPerMeasure / 3 }, () => 3);
    if (timeSignature.beatsPerMeasure === 5) return [3, 2];
    return Array.from({ length: timeSignature.beatsPerMeasure }, () => 1);
}

function groupingDirective(source: string, timeSignature: TimeSignature, diagnostics: DrumDiagnostic[]): number[] {
    const match = source.match(/^\s*grouping\s*(?::|=|\s)\s*([^\r\n]+)$/im);
    if (!match?.[1]) return defaultGrouping(timeSignature);
    const raw = match[1].trim();
    if (!/^\d+(?:\s*\+\s*\d+)*$/.test(raw)) {
        diagnostic(diagnostics, "error", "invalid-grouping", `Invalid grouping "${raw}". Use values such as 3+2.`, 1);
        return defaultGrouping(timeSignature);
    }
    const grouping = raw.split("+").map(value => Number.parseInt(value.trim(), 10));
    const total = grouping.reduce((sum, value) => sum + value, 0);
    if (grouping.some(value => value <= 0) || total !== timeSignature.beatsPerMeasure) {
        diagnostic(diagnostics, "error", "invalid-grouping", `Grouping "${raw}" must add up to ${timeSignature.beatsPerMeasure}.`, 1);
        return defaultGrouping(timeSignature);
    }
    return grouping;
}

function positionsDirective(source: string, diagnostics: DrumDiagnostic[]): Record<string, number> {
    const positions: Record<string, number> = {};
    const match = source.match(/^\s*positions\s*(?::|=|\s)\s*([^\r\n]+)$/im);
    if (!match?.[1]) return positions;
    const contentOffset = (match.index ?? 0) + match[0].indexOf(match[1]);
    let searchOffset = contentOffset;
    match[1].split(",").map(part => part.trim()).filter(Boolean).forEach(part => {
        const partOffset = source.indexOf(part, searchOffset);
        searchOffset = Math.max(searchOffset, partOffset + part.length);
        const prefix = source.slice(0, Math.max(0, partOffset));
        const line = prefix.split(/\r?\n/).length;
        const lastBreak = Math.max(prefix.lastIndexOf("\n"), prefix.lastIndexOf("\r"));
        const column = Math.max(1, partOffset - lastBreak);
        const assignment = part.match(/^([a-z][a-z0-9-]*)\s*=\s*(-?\d+)$/i);
        const instrument = assignment?.[1] ? normalizeInstrument(assignment[1]) : undefined;
        const step = assignment?.[2] ? Number.parseInt(assignment[2], 10) : Number.NaN;
        if (!assignment || !instrument || !Number.isInteger(step) || step < -10 || step > 10) {
            diagnostic(diagnostics, "error", "invalid-staff-position", `Invalid staff position "${part}". Use INSTRUMENT=-10…10.`, line, column, instrument, undefined, part.length);
            return;
        }
        positions[instrument] = step;
    });
    return positions;
}

function normalizeBareMeter(source: string): string {
    return source.replace(/^\s*(\d+\s*\/\s*\d+)\s*$/gm, "meter: $1");
}

function addSourceOffsets(location: DrumEvent["source"], source: string): void {
    const starts = [0];
    for (const match of source.matchAll(/\r?\n/g)) starts.push((match.index ?? 0) + match[0].length);
    const start = (starts[Math.max(0, location.line - 1)] ?? 0) + Math.max(0, location.column - 1);
    const endLine = location.endLine ?? location.line;
    const end = (starts[Math.max(0, endLine - 1)] ?? start) + Math.max(0, (location.endColumn ?? location.column + 1) - 1);
    location.startOffset = start;
    location.endOffset = Math.max(start + 1, end);
    location.endLine = endLine;
    location.endColumn ??= location.column + 1;
    location.source ??= "body";
}

interface ParsedAttack {
    symbol: string;
    articulation: Articulation;
    technique?: DrumTechnique;
    ornament?: DrumOrnament;
}

function articulationFor(instrument: string, token: string): ParsedAttack | undefined {
    if (token === "." || token === "-") return undefined;
    if (token === "~") return { symbol: "~", articulation: "normal" };
    let body = token;
    let accent = false;
    let ghost = false;
    if (body.startsWith(">")) {
        accent = true;
        body = body.slice(1);
    }
    const ghostMatch = body.match(/^\((.+)\)$/);
    if (ghostMatch?.[1]) {
        ghost = true;
        body = ghostMatch[1];
    }
    const special: Record<string, Pick<ParsedAttack, "technique" | "ornament">> = {
        cs: { technique: "cross-stick" },
        rs: { technique: "rimshot" },
        b: { technique: "bell" },
        f: { ornament: "flam" },
        d: { ornament: "drag" },
        rr: { ornament: "roll" },
    };
    const feature = special[body.toLowerCase()];
    if (feature) return { symbol: "o", articulation: ghost ? "ghost" : accent ? "accent" : "normal", ...feature };
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
    diagnostics: DrumDiagnostic[],
): ParsedLane | undefined {
    const firstPipe = lineText.indexOf("|");
    if (firstPipe < 0) return undefined;
    const rawInstrument = lineText.slice(0, firstPipe).trim();
    if (!rawInstrument) return undefined;
    const instrument = normalizeInstrument(rawInstrument);
    if (!instrument) {
        const closest = closestInstrument(rawInstrument);
        const range = { line: lineNumber, column: 1, endLine: lineNumber, endColumn: rawInstrument.length + 1, source: "body" as const };
        diagnostic(diagnostics, "error", "unknown-instrument", `Unknown instrument "${rawInstrument.toUpperCase()}".`, lineNumber, 1, rawInstrument.toUpperCase(), undefined, rawInstrument.length, closest ? `Did you mean ${closest}?` : undefined, closest ? [{ title: "Copy corrected block", replacement: closest, range, applicability: "safe" }] : undefined);
        return undefined;
    }
    const rawMeasures = lineText.slice(firstPipe + 1).split("|");
    if (rawMeasures[rawMeasures.length - 1]?.trim() === "") rawMeasures.pop();
    const lane: ParsedLane = { instrument, voice: instrumentVoice(instrument), measures: [], subdivisions: [], line: lineNumber };
    let tokenSearchCursor = firstPipe + 1;

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

        const tokenColumns = tokens.map(token => {
            const found = lineText.indexOf(token, tokenSearchCursor);
            if (found < 0) return firstPipe + 2;
            tokenSearchCursor = found + token.length;
            return found + 1;
        });

        const expected = beats * subdivisions;
        const measureEvents: DrumEvent[] = [];
        let lastEvent: DrumEvent | undefined;
        tokens.forEach((token, cell) => {
            const tokenColumn = tokenColumns[cell] ?? firstPipe + 2;
            if (token === "~") {
                if (lastEvent && lastEvent.tick + lastEvent.durationTicks === cell * (TICKS_PER_BEAT / subdivisions)) {
                    lastEvent.durationTicks += TICKS_PER_BEAT / subdivisions;
                    lastEvent.tied = true;
                } else {
                    diagnostic(diagnostics, "warning", "orphan-tie", `Tie without a preceding note in ${instrument}, measure ${measureIndex + 1}.`, lineNumber, tokenColumn, instrument, measureIndex + 1, token.length);
                }
                return;
            }
            const parsed = articulationFor(instrument, token);
            if (!parsed) {
                if (token !== "." && token !== "-") {
                    diagnostic(diagnostics, "error", "invalid-grid-token", `Unknown token "${token}" in ${instrument}.`, lineNumber, tokenColumn, instrument, measureIndex + 1, token.length);
                }
                return;
            }
            if (parsed.technique && !supportsTechnique(instrument, parsed.technique)) {
                diagnostic(diagnostics, "error", "unsupported-technique", `${instrument} does not support ${parsed.technique}.`, lineNumber, tokenColumn, instrument, measureIndex + 1, token.length);
                return;
            }
            if (parsed.technique === "rimshot" && parsed.articulation === "ghost") {
                diagnostic(diagnostics, "error", "conflicting-articulation", "Ghost and rimshot cannot coexist.", lineNumber, tokenColumn, instrument, measureIndex + 1, token.length);
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
                technique: parsed.technique,
                ornament: parsed.ornament,
                source: { line: lineNumber, column: tokenColumn, endLine: lineNumber, endColumn: tokenColumn + token.length, source: "body" },
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
    const match = lineText.match(/^\s*([a-z][a-z0-9]*)\s*:\s*(.+)$/i);
    if (!match?.[1] || !match[2]) return undefined;
    const instrument = normalizeInstrument(match[1]);
    if (!instrument) {
        const closest = closestInstrument(match[1]);
        const range = { line: lineNumber, column: 1, endLine: lineNumber, endColumn: match[1].length + 1, source: "body" as const };
        diagnostic(diagnostics, "error", "unknown-instrument", `Unknown instrument "${match[1].toUpperCase()}".`, lineNumber, 1, match[1].toUpperCase(), undefined, match[1].length, closest ? `Did you mean ${closest}?` : undefined, closest ? [{ title: "Copy corrected block", replacement: closest, range, applicability: "safe" }] : undefined);
        return undefined;
    }
    const lane: ParsedLane = { instrument, voice: instrumentVoice(instrument), measures: [], subdivisions: [], line: lineNumber };
    const measureExpressions = match[2].split("|");
    let positionTokenCursor = lineText.indexOf(":") + 1;
    measureExpressions.forEach(rawExpression => {
        let measureExpression = rawExpression.trim();
        let copies = 1;
        const repeatSuffix = measureExpression.match(/\bx([^\s]+)\s*$/i);
        if (repeatSuffix?.[1]) {
            const parsed = /^\d+$/.test(repeatSuffix[1]) ? Number.parseInt(repeatSuffix[1], 10) : 0;
            if (parsed < 1 || parsed > 64) {
                diagnostic(diagnostics, "error", "invalid-repeat", `Repeat "x${repeatSuffix[1]}" must be between x1 and x64.`, lineNumber, lineText.lastIndexOf(repeatSuffix[0]) + 1, instrument, lane.measures.length + 1);
            } else {
                copies = parsed;
            }
            measureExpression = measureExpression.slice(0, repeatSuffix.index).trim();
        }

        if (measureExpression === "%") {
            const previous = lane.measures[lane.measures.length - 1];
            const previousSubdivision = lane.subdivisions[lane.subdivisions.length - 1] ?? (timeSignature.meterType === "compound" ? 3 : 1);
            if (!previous) {
                diagnostic(diagnostics, "error", "repeat-without-source", `${instrument}: % requires a previous measure.`, lineNumber, lineText.indexOf("%") + 1, instrument, 1);
                lane.measures.push([]);
                lane.subdivisions.push(previousSubdivision);
                return;
            }
            for (let copy = 0; copy < copies; copy++) {
                const measureIndex = lane.measures.length;
                lane.measures.push(previous.map(event => ({ ...event, measure: measureIndex, source: { ...event.source } })));
                lane.subdivisions.push(previousSubdivision);
            }
            return;
        }

        const measureIndex = lane.measures.length;
        const events: DrumEvent[] = [];
        let measureSubdivision = timeSignature.meterType === "compound" ? 3 : 1;
        const clauses = measureExpression.split(";").map(value => value.trim()).filter(Boolean);
        clauses.forEach(clause => {
            const modifier = clause.match(/^(open|accent|ghost|normal|cross-stick|rimshot|bell|flam|drag|roll)\s*:\s*(.*)$/i);
            const modifierName = modifier?.[1]?.toLowerCase();
            const forcedArticulation = /^(open|accent|ghost|normal)$/.test(modifierName ?? "")
                ? modifierName as "open" | "accent" | "ghost" | "normal"
                : undefined;
            const forcedTechnique = ({ "cross-stick": "cross-stick", rimshot: "rimshot", bell: "bell" } as Record<string, DrumTechnique>)[modifierName ?? ""];
            const forcedOrnament = ({ flam: "flam", drag: "drag", roll: "roll" } as Record<string, DrumOrnament>)[modifierName ?? ""];
            const body = modifier?.[2] ?? clause;
            const values = body.match(/\([^)]+\)|[^,\s]+/g) ?? [];
            values.forEach(token => {
                const tokenIndex = lineText.indexOf(token, positionTokenCursor);
                const tokenColumn = (tokenIndex >= 0 ? tokenIndex : lineText.indexOf(token)) + 1;
                positionTokenCursor = Math.max(positionTokenCursor, tokenIndex + token.length);
                let value = token;
                let articulationName: Articulation | undefined = forcedArticulation;
                let technique = forcedTechnique;
                let ornament = forcedOrnament;
                const ghost = token.match(/^\((\d+(?:e|&|a)?)\)$/i);
                const accentOpen = token.match(/^>o(\d+(?:e|&|a)?)$/i);
                const accent = token.match(/^>(\d+(?:e|&|a)?)$/i);
                const open = token.match(/^o(\d+(?:e|&|a)?)$/i);
                const feature = token.match(/^(cs|rs|b|f|d|rr)(\d+(?:e|&|a)?)$/i);
                if (ghost?.[1]) {
                    value = ghost[1];
                    articulationName = "ghost";
                } else if (accentOpen?.[1]) {
                    value = accentOpen[1];
                    articulationName = "accent-open";
                } else if (accent?.[1]) {
                    value = accent[1];
                    articulationName = "accent";
                } else if (open?.[1]) {
                    value = open[1];
                    articulationName = "open";
                } else if (feature?.[1] && feature[2]) {
                    value = feature[2];
                    const featureName = feature[1].toLowerCase();
                    technique = ({ cs: "cross-stick", rs: "rimshot", b: "bell" } as Record<string, DrumTechnique>)[featureName];
                    ornament = ({ f: "flam", d: "drag", rr: "roll" } as Record<string, DrumOrnament>)[featureName];
                }
                if ((articulationName === "open" || articulationName === "accent-open") && instrument !== "HH") {
                    diagnostic(diagnostics, "error", "unsupported-articulation", `${instrument} does not support open notation.`, lineNumber, tokenColumn, instrument, measureIndex + 1, token.length);
                    return;
                }
                if (technique && !supportsTechnique(instrument, technique)) {
                    diagnostic(diagnostics, "error", "unsupported-technique", `${instrument} does not support ${technique}.`, lineNumber, tokenColumn, instrument, measureIndex + 1, token.length, `Use ${technique} on ${technique === "bell" ? "RC" : "SD"}.`);
                    return;
                }
                if (articulationName === "ghost" && technique === "rimshot") {
                    diagnostic(diagnostics, "error", "conflicting-articulation", `Ghost and rimshot cannot coexist at ${value}.`, lineNumber, tokenColumn, instrument, measureIndex + 1, token.length);
                    return;
                }
                const preset = PRESETS[value.toLowerCase()];
                const ticks = preset
                    ? Array.from({ length: timeSignature.beatsPerBar }, (_, beat) => preset.map(offset => beat * TICKS_PER_BEAT + offset)).flat()
                    : [positionTick(value, timeSignature)];
                if (ticks.some(tick => tick === undefined)) {
                    diagnostic(diagnostics, "error", "invalid-position", `Invalid position "${token}" in ${instrument}.`, lineNumber, tokenColumn, instrument, measureIndex + 1, token.length);
                    return;
                }
                const subdivision = preset === TRIPLETS || (timeSignature.meterType === "compound" && /[&a]$/i.test(value))
                    ? 3
                    : preset === SIXTEENTHS || /[ea]$/i.test(value)
                        ? 4
                        : preset === EIGHTHS || /&$/i.test(value)
                            ? 2
                            : 1;
                measureSubdivision = Math.max(measureSubdivision, subdivision);
                ticks.forEach(tick => {
                    if (tick === undefined) return;
                    const articulation: Articulation = articulationName ?? "normal";
                    const existing = events.find(event => event.tick === tick);
                    if (existing) {
                        const incoming = articulationName;
                        if (technique === "rimshot" && existing.articulation === "ghost"
                            || incoming === "ghost" && existing.technique === "rimshot") {
                            diagnostic(diagnostics, "error", "conflicting-articulation", `Ghost and rimshot cannot coexist at ${value}.`, lineNumber, tokenColumn, instrument, measureIndex + 1, token.length);
                            return;
                        }
                        if (incoming === "normal") {
                            existing.articulation = "normal";
                        } else if ((incoming === "open" && existing.articulation === "accent")
                            || (incoming === "accent" && existing.articulation === "open")) {
                            existing.articulation = "accent-open";
                        } else if (incoming !== undefined && (existing.articulation === "normal" || existing.articulation === incoming
                            || existing.articulation === "accent-open" && (incoming === "accent" || incoming === "open"))) {
                            existing.articulation = existing.articulation === "normal" ? incoming : existing.articulation;
                        } else if (incoming !== undefined) {
                            diagnostic(diagnostics, "error", "conflicting-articulation", `Conflicting articulations at ${value} in ${instrument}.`, lineNumber, tokenColumn, instrument, measureIndex + 1, token.length);
                        }
                        if (technique) {
                            if (existing.technique && existing.technique !== technique) {
                                diagnostic(diagnostics, "error", "conflicting-technique", `${existing.technique} and ${technique} cannot coexist at ${value}.`, lineNumber, tokenColumn, instrument, measureIndex + 1, token.length);
                            } else existing.technique = technique;
                        }
                        if (ornament) {
                            if (existing.ornament && existing.ornament !== ornament) {
                                diagnostic(diagnostics, "error", "conflicting-ornament", `${existing.ornament} and ${ornament} cannot coexist at ${value}.`, lineNumber, tokenColumn, instrument, measureIndex + 1, token.length);
                            } else existing.ornament = ornament;
                        }
                        return;
                    }
                    events.push({
                        instrument,
                        voice: lane.voice,
                        measure: measureIndex,
                        tick,
                        durationTicks: TICKS_PER_BEAT / subdivision,
                        symbol: instrument === "HH" || instrument === "RC" || instrument === "CC" ? "x" : "o",
                        articulation,
                        technique,
                        ornament,
                        source: { line: lineNumber, column: tokenColumn, endLine: lineNumber, endColumn: tokenColumn + token.length, source: "body" },
                    });
                });
            });
        });
        for (let copy = 0; copy < copies; copy++) {
            const outputIndex = lane.measures.length;
            lane.measures.push(events.map(event => ({ ...event, measure: outputIndex, source: { ...event.source } })));
            lane.subdivisions.push(measureSubdivision);
        }
    });
    return lane;
}

export function parseDrumDocument(source: string, headerLine?: string, defaultBeatsPerBar = 4): DrumDocument {
    const normalizedSource = normalizeBareMeter(source);
    const normalizedHeader = headerLine ? normalizeBareMeter(headerLine) : undefined;
    const directives = parseDirectives(normalizedSource, normalizedHeader);
    const timeSignature = directives.timeSignature ?? buildTimeSignature(directives.beatsPerBar ?? defaultBeatsPerBar, 4);
    const diagnostics: DrumDiagnostic[] = [];
    directives.warnings.forEach(warning => {
        diagnostic(diagnostics, "warning", "header", warning.message, 1, 1, undefined, undefined, warning.length);
        diagnostics[diagnostics.length - 1]!.location.source = warning.source;
    });
    const lines = normalizedSource.split(/\r?\n/);
    const contentLines = lines.filter(line => line.trim() && !HEADER.test(line.trim()) && !/^hairpin\s*\|/i.test(line.trim()));
    const positionMode = contentLines.some(line => /^\s*[a-z][a-z0-9]*\s*:/i.test(line));
    const explicitGrid = directives.subdivisionsPerBeat !== undefined || /^\s*(?:grid|subdiv)/im.test(normalizedSource) || /\b(?:grid|subdiv)\b/i.test(normalizedHeader ?? "");
    const rawSubdivisions = directives.subdivisionsPerBeat;
    const normalizedSubdivisions = rawSubdivisions === 16 ? 4 : rawSubdivisions === 8 ? 2 : rawSubdivisions;
    const subdivisions = normalizedSubdivisions ?? (timeSignature.meterType === "compound" ? 3 : 4);
    const lanes: ParsedLane[] = [];

    lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (!trimmed || HEADER.test(trimmed) || /^hairpin\s*\|/i.test(trimmed)) return;
        const lane = positionMode
            ? parsePositionLane(line, index + 1, timeSignature, diagnostics)
            : explicitGrid ? parseGridLane(line, index + 1, subdivisions, timeSignature.beatsPerBar, diagnostics) : undefined;
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
    const sourceMode = positionMode ? "positions" : "grid";
    const directiveSource = [normalizedHeader, normalizedSource].filter((value): value is string => Boolean(value)).join("\n");
    const style = styleDirective(directiveSource);
    const grouping = groupingDirective(directiveSource, timeSignature, diagnostics);
    const positionOverrides = positionsDirective(directiveSource, diagnostics);
    const instrumentPositions = { ...defaultInstrumentPositions(), ...positionOverrides };
    const document: DrumDocument = {
        version: 2,
        sourceMode,
        timeSignature,
        measures,
        instruments,
        diagnostics,
        feel: directives.feel,
        style,
        showCount: boolDirective(directiveSource, "count") ?? style === "practice",
        showLabels: boolDirective(directiveSource, "labels"),
        hairpinPattern: directives.hairpinPattern,
        grouping,
        instrumentPositions,
        positionOverrides,
        sourceText: source,
        headerText: headerLine,
    };
    const timelineDiagnostics = rhythmDiagnostics(document);
    diagnostics.push(...timelineDiagnostics);
    timelineDiagnostics.forEach(item => {
        const measure = item.measure ? measures[item.measure - 1] : undefined;
        if (measure) measure.valid = false;
    });
    const diagnosticKeys = new Set<string>();
    for (let index = diagnostics.length - 1; index >= 0; index--) {
        const item = diagnostics[index]!;
        const key = `${item.code}:${item.location.line}:${item.location.column}:${item.instrument ?? ""}:${item.measure ?? ""}`;
        if (diagnosticKeys.has(key)) diagnostics.splice(index, 1);
        else diagnosticKeys.add(key);
    }
    measures.forEach(measure => measure.events.forEach(event => addSourceOffsets(event.source, source)));
    diagnostics.forEach(item => addSourceOffsets(item.location, item.location.source === "fence-header" ? headerLine ?? "" : source));
    return document;
}
