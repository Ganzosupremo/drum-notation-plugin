import { Plugin } from "obsidian";

import { parseDrumNotation } from "./parser";
import { renderDrumNotation } from "./renderer";

export default class DrumNotationPlugin extends Plugin {

    async onload() {

        console.log("Loading Drum Notation Plugin");

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

    onunload() {

        console.log("Unloading Drum Notation Plugin");
    }
}