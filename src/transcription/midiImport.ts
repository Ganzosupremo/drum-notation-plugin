import { App, Editor, FuzzySuggestModal, Modal, Notice, Setting, TFile } from "obsidian";
import { midiToDrumEvents, MidiDrumEvents } from "./midiDrums";
import { parseMidiFile } from "./midiFile";
import { DrumSourceOptions, transcribedEventsToDrumSource } from "./toDrumSource";

const MIDI_EXTENSIONS = new Set(["mid", "midi"]);

export function isMidiFile(file: TFile): boolean {
    return MIDI_EXTENSIONS.has(file.extension.toLowerCase());
}

class MidiFileSuggestModal extends FuzzySuggestModal<TFile> {
    constructor(app: App, private readonly choose: (file: TFile) => void) {
        super(app);
        this.setPlaceholder("Choose a .mid file from this vault…");
    }

    getItems(): TFile[] {
        return this.app.vault.getFiles().filter(isMidiFile);
    }

    getItemText(file: TFile): string {
        return file.path;
    }

    onChooseItem(file: TFile): void {
        this.choose(file);
    }
}

function parsePositiveNumber(value: string): number | undefined {
    const parsed = Number(value.trim().replace(",", "."));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parseNonNegativeNumber(value: string): number | undefined {
    const parsed = Number(value.trim().replace(",", "."));
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

class MidiImportOptionsModal extends Modal {
    private tempo: string;
    private firstDownbeat: string;
    private beatsPerBar: string;
    private subdivisionsPerBeat: 2 | 4 = 4;

    constructor(
        app: App,
        private readonly fileName: string,
        midi: MidiDrumEvents,
        defaultBeatsPerBar: number,
        private readonly submit: (options: Required<DrumSourceOptions>) => void,
    ) {
        super(app);
        this.tempo = String(midi.initialTempoBpm);
        this.firstDownbeat = String(Math.round((midi.downbeatSeconds ?? midi.firstHitSeconds ?? 0) * 1000) / 1000);
        this.beatsPerBar = String(midi.beatsPerBar ?? defaultBeatsPerBar);
    }

    onOpen(): void {
        const { contentEl } = this;
        this.setTitle(`Import drums from ${this.fileName}`);
        contentEl.createEl("p", {
            text: "Hits are quantized to the grid using this tempo, counted from the first downbeat.",
        });

        new Setting(contentEl)
            .setName("Tempo")
            .setDesc("Beats per minute, prefilled from the file. Many files store 120 by default, so check it against the song.")
            .addText(text => text.setValue(this.tempo).onChange(value => { this.tempo = value; }));
        new Setting(contentEl)
            .setName("First downbeat (seconds)")
            .setDesc("Time of beat 1 of the first bar. Hits before it are skipped and reported.")
            .addText(text => text.setValue(this.firstDownbeat).onChange(value => { this.firstDownbeat = value; }));
        new Setting(contentEl)
            .setName("Beats per bar")
            .addText(text => text.setValue(this.beatsPerBar).onChange(value => { this.beatsPerBar = value; }));
        new Setting(contentEl)
            .setName("Grid")
            .addDropdown(dropdown => dropdown
                .addOption("4", "Sixteenth notes")
                .addOption("2", "Eighth notes")
                .setValue(String(this.subdivisionsPerBeat))
                .onChange(value => { this.subdivisionsPerBeat = value === "2" ? 2 : 4; }));
        new Setting(contentEl)
            .addButton(button => button
                .setButtonText("Insert notation")
                .setCta()
                .onClick(() => this.confirm()));
    }

    private confirm(): void {
        const tempoBpm = parsePositiveNumber(this.tempo);
        const firstDownbeatSeconds = parseNonNegativeNumber(this.firstDownbeat);
        const beatsPerBar = parsePositiveNumber(this.beatsPerBar);
        if (tempoBpm === undefined) {
            new Notice("Enter a tempo greater than zero.");
            return;
        }
        if (firstDownbeatSeconds === undefined) {
            new Notice("Enter the first downbeat in seconds, zero or greater.");
            return;
        }
        if (beatsPerBar === undefined || !Number.isInteger(beatsPerBar)) {
            new Notice("Beats per bar must be a whole number.");
            return;
        }
        this.close();
        this.submit({ tempoBpm, firstDownbeatSeconds, beatsPerBar, subdivisionsPerBeat: this.subdivisionsPerBeat });
    }

    onClose(): void {
        this.contentEl.empty();
    }
}

function importSummary(acceptedEvents: number, measureCount: number, discarded: number, midi: MidiDrumEvents): string {
    const parts = [`Imported ${acceptedEvents} hits into ${measureCount} bars.`];
    if (discarded > 0) parts.push(`${discarded} hits before the first downbeat were skipped.`);
    const unmapped = [...midi.unmappedNotes.values()].reduce((total, count) => total + count, 0);
    if (unmapped > 0) {
        const notes = [...midi.unmappedNotes.keys()].sort((left, right) => left - right).join(", ");
        parts.push(`${unmapped} hits on unsupported MIDI notes were ignored (${notes}).`);
    }
    return parts.join(" ");
}

/** Lets the user pick a MIDI file, confirm tempo and downbeat, then inserts a drums block at the cursor. */
export function startMidiImport(app: App, editor: Editor, defaultBeatsPerBar: number): void {
    new MidiFileSuggestModal(app, file => {
        void (async () => {
            let midi: MidiDrumEvents;
            try {
                midi = midiToDrumEvents(parseMidiFile(await app.vault.readBinary(file)));
            } catch (error) {
                new Notice(`Unable to read ${file.name}: ${error instanceof Error ? error.message : "unknown error"}`);
                return;
            }
            if (midi.events.length === 0) {
                new Notice(`No supported drum hits found in ${file.name}.`);
                return;
            }
            new MidiImportOptionsModal(app, file.name, midi, defaultBeatsPerBar, options => {
                const result = transcribedEventsToDrumSource(midi.events, options);
                editor.replaceSelection(`\`\`\`drums\n${result.source}\n\`\`\`\n`);
                new Notice(importSummary(result.acceptedEvents, result.measureCount, result.discardedEvents.length, midi), 8000);
            }).open();
        })();
    }).open();
}
