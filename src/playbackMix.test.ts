import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultInstrumentVolumes, instrumentVolumeGain, normalizeInstrumentVolumes } from "./playbackMix";

describe("playback instrument mix", () => {
    it("starts cymbals below kick and snare", () => {
        const volumes = defaultInstrumentVolumes();
        assert.equal(volumes.BD, 100);
        assert.equal(volumes.SD, 100);
        assert.equal(volumes.HH, 45);
        assert.equal(volumes.RC, 50);
    });

    it("merges saved values and clamps unsupported percentages", () => {
        const volumes = normalizeInstrumentVolumes({ HH: 25, RC: 999, BD: -20, UNKNOWN: 12 });
        assert.equal(volumes.HH, 25);
        assert.equal(volumes.RC, 150);
        assert.equal(volumes.BD, 0);
        assert.equal(volumes.SD, 100);
        assert.equal(volumes.UNKNOWN, undefined);
    });

    it("converts percentages to an audio gain", () => {
        assert.equal(instrumentVolumeGain({ HH: 35 }, "HH"), 0.35);
        assert.equal(instrumentVolumeGain({}, "SD"), 1);
    });
});
