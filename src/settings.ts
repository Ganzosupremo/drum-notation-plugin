import { App, PluginSettingTab, Setting } from "obsidian";
import DrumNotationPlugin from "./main";
import { defaultInstrumentPositions, normalizeInstrument } from "./notation/instruments";

export interface DrumNotationSettings {
    beatsPerBar: number;
    notationScale: number;
    showInstrumentLabels: boolean;
    showCount: boolean;
    instrumentPositions: Record<string, number>;
}

export const DEFAULT_SETTINGS: DrumNotationSettings = {
    beatsPerBar: 4,
    notationScale: 100,
    showInstrumentLabels: false,
    showCount: false,
    instrumentPositions: defaultInstrumentPositions(),
};

export class DrumNotationSettingTab extends PluginSettingTab {
    constructor(app: App, private readonly plugin: DrumNotationPlugin) {
        super(app, plugin);
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        new Setting(containerEl)
            .setName("Show instrument labels")
            .setDesc("Display the short instrument code (hh, sd, bd …) below the first system.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showInstrumentLabels)
                .onChange(async value => {
                    this.plugin.settings.showInstrumentLabels = value;
                    await this.plugin.saveSettings();
                    this.plugin.refreshRenderers();
                }));

        new Setting(containerEl)
            .setName("Show subdivision count")
            .setDesc("Display beat counting above the staff. Practice-style blocks always show it.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showCount)
                .onChange(async value => {
                    this.plugin.settings.showCount = value;
                    await this.plugin.saveSettings();
                    this.plugin.refreshRenderers();
                }));

        new Setting(containerEl)
            .setName("Instrument staff positions")
            .setDesc("Half-space steps from the middle line, for example ch=-7, sp=-6, sd=-1. Block directives take precedence.")
            .addText(text => text
                .setPlaceholder("Ch=-7, sp=-6, sd=-1")
                .setValue(Object.entries(this.plugin.settings.instrumentPositions).map(([instrument, step]) => `${instrument}=${step}`).join(", "))
                .onChange(async value => {
                    const positions = { ...defaultInstrumentPositions() };
                    value.split(",").map(item => item.trim()).filter(Boolean).forEach(item => {
                        const match = item.match(/^([a-z][a-z0-9-]*)\s*=\s*(-?\d+)$/i);
                        const instrument = match?.[1] ? normalizeInstrument(match[1]) : undefined;
                        const step = match?.[2] ? Number.parseInt(match[2], 10) : Number.NaN;
                        if (instrument && Number.isInteger(step) && step >= -10 && step <= 10) positions[instrument] = step;
                    });
                    this.plugin.settings.instrumentPositions = positions;
                    await this.plugin.saveSettings();
                    this.plugin.refreshRenderers();
                }))
            .addExtraButton(button => button
                .setIcon("reset")
                .setTooltip("Reset instrument positions")
                .onClick(async () => {
                    this.plugin.settings.instrumentPositions = defaultInstrumentPositions();
                    await this.plugin.saveSettings();
                    this.plugin.refreshRenderers();
                    this.display();
                }));

        new Setting(containerEl)
            .setName("Beats per bar")
            .setDesc("Default time-signature numerator when a block does not declare a meter.")
            .addText(text => text
                .setPlaceholder("4")
                .setValue(this.plugin.settings.beatsPerBar.toString())
                .onChange(async value => {
                    const parsed = Number.parseInt(value, 10);
                    this.plugin.settings.beatsPerBar = Number.isFinite(parsed) && parsed > 0
                        ? parsed
                        : DEFAULT_SETTINGS.beatsPerBar;
                    await this.plugin.saveSettings();
                }));

        let scaleDisplay: HTMLDivElement;
        new Setting(containerEl)
            .setName("Notation scale")
            .setDesc("Adjust the visual size of noteheads and stems (80%–150%).")
            .addSlider(slider => slider
                .setLimits(80, 150, 1)
                .setValue(this.plugin.settings.notationScale)
                .setDynamicTooltip()
                .onChange(async value => {
                    this.plugin.settings.notationScale = value;
                    scaleDisplay.textContent = `${value}%`;
                    await this.plugin.saveSettings();
                    this.plugin.refreshRenderers();
                }))
            .addExtraButton(button => button
                .setIcon("reset")
                .setTooltip("Reset to default (100%)")
                .onClick(async () => {
                    this.plugin.settings.notationScale = DEFAULT_SETTINGS.notationScale;
                    await this.plugin.saveSettings();
                    this.plugin.refreshRenderers();
                    this.display();
                }));

        scaleDisplay = containerEl.createDiv({
            text: `${this.plugin.settings.notationScale}%`,
            cls: ["setting-item-description", "drum-scale-display"],
        });
    }
}
