/// <reference types="node" />
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
    DEFAULT_METRONOME_ACCENT_VOICE,
    DEFAULT_METRONOME_BEAT_VOICE,
    DEFAULT_METRONOME_VOLUME,
    METRONOME_VOICES,
    normalizeMetronomeVoice,
    normalizeMetronomeVolume,
} from "./metronome";

describe("metronome settings", () => {
    test("provides distinct high and low percussion choices", () => {
        const ids = METRONOME_VOICES.map(voice => voice.id);
        assert.ok(ids.includes("bongo-high") && ids.includes("bongo-low"));
        assert.ok(ids.includes("cowbell-high") && ids.includes("cowbell-low"));
        assert.ok(ids.includes("conga-high") && ids.includes("conga-low"));
    });

    test("normalizes volume and unknown saved voices", () => {
        assert.equal(normalizeMetronomeVolume(undefined), DEFAULT_METRONOME_VOLUME);
        assert.equal(normalizeMetronomeVolume(-20), 0);
        assert.equal(normalizeMetronomeVolume(200), 150);
        assert.equal(normalizeMetronomeVoice("missing", DEFAULT_METRONOME_ACCENT_VOICE), DEFAULT_METRONOME_ACCENT_VOICE);
        assert.equal(normalizeMetronomeVoice("conga-low", DEFAULT_METRONOME_BEAT_VOICE), "conga-low");
    });
});
