export type TranscribedInstrument =
    | "kick"
    | "snare"
    | "hi-hat-closed"
    | "hi-hat-open"
    | "hi-hat-pedal"
    | "high-tom"
    | "mid-tom"
    | "low-tom"
    | "ride"
    | "crash"
    | "china"
    | "splash";

export interface TranscribedDrumEvent {
    timeSeconds: number;
    instrument: TranscribedInstrument;
    confidence?: number;
}

export interface DrumSourceOptions {
    tempoBpm: number;
    beatsPerBar?: number;
    firstDownbeatSeconds?: number;
    subdivisionsPerBeat?: 2 | 4;
}

export interface DiscardedTranscriptionEvent extends TranscribedDrumEvent {
    reason: "before-first-downbeat";
}

export interface DrumSourceResult {
    source: string;
    measureCount: number;
    acceptedEvents: number;
    discardedEvents: DiscardedTranscriptionEvent[];
}

interface InstrumentNotation {
    lane: string;
    token: "x" | "o";
    order: number;
}

const INSTRUMENT_NOTATION: Record<TranscribedInstrument, InstrumentNotation> = {
    crash: { lane: "CC", token: "x", order: 0 },
    china: { lane: "CH", token: "x", order: 1 },
    splash: { lane: "SP", token: "x", order: 2 },
    "hi-hat-closed": { lane: "HH", token: "x", order: 3 },
    "hi-hat-open": { lane: "HH", token: "o", order: 3 },
    ride: { lane: "RC", token: "x", order: 4 },
    "high-tom": { lane: "HT", token: "o", order: 5 },
    "mid-tom": { lane: "MT", token: "o", order: 6 },
    snare: { lane: "SD", token: "o", order: 7 },
    "low-tom": { lane: "FT", token: "o", order: 8 },
    kick: { lane: "BD", token: "o", order: 9 },
    "hi-hat-pedal": { lane: "HF", token: "x", order: 10 },
};

interface QuantizedEvent {
    event: TranscribedDrumEvent;
    notation: InstrumentNotation;
    measure: number;
    cell: number;
}

function assertOptions(options: DrumSourceOptions): Required<DrumSourceOptions> {
    const tempoBpm = options.tempoBpm;
    const beatsPerBar = options.beatsPerBar ?? 4;
    const firstDownbeatSeconds = options.firstDownbeatSeconds ?? 0;
    const subdivisionsPerBeat = options.subdivisionsPerBeat ?? 4;
    if (!Number.isFinite(tempoBpm) || tempoBpm <= 0) throw new Error("tempoBpm must be greater than zero.");
    if (!Number.isInteger(beatsPerBar) || beatsPerBar < 1) throw new Error("beatsPerBar must be a positive integer.");
    if (!Number.isFinite(firstDownbeatSeconds) || firstDownbeatSeconds < 0) throw new Error("firstDownbeatSeconds must be zero or greater.");
    return { tempoBpm, beatsPerBar, firstDownbeatSeconds, subdivisionsPerBeat };
}

function formatMeasure(tokens: readonly string[], subdivisionsPerBeat: number): string {
    const beats: string[] = [];
    for (let index = 0; index < tokens.length; index += subdivisionsPerBeat) {
        beats.push(tokens.slice(index, index + subdivisionsPerBeat).join(" "));
    }
    return beats.join("  ");
}

function pickEvent(existing: QuantizedEvent | undefined, incoming: QuantizedEvent): QuantizedEvent {
    if (!existing) return incoming;
    return (incoming.event.confidence ?? 0) > (existing.event.confidence ?? 0) ? incoming : existing;
}

/**
 * Converts model-neutral, timestamped drum hits into the plugin's explicit grid syntax.
 * The caller owns audio analysis; this function is deterministic and has no runtime dependencies.
 */
export function transcribedEventsToDrumSource(
    events: readonly TranscribedDrumEvent[],
    options: DrumSourceOptions,
): DrumSourceResult {
    const settings = assertOptions(options);
    const secondsPerCell = 60 / settings.tempoBpm / settings.subdivisionsPerBeat;
    const cellsPerMeasure = settings.beatsPerBar * settings.subdivisionsPerBeat;
    const discardedEvents: DiscardedTranscriptionEvent[] = [];
    const slots = new Map<string, QuantizedEvent>();

    events.forEach(event => {
        const relativeSeconds = event.timeSeconds - settings.firstDownbeatSeconds;
        if (relativeSeconds < -secondsPerCell / 2) {
            discardedEvents.push({ ...event, reason: "before-first-downbeat" });
            return;
        }
        const cellIndex = Math.max(0, Math.round(relativeSeconds / secondsPerCell));
        const notation = INSTRUMENT_NOTATION[event.instrument];
        const quantized: QuantizedEvent = {
            event,
            notation,
            measure: Math.floor(cellIndex / cellsPerMeasure),
            cell: cellIndex % cellsPerMeasure,
        };
        const key = `${notation.lane}:${quantized.measure}:${quantized.cell}`;
        slots.set(key, pickEvent(slots.get(key), quantized));
    });

    const quantizedEvents = [...slots.values()];
    const measureCount = Math.max(1, ...quantizedEvents.map(event => event.measure + 1));
    const lanes = new Map<string, { order: number; measures: string[][] }>();
    quantizedEvents.forEach(event => {
        let lane = lanes.get(event.notation.lane);
        if (!lane) {
            lane = {
                order: event.notation.order,
                measures: Array.from({ length: measureCount }, () => Array.from({ length: cellsPerMeasure }, () => ".")),
            };
            lanes.set(event.notation.lane, lane);
        }
        lane.measures[event.measure]![event.cell] = event.notation.token;
    });

    const grid = settings.subdivisionsPerBeat === 4 ? 16 : 8;
    const lines = [`meter: ${settings.beatsPerBar}/4`, `grid: ${grid}`, `tempo: ${settings.tempoBpm}`];
    [...lanes.entries()]
        .sort((left, right) => left[1].order - right[1].order)
        .forEach(([name, lane]) => {
            const measures = lane.measures.map(measure => formatMeasure(measure, settings.subdivisionsPerBeat));
            lines.push(`${name} | ${measures.join(" | ")} |`);
        });

    return {
        source: lines.join("\n"),
        measureCount,
        acceptedEvents: quantizedEvents.length,
        discardedEvents,
    };
}
