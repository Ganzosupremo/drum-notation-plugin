import chinaHard from "../assets/audio/cc0-acoustic/china_vl4_rr1.wav";
import crashMedium from "../assets/audio/cc0-acoustic/crash_vl2_rr1.wav";
import crashHard from "../assets/audio/cc0-acoustic/crash_vl3_rr1.wav";
import hatClosedMedium from "../assets/audio/cc0-acoustic/hhc_vl2_rr1.flac";
import hatClosedHard from "../assets/audio/cc0-acoustic/hhc_vl4_rr1.flac";
import hatOpenMedium from "../assets/audio/cc0-acoustic/hho_vl2_rr1.flac";
import hatOpenHard from "../assets/audio/cc0-acoustic/hho_vl4_rr1.flac";
import hatPedal from "../assets/audio/cc0-acoustic/hhp_vl2_rr1.flac";
import kickMedium from "../assets/audio/cc0-acoustic/kick_vl2_rr1.flac";
import kickHard from "../assets/audio/cc0-acoustic/kick_vl4_rr1.flac";
import rideMedium from "../assets/audio/cc0-acoustic/ride_vl2_rr1.flac";
import rideHard from "../assets/audio/cc0-acoustic/ride_vl3_rr1.flac";
import rideBellMedium from "../assets/audio/cc0-acoustic/ridebell_vl2_rr1.flac";
import rideBellHard from "../assets/audio/cc0-acoustic/ridebell_vl3_rr1.flac";
import sideStick from "../assets/audio/cc0-acoustic/sidestick_vl2_rr1.flac";
import snareSoft from "../assets/audio/cc0-acoustic/snare_vl2_rr1.flac";
import snareMedium from "../assets/audio/cc0-acoustic/snare_vl4_rr1.flac";
import snareHard from "../assets/audio/cc0-acoustic/snare_vl6_rr1.flac";
import splash from "../assets/audio/cc0-acoustic/splash_vl1_rr1.wav";
import tomHighMedium from "../assets/audio/cc0-acoustic/tomhi_vl2_rr1.flac";
import tomHighHard from "../assets/audio/cc0-acoustic/tomhi_vl4_rr1.flac";
import tomLowMedium from "../assets/audio/cc0-acoustic/tomlo_vl2_rr1.flac";
import tomLowHard from "../assets/audio/cc0-acoustic/tomlo_vl4_rr1.flac";
import {
    PlaybackKit,
    SampleBufferCache,
    SampleKitDefinition,
    SampleLayer,
    SampleMapping,
    SamplePlaybackKit,
    SynthPlaybackKit,
} from "./playbackKits";

const bundledSamples: Readonly<Record<string, Uint8Array>> = {
    "china-hard": chinaHard,
    "crash-medium": crashMedium,
    "crash-hard": crashHard,
    "hat-closed-medium": hatClosedMedium,
    "hat-closed-hard": hatClosedHard,
    "hat-open-medium": hatOpenMedium,
    "hat-open-hard": hatOpenHard,
    "hat-pedal": hatPedal,
    "kick-medium": kickMedium,
    "kick-hard": kickHard,
    "ride-medium": rideMedium,
    "ride-hard": rideHard,
    "ride-bell-medium": rideBellMedium,
    "ride-bell-hard": rideBellHard,
    "side-stick": sideStick,
    "snare-soft": snareSoft,
    "snare-medium": snareMedium,
    "snare-hard": snareHard,
    splash,
    "tom-high-medium": tomHighMedium,
    "tom-high-hard": tomHighHard,
    "tom-low-medium": tomLowMedium,
    "tom-low-hard": tomLowHard,
};

const soft = (url: string, options: Omit<SampleLayer, "url" | "maxVelocity"> = {}): SampleLayer => ({
    url,
    maxVelocity: 0.5,
    ...options,
});
const regular = (url: string, options: Omit<SampleLayer, "url" | "minVelocity" | "maxVelocity"> = {}): SampleLayer => ({
    url,
    minVelocity: 0.5001,
    maxVelocity: 0.95,
    ...options,
});
const accent = (url: string, options: Omit<SampleLayer, "url" | "minVelocity"> = {}): SampleLayer => ({
    url,
    minVelocity: 0.9501,
    ...options,
});

