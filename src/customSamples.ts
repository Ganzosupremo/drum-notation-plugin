import type { TFile } from "obsidian";
import { SampleMapping } from "./playbackKits";

export interface CustomSampleTarget {
    key: string;
    label: string;
}

export const CUSTOM_SAMPLE_TARGETS: readonly CustomSampleTarget[] = [
    { key: "BD", label: "Kick" },
    { key: "SD", label: "Snare" },
    { key: "SD:rimshot", label: "Snare · Rimshot" },
    { key: "SD:cross-stick", label: "Snare · Cross-stick" },
    { key: "HH", label: "Hi-hat · Closed" },
    { key: "HH:open", label: "Hi-hat · Open" },
    { key: "HF", label: "Hi-hat · Pedal" },
    { key: "HT", label: "Tom · High" },
    { key: "MT", label: "Tom · Mid" },
    { key: "FT", label: "Tom · Floor" },
    { key: "RC", label: "Ride" },
    { key: "RC:bell", label: "Ride · Bell" },
    { key: "CC", label: "Crash" },
    { key: "CH", label: "China" },
    { key: "SP", label: "Splash" },
];

export const CUSTOM_SAMPLE_FOLDER = "Drum Notation Samples";
export const CUSTOM_SAMPLE_ACCEPT = ".wav,.mp3,.ogg,.flac,.m4a,.aac,.webm,audio/*";

const AUDIO_EXTENSIONS = new Set(["wav", "mp3", "ogg", "flac", "m4a", "aac", "webm"]);
const CUSTOM_SAMPLE_KEYS = new Set(CUSTOM_SAMPLE_TARGETS.map(target => target.key));

export function isSupportedAudioFile(file: Pick<TFile, "extension">): boolean {
    return AUDIO_EXTENSIONS.has(file.extension.toLowerCase());
}

export function isSupportedAudioFileName(name: string): boolean {
    return AUDIO_EXTENSIONS.has(name.split(".").pop()?.toLowerCase() ?? "");
}

export function safeSampleFileName(name: string): string {
    const safe = name.replace(/[\\/:*?"<>|]/g, "_").trim();
    return safe || "sample.wav";
}

export function normalizeCustomSamples(samples: Record<string, string> | undefined): Record<string, string> {
    const normalized: Record<string, string> = {};
    Object.entries(samples ?? {}).forEach(([key, path]) => {
        if (CUSTOM_SAMPLE_KEYS.has(key) && typeof path === "string" && path.trim()) normalized[key] = path.trim();
    });
    return normalized;
}

export function customSampleMappings(samples: Record<string, string>): Record<string, SampleMapping> {
    return Object.fromEntries(Object.entries(normalizeCustomSamples(samples)).map(([key, path]) => [key, path]));
}
