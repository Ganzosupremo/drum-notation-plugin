import { DrumNotation, DrumLine, TimeSignature, MeterType } from "./types";

type HeaderParseResult = {
    beatsPerBar?: number;
    timeSignature?: TimeSignature;
    subdivisionsPerBeat?: number;
    warnings: string[];
};

function isPowerOfTwo(n: number): boolean {
    return n > 0 && (n & (n - 1)) === 0;
}

function buildTimeSignature(
    beatsPerMeasure: number,
    beatUnit: number,
    validate = false
): TimeSignature {
    if (validate && !isPowerOfTwo(beatUnit)) {
        throw new Error(
            `Invalid beat unit "${beatUnit}": beat unit must be a power of 2 (1, 2, 4, 8, 16, 32)`
        );
    }

    const meterType: MeterType =
        beatUnit === 8 && beatsPerMeasure % 3 === 0 && beatsPerMeasure >= 6
            ? "compound"
            : "simple";

    const beatsPerBar = meterType === "compound"
        ? beatsPerMeasure / 3
        : beatsPerMeasure;

    return {
        beatsPerMeasure,
        beatUnit,
        meterType,
        beatsPerBar
    };
}

/**
 * Splits an inline header string like "time 4/4 subdiv 4" into individual
 * key-value segments ["time 4/4", "subdiv 4"] so each directive can be
 * parsed independently. Without this, the entire string after the first key
 * is captured as one value, breaking multi-directive inline headers.
 */
function splitInlineHeader(header: string): string[] {
    const keywordPattern = /\b(time|timesig|timesignature|meter|ts|beatsperbar|beats-per-bar|beats|bpb|subdivisions|subdivision|subdiv|grid|resolution)\b/gi;

    const positions: number[] = [];
    let match: RegExpExecArray | null;

    keywordPattern.lastIndex = 0;
    while ((match = keywordPattern.exec(header)) !== null) {
        positions.push(match.index);
    }

    if (positions.length === 0) return [header];

    const segments: string[] = [];
    for (let i = 0; i < positions.length; i++) {
        const start = positions[i] as number;
        const end = i + 1 < positions.length ? positions[i + 1] as number : header.length;
        const segment = header.slice(start, end).trim();
        if (segment) segments.push(segment);
    }

    return segments;
}

function parseHeaderLine(
    line: string,
    warnings: string[]
): { beatsPerBar?: number; timeSignature?: TimeSignature; subdivisionsPerBeat?: number } | undefined {
    const headerPattern = /^(time|timesig|timesignature|meter|ts|beatsperbar|beats-per-bar|beats|bpb|subdivisions|subdivision|subdiv|grid|resolution)\s*(?:[:=]|\s)\s*(.+)$/i as RegExp;
    const headerMatch = line.match(headerPattern);

    if (!headerMatch) return undefined;

    const [, keyRaw, valueRaw] = headerMatch;

    if (!keyRaw || !valueRaw) return undefined;

    const key = keyRaw.toLowerCase();
    const value = valueRaw.trim();

    if (key === "time" || key === "timesig" || key === "timesignature" || key === "meter" || key === "ts") {
        const timeMatch = value.match(/^(\d+)\s*\/\s*(\d+)$/);
        if (timeMatch?.[1] && timeMatch?.[2]) {
            const beats = Number.parseInt(timeMatch[1], 10);
            const unit = Number.parseInt(timeMatch[2], 10);
            if (!isPowerOfTwo(unit)) {
                warnings.push(
                    `Invalid time signature beat unit "${unit}" in "${value}": beat unit must be a power of 2 (1, 2, 4, 8, 16, 32)`
                );
                return {};
            }
            return { timeSignature: buildTimeSignature(beats, unit) };
        }

        warnings.push(`Malformed time signature: "${value}"`);
        return {};
    }

    if (key === "subdivisions" || key === "subdivision" || key === "subdiv" || key === "grid" || key === "resolution") {
        const subdivisionsPerBeat = parseSubdivisions(value);
        if (subdivisionsPerBeat) {
            return { subdivisionsPerBeat };
        }

        warnings.push(`Invalid subdivision value: "${value}"`);
        return {};
    }

    const parsedBeats = Number.parseInt(value, 10);
    if (Number.isFinite(parsedBeats)) {
        return { beatsPerBar: parsedBeats };
    }

    warnings.push(`Invalid beats-per-bar value: "${value}"`);
    return {};
}

