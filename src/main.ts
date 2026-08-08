import { MarkdownRenderChild, Plugin } from "obsidian";
import { parseDrumDocument } from "./notation/parseDocument";
import { renderDrumDocument, RenderedDocument } from "./renderer/renderDocument";
import { DEFAULT_SETTINGS, DrumNotationSettings, DrumNotationSettingTab } from "./settings";

class DrumRenderChild extends MarkdownRenderChild {
    constructor(
        containerEl: HTMLElement,
        private readonly rendered: RenderedDocument,
        private readonly registry: Set<RenderedDocument>,
    ) {
        super(containerEl);
    }

    onunload(): void {
        this.rendered.destroy();
        this.registry.delete(this.rendered);
    }
}

export default class DrumNotationPlugin extends Plugin {
    settings: DrumNotationSettings = { ...DEFAULT_SETTINGS };
    private readonly renderedDocuments = new Set<RenderedDocument>();

    async onload(): Promise<void> {
        const saved = await this.loadData() as Partial<DrumNotationSettings> | null;
        this.settings = Object.assign({}, DEFAULT_SETTINGS, saved ?? {});
        this.settings.instrumentPositions = {
            ...DEFAULT_SETTINGS.instrumentPositions,
            ...(saved?.instrumentPositions ?? {}),
        };
        this.addSettingTab(new DrumNotationSettingTab(this.app, this));

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
                const rendered = renderDrumDocument(documentModel, el, this.renderOptions());
                this.renderedDocuments.add(rendered);
                ctx.addChild(new DrumRenderChild(el, rendered, this.renderedDocuments));
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

    refreshRenderers(): void {
        const options = this.renderOptions();
        this.renderedDocuments.forEach(rendered => rendered.updateOptions(options));
    }

    onunload(): void {
        this.renderedDocuments.forEach(rendered => rendered.destroy());
        this.renderedDocuments.clear();
    }
}
