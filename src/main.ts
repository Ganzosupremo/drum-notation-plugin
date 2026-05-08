import { Plugin } from "obsidian";

import { parseDrumNotation } from "./parser";
import { renderDrumNotation } from "./renderer/renderNotation";
import { DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab } from "./settings";

export default class DrumNotationPlugin extends Plugin {
    settings: MyPluginSettings = {} as MyPluginSettings;

    async onload() {

        console.log("Loading Drum Notation Plugin");

        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        this.addSettingTab(new SampleSettingTab(this.app, this));

        this.registerMarkdownCodeBlockProcessor(
            "drums",
            (source, el) => {

                try {

                    const parsed = parseDrumNotation(source);

                    renderDrumNotation(parsed, el);

                } catch (error) {

                    console.error(error);

                    el.createEl("p", {
                        text: "Error rendering drum notation."
                    });
                }
            }
        );
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    onunload() {

        console.log("Unloading Drum Notation Plugin");
    }
}