/// <reference types="node" />
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { parseDrumDocument } from "./notation/parseDocument";
import { buildPlaybackSchedule } from "./playbackSchedule";

describe("playback schedule", () => {
    test("places hits and metronome clicks on the shared pulse timeline", () => {
        const documentModel = parseDrumDocument("tempo: 120\n4/4\nH: 8ths\nS: 2 4\nK: 1 3");
        const schedule = buildPlaybackSchedule(documentModel, documentModel.tempo, true);
        const clicks = schedule.filter(item => item.kind === "click");
        const kicks = schedule.filter(item => item.kind === "hit" && item.event.instrument === "BD");
        assert.deepEqual(clicks.map(item => item.timeSeconds), [0, 0.5, 1, 1.5]);
        assert.deepEqual(kicks.map(item => item.timeSeconds), [0, 1]);
        assert.equal(clicks[0]?.kind === "click" && clicks[0].accent, true);
    });

    test("delays eighth-note offbeats when swing feel is enabled", () => {
        const straight = buildPlaybackSchedule(parseDrumDocument("4/4\nH: 8ths"), 120, false);
        const swing = buildPlaybackSchedule(parseDrumDocument("4/4\nfeel: swing\nH: 8ths"), 120, false);
        assert.equal(straight.find(item => item.kind === "hit" && item.event.tick === 6)?.timeSeconds, 0.25);
        assert.ok(Math.abs((swing.find(item => item.kind === "hit" && item.event.tick === 6)?.timeSeconds ?? 0) - 1 / 3) < 0.0001);
    });
});
