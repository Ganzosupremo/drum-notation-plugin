import { MarkdownRenderChild, Notice, Plugin, TFile, TFolder } from "obsidian";
import { parseDrumDocument } from "./notation/parseDocument";
import { renderDrumDocument, RenderedDocument } from "./renderer/renderDocument";
import { DEFAULT_SETTINGS, DrumNotationSettings, DrumNotationSettingTab } from "./settings";
import { createPlaybackControls, DrumPlaybackManager, PlaybackControls } from "./playback";
import { bundledPlaybackKits } from "./bundledPlaybackKits";
import { normalizeInstrumentVolumes } from "./playbackMix";
import {
    DEFAULT_METRONOME_ACCENT_VOICE,
    DEFAULT_METRONOME_BEAT_VOICE,
    normalizeMetronomeVoice,
    normalizeMetronomeVolume,
} from "./metronome";
import {
    CUSTOM_SAMPLE_FOLDER,
    customSampleMappings,
    isSupportedAudioFileName,
    normalizeCustomSamples,
    safeSampleFileName,
} from "./customSamples";
import { SamplePlaybackKit, SynthPlaybackKit } from "./playbackKits";

class DrumRenderChild extends MarkdownRenderChild {
    constructor(
        containerEl: HTMLElement,
        private readonly rendered: RenderedDocument,
        private readonly playback: PlaybackControls,
        private readonly registry: Set<RenderedDocument>,
    ) {
        super(containerEl);
    }

    onunload(): void {
        this.playback.destroy();
        this.rendered.destroy();
        this.registry.delete(this.rendered);
    }
}

export default class DrumNotationPlugin extends Plugin {
    settings: DrumNotationSettings = { ...DEFAULT_SETTINGS };
    private readonly renderedDocuments = new Set<RenderedDocument>();
    private readonly playbackManager = new DrumPlaybackManager();
    private customKit?: SamplePlaybackKit;
    private samplePreview?: HTMLAudioElement;

