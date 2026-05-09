import { Plugin } from "obsidian";

import { buildTimeSignature, parseDrumNotation } from "./parser";
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
            (source, el, ctx) => {

                try {

                    const sectionInfo = ctx.getSectionInfo(el);
                    const firstLine = sectionInfo?.text?.split("\n")[0] ?? "";
                    const infoMatch = firstLine.match(/^```drums\s*(.*)$/i);
                    const headerLine = infoMatch?.[1]?.trim() || undefined;

                    const parsed = parseDrumNotation(source, headerLine);
                    const beatsPerBar = parsed.beatsPerBar
                        ?? this.settings.beatsPerBar
                        ?? DEFAULT_SETTINGS.beatsPerBar;
                    const timeSignature = parsed.timeSignature
                        ?? buildTimeSignature(beatsPerBar, 4);

                    renderDrumNotation(parsed, el, timeSignature);

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