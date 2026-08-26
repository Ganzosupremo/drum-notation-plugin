/// <reference types="node" />
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { DrumEvent } from "./types";
import { KitAudioHost, PlaybackKit, PlaybackKitRegistry, SamplePlaybackKit, sampleKeysFor, SynthPlaybackKit } from "./playbackKits";

describe("playback kit registry", () => {
    test("exposes stable descriptors and rejects duplicate kit ids", () => {
        const registry = new PlaybackKitRegistry([new SynthPlaybackKit()]);
        assert.deepEqual(registry.descriptors(), [{ id: "synth", label: "Sintetizado", type: "synth" }]);
        assert.throws(() => registry.register(new SynthPlaybackKit()), /already registered/);
    });

    test("rejects ids that cannot be stored safely in settings or directives", () => {
        const registry = new PlaybackKitRegistry();
        const invalid = new SynthPlaybackKit();
        Object.defineProperty(invalid, "id", { value: "Studio Kit" });
        assert.throws(() => registry.register(invalid), /Invalid playback kit id/);
    });
});

describe("sample kit mapping", () => {
    test("prefers technique and articulation samples before the base instrument", () => {
        assert.deepEqual(sampleKeysFor({ instrument: "SD", technique: "rimshot", articulation: "normal" }), ["SD:rimshot", "SD"]);
        assert.deepEqual(sampleKeysFor({ instrument: "HH", articulation: "accent-open" }), ["HH:open", "HH"]);
        assert.deepEqual(sampleKeysFor({ instrument: "BD", articulation: "ghost" }), ["BD"]);
    });

    test("falls back for an instrument that has no sample mapping", () => {
        let fallbackHits = 0;
        const fallback: PlaybackKit = {
            id: "fallback",
            label: "Fallback",
            type: "synth",
            prepare: () => Promise.resolve(),
            hit: () => { fallbackHits++; },
        };
        const kit = new SamplePlaybackKit({
            id: "partial-kit",
            label: "Partial kit",
            samples: {},
            loadSample: () => Promise.reject(new Error("No samples expected")),
        }, fallback);
        const event: DrumEvent = {
            instrument: "CH",
            voice: "upper",
            measure: 0,
            tick: 0,
            durationTicks: 12,
            symbol: "x",
            articulation: "normal",
            source: { line: 1, column: 1 },
        };
        kit.hit({} as KitAudioHost, event, 0, 0.8);
        assert.equal(fallbackHits, 1);
    });
});
