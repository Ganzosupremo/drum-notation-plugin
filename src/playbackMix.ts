export interface PlaybackInstrumentMix {
    instrument: string;
    label: string;
    defaultVolume: number;
}

export const PLAYBACK_INSTRUMENT_MIX: readonly PlaybackInstrumentMix[] = [
    { instrument: "BD", label: "Kick (BD)", defaultVolume: 100 },
    { instrument: "SD", label: "Snare (SD)", defaultVolume: 100 },
    { instrument: "HH", label: "Hi-hat (HH)", defaultVolume: 45 },
    { instrument: "HF", label: "Hi-hat pedal (HF)", defaultVolume: 55 },
    { instrument: "HT", label: "High tom (HT)", defaultVolume: 90 },
    { instrument: "MT", label: "Mid tom (MT)", defaultVolume: 90 },
    { instrument: "FT", label: "Floor tom (FT)", defaultVolume: 90 },
    { instrument: "RC", label: "Ride (RC)", defaultVolume: 50 },
    { instrument: "CC", label: "Crash (CC)", defaultVolume: 50 },
    { instrument: "CH", label: "China (CH)", defaultVolume: 45 },
    { instrument: "SP", label: "Splash (SP)", defaultVolume: 45 },
];

export function defaultInstrumentVolumes(): Record<string, number> {
    return Object.fromEntries(PLAYBACK_INSTRUMENT_MIX.map(({ instrument, defaultVolume }) => [instrument, defaultVolume]));
}

export function normalizeInstrumentVolumes(volumes?: Record<string, number>): Record<string, number> {
    const normalized = defaultInstrumentVolumes();
    PLAYBACK_INSTRUMENT_MIX.forEach(({ instrument }) => {
        const value = volumes?.[instrument];
        if (typeof value === "number" && Number.isFinite(value)) normalized[instrument] = Math.max(0, Math.min(150, value));
    });
    return normalized;
}

export function instrumentVolumeGain(volumes: Record<string, number>, instrument: string): number {
    return Math.max(0, Math.min(150, volumes[instrument] ?? 100)) / 100;
}
