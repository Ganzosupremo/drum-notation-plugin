import { DrumDocument, DrumEvent, TICKS_PER_BEAT } from "../types";

const ALIASES: Record<string, string> = {
    HH: "H", RC: "R", CC: "C", SD: "S", BD: "K", HF: "P", HT: "T1", MT: "T2", FT: "T3",
};

function position(event: DrumEvent, document: DrumDocument): string {
    const beat = Math.floor(event.tick / TICKS_PER_BEAT) + 1;
    const offset = event.tick % TICKS_PER_BEAT;
    const compound = document.timeSignature.meterType === "compound";
    const suffix = offset === 0 ? ""
        : offset === 3 ? "e"
            : offset === (compound ? 4 : 6) ? "&"
                : offset === (compound ? 8 : 9) ? "a" : "";
    return `${beat}${suffix}`;
}

function eventTokens(event: DrumEvent, document: DrumDocument): string[] {
    const at = position(event, document);
    const tokens: string[] = [];
    if (event.articulation === "ghost") tokens.push(`(${at})`);
    else if (event.articulation === "open") tokens.push(`o${at}`);
    else if (event.articulation === "accent-open") tokens.push(`>o${at}`);
    else if (event.articulation === "accent") tokens.push(`>${at}`);
    if (!event.technique && !event.ornament && event.articulation === "normal") tokens.push(at);
    if (event.technique === "cross-stick") tokens.push(`cs${at}`);
    if (event.technique === "rimshot") tokens.push(`rs${at}`);
    if (event.technique === "bell") tokens.push(`b${at}`);
    if (event.ornament === "flam") tokens.push(`f${at}`);
    if (event.ornament === "drag") tokens.push(`d${at}`);
    if (event.ornament === "roll") tokens.push(`rr${at}`);
    return tokens;
}

export function serializeCompactDocument(document: DrumDocument): string {
    const lines = [`${document.timeSignature.beatsPerMeasure}/${document.timeSignature.beatUnit}`];
    const instruments = [...new Set(document.instruments.map(item => item.instrument))];
    instruments.forEach(instrument => {
        const measures = document.measures.map(measure => measure.events
            .filter(event => event.instrument === instrument)
            .sort((left, right) => left.tick - right.tick)
            .flatMap(event => eventTokens(event, document))
            .join(" "));
        lines.push(`${ALIASES[instrument] ?? instrument}: ${measures.join(" | ")}`);
    });
    return lines.join("\n");
}