const studioSamples: Record<string, SampleMapping> = {
    BD: [regular("kick-medium"), accent("kick-hard")],
    SD: [soft("snare-soft"), regular("snare-medium"), accent("snare-hard")],
    "SD:cross-stick": "side-stick",
    HH: [regular("hat-closed-medium", { gain: 0.65 }), accent("hat-closed-hard", { gain: 0.62 })],
    "HH:open": [regular("hat-open-medium", { gain: 0.62 }), accent("hat-open-hard", { gain: 0.58 })],
    HF: { url: "hat-pedal", gain: 0.62 },
    HT: [regular("tom-high-medium", { playbackRate: 1.08 }), accent("tom-high-hard", { playbackRate: 1.08 })],
    MT: [regular("tom-high-medium", { playbackRate: 0.82 }), accent("tom-high-hard", { playbackRate: 0.82 })],
    FT: [regular("tom-low-medium", { playbackRate: 0.9 }), accent("tom-low-hard", { playbackRate: 0.9 })],
    RC: [regular("ride-medium", { gain: 0.6 }), accent("ride-hard", { gain: 0.56 })],
    "RC:bell": [regular("ride-bell-medium", { gain: 0.65 }), accent("ride-bell-hard", { gain: 0.62 })],
    CC: [regular("crash-medium", { gain: 0.48 }), accent("crash-hard", { gain: 0.44 })],
    CH: { url: "china-hard", gain: 0.44 },
    SP: { url: "splash", gain: 0.42 },
};

const heavySamples: Record<string, SampleMapping> = {
    BD: { url: "kick-hard", gain: 1.08 },
    SD: [soft("snare-medium", { gain: 0.78 }), { url: "snare-hard", minVelocity: 0.5001, gain: 1.05 }],
    "SD:cross-stick": { url: "side-stick", gain: 0.9 },
    HH: { url: "hat-closed-hard", gain: 0.62 },
    "HH:open": { url: "hat-open-hard", gain: 0.58 },
    HF: { url: "hat-pedal", gain: 0.62 },
    HT: { url: "tom-high-hard", playbackRate: 1.08, gain: 1.05 },
    MT: { url: "tom-high-hard", playbackRate: 0.82, gain: 1.05 },
    FT: { url: "tom-low-hard", playbackRate: 0.9, gain: 1.08 },
    RC: { url: "ride-hard", gain: 0.58 },
    "RC:bell": { url: "ride-bell-hard", gain: 0.65 },
    CC: { url: "crash-hard", gain: 0.46 },
    CH: { url: "china-hard", gain: 0.46 },
    SP: { url: "splash", gain: 0.44 },
};

const crispySamples: Record<string, SampleMapping> = {
    BD: { url: "kick-hard", gain: 1.02 },
    SD: [
        soft("snare-medium", { playbackRate: 1.04, gain: 0.82 }),
        { url: "snare-hard", minVelocity: 0.5001, playbackRate: 1.06, gain: 1.08 },
    ],
    "SD:cross-stick": { url: "side-stick", playbackRate: 1.04, gain: 0.92 },
    HH: { url: "hat-closed-medium", playbackRate: 1.04, gain: 0.58 },
    "HH:open": { url: "hat-open-medium", playbackRate: 1.03, gain: 0.54 },
    HF: { url: "hat-pedal", gain: 0.58 },
    HT: { url: "tom-high-hard", playbackRate: 1.12, gain: 0.94 },
    MT: { url: "tom-high-hard", playbackRate: 0.86, gain: 0.96 },
    FT: { url: "tom-low-hard", playbackRate: 0.92, gain: 1.0 },
    RC: { url: "ride-medium", playbackRate: 1.02, gain: 0.52 },
    "RC:bell": { url: "ride-bell-hard", playbackRate: 1.02, gain: 0.58 },
    CC: { url: "crash-medium", playbackRate: 1.03, gain: 0.42 },
    CH: { url: "china-hard", playbackRate: 1.02, gain: 0.42 },
    SP: { url: "splash", playbackRate: 1.04, gain: 0.4 },
};

async function loadBundledSample(id: string): Promise<ArrayBuffer> {
    const bytes = bundledSamples[id];
    if (!bytes) throw new Error(`Bundled sample "${id}" was not found.`);
    return Uint8Array.from(bytes).buffer;
}

export const BUNDLED_SAMPLE_KIT_DEFINITIONS: readonly SampleKitDefinition[] = [
    { id: "acoustic-studio", label: "Acoustic · Studio", gain: 0.82, samples: studioSamples, loadSample: loadBundledSample },
    { id: "acoustic-heavy", label: "Acoustic · Heavy", gain: 0.88, samples: heavySamples, loadSample: loadBundledSample },
    { id: "acoustic-crispy", label: "Acoustic · Crispy", gain: 0.86, samples: crispySamples, loadSample: loadBundledSample },
];

export function bundledPlaybackKits(): PlaybackKit[] {
    const fallback = new SynthPlaybackKit();
    const sharedBuffers: SampleBufferCache = new WeakMap();
    return BUNDLED_SAMPLE_KIT_DEFINITIONS.map(definition => new SamplePlaybackKit(definition, fallback, sharedBuffers));
}
