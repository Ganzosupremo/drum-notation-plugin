import { App, FuzzySuggestModal, Notice, PluginSettingTab, Setting, TFile, type SettingDefinitionItem } from "obsidian";
import DrumNotationPlugin from "./main";
import { defaultInstrumentPositions, normalizeInstrument } from "./notation/instruments";
import { defaultInstrumentVolumes, PLAYBACK_INSTRUMENT_MIX } from "./playbackMix";
import {
    DEFAULT_METRONOME_ACCENT_VOICE,
    DEFAULT_METRONOME_BEAT_VOICE,
    DEFAULT_METRONOME_VOLUME,
    METRONOME_VOICES,
} from "./metronome";
import { CUSTOM_SAMPLE_ACCEPT, CUSTOM_SAMPLE_TARGETS, isSupportedAudioFile } from "./customSamples";

export interface DrumNotationSettings {
    beatsPerBar: number;
    notationScale: number;
    showInstrumentLabels: boolean;
    showCount: boolean;
    instrumentPositions: Record<string, number>;
    instrumentVolumes: Record<string, number>;
    metronomeVolume: number;
    metronomeAccentVoice: string;
    metronomeBeatVoice: string;
    customSamples: Record<string, string>;
}

export const DEFAULT_SETTINGS: DrumNotationSettings = {
    beatsPerBar: 4,
    notationScale: 100,
    showInstrumentLabels: false,
    showCount: false,
    instrumentPositions: defaultInstrumentPositions(),
    instrumentVolumes: defaultInstrumentVolumes(),
    metronomeVolume: DEFAULT_METRONOME_VOLUME,
    metronomeAccentVoice: DEFAULT_METRONOME_ACCENT_VOICE,
    metronomeBeatVoice: DEFAULT_METRONOME_BEAT_VOICE,
    customSamples: {},
};

class AudioFileSuggestModal extends FuzzySuggestModal<TFile> {
    constructor(app: App, private readonly choose: (file: TFile) => void) {
        super(app);
        this.setPlaceholder("Choose an audio file from this vault…");
    }

    getItems(): TFile[] {
        return this.app.vault.getFiles().filter(isSupportedAudioFile);
    }

    getItemText(file: TFile): string {
        return file.path;
    }

    onChooseItem(file: TFile): void {
        this.choose(file);
    }
}

interface SettingRowDefinition {
    name: string;
    desc: string;
    render(setting: Setting): void;
}

export class DrumNotationSettingTab extends PluginSettingTab {
    private readonly volumeSliderUpdates = new Map<string, (value: number) => void>();
    private readonly customSampleButtonUpdates = new Map<string, (path: string | undefined) => void>();

    constructor(app: App, private readonly plugin: DrumNotationPlugin) {
        super(app, plugin);
    }

    getSettingDefinitions(): SettingDefinitionItem[] {
        return this.settingRows().map(row => ({
            name: row.name,
            desc: row.desc,
            render: setting => row.render(setting),
        }));
    }

    display(): void {
        this.renderSettings();
    }

    private renderSettings(): void {
        this.volumeSliderUpdates.clear();
        this.customSampleButtonUpdates.clear();
        this.containerEl.empty();
        this.settingRows().forEach(row => {
            const setting = new Setting(this.containerEl)
                .setName(row.name)
                .setDesc(row.desc);
            row.render(setting);
        });
    }

