/// <reference types="node" />
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { buildTimeSignature, isPowerOfTwo, parseDirectives } from "./directives";

describe("notation directives", () => {
    test("builds simple and compound meters", () => {
        assert.deepEqual(buildTimeSignature(4, 4), { beatsPerMeasure: 4, beatUnit: 4, meterType: "simple", beatsPerBar: 4 });
        assert.deepEqual(buildTimeSignature(6, 8), { beatsPerMeasure: 6, beatUnit: 8, meterType: "compound", beatsPerBar: 2 });
        assert.equal(isPowerOfTwo(16), true);
        assert.equal(isPowerOfTwo(7), false);
        assert.throws(() => buildTimeSignature(4, 7, true));
    });

    test("parses aliases and multiple fence-header directives", () => {
        const parsed = parseDirectives("feel: straight", "time 9/8 subdiv triplets");
        assert.equal(parsed.timeSignature?.meterType, "compound");
        assert.equal(parsed.timeSignature?.beatsPerBar, 3);
        assert.equal(parsed.subdivisionsPerBeat, 3);
        assert.equal(parsed.feel, "straight");
    });

    test("derives triplet subdivision and hairpins", () => {
        const parsed = parseDirectives("meter: 4/4\nfeel: triplet\nhairpin | <...> |");
        assert.equal(parsed.subdivisionsPerBeat, 3);
        assert.equal(parsed.hairpinPattern, "<...>");
    });

    test("deduplicates warnings per source and preserves their origin", () => {
        const parsed = parseDirectives("time: nope\ntime: nope", "time nope");
        assert.equal(parsed.warnings.length, 2);
        assert.deepEqual(parsed.warnings.map(item => item.source).sort(), ["body", "fence-header"]);
    });
});
