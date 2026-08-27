import { PlaybackSource } from "./playbackKits";

export interface MetronomeVoiceDescriptor {
    id: string;
    label: string;
}

export const METRONOME_VOICES: readonly MetronomeVoiceDescriptor[] = [
    { id: "click-high", label: "Click · High" },
    { id: "click-low", label: "Click · Low" },
    { id: "woodblock-high", label: "Woodblock · High" },
    { id: "woodblock-low", label: "Woodblock · Low" },
    { id: "cowbell-high", label: "Cowbell · High" },
    { id: "cowbell-low", label: "Cowbell · Low" },
    { id: "bongo-high", label: "Bongo · High" },
    { id: "bongo-low", label: "Bongo · Low" },
    { id: "conga-high", label: "Conga · High" },
    { id: "conga-low", label: "Conga · Low" },
    { id: "clave", label: "Clave" },
    { id: "rimshot", label: "Rimshot" },
    { id: "shaker", label: "Shaker" },
];

export const DEFAULT_METRONOME_VOLUME = 65;
export const DEFAULT_METRONOME_ACCENT_VOICE = "woodblock-high";
export const DEFAULT_METRONOME_BEAT_VOICE = "woodblock-low";

export function normalizeMetronomeVolume(value: number | undefined): number {
    return Math.max(0, Math.min(150, Number.isFinite(value) ? value! : DEFAULT_METRONOME_VOLUME));
}

export function normalizeMetronomeVoice(value: string | undefined, fallback: string): string {
    return METRONOME_VOICES.some(voice => voice.id === value) ? value! : fallback;
}

export interface MetronomeAudioHost {
    context: AudioContext;
    destination: AudioNode;
    noiseBuffer(): AudioBuffer;
    track(source: PlaybackSource): void;
}

function envelope(gain: GainNode, at: number, level: number, duration: number): void {
    gain.gain.setValueAtTime(Math.max(0.0001, level), at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
}

function tonal(
    host: MetronomeAudioHost,
    at: number,
    frequency: number,
    endFrequency: number,
    duration: number,
    level: number,
    type: OscillatorType = "sine",
): void {
    const oscillator = host.context.createOscillator();
    const gain = host.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, at);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, at + Math.min(duration, 0.06));
    envelope(gain, at, level, duration);
    oscillator.connect(gain).connect(host.destination);
    oscillator.start(at);
    oscillator.stop(at + duration + 0.01);
    host.track(oscillator);
}

function noise(
    host: MetronomeAudioHost,
    at: number,
    frequency: number,
    duration: number,
    level: number,
    type: BiquadFilterType,
): void {
    const source = host.context.createBufferSource();
    const filter = host.context.createBiquadFilter();
    const gain = host.context.createGain();
    source.buffer = host.noiseBuffer();
    filter.type = type;
    filter.frequency.setValueAtTime(frequency, at);
    filter.Q.setValueAtTime(type === "bandpass" ? 2.5 : 0.6, at);
    envelope(gain, at, level, duration);
    source.connect(filter).connect(gain).connect(host.destination);
    source.start(at);
    source.stop(at + duration + 0.01);
    host.track(source);
}

export function scheduleMetronomeVoice(host: MetronomeAudioHost, at: number, voice: string, volume: number): void {
    const level = normalizeMetronomeVolume(volume) / 100;
    if (level <= 0) return;
    const safeAt = Math.max(host.context.currentTime, at);
    switch (normalizeMetronomeVoice(voice, DEFAULT_METRONOME_BEAT_VOICE)) {
        case "click-high":
            tonal(host, safeAt, 1500, 1500, 0.035, 0.16 * level, "square");
            break;
        case "click-low":
            tonal(host, safeAt, 1050, 1050, 0.035, 0.14 * level, "square");
            break;
        case "woodblock-high":
            tonal(host, safeAt, 1180, 860, 0.07, 0.24 * level, "triangle");
            tonal(host, safeAt, 2360, 1720, 0.035, 0.07 * level, "sine");
            break;
        case "woodblock-low":
            tonal(host, safeAt, 760, 560, 0.085, 0.25 * level, "triangle");
            tonal(host, safeAt, 1520, 1120, 0.04, 0.06 * level, "sine");
            break;
        case "cowbell-high":
            tonal(host, safeAt, 820, 805, 0.16, 0.16 * level, "square");
            tonal(host, safeAt, 1230, 1205, 0.13, 0.1 * level, "square");
            break;
        case "cowbell-low":
            tonal(host, safeAt, 540, 525, 0.19, 0.17 * level, "square");
            tonal(host, safeAt, 800, 780, 0.16, 0.1 * level, "square");
            break;
        case "bongo-high":
            tonal(host, safeAt, 520, 315, 0.16, 0.34 * level);
            tonal(host, safeAt, 980, 720, 0.07, 0.07 * level, "triangle");
            break;
        case "bongo-low":
            tonal(host, safeAt, 330, 195, 0.22, 0.36 * level);
            tonal(host, safeAt, 620, 440, 0.09, 0.06 * level, "triangle");
            break;
        case "conga-high":
            tonal(host, safeAt, 410, 245, 0.28, 0.32 * level);
            noise(host, safeAt, 2100, 0.035, 0.045 * level, "bandpass");
            break;
        case "conga-low":
            tonal(host, safeAt, 265, 145, 0.34, 0.36 * level);
            noise(host, safeAt, 1650, 0.04, 0.04 * level, "bandpass");
            break;
        case "clave":
            tonal(host, safeAt, 1750, 1420, 0.075, 0.22 * level, "triangle");
            break;
        case "rimshot":
            noise(host, safeAt, 2400, 0.055, 0.13 * level, "bandpass");
            tonal(host, safeAt, 920, 680, 0.055, 0.16 * level, "triangle");
            break;
        case "shaker":
            noise(host, safeAt, 6200, 0.09, 0.13 * level, "highpass");
            break;
    }
}
