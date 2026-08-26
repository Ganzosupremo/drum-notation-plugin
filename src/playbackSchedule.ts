import { DrumDocument, DrumEvent, TICKS_PER_BEAT } from "./types";

export type PlaybackScheduleItem =
    | { kind: "hit"; timeSeconds: number; event: DrumEvent }
    | { kind: "click"; timeSeconds: number; accent: boolean };

function adjustedTick(documentModel: DrumDocument, tick: number): number {
    if (documentModel.feel !== "swing") return tick;
    const pulse = Math.floor(tick / TICKS_PER_BEAT);
    const withinPulse = tick % TICKS_PER_BEAT;
    return pulse * TICKS_PER_BEAT + (withinPulse === TICKS_PER_BEAT / 2 ? TICKS_PER_BEAT * 2 / 3 : withinPulse);
}

export function buildPlaybackSchedule(documentModel: DrumDocument, tempo: number, metronome: boolean): PlaybackScheduleItem[] {
    const secondsPerPulse = 60 / tempo;
    const schedule: PlaybackScheduleItem[] = [];
    let pulseOffset = 0;
    documentModel.measures.forEach(measure => {
        measure.events.forEach(event => {
            const eventPulses = adjustedTick(documentModel, event.tick) / TICKS_PER_BEAT;
            schedule.push({ kind: "hit", timeSeconds: (pulseOffset + eventPulses) * secondsPerPulse, event });
        });
        if (metronome) {
            for (let pulse = 0; pulse < measure.beats; pulse++) {
                schedule.push({ kind: "click", timeSeconds: (pulseOffset + pulse) * secondsPerPulse, accent: pulse === 0 });
            }
        }
        pulseOffset += measure.beats;
    });
    return schedule.sort((left, right) => left.timeSeconds - right.timeSeconds || (left.kind === "click" ? -1 : 1));
}
