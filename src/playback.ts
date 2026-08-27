import { setIcon } from "obsidian";
import { DrumDocument, DrumEvent } from "./types";
import { buildPlaybackSchedule } from "./playbackSchedule";
import { createSVGElement } from "./renderer/svgHelper";
import { defaultInstrumentVolumes, instrumentVolumeGain, normalizeInstrumentVolumes } from "./playbackMix";
import {
    DEFAULT_METRONOME_ACCENT_VOICE,
    DEFAULT_METRONOME_BEAT_VOICE,
    DEFAULT_METRONOME_VOLUME,
    normalizeMetronomeVoice,
    normalizeMetronomeVolume,
    scheduleMetronomeVoice,
} from "./metronome";
import {
    defaultPlaybackKitRegistry,
    KitAudioHost,
    PlaybackKit,
    PlaybackKitDescriptor,
    PlaybackKitRegistry,
    PlaybackSource,
} from "./playbackKits";

export interface PlaybackControls {
    destroy(): void;
    stop(): void;
}

export class DrumPlaybackManager {
    private context?: AudioContext;
    private noise?: AudioBuffer;
    private active?: PlaybackControls;
    private readonly sources = new Set<PlaybackSource>();
    private instrumentVolumes = defaultInstrumentVolumes();
    private metronomeVolume = DEFAULT_METRONOME_VOLUME;
    private metronomeAccentVoice = DEFAULT_METRONOME_ACCENT_VOICE;
    private metronomeBeatVoice = DEFAULT_METRONOME_BEAT_VOICE;

    constructor(private readonly kitRegistry: PlaybackKitRegistry = defaultPlaybackKitRegistry()) {}

    registerKit(kit: PlaybackKit): void {
        this.kitRegistry.register(kit);
    }

    kits(): PlaybackKitDescriptor[] {
        return this.kitRegistry.descriptors();
    }

    setInstrumentVolumes(volumes: Record<string, number>): void {
        this.instrumentVolumes = normalizeInstrumentVolumes(volumes);
    }

    setMetronomeSettings(volume: number, accentVoice: string, beatVoice: string): void {
        this.metronomeVolume = normalizeMetronomeVolume(volume);
        this.metronomeAccentVoice = normalizeMetronomeVoice(accentVoice, DEFAULT_METRONOME_ACCENT_VOICE);
        this.metronomeBeatVoice = normalizeMetronomeVoice(beatVoice, DEFAULT_METRONOME_BEAT_VOICE);
    }

    async previewMetronomeVoice(voice: string): Promise<void> {
        const context = await this.audioContext();
        scheduleMetronomeVoice(this.audioHost(context, ""), context.currentTime + 0.02, voice, this.metronomeVolume);
    }

    async previewKit(kitId: string): Promise<void> {
        const context = await this.audioContext();
        await this.prepareKit(context, kitId);
        const start = context.currentTime + 0.04;
        const hits: readonly [instrument: string, offset: number, articulation?: DrumEvent["articulation"]][] = [
            ["BD", 0], ["HH", 0.22], ["SD", 0.44, "accent"], ["HH", 0.66],
            ["BD", 0.88], ["HT", 1.1], ["FT", 1.32], ["RC", 1.54],
        ];
        hits.forEach(([instrument, offset, articulation = "normal"]) => this.scheduleHit(context, {
            instrument,
            voice: instrument === "BD" ? "lower" : "upper",
            measure: 0,
            tick: 0,
            durationTicks: 12,
            symbol: instrument === "BD" || instrument === "SD" ? "o" : "x",
            articulation,
            source: { line: 1, column: 1 },
        }, start + offset, kitId));
    }

    claim(controls: PlaybackControls): void {
        if (this.active !== controls) this.active?.stop();
        this.active = controls;
    }

    release(controls: PlaybackControls): void {
        if (this.active === controls) this.active = undefined;
    }

    async audioContext(): Promise<AudioContext> {
        this.context ??= new AudioContext();
        if (this.context.state === "suspended") await this.context.resume();
        return this.context;
    }

    stopAudio(): void {
        this.sources.forEach(source => {
            try { source.stop(); } catch { /* The source may already have ended. */ }
        });
        this.sources.clear();
    }

    destroy(): void {
        this.active?.stop();
        this.stopAudio();
        if (this.context) void this.context.close();
        this.context = undefined;
        this.noise = undefined;
    }

    async prepareKit(context: AudioContext, kitId: string): Promise<void> {
        await (this.kitRegistry.get(kitId) ?? this.kitRegistry.get("synth"))?.prepare(context);
    }

