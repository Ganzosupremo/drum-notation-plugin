import { DrumEvent } from "./types";

export type PlaybackSource = AudioBufferSourceNode | OscillatorNode;

export interface KitAudioHost {
    context: AudioContext;
    destination: AudioNode;
    instrumentGain: number;
    noiseBuffer(): AudioBuffer;
    track(source: PlaybackSource): void;
}

export interface PlaybackKitDescriptor {
    id: string;
    label: string;
    type: "synth" | "samples";
}

export interface PlaybackKit extends PlaybackKitDescriptor {
    prepare(context: AudioContext): Promise<void>;
    hit(host: KitAudioHost, event: DrumEvent, at: number, velocity: number): void;
}

export interface SampleLayer {
    url: string;
    gain?: number;
    minVelocity?: number;
    maxVelocity?: number;
    playbackRate?: number;
}

export type SampleMapping = string | SampleLayer | SampleLayer[];

export interface SampleKitDefinition {
    id: string;
    label: string;
    samples: Record<string, SampleMapping>;
    gain?: number;
    loadSample(url: string): Promise<ArrayBuffer>;
}

export function sampleKeysFor(event: Pick<DrumEvent, "instrument" | "technique" | "articulation">): string[] {
    const keys: string[] = [];
    if (event.technique) keys.push(`${event.instrument}:${event.technique}`);
    if (event.instrument === "HH" && (event.articulation === "open" || event.articulation === "accent-open")) {
        keys.push("HH:open");
    }
    keys.push(event.instrument);
    return [...new Set(keys)];
}

function normalizedLayers(mapping: SampleMapping): SampleLayer[] {
    if (typeof mapping === "string") return [{ url: mapping }];
    return Array.isArray(mapping) ? mapping : [mapping];
}

export class PlaybackKitRegistry {
    private readonly kits = new Map<string, PlaybackKit>();

    constructor(kits: PlaybackKit[] = []) {
        kits.forEach(kit => this.register(kit));
    }

    register(kit: PlaybackKit): void {
        if (!/^[a-z0-9][a-z0-9-]*$/.test(kit.id)) throw new Error(`Invalid playback kit id "${kit.id}".`);
        if (this.kits.has(kit.id)) throw new Error(`Playback kit "${kit.id}" is already registered.`);
        this.kits.set(kit.id, kit);
    }

    get(id: string): PlaybackKit | undefined {
        return this.kits.get(id);
    }

    descriptors(): PlaybackKitDescriptor[] {
        return [...this.kits.values()].map(({ id, label, type }) => ({ id, label, type }));
    }
}

export class SynthPlaybackKit implements PlaybackKit {
    readonly id = "synth";
    readonly label = "Sintetizado";
    readonly type = "synth" as const;

    async prepare(_context: AudioContext): Promise<void> {
        await Promise.resolve();
    }

    hit(host: KitAudioHost, event: DrumEvent, at: number, velocity: number): void {
        if (host.instrumentGain <= 0) return;
        const { context } = host;
        const safeAt = Math.max(context.currentTime, at);
        const mixedVelocity = velocity * host.instrumentGain;
        if (event.instrument === "BD") {
            this.tonalHit(host, safeAt, 145, 48, 0.24, 0.62 * mixedVelocity);
            return;
        }
        const tomFrequency = event.instrument === "HT" ? 210 : event.instrument === "MT" ? 155 : event.instrument === "FT" ? 105 : undefined;
        if (tomFrequency) {
            this.tonalHit(host, safeAt, tomFrequency * 1.35, tomFrequency, 0.32, 0.42 * mixedVelocity);
            return;
        }
        if (event.instrument === "SD") {
            if (event.technique === "cross-stick") {
                this.tonalHit(host, safeAt, 950, 620, 0.045, 0.28 * mixedVelocity, "triangle");
                return;
            }
            this.noiseHit(host, safeAt, event.technique === "rimshot" ? 1200 : 850, 0.16, 0.34 * mixedVelocity, "bandpass");
            this.tonalHit(host, safeAt, event.technique === "rimshot" ? 230 : 185, 165, 0.11, 0.18 * mixedVelocity, "triangle");
            return;
        }
        if (event.instrument === "HH" || event.instrument === "HF") {
            const open = event.instrument === "HH" && (event.articulation === "open" || event.articulation === "accent-open");
            this.noiseHit(host, safeAt, 6500, open ? 0.42 : 0.07, 0.17 * mixedVelocity, "highpass");
            return;
        }
        if (event.instrument === "RC" && event.technique === "bell") {
            this.tonalHit(host, safeAt, 1250, 980, 0.25, 0.2 * mixedVelocity, "triangle");
            return;
        }
        this.noiseHit(host, safeAt, event.instrument === "RC" ? 4200 : 3600, event.instrument === "RC" ? 0.38 : 0.55, 0.2 * mixedVelocity, "highpass");
    }

