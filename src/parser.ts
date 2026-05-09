import { DrumNotation, DrumLine, TimeSignature, MeterType } from "./types";

type HeaderParseResult = {
    beatsPerBar?: number;
    timeSignature?: TimeSignature;
    subdivisionsPerBeat?: number;
    warnings: string[];
};

function buildTimeSignature(
    beatsPerMeasure: number,
    beatUnit: number
): TimeSignature {
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

function parseHeaders(
    lines: string[],
    headerLine?: string
): HeaderParseResult {
    const warnings: string[] = [];
    let beatsPerBar: number | undefined;
    let timeSignature: TimeSignature | undefined;
    let subdivisionsPerBeat: number | undefined;

    if (headerLine) {
        const headerResult = parseHeaderLine(headerLine, warnings);
        if (headerResult?.timeSignature) timeSignature = headerResult.timeSignature;
        if (headerResult?.beatsPerBar) beatsPerBar = headerResult.beatsPerBar;
        if (headerResult?.subdivisionsPerBeat) subdivisionsPerBeat = headerResult.subdivisionsPerBeat;
    }

    for (const line of lines) {
        const headerResult = parseHeaderLine(line, warnings);
        if (headerResult?.timeSignature) timeSignature = headerResult.timeSignature;
        if (headerResult?.beatsPerBar) beatsPerBar = headerResult.beatsPerBar;
        if (headerResult?.subdivisionsPerBeat) subdivisionsPerBeat = headerResult.subdivisionsPerBeat;
    }

    if (!timeSignature && beatsPerBar) {
        timeSignature = buildTimeSignature(beatsPerBar, 4);
    }

    if (timeSignature) {
        beatsPerBar = timeSignature.beatsPerBar;
    }

    return {
        beatsPerBar,
        timeSignature,
        subdivisionsPerBeat,
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
    let beatsPerBar = headerResult.beatsPerBar;
    const timeSignature = headerResult.timeSignature;
    const subdivisionsPerBeat = headerResult.subdivisionsPerBeat;

    for (const line of lines) {
        if (parseHeaderLine(line, headerResult.warnings) !== undefined) {
            continue;
        }

        const [instrument, pattern] = line.split("|").map(s => s.trim());

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

    export { buildTimeSignature };