    scheduleHit(context: AudioContext, event: DrumEvent, at: number, kitId: string): void {
        const kit = this.kitRegistry.get(kitId) ?? this.kitRegistry.get("synth");
        if (!kit) return;
        const host = this.audioHost(context, event.instrument);
        const velocity = event.articulation === "ghost" ? 0.38
            : event.articulation === "accent" || event.articulation === "accent-open" ? 1.15 : 0.82;
        const graceSpacing = 0.055;
        if (event.ornament === "flam") kit.hit(host, event, at - graceSpacing, velocity * 0.48);
        if (event.ornament === "drag") {
            kit.hit(host, event, at - graceSpacing * 1.7, velocity * 0.38);
            kit.hit(host, event, at - graceSpacing * 0.8, velocity * 0.44);
        }
        if (event.ornament === "roll") {
            kit.hit(host, event, at, velocity * 0.72);
            kit.hit(host, event, at + 0.045, velocity * 0.72);
            kit.hit(host, event, at + 0.09, velocity * 0.72);
            return;
        }
        kit.hit(host, event, at, velocity);
    }

    scheduleClick(context: AudioContext, at: number, accent: boolean): void {
        scheduleMetronomeVoice(
            this.audioHost(context, ""),
            at,
            accent ? this.metronomeAccentVoice : this.metronomeBeatVoice,
            this.metronomeVolume,
        );
    }

    private track(source: PlaybackSource): void {
        this.sources.add(source);
        source.addEventListener("ended", () => this.sources.delete(source), { once: true });
    }

    private noiseBuffer(context: AudioContext): AudioBuffer {
        if (this.noise && this.noise.sampleRate === context.sampleRate) return this.noise;
        const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
        const data = buffer.getChannelData(0);
        for (let index = 0; index < data.length; index++) data[index] = Math.random() * 2 - 1;
        this.noise = buffer;
        return buffer;
    }

    private audioHost(context: AudioContext, instrument: string): KitAudioHost {
        return {
            context,
            destination: context.destination,
            instrumentGain: instrumentVolumeGain(this.instrumentVolumes, instrument),
            noiseBuffer: () => this.noiseBuffer(context),
            track: source => this.track(source),
        };
    }
}