    private tonalHit(
        host: KitAudioHost,
        at: number,
        startFrequency: number,
        endFrequency: number,
        duration: number,
        volume: number,
        type: OscillatorType = "sine",
    ): void {
        const oscillator = host.context.createOscillator();
        const gain = host.context.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(startFrequency, at);
        oscillator.frequency.exponentialRampToValueAtTime(endFrequency, at + Math.min(0.08, duration));
        gain.gain.setValueAtTime(Math.max(0.0001, volume), at);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
        oscillator.connect(gain).connect(host.destination);
        oscillator.start(at);
        oscillator.stop(at + duration + 0.01);
        host.track(oscillator);
    }

    private noiseHit(
        host: KitAudioHost,
        at: number,
        frequency: number,
        duration: number,
        volume: number,
        filterType: BiquadFilterType,
    ): void {
        const source = host.context.createBufferSource();
        const filter = host.context.createBiquadFilter();
        const gain = host.context.createGain();
        source.buffer = host.noiseBuffer();
        filter.type = filterType;
        filter.frequency.setValueAtTime(frequency, at);
        filter.Q.setValueAtTime(filterType === "bandpass" ? 0.8 : 0.3, at);
        gain.gain.setValueAtTime(Math.max(0.0001, volume), at);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
        source.connect(filter).connect(gain).connect(host.destination);
        source.start(at);
        source.stop(at + duration + 0.01);
        host.track(source);
    }
}

export class SamplePlaybackKit implements PlaybackKit {
    readonly type = "samples" as const;
    readonly id: string;
    readonly label: string;
    private readonly gain: number;
    private readonly loadSample: SampleKitDefinition["loadSample"];
    private readonly mappings = new Map<string, SampleLayer[]>();
    private buffers: SampleBufferCache;

    constructor(
        definition: SampleKitDefinition,
        private readonly fallback: PlaybackKit = new SynthPlaybackKit(),
        buffers: SampleBufferCache = new WeakMap(),
    ) {
        this.id = definition.id;
        this.label = definition.label;
        this.gain = definition.gain ?? 1;
        this.loadSample = url => definition.loadSample(url);
        this.buffers = buffers;
        this.setMappings(definition.samples);
    }

    updateSamples(samples: Record<string, SampleMapping>): void {
        this.mappings.clear();
        this.setMappings(samples);
        this.buffers = new WeakMap();
    }

    async prepare(context: AudioContext): Promise<void> {
        await Promise.all([...this.mappings.values()].flat().map(layer => this.load(context, layer.url)));
    }

    hit(host: KitAudioHost, event: DrumEvent, at: number, velocity: number): void {
        if (host.instrumentGain <= 0) return;
        const layers = sampleKeysFor(event).flatMap(key => this.mappings.get(key) ?? []);
        const layer = layers.find(candidate => velocity >= (candidate.minVelocity ?? 0) && velocity <= (candidate.maxVelocity ?? 1.25)) ?? layers[0];
        const bufferPromise = layer ? this.contextBuffers(host.context).get(layer.url) : undefined;
        if (!layer || !bufferPromise) {
            this.fallback.hit(host, event, at, velocity);
            return;
        }
        void bufferPromise.then(buffer => {
            if (!buffer) {
                this.fallback.hit(host, event, at, velocity);
                return;
            }
            const source = host.context.createBufferSource();
            const gain = host.context.createGain();
            source.buffer = buffer;
            source.playbackRate.setValueAtTime(layer.playbackRate ?? 1, Math.max(host.context.currentTime, at));
            gain.gain.setValueAtTime(Math.max(0.0001, velocity * host.instrumentGain * this.gain * (layer.gain ?? 1)), Math.max(host.context.currentTime, at));
            source.connect(gain).connect(host.destination);
            source.start(Math.max(host.context.currentTime, at));
            host.track(source);
        });
    }

    private contextBuffers(context: AudioContext): Map<string, Promise<AudioBuffer | undefined>> {
        let buffers = this.buffers.get(context);
        if (!buffers) {
            buffers = new Map();
            this.buffers.set(context, buffers);
        }
        return buffers;
    }

    private setMappings(samples: Record<string, SampleMapping>): void {
        Object.entries(samples).forEach(([key, mapping]) => this.mappings.set(key, normalizedLayers(mapping)));
    }

    private load(context: AudioContext, url: string): Promise<AudioBuffer | undefined> {
        const buffers = this.contextBuffers(context);
        const existing = buffers.get(url);
        if (existing) return existing;
        const loaded = this.loadSample(url)
            .then(data => context.decodeAudioData(data))
            .catch(() => undefined);
        buffers.set(url, loaded);
        return loaded;
    }
}

export type SampleBufferCache = WeakMap<AudioContext, Map<string, Promise<AudioBuffer | undefined>>>;

export function defaultPlaybackKitRegistry(): PlaybackKitRegistry {
    return new PlaybackKitRegistry([new SynthPlaybackKit()]);
}
