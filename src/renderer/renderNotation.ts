import { DrumNotation, TimeSignature } from "types";

import {
    START_X_WITH_LABELS,
    START_X_NO_LABELS,
    getCellWidth,
    STAFF_S,
    STAFF_MID_Y,
} from "./constants";

import {
    CANONICAL_ORDER,
    STAFF_OFFSET,
    STEM_UP,
} from "./staffPositions";

import { INSTRUMENT_NAMES } from "./constants";

import { buildLayout } from "notation/layout/buildLayout";

import * as VexFlow from "vexflow";

type HairpinDirection = "crescendo" | "decrescendo";

function getBaseDuration(
    beatUnit: number,
    subdivisionsPerBeat?: number
): { duration: string; isTriplet: boolean } {
    const subdiv = subdivisionsPerBeat ?? 2;

    const mapForQuarter = () => {
        if (subdiv === 1) return { duration: "4", isTriplet: false };
        if (subdiv === 2) return { duration: "8", isTriplet: false };
        if (subdiv === 3) return { duration: "8", isTriplet: true };
        return { duration: "16", isTriplet: false };
    };

    const mapForEighth = () => {
        if (subdiv === 1) return { duration: "8", isTriplet: false };
        if (subdiv === 2) return { duration: "16", isTriplet: false };
        if (subdiv === 3) return { duration: "16", isTriplet: true };
        return { duration: "32", isTriplet: false };
    };

    if (beatUnit === 8) return mapForEighth();
    return mapForQuarter();
}

function instrumentLineIndex(instrument: string): number {
    const offset = STAFF_OFFSET[instrument] ?? 0;
    return 2 + offset / STAFF_S;
}

function parseHairpinPattern(pattern: string): { start: number; end: number; direction: HairpinDirection } | undefined {
    const str = pattern.replace(/\s+/g, "");
    if (!str) return undefined;

    const firstLt = str.indexOf("<");
    const firstGt = str.indexOf(">");
    if (firstLt === -1 && firstGt === -1) return undefined;

    if (firstLt !== -1 && (firstGt === -1 || firstLt < firstGt)) {
        return {
            start: firstLt,
            end: firstGt !== -1 ? firstGt : str.length - 1,
            direction: "crescendo",
        };
    }

    return {
        start: firstGt === -1 ? 0 : 0,
        end: firstGt !== -1 ? firstGt : str.length - 1,
        direction: "decrescendo",
    };
}