export function createPlaybackControls(
    documentModel: DrumDocument,
    container: HTMLElement,
    manager: DrumPlaybackManager,
): PlaybackControls {
    const controls = container.createDiv({ cls: "drum-playback-controls" });
    const playButton = controls.createEl("button", { cls: "drum-playback-button", attr: { type: "button", "aria-label": "Play drum notation" } });
    setIcon(playButton, "play");
    const kitLabel = controls.createEl("label", { cls: "drum-kit-control" });
    kitLabel.createSpan({ text: "Kit" });
    const kitSelect = kitLabel.createEl("select", { attr: { "aria-label": "Playback kit" } });
    const availableKits = manager.kits();
    availableKits.forEach(kit => kitSelect.createEl("option", { text: kit.label, attr: { value: kit.id } }));
    kitSelect.value = availableKits[0]?.id ?? "synth";
    const kitPreviewButton = controls.createEl("button", {
        cls: "drum-kit-preview-button",
        attr: { type: "button", "aria-label": "Preview selected playback kit", title: "Preview selected kit" },
    });
    setIcon(kitPreviewButton, "volume-2");
    const tempoLabel = controls.createEl("label", { cls: "drum-tempo-control" });
    tempoLabel.createSpan({ text: "BPM" });
    const tempoInput = tempoLabel.createEl("input", {
        attr: { type: "number", min: "20", max: "300", step: "1", value: documentModel.tempo.toString(), inputmode: "numeric", "aria-label": "Playback tempo in bpm" },
    });
    const metronomeLabel = controls.createEl("label", { cls: "drum-metronome-control" });
    const metronomeInput = metronomeLabel.createEl("input", { attr: { type: "checkbox", "aria-label": "Metronome" } });
    metronomeInput.checked = true;
    metronomeLabel.createSpan({ text: "Metrónomo" });
    const status = controls.createSpan({ cls: "drum-playback-status", text: "Listo" });

    let playing = false;
    let destroyed = false;
    let animationFrame = 0;
    let finishTimer = 0;
    let startTime = 0;
    let secondsPerPulse = 0;
    let context: AudioContext | undefined;

    const clearCursors = () => container.querySelectorAll(".drum-playback-cursor.is-active").forEach(cursor => cursor.classList.remove("is-active"));

    const stop = () => {
        if (!playing) {
            manager.release(api);
            return;
        }
        playing = false;
        manager.stopAudio();
        manager.release(api);
        if (animationFrame !== 0) container.ownerDocument.defaultView?.cancelAnimationFrame(animationFrame);
        if (finishTimer !== 0) container.ownerDocument.defaultView?.clearTimeout(finishTimer);
        animationFrame = 0;
        finishTimer = 0;
        clearCursors();
        setIcon(playButton, "play");
        playButton.setAttribute("aria-label", "Play drum notation");
        status.textContent = "Listo";
    };

    const updateCursor = () => {
        if (!playing || !context) return;
        const elapsedPulses = Math.max(0, (context.currentTime - startTime) / secondsPerPulse);
        let measureIndex = 0;
        let pulseInMeasure = elapsedPulses;
        while (measureIndex < documentModel.measures.length && pulseInMeasure >= (documentModel.measures[measureIndex]?.beats ?? 0)) {
            pulseInMeasure -= documentModel.measures[measureIndex]?.beats ?? 0;
            measureIndex++;
        }
        clearCursors();
        const anchor = container.querySelector<SVGLineElement>(`.drum-measure-anchor[data-measure="${measureIndex}"]`);
        if (anchor?.ownerSVGElement) {
            let cursor = anchor.ownerSVGElement.querySelector<SVGLineElement>(`.drum-playback-cursor[data-measure="${measureIndex}"]`);
            if (!cursor) {
                cursor = createSVGElement(container.ownerDocument, "line");
                cursor.classList.add("drum-playback-cursor");
                cursor.dataset.measure = measureIndex.toString();
                const anchorTop = Number(anchor.getAttribute("y1") ?? 0);
                const anchorBottom = Number(anchor.getAttribute("y2") ?? anchorTop);
                cursor.setAttribute("y1", (anchorTop - 10).toString());
                cursor.setAttribute("y2", (anchorBottom + 10).toString());
                anchor.ownerSVGElement.appendChild(cursor);
            }
            const left = Number(anchor.dataset.left ?? 0);
            const right = Number(anchor.dataset.right ?? left);
            const beats = documentModel.measures[measureIndex]?.beats ?? 1;
            const x = left + Math.min(1, pulseInMeasure / beats) * (right - left);
            cursor.setAttribute("x1", x.toString());
            cursor.setAttribute("x2", x.toString());
            cursor.classList.add("is-active");
        }
        status.textContent = measureIndex < documentModel.measures.length
            ? `Compás ${measureIndex + 1} · ${Math.floor(pulseInMeasure) + 1}` : "Listo";
        animationFrame = container.ownerDocument.defaultView?.requestAnimationFrame(updateCursor) ?? 0;
    };

    const play = async () => {
        if (playing || destroyed) return;
        const rawTempo = Number.parseInt(tempoInput.value, 10);
        const tempo = Math.max(20, Math.min(300, Number.isFinite(rawTempo) ? rawTempo : documentModel.tempo));
        tempoInput.value = tempo.toString();
        playing = true;
        manager.stopAudio();
        manager.claim(api);
        try {
            context = await manager.audioContext();
            status.textContent = "Cargando kit…";
            await manager.prepareKit(context, kitSelect.value);
        } catch {
            playing = false;
            status.textContent = "Kit no disponible";
            manager.release(api);
            return;
        }
        if (!playing || destroyed) return;
        secondsPerPulse = 60 / tempo;
        startTime = context.currentTime + 0.06;
        buildPlaybackSchedule(documentModel, tempo, metronomeInput.checked).forEach(item => {
            const at = startTime + item.timeSeconds;
            if (item.kind === "hit") manager.scheduleHit(context!, item.event, at, kitSelect.value);
            else manager.scheduleClick(context!, at, item.accent);
        });
        setIcon(playButton, "square");
        playButton.setAttribute("aria-label", "Stop playback");
        updateCursor();
        const totalPulses = documentModel.measures.reduce((sum, measure) => sum + measure.beats, 0);
        const durationMs = (totalPulses * secondsPerPulse + 0.2) * 1000;
        finishTimer = container.ownerDocument.defaultView?.setTimeout(stop, durationMs) ?? 0;
    };

    const api: PlaybackControls = {
        stop,
        destroy() {
            destroyed = true;
            stop();
            controls.remove();
        },
    };
    playButton.addEventListener("click", () => playing ? stop() : void play());
    tempoInput.addEventListener("change", () => {
        const tempo = Math.max(20, Math.min(300, Number.parseInt(tempoInput.value, 10) || documentModel.tempo));
        tempoInput.value = tempo.toString();
        if (playing) {
            stop();
            void play();
        }
    });
    kitSelect.addEventListener("change", () => {
        if (playing) {
            stop();
            void play();
        }
    });
    kitPreviewButton.addEventListener("click", () => {
        if (playing) stop();
        manager.stopAudio();
        manager.claim(api);
        kitPreviewButton.disabled = true;
        status.textContent = "Cargando kit…";
        void manager.previewKit(kitSelect.value)
            .then(() => {
                if (!destroyed) status.textContent = "Audición del kit";
            })
            .catch(() => {
                if (!destroyed) status.textContent = "Kit no disponible";
            })
            .finally(() => {
                if (!destroyed) kitPreviewButton.disabled = false;
            });
    });
    return api;
}