    private settingRows(): SettingRowDefinition[] {
        return [
            {
                name: "Show instrument labels",
                desc: "Display the short instrument code (hh, sd, bd...) below the first system.",
                render: setting => {
                    setting.addToggle(toggle => toggle
                        .setValue(this.plugin.settings.showInstrumentLabels)
                        .onChange(async value => {
                            this.plugin.settings.showInstrumentLabels = value;
                            await this.plugin.saveSettings();
                            this.plugin.refreshRenderers();
                        }));
                },
            },
            {
                name: "Show subdivision count",
                desc: "Display beat counting above the staff. Practice-style blocks always show it.",
                render: setting => {
                    setting.addToggle(toggle => toggle
                        .setValue(this.plugin.settings.showCount)
                        .onChange(async value => {
                            this.plugin.settings.showCount = value;
                            await this.plugin.saveSettings();
                            this.plugin.refreshRenderers();
                        }));
                },
            },
            {
                name: "Playback instrument volumes",
                desc: "Individual playback levels. These affect synthesized and acoustic kits (0%-150%).",
                render: setting => {
                    setting.addExtraButton(button => button
                        .setIcon("reset")
                        .setTooltip("Reset all playback volumes")
                        .onClick(async () => {
                            this.plugin.settings.instrumentVolumes = defaultInstrumentVolumes();
                            Object.entries(this.plugin.settings.instrumentVolumes).forEach(([instrument, value]) => {
                                this.volumeSliderUpdates.get(instrument)?.(value);
                            });
                            this.plugin.updatePlaybackMix();
                            await this.plugin.saveSettings();
                        }));
                },
            },
            ...PLAYBACK_INSTRUMENT_MIX.map(({ instrument, label, defaultVolume }) => ({
                name: label,
                desc: `Playback volume for ${instrument}. Default: ${defaultVolume}%.`,
                render: (setting: Setting) => {
                    setting.addSlider(slider => {
                        this.volumeSliderUpdates.set(instrument, value => {
                            slider.setValue(value);
                        });
                        slider.setLimits(0, 150, 5)
                            .setValue(this.plugin.settings.instrumentVolumes[instrument] ?? defaultVolume)
                            .onChange(async value => {
                                this.plugin.settings.instrumentVolumes[instrument] = value;
                                this.plugin.updatePlaybackMix();
                                await this.plugin.saveSettings();
                            });
                    });
                },
            })),
            {
                name: "Custom kit samples",
                desc: "Map audio files stored inside this vault. Unmapped sounds use the synthesized fallback, and BRAT updates do not remove your files.",
                render: setting => {
                    setting.addExtraButton(button => button
                        .setIcon("reset")
                        .setTooltip("Clear all custom sample mappings")
                        .onClick(async () => {
                            this.plugin.settings.customSamples = {};
                            CUSTOM_SAMPLE_TARGETS.forEach(target => this.customSampleButtonUpdates.get(target.key)?.(undefined));
                            this.plugin.updateCustomKit();
                            await this.plugin.saveSettings();
                        }));
                },
            },
            ...CUSTOM_SAMPLE_TARGETS.map(target => ({
                name: target.label,
                desc: `Custom kit mapping for ${target.key}.`,
                render: (setting: Setting) => this.renderCustomSample(setting, target.key),
            })),
            {
                name: "Metronome volume",
                desc: `Overall metronome level (0%-150%). Default: ${DEFAULT_METRONOME_VOLUME}%.`,
                render: setting => {
                    let updateSlider: ((value: number) => void) | undefined;
                    setting.addSlider(slider => {
                        updateSlider = value => {
                            slider.setValue(value);
                        };
                        slider.setLimits(0, 150, 5)
                            .setValue(this.plugin.settings.metronomeVolume)
                            .onChange(async value => {
                                this.plugin.settings.metronomeVolume = value;
                                this.plugin.updateMetronomeSettings();
                                await this.plugin.saveSettings();
                            });
                    }).addExtraButton(button => button
                        .setIcon("reset")
                        .setTooltip(`Reset to default (${DEFAULT_METRONOME_VOLUME}%)`)
                        .onClick(async () => {
                            this.plugin.settings.metronomeVolume = DEFAULT_METRONOME_VOLUME;
                            updateSlider?.(DEFAULT_METRONOME_VOLUME);
                            this.plugin.updateMetronomeSettings();
                            await this.plugin.saveSettings();
                        }));
                },
            },
            this.metronomeVoiceRow("Metronome first beat", "Sound used for the accented first beat.", "metronomeAccentVoice"),
            this.metronomeVoiceRow("Metronome regular beats", "Sound used for the remaining beats.", "metronomeBeatVoice"),
            {
                name: "Instrument staff positions",
                desc: "Half-space steps from the middle line, for example ch=-7, sp=-6, sd=-1. Block directives take precedence.",
                render: setting => this.renderInstrumentPositions(setting),
            },
            {
                name: "Beats per bar",
                desc: "Default time-signature numerator when a block does not declare a meter.",
                render: setting => {
                    setting.addText(text => text
                        .setPlaceholder("4")
                        .setValue(this.plugin.settings.beatsPerBar.toString())
                        .onChange(async value => {
                            const parsed = Number.parseInt(value, 10);
                            this.plugin.settings.beatsPerBar = Number.isFinite(parsed) && parsed > 0
                                ? parsed
                                : DEFAULT_SETTINGS.beatsPerBar;
                            await this.plugin.saveSettings();
                        }));
                },
            },
            {
                name: "Notation scale",
                desc: "Adjust the visual size of noteheads and stems (80%-150%).",
                render: setting => this.renderNotationScale(setting),
            },
        ];
    }

    private renderCustomSample(setting: Setting, key: string): void {
        let selectedPath = this.plugin.settings.customSamples[key];
        let updateButton: ((path: string | undefined) => void) | undefined;
        setting
            .addButton(button => {
                updateButton = path => {
                    selectedPath = path;
                    button.setButtonText(path?.split("/").pop() ?? "Choose audio…");
                    button.setTooltip(path ?? "Choose an audio file from this vault");
                };
                this.customSampleButtonUpdates.set(key, path => updateButton?.(path));
                updateButton(selectedPath);
                button.onClick(() => {
                    const audioFiles = this.app.vault.getFiles().filter(isSupportedAudioFile);
                    if (audioFiles.length === 0) {
                        new Notice("Add a wav, mp3, ogg, flac, m4a, aac, or webm audio file to this vault first.");
                        return;
                    }
                    new AudioFileSuggestModal(this.app, file => {
                        this.plugin.settings.customSamples[key] = file.path;
                        updateButton?.(file.path);
                        this.plugin.updateCustomKit();
                        void this.plugin.saveSettings();
                    }).open();
                });
            })
            .addExtraButton(button => button
                .setIcon("file-up")
                .setTooltip("Import an audio file into this vault")
                .onClick(() => this.openAudioImport(key, path => updateButton?.(path))))
            .addExtraButton(button => button
                .setIcon("volume-2")
                .setTooltip("Preview mapped sample")
                .onClick(() => {
                    if (selectedPath) void this.plugin.previewCustomSample(selectedPath);
                }))
            .addExtraButton(button => button
                .setIcon("x")
                .setTooltip("Clear this mapping")
                .onClick(async () => {
                    delete this.plugin.settings.customSamples[key];
                    updateButton?.(undefined);
                    this.plugin.updateCustomKit();
                    await this.plugin.saveSettings();
                }));
    }