export function renderDrumNotation(
    notation: DrumNotation,
    container: HTMLElement,
    timeSignature?: TimeSignature,
    scale: number = 1,
    showLabels: boolean = true
) {
    const beatsPerBar = timeSignature?.beatsPerBar ?? 4;
    const subdivisionsPerBeat = notation.subdivisionsPerBeat;
    const beatUnit = timeSignature?.beatUnit ?? 4;

    const cellWidth = getCellWidth(subdivisionsPerBeat ?? 0);
    const startX = showLabels ? START_X_WITH_LABELS : START_X_NO_LABELS;
    const endPadding = 40;

    const wrapper = document.createElement("div");
    wrapper.className = "drum-container";

    if (notation.warnings && notation.warnings.length > 0) {
        const warningEl = document.createElement("div");
        warningEl.className = "drum-warning";
        warningEl.textContent = `Warning: ${notation.warnings.join(" | ")}`;
        wrapper.appendChild(warningEl);
    }

    const layouts = notation.lines.map((line) => ({
        line,
        ...buildLayout(line.instrument, line.pattern, cellWidth, startX),
    }));

    // Sort instruments into canonical staff order (CC top → HF bottom).
    // Unknown instruments fall to the end.
    layouts.sort((a, b) => {
        const ai = CANONICAL_ORDER.indexOf(a.line.instrument);
        const bi = CANONICAL_ORDER.indexOf(b.line.instrument);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });

    const maxCellCount = layouts.reduce((m, l) => Math.max(m, l.cellCount), 0);
    const width = Math.max(560, startX + maxCellCount * cellWidth + endPadding);
    const height = Math.max(200, STAFF_MID_Y + 80);

    const VF = VexFlow as any;
    const renderer = new VF.Renderer(wrapper, VF.Renderer.Backends.SVG);
    renderer.resize(width, height);

    const context = renderer.getContext();
    const stave = new VF.Stave(startX, 20, width - startX - endPadding);

    stave.addClef("percussion");
    stave.addTimeSignature(`${timeSignature?.beatsPerMeasure ?? 4}/${beatUnit}`);
    stave.setContext(context).draw();

    const { duration: baseDuration, isTriplet } = getBaseDuration(beatUnit, subdivisionsPerBeat);
    const totalCells = maxCellCount;

    const voices: any[] = [];
    const beams: any[] = [];
    const ties: any[] = [];
    const tuplets: any[] = [];

    const ghostNotes: any[] = [];
    for (let i = 0; i < totalCells; i++) {
        ghostNotes.push(new VF.GhostNote({ duration: baseDuration }));
    }
    const ghostVoice = new VF.Voice({
        num_beats: beatsPerBar,
        beat_value: beatUnit,
    });
    ghostVoice.setMode(VF.Voice.Mode.SOFT);
    ghostVoice.addTickables(ghostNotes);

    layouts.forEach(({ line, notes, cellCount }) => {
        const stemUp = STEM_UP[line.instrument] ?? true;
        const lineIndex = instrumentLineIndex(line.instrument);

        const cellNotes: any[] = [];
        for (let i = 0; i < cellCount; i++) {
            const note = new VF.StaveNote({
                keys: ["c/5"],
                duration: baseDuration + "r",
                clef: "percussion",
                stem_direction: stemUp ? 1 : -1,
            });
            if (typeof note.setKeyLine === "function") {
                note.setKeyLine(0, lineIndex);
            }
            cellNotes.push(note);
        }

        notes.forEach((noteEvent) => {
            for (let d = 0; d < (noteEvent.duration ?? 1); d++) {
                const idx = noteEvent.index + d;
                if (idx < 0 || idx >= cellNotes.length) continue;

                const note = new VF.StaveNote({
                    keys: ["c/5"],
                    duration: baseDuration,
                    clef: "percussion",
                    stem_direction: stemUp ? 1 : -1,
                });
                if (typeof note.setKeyLine === "function") {
                    note.setKeyLine(0, lineIndex);
                }

                if (noteEvent.articulation === "accent" || noteEvent.articulation === "accent-open") {
                    const accent = new VF.Articulation("a>");
                    accent.setPosition(VF.Modifier.Position.ABOVE);
                    note.addModifier(accent, 0);
                }

                if (noteEvent.articulation === "ghost") {
                    note.setStyle({ fillStyle: "#666", strokeStyle: "#666" });
                }

                cellNotes[idx] = note;

                if (d > 0) {
                    const prev = cellNotes[idx - 1];
                    ties.push(new VF.StaveTie({
                        first_note: prev,
                        last_note: note,
                        first_indices: [0],
                        last_indices: [0],
                    }));
                }
            }
        });

        const voice = new VF.Voice({
            num_beats: beatsPerBar,
            beat_value: beatUnit,
        });
        voice.setMode(VF.Voice.Mode.SOFT);
        voice.addTickables(cellNotes);

        if (isTriplet) {
            for (let i = 0; i < cellNotes.length; i += 3) {
                const group = cellNotes.slice(i, i + 3);
                if (group.length === 3) {
                    tuplets.push(new VF.Tuplet(group));
                }
            }
        }

        voices.push(voice);
        const beamable = cellNotes.filter((n: any) => {
            if (typeof n.isRest === "function") return !n.isRest();
            return !n.isRest;
        });
        beams.push(...VF.Beam.generateBeams(beamable));

        if (showLabels) {
            const label = INSTRUMENT_NAMES[line.instrument] ?? line.instrument;
            const labelY = stave.getYForLine(lineIndex);
            context.save();
            context.setFont("monospace", 12, "");
            context.fillText(label, 10, labelY + 4);
            context.restore();
        }
    });

    voices.push(ghostVoice);

    const formatter = new VF.Formatter();
    formatter.joinVoices(voices).format(voices, width - startX - endPadding);

    voices.forEach((voice) => voice.draw(context, stave));
    beams.forEach((beam) => beam.setContext(context).draw());
    ties.forEach((tie) => tie.setContext(context).draw());
    tuplets.forEach((tuplet) => tuplet.setContext(context).draw());

    if (notation.hairpinPattern) {
        const hairpin = parseHairpinPattern(notation.hairpinPattern);
        if (hairpin && ghostNotes[hairpin.start] && ghostNotes[hairpin.end]) {
            const type = hairpin.direction === "crescendo"
                ? VF.StaveHairpin.type.CRESC
                : VF.StaveHairpin.type.DECRESC;
            const hp = new VF.StaveHairpin({
                first_note: ghostNotes[hairpin.start],
                last_note: ghostNotes[hairpin.end],
            }, type);
            hp.setContext(context);
            hp.setPosition(VF.Modifier.Position.BELOW);
            hp.draw();
        }
    }

    container.appendChild(wrapper);
}