    async onload(): Promise<void> {
        const saved = await this.loadData() as Partial<DrumNotationSettings> | null;
        this.settings = Object.assign({}, DEFAULT_SETTINGS, saved ?? {});
        this.settings.instrumentPositions = {
            ...DEFAULT_SETTINGS.instrumentPositions,
            ...(saved?.instrumentPositions ?? {}),
        };
        this.settings.instrumentVolumes = normalizeInstrumentVolumes(saved?.instrumentVolumes);
        this.settings.metronomeVolume = normalizeMetronomeVolume(saved?.metronomeVolume);
        this.settings.metronomeAccentVoice = normalizeMetronomeVoice(saved?.metronomeAccentVoice, DEFAULT_METRONOME_ACCENT_VOICE);
        this.settings.metronomeBeatVoice = normalizeMetronomeVoice(saved?.metronomeBeatVoice, DEFAULT_METRONOME_BEAT_VOICE);
        this.settings.customSamples = normalizeCustomSamples(saved?.customSamples);
        this.playbackManager.setInstrumentVolumes(this.settings.instrumentVolumes);
        this.updateMetronomeSettings();
        this.addSettingTab(new DrumNotationSettingTab(this.app, this));
        bundledPlaybackKits().forEach(kit => this.playbackManager.registerKit(kit));
        this.customKit = new SamplePlaybackKit({
            id: "custom-vault",
            label: "Custom · Vault",
            samples: customSampleMappings(this.settings.customSamples),
            loadSample: async path => {
                const file = this.app.vault.getAbstractFileByPath(path);
                if (!(file instanceof TFile)) throw new Error(`Custom sample not found: ${path}`);
                return this.app.vault.readBinary(file);
            },
        }, new SynthPlaybackKit());
        this.playbackManager.registerKit(this.customKit);

        this.registerMarkdownCodeBlockProcessor("drums", (source, el, ctx) => {
            try {
                const sectionInfo = ctx.getSectionInfo(el);
                const firstLine = sectionInfo?.text?.split("\n")[0] ?? "";
                const infoMatch = firstLine.match(/^```drums\s*(.*)$/i);
                const headerLine = infoMatch?.[1]?.trim() || undefined;
                const documentModel = parseDrumDocument(
                    source,
                    headerLine,
                    this.settings.beatsPerBar,
                );
                const playback = createPlaybackControls(documentModel, el, this.playbackManager);
                const rendered = renderDrumDocument(documentModel, el, this.renderOptions());
                this.renderedDocuments.add(rendered);
                ctx.addChild(new DrumRenderChild(el, rendered, playback, this.renderedDocuments));
            } catch (error) {
                const message = error instanceof Error ? error.message : "Unknown error";
                el.createEl("p", {
                    text: `Error rendering drum notation: ${message}`,
                    cls: "drum-diagnostic-error",
                });
            }
        });
    }

    private renderOptions() {
        return {
            scale: this.settings.notationScale / 100,
            showLabels: this.settings.showInstrumentLabels,
            showCount: this.settings.showCount,
            instrumentPositions: this.settings.instrumentPositions,
        };
    }

    async saveSettings(): Promise<void> {
        await this.saveData(this.settings);
    }

    updatePlaybackMix(): void {
        this.playbackManager.setInstrumentVolumes(this.settings.instrumentVolumes);
    }

    updateMetronomeSettings(): void {
        this.playbackManager.setMetronomeSettings(
            this.settings.metronomeVolume,
            this.settings.metronomeAccentVoice,
            this.settings.metronomeBeatVoice,
        );
    }

    async previewMetronomeVoice(voice: string): Promise<void> {
        await this.playbackManager.previewMetronomeVoice(voice);
    }

    updateCustomKit(): void {
        this.customKit?.updateSamples(customSampleMappings(this.settings.customSamples));
    }

    async previewCustomSample(path: string): Promise<void> {
        const file = this.app.vault.getAbstractFileByPath(path);
        if (!(file instanceof TFile)) {
            new Notice(`Custom sample not found: ${path}`);
            return;
        }
        this.samplePreview?.pause();
        const preview = new Audio(this.app.vault.getResourcePath(file));
        preview.volume = 0.75;
        this.samplePreview = preview;
        preview.addEventListener("ended", () => {
            if (this.samplePreview === preview) this.samplePreview = undefined;
        }, { once: true });
        try {
            await preview.play();
        } catch {
            if (this.samplePreview === preview) this.samplePreview = undefined;
            new Notice(`Unable to preview: ${path}`);
        }
    }

    async importCustomSample(file: File): Promise<string | undefined> {
        if (!isSupportedAudioFileName(file.name)) {
            new Notice("Unsupported audio format. Use wav, mp3, ogg, flac, m4a, aac, or webm.");
            return undefined;
        }
        if (file.size > 25 * 1024 * 1024) {
            new Notice("The sample is larger than 25 mb. Choose a shorter one-shot audio file.");
            return undefined;
        }
        const existingFolder = this.app.vault.getAbstractFileByPath(CUSTOM_SAMPLE_FOLDER);
        if (existingFolder && !(existingFolder instanceof TFolder)) {
            new Notice(`Cannot import samples because “${CUSTOM_SAMPLE_FOLDER}” is already a file.`);
            return undefined;
        }
        if (!existingFolder) await this.app.vault.createFolder(CUSTOM_SAMPLE_FOLDER);

        const safeName = safeSampleFileName(file.name);
        const dot = safeName.lastIndexOf(".");
        const stem = dot > 0 ? safeName.slice(0, dot) : safeName;
        const extension = dot > 0 ? safeName.slice(dot) : "";
        let path = `${CUSTOM_SAMPLE_FOLDER}/${safeName}`;
        let suffix = 2;
        while (this.app.vault.getAbstractFileByPath(path)) {
            path = `${CUSTOM_SAMPLE_FOLDER}/${stem} (${suffix})${extension}`;
            suffix++;
        }
        await this.app.vault.createBinary(path, await file.arrayBuffer());
        new Notice(`Imported sample: ${path}`);
        return path;
    }

    refreshRenderers(): void {
        const options = this.renderOptions();
        this.renderedDocuments.forEach(rendered => rendered.updateOptions(options));
    }

    onunload(): void {
        this.samplePreview?.pause();
        this.samplePreview = undefined;
        this.playbackManager.destroy();
        this.renderedDocuments.forEach(rendered => rendered.destroy());
        this.renderedDocuments.clear();
    }
}
