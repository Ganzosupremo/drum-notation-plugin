import { Plugin } from "obsidian";

import { buildTimeSignature, parseDrumNotation } from "./parser";
import { renderDrumNotation } from "./renderer/renderNotation";
import { DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab } from "./settings";

export default class DrumNotationPlugin extends Plugin {
    settings: MyPluginSettings = {} as MyPluginSettings;
    private _scaleStyleEl: HTMLStyleElement | null = null;

    async onload() {

        console.log("Loading Drum Notation Plugin");

        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        this.addSettingTab(new SampleSettingTab(this.app, this));

        this.loadBravuraFont();
        this.applyNotationScale();

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

                    const notationScale = (this.settings.notationScale ?? DEFAULT_SETTINGS.notationScale) / 100;
                    const showLabels = this.settings.showInstrumentLabels ?? DEFAULT_SETTINGS.showInstrumentLabels;
                    renderDrumNotation(parsed, el, timeSignature, notationScale, showLabels);

                } catch (error) {

                    console.error(error);

                    el.createEl("p", {
                        text: "Error rendering drum notation."
                    });
                }
            }
        );
    }

    /**
     * Inject a @font-face declaration that points Bravura.woff2 at the
     * correct app:// resource URL for this plugin's directory.
     *
     * Obsidian desktop (Electron) serves local files via an app:// protocol.
     * The static @font-face in styles.css uses a bare relative URL which may
     * not resolve correctly in all Obsidian versions, so we also inject the
     * rule dynamically using the FileSystemAdapter's getResourcePath.
     */
    private loadBravuraFont(): void {
        const adapter = this.app.vault.adapter as unknown as Record<string, unknown>;
        const getResourcePath = adapter["getResourcePath"];

        if (typeof getResourcePath !== "function") {
            return;
        }

        const manifestDir = (this.manifest as unknown as Record<string, unknown>)["dir"];
        if (typeof manifestDir !== "string" || !manifestDir) {
            return;
        }

        const fontSrc = (getResourcePath as (p: string) => string).call(
            adapter,
            manifestDir + "/Bravura.woff2"
        );

        const style = document.createElement("style");
        style.textContent =
            `@font-face{font-family:'Bravura';src:url('${fontSrc}')format('woff2');font-weight:normal;font-style:normal;}`;
        document.head.appendChild(style);
    }

    /**
     * Inject (or update) a <style> element that sets the --drum-notation-scale
     * CSS custom property on :root, used by styles.css to scale notehead sizes.
     */
    applyNotationScale(): void {
        const scale = (this.settings.notationScale ?? DEFAULT_SETTINGS.notationScale) / 100;
        if (!this._scaleStyleEl) {
            this._scaleStyleEl = document.createElement("style");
            this._scaleStyleEl.id = "drum-notation-scale";
            document.head.appendChild(this._scaleStyleEl);
        }
        this._scaleStyleEl.textContent = `:root { --drum-notation-scale: ${scale}; }`;
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    onunload() {
        if (this._scaleStyleEl) {
            this._scaleStyleEl.remove();
            this._scaleStyleEl = null;
        }
        console.log("Unloading Drum Notation Plugin");
    }
}
