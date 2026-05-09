import { App, PluginSettingTab, Setting } from "obsidian";
import MyPlugin from "./main";

export interface MyPluginSettings {
	beatsPerBar: number;
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
	beatsPerBar: 4
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
	}
}
