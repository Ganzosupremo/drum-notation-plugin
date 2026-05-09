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

    if (beatWidth <= 0) return groups;

    // Determine subdivisions per beat
    let subdivisionsPerBeat: number;

    if (subdivisionsPerBeatOverride && subdivisionsPerBeatOverride > 0) {
        subdivisionsPerBeat = subdivisionsPerBeatOverride;
    } else {
        const rawSubdivisions = patternLength / beatsPerBar;
        const supported = [2, 3, 4];
        const closest = supported.reduce((prev, current) =>
            Math.abs(current - rawSubdivisions) < Math.abs(prev - rawSubdivisions)
                ? current
                : prev
        );
        subdivisionsPerBeat = Number.isFinite(rawSubdivisions) ? closest : 2;
    }

    // subdiv 4 → two stacked beams; subdiv 2 or 3 → one beam
    const beamCount = subdivisionsPerBeat === 4 ? 2 : 1;

    // Group notes by beat index
    const beatGroups = new Map<number, NoteEvent[]>();
    for (const note of notes) {
        const beat = Math.floor(note.index / beatWidth);
        if (!beatGroups.has(beat)) {
            beatGroups.set(beat, []);
        }
        beatGroups.get(beat)!.push(note);
    }

    // Emit one BeamGroup per beat that has 2+ notes, spanning first → last note
    for (const beatNotes of beatGroups.values()) {
        if (beatNotes.length < 2) continue;
        const sorted = beatNotes.slice().sort((a, b) => a.index - b.index);
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        if (!first || !last) continue;
        groups.push({
            startX: first.x,
            endX: last.x,
            y,
            beamCount,
        });
    }

    return groups;
}
