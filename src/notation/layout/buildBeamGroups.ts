import { NoteEvent, BeamGroup } from "../../types";

export function buildBeamGroups(
    notes: NoteEvent[],
    y: number,
    patternLength: number,
    beatsPerBar = 4,
    subdivisionsPerBeatOverride?: number
): BeamGroup[] {

    const groups: BeamGroup[] = [];

    if (notes.length < 2) return groups;

    const beatWidth = patternLength > 0
        ? patternLength / beatsPerBar
        : 0;

    const subdivisionsPerBeat = subdivisionsPerBeatOverride && subdivisionsPerBeatOverride > 0
        ? subdivisionsPerBeatOverride
        : (beatWidth > 0 ? Math.round(beatWidth) : 0);
    const maxIndexGap = subdivisionsPerBeat > 0
        ? Math.max(1, Math.floor(subdivisionsPerBeat / 2))
        : 1;

    for (let i = 0; i < notes.length - 1; i++) {

        const current = notes[i] as NoteEvent;

        const next = notes[i + 1] as NoteEvent;

        // only consecutive subdivisions
        if (next.index - current.index > maxIndexGap)
            continue;

        if (beatWidth > 0) {
            const currentBeat = Math.floor(current.index / beatWidth);
            const nextBeat = Math.floor(next.index / beatWidth);

            if (currentBeat !== nextBeat) continue;
        }

        groups.push({

            startX: current.x,

            endX: next.x,

            y
        });
    }

    return groups;
}