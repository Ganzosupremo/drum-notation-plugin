import { MeterType, TimeSignature } from "../types";

export interface ParsedDirectives {
    beatsPerBar?: number;
    timeSignature?: TimeSignature;
    subdivisionsPerBeat?: number;
    feel?: "straight" | "swing" | "triplet";
    hairpinPattern?: string;
    warnings: DirectiveWarning[];
}

export interface DirectiveWarning {
    message: string;
    source: "body" | "fence-header";
    length: number;
}

export function isPowerOfTwo(value: number): boolean {
    return value > 0 && (value & (value - 1)) === 0;
}

export function buildTimeSignature(beatsPerMeasure: number, beatUnit: number, validate = false): TimeSignature {
    if (validate && !isPowerOfTwo(beatUnit)) {
        throw new Error(`Invalid beat unit "${beatUnit}": beat unit must be a power of 2 (1, 2, 4, 8, 16, 32)`);
    }
    const meterType: MeterType = beatUnit === 8 && beatsPerMeasure >= 6 && beatsPerMeasure % 3 === 0
        ? "compound"
        : "simple";
    return {
        beatsPerMeasure,
        beatUnit,
        meterType,
        beatsPerBar: meterType === "compound" ? beatsPerMeasure / 3 : beatsPerMeasure,
    };
}

function subdivisionValue(value: string): number | undefined {
    const normalized = value.toLowerCase().replace(/\s+/g, "");
    if (/^\d+$/.test(normalized)) {
        const parsed = Number.parseInt(normalized, 10);
        if (parsed > 0) return parsed;
    }
    if (["8th", "8ths", "eighth", "eighths"].includes(normalized)) return 2;
    if (["16th", "16ths", "sixteenth", "sixteenths"].includes(normalized)) return 4;
    if (["triplet", "triplets", "tri", "3s"].includes(normalized)) return 3;
    return undefined;
}

function splitInlineHeader(header: string): string[] {
    const keyword = /\b(time|timesig|timesignature|meter|ts|beatsperbar|beats-per-bar|beats|bpb|subdivisions|subdivision|subdiv|grid|resolution|feel|swing)\b/gi;
    const starts = [...header.matchAll(keyword)].map(match => match.index ?? 0);
    if (starts.length === 0) return [header];
    return starts.map((start, index) => header.slice(start, starts[index + 1] ?? header.length).trim()).filter(Boolean);
}

type DirectiveState = Omit<ParsedDirectives, "warnings" | "hairpinPattern">;

function parseDirectiveLine(line: string, state: DirectiveState): string | undefined {
    if (/^swing$/i.test(line.trim())) {
        state.feel = "swing";
        return undefined;
    }
    const match = line.match(/^(time|timesig|timesignature|meter|ts|beatsperbar|beats-per-bar|beats|bpb|subdivisions|subdivision|subdiv|grid|resolution|feel|swing)\s*(?:[:=]|\s)\s*(.+)$/i);
    if (!match?.[1] || !match[2]) return undefined;
    const key = match[1].toLowerCase();
    const value = match[2].trim();
    if (["time", "timesig", "timesignature", "meter", "ts"].includes(key)) {
        const meter = value.match(/^(\d+)\s*\/\s*(\d+)$/);
        if (!meter?.[1] || !meter[2]) return `Malformed time signature: "${value}"`;
        const beats = Number.parseInt(meter[1], 10);
        const unit = Number.parseInt(meter[2], 10);
        if (!isPowerOfTwo(unit)) return `Invalid time signature beat unit "${unit}" in "${value}": beat unit must be a power of 2 (1, 2, 4, 8, 16, 32)`;
        state.timeSignature = buildTimeSignature(beats, unit);
        state.beatsPerBar = state.timeSignature.beatsPerBar;
        return undefined;
    }
    if (["subdivisions", "subdivision", "subdiv", "grid", "resolution"].includes(key)) {
        const subdivision = subdivisionValue(value);
        if (!subdivision) return `Invalid subdivision value: "${value}"`;
        state.subdivisionsPerBeat = subdivision;
        return undefined;
    }
    if (key === "feel" || key === "swing") {
        const feel = value.toLowerCase();
        if (feel !== "straight" && feel !== "swing" && feel !== "triplet") return `Unknown feel value: "${value}"`;
        state.feel = feel;
        return undefined;
    }
    const beats = Number.parseInt(value, 10);
    if (!Number.isFinite(beats)) return `Invalid beats-per-bar value: "${value}"`;
    state.beatsPerBar = beats;
    state.timeSignature = buildTimeSignature(beats, 4);
    return undefined;
}

function hairpinFromLine(line: string): string | undefined {
    const segments = line.split("|").map(value => value.trim());
    if (!["hairpin", "hp"].includes((segments[0] ?? "").toLowerCase())) return undefined;
    const body = segments.slice(1);
    if (body[body.length - 1] === "") body.pop();
    return body.join("") || undefined;
}

export function parseDirectives(source: string, headerLine?: string): ParsedDirectives {
    const state: DirectiveState = {};
    const warnings: DirectiveWarning[] = [];
    const parse = (line: string, origin: DirectiveWarning["source"]) => {
        const warning = parseDirectiveLine(line, state);
        if (warning && !warnings.some(item => item.message === warning && item.source === origin)) {
            warnings.push({ message: warning, source: origin, length: Math.max(1, line.length) });
        }
    };
    if (headerLine) splitInlineHeader(headerLine).forEach(line => parse(line, "fence-header"));
    let hairpinPattern: string | undefined;
    source.split(/\r?\n/).forEach(line => {
        parse(line.trim(), "body");
        hairpinPattern ??= hairpinFromLine(line);
    });
    if (state.feel === "triplet" && !state.subdivisionsPerBeat) state.subdivisionsPerBeat = 3;
    return { ...state, hairpinPattern, warnings };
}
