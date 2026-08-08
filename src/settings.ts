import { App, PluginSettingTab, Setting } from "obsidian";
import DrumNotationPlugin from "./main";

export interface DrumNotationSettings {
    beatsPerBar: number;
    notationScale: number;
    showInstrumentLabels: boolean;
    showCount: boolean;
}

export const DEFAULT_SETTINGS: DrumNotationSettings = {
    beatsPerBar: 4,
    notationScale: 100,
    showInstrumentLabels: false,
    showCount: false,
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
