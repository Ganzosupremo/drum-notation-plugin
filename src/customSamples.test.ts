/// <reference types="node" />
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
    customSampleMappings,
    isSupportedAudioFile,
    isSupportedAudioFileName,
    normalizeCustomSamples,
    safeSampleFileName,
} from "./customSamples";

describe("custom sample mappings", () => {
    test("keeps supported instrument and technique mappings only", () => {
        assert.deepEqual(normalizeCustomSamples({
            BD: "Samples/kick.wav",
            "HH:open": " Samples/open.flac ",
            unknown: "Samples/unknown.wav",
            SD: "",
        }), {
            BD: "Samples/kick.wav",
            "HH:open": "Samples/open.flac",
        });
    });

    test("recognizes common AudioContext-compatible file extensions", () => {
        assert.equal(isSupportedAudioFile({ extension: "WAV" }), true);
        assert.equal(isSupportedAudioFile({ extension: "flac" }), true);
        assert.equal(isSupportedAudioFile({ extension: "md" }), false);
        assert.equal(isSupportedAudioFileName("My Snare.MP3"), true);
        assert.equal(isSupportedAudioFileName("notes.txt"), false);
    });

    test("sanitizes imported filenames for vault storage", () => {
        assert.equal(safeSampleFileName("snare:crispy?.wav"), "snare_crispy_.wav");
    });

    test("converts saved paths to sample kit mappings", () => {
        assert.deepEqual(customSampleMappings({ SD: "Samples/snare.mp3" }), { SD: "Samples/snare.mp3" });
    });
});