    private openAudioImport(key: string, updateButton: (path: string) => void): void {
        const input = this.containerEl.createEl("input");
        input.type = "file";
        input.accept = CUSTOM_SAMPLE_ACCEPT;
        input.hidden = true;
        input.addEventListener("change", () => {
            const file = input.files?.[0];
            input.remove();
            if (!file) return;
            void this.plugin.importCustomSample(file).then(path => {
                if (!path) return;
                this.plugin.settings.customSamples[key] = path;
                updateButton(path);
                this.plugin.updateCustomKit();
                return this.plugin.saveSettings();
            }).catch(() => new Notice("Unable to import this audio file."));
        }, { once: true });
        input.addEventListener("cancel", () => input.remove(), { once: true });
        input.click();
    }

    private metronomeVoiceRow(
        name: string,
        desc: string,
        key: "metronomeAccentVoice" | "metronomeBeatVoice",
    ): SettingRowDefinition {
        return {
            name,
            desc,
            render: setting => {
                setting.addDropdown(dropdown => {
                    METRONOME_VOICES.forEach(voice => {
                        dropdown.addOption(voice.id, voice.label);
                    });
                    dropdown.setValue(this.plugin.settings[key])
                        .onChange(async value => {
                            this.plugin.settings[key] = value;
                            this.plugin.updateMetronomeSettings();
                            await this.plugin.saveSettings();
                        });
                }).addExtraButton(button => button
                    .setIcon("volume-2")
                    .setTooltip("Preview this metronome voice")
                    .onClick(async () => this.plugin.previewMetronomeVoice(this.plugin.settings[key])));
            },
        };
    }

    private instrumentPositionsText(): string {
        return Object.entries(this.plugin.settings.instrumentPositions)
            .map(([instrument, step]) => `${instrument}=${step}`)
            .join(", ");
    }

    private renderInstrumentPositions(setting: Setting): void {
        let updateText: ((value: string) => void) | undefined;
        setting
            .addText(text => {
                updateText = value => {
                    text.setValue(value);
                };
                text.setPlaceholder("Ch=-7, sp=-6, sd=-1")
                    .setValue(this.instrumentPositionsText())
                    .onChange(async value => {
                        const positions = { ...defaultInstrumentPositions() };
                        value.split(",").map(item => item.trim()).filter(Boolean).forEach(item => {
                            const match = item.match(/^([a-z][a-z0-9-]*)\s*=\s*(-?\d+)$/i);
                            const instrument = match?.[1] ? normalizeInstrument(match[1]) : undefined;
                            const step = match?.[2] ? Number.parseInt(match[2], 10) : Number.NaN;
                            if (instrument && Number.isInteger(step) && step >= -10 && step <= 10) {
                                positions[instrument] = step;
                            }
                        });
                        this.plugin.settings.instrumentPositions = positions;
                        await this.plugin.saveSettings();
                        this.plugin.refreshRenderers();
                    });
            })
            .addExtraButton(button => button
                .setIcon("reset")
                .setTooltip("Reset instrument positions")
                .onClick(async () => {
                    this.plugin.settings.instrumentPositions = defaultInstrumentPositions();
                    updateText?.(this.instrumentPositionsText());
                    await this.plugin.saveSettings();
                    this.plugin.refreshRenderers();
                }));
    }

    private renderNotationScale(setting: Setting): void {
        let updateSlider: ((value: number) => void) | undefined;
        setting
            .addSlider(slider => {
                updateSlider = value => {
                    slider.setValue(value);
                };
                slider.setLimits(80, 150, 1)
                    .setValue(this.plugin.settings.notationScale)
                    .onChange(async value => {
                        this.plugin.settings.notationScale = value;
                        await this.plugin.saveSettings();
                        this.plugin.refreshRenderers();
                    });
            })
            .addExtraButton(button => button
                .setIcon("reset")
                .setTooltip("Reset to default (100%)")
                .onClick(async () => {
                    this.plugin.settings.notationScale = DEFAULT_SETTINGS.notationScale;
                    updateSlider?.(DEFAULT_SETTINGS.notationScale);
                    await this.plugin.saveSettings();
                    this.plugin.refreshRenderers();
                }));
    }
}