function parseSubdivisions(value: string): number | undefined {
    const normalized = value.toLowerCase().replace(/\s+/g, "");

    const numericMatch = normalized.match(/^(\d+)$/);
    if (numericMatch?.[1]) {
        const parsed = Number.parseInt(numericMatch[1], 10);
        if (parsed > 0) return parsed;
    }

    if (normalized === "8" || normalized === "8th" || normalized === "8ths" || normalized === "eighth" || normalized === "eighths") {
        return 2;
    }

    if (normalized === "16" || normalized === "16th" || normalized === "16ths" || normalized === "sixteenth" || normalized === "sixteenths") {
        return 4;
    }

    if (normalized === "triplet" || normalized === "triplets" || normalized === "tri" || normalized === "3" || normalized === "3s") {
        return 3;
    }

    return undefined;
}

function applyHeaderResult(
    result: { beatsPerBar?: number; timeSignature?: TimeSignature; subdivisionsPerBeat?: number } | undefined,
    state: { beatsPerBar?: number; timeSignature?: TimeSignature; subdivisionsPerBeat?: number }
): void {
    if (result?.timeSignature) state.timeSignature = result.timeSignature;
    if (result?.beatsPerBar) state.beatsPerBar = result.beatsPerBar;
    if (result?.subdivisionsPerBeat) state.subdivisionsPerBeat = result.subdivisionsPerBeat;
}

function parseHeaders(
    lines: string[],
    headerLine?: string
): HeaderParseResult {
    const warnings: string[] = [];
    const state: { beatsPerBar?: number; timeSignature?: TimeSignature; subdivisionsPerBeat?: number } = {};

    // Inline fence header may contain multiple space-separated directives,
    // e.g. "time 4/4 subdiv 4". Split into individual segments first so each
    // one is processed independently by parseHeaderLine.
    if (headerLine) {
        for (const segment of splitInlineHeader(headerLine)) {
            applyHeaderResult(parseHeaderLine(segment, warnings), state);
        }
    }

    for (const line of lines) {
        applyHeaderResult(parseHeaderLine(line, warnings), state);
    }

    if (!state.timeSignature && state.beatsPerBar) {
        state.timeSignature = buildTimeSignature(state.beatsPerBar, 4);
    }

    if (state.timeSignature) {
        state.beatsPerBar = state.timeSignature.beatsPerBar;
    }

    return {
        beatsPerBar: state.beatsPerBar,
        timeSignature: state.timeSignature,
        subdivisionsPerBeat: state.subdivisionsPerBeat,
        warnings
    };
}

export function parseDrumNotation(
    source: string,
    headerLine?: string
): DrumNotation {

    const lines = source
        .split("\n")
        .map(l => l.trim())
        .filter(Boolean);

    const parsed: DrumLine[] = [];
    const headerResult = parseHeaders(lines, headerLine);
    const beatsPerBar = headerResult.beatsPerBar;
    const timeSignature = headerResult.timeSignature;
    const subdivisionsPerBeat = headerResult.subdivisionsPerBeat;

    for (const line of lines) {
        if (parseHeaderLine(line, headerResult.warnings) !== undefined) {
            continue;
        }

        const segments = line.split("|").map(s => s.trim());
        const instrument = segments[0];
        // Join all inner segments (between the first and last pipe) so that
        // inner bar separators like `HH |x-x-|x-x-|` are treated the same as
        // `HH |x-x-x-x-|`. Drop the trailing empty segment produced by a
        // closing `|`.
        const innerSegments = segments.slice(1);
        if (innerSegments[innerSegments.length - 1] === "") {
            innerSegments.pop();
        }
        const pattern = innerSegments.join("");

        if (!instrument || !pattern) continue;

        parsed.push({
            instrument,
            pattern
        });
    }

    return {
        lines: parsed,
        beatsPerBar,
        timeSignature,
        subdivisionsPerBeat,
        warnings: headerResult.warnings.length > 0 ? headerResult.warnings : undefined
    };
}

export { buildTimeSignature, isPowerOfTwo };
