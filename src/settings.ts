import { App, PluginSettingTab, Setting } from "obsidian";
import MyPlugin from "./main";

export interface MyPluginSettings {
        beatsPerBar: number;
        notationScale: number;
        showInstrumentLabels: boolean;
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
        beatsPerBar: 4,
        notationScale: 100,
        showInstrumentLabels: true,
};

export class SampleSettingTab extends PluginSettingTab {
        plugin: MyPlugin;

        constructor(app: App, plugin: MyPlugin) {
                super(app, plugin);
                this.plugin = plugin;
        }

        display(): void {
                const {containerEl} = this;

                containerEl.empty();

                new Setting(containerEl)
                        .setName('Show instrument labels')
                        .setDesc('Display the short instrument code (HH, SD, BD …) to the left of each staff. Turn off for a cleaner chart when the instruments are self-evident.')
                        .addToggle(toggle => toggle
                                .setValue(this.plugin.settings.showInstrumentLabels)
                                .onChange(async (value) => {
                                        this.plugin.settings.showInstrumentLabels = value;
                                        await this.plugin.saveSettings();
                                }));

                new Setting(containerEl)
                        .setName('Beats per bar')
                        .setDesc('Default time signature numerator used for beam grouping.')
                        .addText(text => text
                                .setPlaceholder('4')
                                .setValue(this.plugin.settings.beatsPerBar.toString())
                                .onChange(async (value) => {
                                        const parsed = Number.parseInt(value, 10);
                                        this.plugin.settings.beatsPerBar = Number.isFinite(parsed) && parsed > 0
                                                ? parsed
                                                : DEFAULT_SETTINGS.beatsPerBar;
                                        await this.plugin.saveSettings();
                                }));

                let scaleDisplay: HTMLSpanElement;
                new Setting(containerEl)
                        .setName('Notation scale')
                        .setDesc('Adjust the visual size of noteheads and stems (80%–150%). Default is 100%.')
                        .addSlider(slider => {
                                slider
                                        .setLimits(80, 150, 1)
                                        .setValue(this.plugin.settings.notationScale)
                                        .setDynamicTooltip()
                                        .onChange(async (value) => {
                                                this.plugin.settings.notationScale = value;
                                                scaleDisplay.textContent = `${value}%`;
                                                this.plugin.applyNotationScale();
                                                await this.plugin.saveSettings();
                                        });
                        })
                        .addExtraButton(btn => {
                                btn.setIcon('reset')
                                        .setTooltip('Reset to default (100%)')
                                        .onClick(async () => {
                                                this.plugin.settings.notationScale = DEFAULT_SETTINGS.notationScale;
                                                this.plugin.applyNotationScale();
                                                await this.plugin.saveSettings();
                                                this.display();
                                        });
                        });

                scaleDisplay = containerEl.createEl('div', {
                        text: `${this.plugin.settings.notationScale}%`,
                        cls: 'setting-item-description'
                });
                scaleDisplay.style.textAlign = 'right';
                scaleDisplay.style.marginTop = '-0.5em';
                scaleDisplay.style.marginBottom = '0.5em';
        }
}
