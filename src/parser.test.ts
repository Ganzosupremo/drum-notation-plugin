import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { parseDrumNotation, buildTimeSignature, isPowerOfTwo } from "./parser";
import { buildLayout } from "./notation/layout/buildLayout";

describe("inner pipe segment-joining (parseDrumNotation)", () => {

    test("pattern with inner pipes is joined into a single pattern string", () => {
        const source = "HH |x-x-|x-x-|";
        const result = parseDrumNotation(source);

        assert.equal(result.lines.length, 1);
        assert.equal(result.lines[0]?.instrument, "HH");
        assert.equal(result.lines[0]?.pattern, "x-x-x-x-");
    });

    test("pattern without inner pipes extracts pattern correctly", () => {
        const source = "HH |x-x-x-x-|";
        const result = parseDrumNotation(source);

        assert.equal(result.lines.length, 1);
        assert.equal(result.lines[0]?.instrument, "HH");
        assert.equal(result.lines[0]?.pattern, "x-x-x-x-");
    });

    test("pattern with only a closing pipe (no inner pipes) extracts pattern correctly", () => {
        const source = "SD |o---|";
        const result = parseDrumNotation(source);

        assert.equal(result.lines.length, 1);
        assert.equal(result.lines[0]?.instrument, "SD");
        assert.equal(result.lines[0]?.pattern, "o---");
    });

    test("pattern with no closing pipe extracts pattern correctly", () => {
        const source = "BD |o---";
        const result = parseDrumNotation(source);

        assert.equal(result.lines.length, 1);
        assert.equal(result.lines[0]?.instrument, "BD");
        assert.equal(result.lines[0]?.pattern, "o---");
    });

    test("multiple lines with inner pipes all parse correctly", () => {
        const source = [
            "HH |x-x-|x-x-|",
            "SD |----|-o--|",
            "BD |o---|----| ",
        ].join("\n");
        const result = parseDrumNotation(source);

        assert.equal(result.lines.length, 3);
        assert.equal(result.lines[0]?.instrument, "HH");
        assert.equal(result.lines[0]?.pattern, "x-x-x-x-");
        assert.equal(result.lines[1]?.instrument, "SD");
        assert.equal(result.lines[1]?.pattern, "-----o--");
        assert.equal(result.lines[2]?.instrument, "BD");
        assert.equal(result.lines[2]?.pattern, "o-------");
    });

    test("three inner pipes are joined in order", () => {
        const source = "HH |x-|x-|x-|x-|";
        const result = parseDrumNotation(source);

        assert.equal(result.lines.length, 1);
        assert.equal(result.lines[0]?.instrument, "HH");
        assert.equal(result.lines[0]?.pattern, "x-x-x-x-");
    });

    test("inner-pipe pattern and equivalent single-segment pattern produce identical results", () => {
        const withInner = parseDrumNotation("HH |x-x-|x-x-|");
        const withoutInner = parseDrumNotation("HH |x-x-x-x-|");

        assert.deepEqual(withInner.lines, withoutInner.lines);
    });

    test("line with no opening pipe is skipped (no valid instrument/pattern split)", () => {
        const source = "HH x-x-x-x-";
        const result = parseDrumNotation(source);

        assert.equal(result.lines.length, 0);
    });
});

describe("header directives — inline fence header", () => {

    test("time 4/4 sets beatsPerBar to 4 and timeSignature correctly", () => {
        const result = parseDrumNotation("HH |x-x-x-x-|", "time 4/4");

        assert.equal(result.beatsPerBar, 4);
        assert.deepEqual(result.timeSignature, {
            beatsPerMeasure: 4,
            beatUnit: 4,
            meterType: "simple",
            beatsPerBar: 4
        });
        assert.equal(result.warnings, undefined);
    });

    test("time 3/4 sets beatsPerBar to 3", () => {
        const result = parseDrumNotation("HH |x-x-x-|", "time 3/4");

        assert.equal(result.beatsPerBar, 3);
        assert.equal(result.timeSignature?.beatsPerMeasure, 3);
        assert.equal(result.timeSignature?.beatUnit, 4);
        assert.equal(result.timeSignature?.meterType, "simple");
    });

    test("subdiv 4 sets subdivisionsPerBeat to 4", () => {
        const result = parseDrumNotation("HH |x-x-x-x-|", "subdiv 4");

        assert.equal(result.subdivisionsPerBeat, 4);
        assert.equal(result.warnings, undefined);
    });

    test("subdiv 2 sets subdivisionsPerBeat to 2", () => {
        const result = parseDrumNotation("HH |x-x-x-x-|", "subdiv 2");

        assert.equal(result.subdivisionsPerBeat, 2);
    });

    test("combined inline header 'time 4/4 subdiv 4' sets both fields", () => {
        const result = parseDrumNotation("HH |x-x-x-x-|", "time 4/4 subdiv 4");

        assert.equal(result.beatsPerBar, 4);
        assert.equal(result.subdivisionsPerBeat, 4);
        assert.equal(result.timeSignature?.beatsPerMeasure, 4);
        assert.equal(result.timeSignature?.beatUnit, 4);
        assert.equal(result.warnings, undefined);
    });

    test("combined inline header 'time 3/4 subdiv 2' sets both fields", () => {
        const result = parseDrumNotation("HH |x-x-x-|", "time 3/4 subdiv 2");

        assert.equal(result.beatsPerBar, 3);
        assert.equal(result.subdivisionsPerBeat, 2);
    });

    test("timesig alias works as a header keyword", () => {
        const result = parseDrumNotation("HH |x-x-x-x-|", "timesig 4/4");

        assert.equal(result.beatsPerBar, 4);
        assert.equal(result.timeSignature?.beatsPerMeasure, 4);
    });

    test("meter alias works as a header keyword", () => {
        const result = parseDrumNotation("HH |x-x-x-x-|", "meter 4/4");

        assert.equal(result.beatsPerBar, 4);
    });

    test("ts alias works as a header keyword", () => {
        const result = parseDrumNotation("HH |x-x-x-x-|", "ts 4/4");

        assert.equal(result.beatsPerBar, 4);
    });

    test("grid alias works as a subdivision keyword", () => {
        const result = parseDrumNotation("HH |x-x-x-x-|", "grid 4");

        assert.equal(result.subdivisionsPerBeat, 4);
    });

    test("resolution alias works as a subdivision keyword", () => {
        const result = parseDrumNotation("HH |x-x-x-x-|", "resolution 4");

        assert.equal(result.subdivisionsPerBeat, 4);
    });
});

describe("header directives — compound meter", () => {

    test("time 6/8 is classified as compound with beatsPerBar 2", () => {
        const result = parseDrumNotation("HH |x-x-x-x-x-x-|", "time 6/8");

        assert.equal(result.timeSignature?.meterType, "compound");
        assert.equal(result.timeSignature?.beatsPerMeasure, 6);
        assert.equal(result.timeSignature?.beatUnit, 8);
        assert.equal(result.timeSignature?.beatsPerBar, 2);
        assert.equal(result.beatsPerBar, 2);
    });

    test("time 12/8 is classified as compound with beatsPerBar 4", () => {
        const result = parseDrumNotation("HH |x-x-x-x-x-x-x-x-x-x-x-x-|", "time 12/8");

        assert.equal(result.timeSignature?.meterType, "compound");
        assert.equal(result.timeSignature?.beatsPerBar, 4);
        assert.equal(result.beatsPerBar, 4);
    });

    test("time 9/8 is classified as compound with beatsPerBar 3", () => {
        const result = parseDrumNotation("HH |x-x-x-x-x-x-x-x-x-|", "time 9/8");

        assert.equal(result.timeSignature?.meterType, "compound");
        assert.equal(result.timeSignature?.beatsPerBar, 3);
    });

    test("time 4/4 is classified as simple", () => {
        const result = parseDrumNotation("HH |x-x-x-x-|", "time 4/4");

        assert.equal(result.timeSignature?.meterType, "simple");
    });
});

describe("header directives — body-level directives", () => {

    test("time 4/4 in the body sets beatsPerBar and timeSignature", () => {
        const source = [
            "time 4/4",
            "HH |x-x-x-x-|",
            "SD |----o---|",
        ].join("\n");
        const result = parseDrumNotation(source);

        assert.equal(result.beatsPerBar, 4);
        assert.equal(result.timeSignature?.beatsPerMeasure, 4);
        assert.equal(result.timeSignature?.beatUnit, 4);
        assert.equal(result.lines.length, 2);
    });

    test("subdiv 4 in the body sets subdivisionsPerBeat", () => {
        const source = [
            "subdiv 4",
            "HH |x-x-x-x-|",
        ].join("\n");
        const result = parseDrumNotation(source);

        assert.equal(result.subdivisionsPerBeat, 4);
        assert.equal(result.lines.length, 1);
    });

    test("body directive does not appear as an instrument line", () => {
        const source = [
            "time 4/4",
            "subdiv 4",
            "HH |x-x-x-x-|",
        ].join("\n");
        const result = parseDrumNotation(source);

        assert.equal(result.lines.length, 1);
        assert.equal(result.lines[0]?.instrument, "HH");
    });

    test("body-level directive with colon separator works", () => {
        const source = [
            "time: 4/4",
            "HH |x-x-x-x-|",
        ].join("\n");
        const result = parseDrumNotation(source);

        assert.equal(result.beatsPerBar, 4);
    });

    test("body-level directive with equals separator works", () => {
        const source = [
            "subdiv=4",
            "HH |x-x-x-x-|",
        ].join("\n");
        const result = parseDrumNotation(source);

        assert.equal(result.subdivisionsPerBeat, 4);
    });

    test("body directive overrides inline header for subdivisions", () => {
        const source = [
            "subdiv 8",
            "HH |x-x-x-x-|",
        ].join("\n");
        const result = parseDrumNotation(source, "subdiv 4");

        assert.equal(result.subdivisionsPerBeat, 8);
    });

    test("beats alias in body sets beatsPerBar without time signature", () => {
        const source = [
            "beats 3",
            "HH |x-x-x-|",
        ].join("\n");
        const result = parseDrumNotation(source);

        assert.equal(result.beatsPerBar, 3);
        assert.equal(result.timeSignature?.beatsPerMeasure, 3);
        assert.equal(result.timeSignature?.beatUnit, 4);
    });

    test("bpb alias in body sets beatsPerBar", () => {
        const source = [
            "bpb 5",
            "HH |x-x-x-x-x-|",
        ].join("\n");
        const result = parseDrumNotation(source);

        assert.equal(result.beatsPerBar, 5);
    });
});

describe("header directives — subdivision aliases", () => {

    test("subdiv 8th sets subdivisionsPerBeat to 2", () => {
        const result = parseDrumNotation("HH |x-x-|", "subdiv 8th");

        assert.equal(result.subdivisionsPerBeat, 2);
    });

    test("subdiv 8ths sets subdivisionsPerBeat to 2", () => {
        const result = parseDrumNotation("HH |x-x-|", "subdiv 8ths");

        assert.equal(result.subdivisionsPerBeat, 2);
    });

    test("subdiv eighth sets subdivisionsPerBeat to 2", () => {
        const result = parseDrumNotation("HH |x-x-|", "subdiv eighth");

        assert.equal(result.subdivisionsPerBeat, 2);
    });

    test("subdiv 16th sets subdivisionsPerBeat to 4", () => {
        const result = parseDrumNotation("HH |x-x-x-x-|", "subdiv 16th");

        assert.equal(result.subdivisionsPerBeat, 4);
    });

    test("subdiv 16ths sets subdivisionsPerBeat to 4", () => {
        const result = parseDrumNotation("HH |x-x-x-x-|", "subdiv 16ths");

        assert.equal(result.subdivisionsPerBeat, 4);
    });

    test("subdiv sixteenth sets subdivisionsPerBeat to 4", () => {
        const result = parseDrumNotation("HH |x-x-x-x-|", "subdiv sixteenth");

        assert.equal(result.subdivisionsPerBeat, 4);
    });

    test("subdiv triplet sets subdivisionsPerBeat to 3", () => {
        const result = parseDrumNotation("HH |x-x-x-|", "subdiv triplet");

        assert.equal(result.subdivisionsPerBeat, 3);
    });

    test("subdiv triplets sets subdivisionsPerBeat to 3", () => {
        const result = parseDrumNotation("HH |x-x-x-|", "subdiv triplets");

        assert.equal(result.subdivisionsPerBeat, 3);
    });

    test("subdiv tri sets subdivisionsPerBeat to 3", () => {
        const result = parseDrumNotation("HH |x-x-x-|", "subdiv tri");

        assert.equal(result.subdivisionsPerBeat, 3);
    });

    test("subdiv 3 sets subdivisionsPerBeat to 3", () => {
        const result = parseDrumNotation("HH |x-x-x-|", "subdiv 3");

        assert.equal(result.subdivisionsPerBeat, 3);
    });

    test("subdiv 8TH (uppercase) sets subdivisionsPerBeat to 2", () => {
        const result = parseDrumNotation("HH |x-x-|", "subdiv 8TH");

        assert.equal(result.subdivisionsPerBeat, 2);
    });

    test("subdiv 8Ths (mixed-case) sets subdivisionsPerBeat to 2", () => {
        const result = parseDrumNotation("HH |x-x-|", "subdiv 8Ths");

        assert.equal(result.subdivisionsPerBeat, 2);
    });

    test("subdiv EIGHTH (uppercase) sets subdivisionsPerBeat to 2", () => {
        const result = parseDrumNotation("HH |x-x-|", "subdiv EIGHTH");

        assert.equal(result.subdivisionsPerBeat, 2);
    });

    test("subdiv SIXTEENTH (uppercase) sets subdivisionsPerBeat to 4", () => {
        const result = parseDrumNotation("HH |x-x-x-x-|", "subdiv SIXTEENTH");

        assert.equal(result.subdivisionsPerBeat, 4);
    });

    test("subdiv Sixteenth (mixed-case) sets subdivisionsPerBeat to 4", () => {
        const result = parseDrumNotation("HH |x-x-x-x-|", "subdiv Sixteenth");

        assert.equal(result.subdivisionsPerBeat, 4);
    });

    test("subdiv 16TH (uppercase) sets subdivisionsPerBeat to 4", () => {
        const result = parseDrumNotation("HH |x-x-x-x-|", "subdiv 16TH");

        assert.equal(result.subdivisionsPerBeat, 4);
    });

    test("subdiv Triplet (mixed-case) sets subdivisionsPerBeat to 3", () => {
        const result = parseDrumNotation("HH |x-x-x-|", "subdiv Triplet");

        assert.equal(result.subdivisionsPerBeat, 3);
    });

    test("subdiv TRIPLET (uppercase) sets subdivisionsPerBeat to 3", () => {
        const result = parseDrumNotation("HH |x-x-x-|", "subdiv TRIPLET");

        assert.equal(result.subdivisionsPerBeat, 3);
    });

    test("subdiv TRI (uppercase) sets subdivisionsPerBeat to 3", () => {
        const result = parseDrumNotation("HH |x-x-x-|", "subdiv TRI");

        assert.equal(result.subdivisionsPerBeat, 3);
    });
});

describe("header directives — malformed values produce warnings", () => {

    test("malformed time signature 'time 5' produces a warning", () => {
        const result = parseDrumNotation("HH |x-x-x-x-|", "time 5");

        assert.ok(result.warnings && result.warnings.length > 0, "expected at least one warning");
        assert.ok(
            result.warnings?.some(w => w.toLowerCase().includes("time")),
            `expected warning mentioning 'time', got: ${JSON.stringify(result.warnings)}`
        );
    });

    test("malformed time signature 'time foo/bar' produces a warning", () => {
        const result = parseDrumNotation("HH |x-x-x-x-|", "time foo/bar");

        assert.ok(result.warnings && result.warnings.length > 0);
    });

    test("malformed time signature 'time 4' in body produces a warning", () => {
        const source = [
            "time 4",
            "HH |x-x-x-x-|",
        ].join("\n");
        const result = parseDrumNotation(source);

        assert.ok(result.warnings && result.warnings.length > 0);
        assert.ok(result.warnings?.some(w => w.toLowerCase().includes("time")));
    });

    test("invalid subdivision 'subdiv foo' produces a warning", () => {
        const result = parseDrumNotation("HH |x-x-x-x-|", "subdiv foo");

        assert.ok(result.warnings && result.warnings.length > 0, "expected at least one warning");
        assert.ok(
            result.warnings?.some(w => w.toLowerCase().includes("subdiv") || w.toLowerCase().includes("subdivision")),
            `expected warning mentioning subdivision, got: ${JSON.stringify(result.warnings)}`
        );
    });

    test("invalid subdivision 'subdiv foo' in body produces a warning", () => {
        const source = [
            "subdiv foo",
            "HH |x-x-x-x-|",
        ].join("\n");
        const result = parseDrumNotation(source);

        assert.ok(result.warnings && result.warnings.length > 0);
    });

    test("invalid beats-per-bar value 'beats abc' produces a warning", () => {
        const source = [
            "beats abc",
            "HH |x-x-x-x-|",
        ].join("\n");
        const result = parseDrumNotation(source);

        assert.ok(result.warnings && result.warnings.length > 0);
    });

    test("malformed and valid directives together: valid one still applies", () => {
        const result = parseDrumNotation("HH |x-x-x-x-|", "time 4/4 subdiv foo");

        assert.equal(result.beatsPerBar, 4);
        assert.ok(result.warnings && result.warnings.length > 0, "expected warning for bad subdivision");
        assert.equal(result.subdivisionsPerBeat, undefined);
    });

    test("no warnings when all directives are valid", () => {
        const result = parseDrumNotation("HH |x-x-x-x-|", "time 4/4 subdiv 4");

        assert.equal(result.warnings, undefined);
    });
});

describe("beat unit validation — isPowerOfTwo helper", () => {

    test("1 is a valid power of 2", () => {
        assert.equal(isPowerOfTwo(1), true);
    });

    test("2 is a valid power of 2", () => {
        assert.equal(isPowerOfTwo(2), true);
    });

    test("4 is a valid power of 2", () => {
        assert.equal(isPowerOfTwo(4), true);
    });

    test("8 is a valid power of 2", () => {
        assert.equal(isPowerOfTwo(8), true);
    });

    test("16 is a valid power of 2", () => {
        assert.equal(isPowerOfTwo(16), true);
    });

    test("32 is a valid power of 2", () => {
        assert.equal(isPowerOfTwo(32), true);
    });

    test("0 is not a power of 2", () => {
        assert.equal(isPowerOfTwo(0), false);
    });

    test("3 is not a power of 2", () => {
        assert.equal(isPowerOfTwo(3), false);
    });

    test("5 is not a power of 2", () => {
        assert.equal(isPowerOfTwo(5), false);
    });

    test("7 is not a power of 2", () => {
        assert.equal(isPowerOfTwo(7), false);
    });
});

describe("beat unit validation — parseHeaderLine rejects invalid denominators", () => {

    test("time 4/7 emits a warning about invalid beat unit", () => {
        const result = parseDrumNotation("HH |x-x-x-x-|", "time 4/7");

        assert.ok(result.warnings && result.warnings.length > 0, "expected a warning");
        assert.ok(
            result.warnings?.some(w => w.includes("7")),
            `expected warning mentioning the invalid unit '7', got: ${JSON.stringify(result.warnings)}`
        );
    });

    test("time 4/3 emits a warning about invalid beat unit", () => {
        const result = parseDrumNotation("HH |x-x-x-x-|", "time 4/3");

        assert.ok(result.warnings && result.warnings.length > 0, "expected a warning");
        assert.ok(
            result.warnings?.some(w => w.includes("3")),
            `expected warning mentioning the invalid unit '3', got: ${JSON.stringify(result.warnings)}`
        );
    });

    test("time 4/5 emits a warning about invalid beat unit", () => {
        const result = parseDrumNotation("HH |x-x-x-x-|", "time 4/5");

        assert.ok(result.warnings && result.warnings.length > 0, "expected a warning");
    });

    test("time 4/0 emits a warning about invalid beat unit", () => {
        const result = parseDrumNotation("HH |x-x-x-x-|", "time 4/0");

        assert.ok(result.warnings && result.warnings.length > 0, "expected a warning");
    });

    test("time 4/7 does not produce a timeSignature", () => {
        const result = parseDrumNotation("HH |x-x-x-x-|", "time 4/7");

        assert.equal(result.timeSignature, undefined);
    });

    test("time 4/3 does not produce a timeSignature", () => {
        const result = parseDrumNotation("HH |x-x-x-x-|", "time 4/3");

        assert.equal(result.timeSignature, undefined);
    });

    test("time 4/4 (valid) produces no warning", () => {
        const result = parseDrumNotation("HH |x-x-x-x-|", "time 4/4");

        assert.equal(result.warnings, undefined);
        assert.equal(result.timeSignature?.beatUnit, 4);
    });

    test("time 3/4 (valid) produces no warning", () => {
        const result = parseDrumNotation("HH |x-x-x-|", "time 3/4");

        assert.equal(result.warnings, undefined);
    });

    test("time 6/8 (valid) produces no warning", () => {
        const result = parseDrumNotation("HH |x-x-x-x-x-x-|", "time 6/8");

        assert.equal(result.warnings, undefined);
    });

    test("time 4/16 (valid) produces no warning", () => {
        const result = parseDrumNotation("HH |x-x-x-x-|", "time 4/16");

        assert.equal(result.warnings, undefined);
        assert.equal(result.timeSignature?.beatUnit, 16);
    });

    test("time 2/1 (valid) produces no warning", () => {
        const result = parseDrumNotation("HH |x-x-|", "time 2/1");

        assert.equal(result.warnings, undefined);
        assert.equal(result.timeSignature?.beatUnit, 1);
    });

    test("invalid beat unit in body-level directive also emits a warning", () => {
        const source = [
            "time 4/7",
            "HH |x-x-x-x-|",
        ].join("\n");
        const result = parseDrumNotation(source);

        assert.ok(result.warnings && result.warnings.length > 0, "expected a warning");
        assert.ok(result.warnings?.some(w => w.includes("7")));
    });
});

describe("beat unit validation — buildTimeSignature with validate flag", () => {

    test("buildTimeSignature with valid unit and validate=true succeeds", () => {
        assert.doesNotThrow(() => buildTimeSignature(4, 4, true));
        assert.doesNotThrow(() => buildTimeSignature(6, 8, true));
        assert.doesNotThrow(() => buildTimeSignature(4, 16, true));
        assert.doesNotThrow(() => buildTimeSignature(2, 1, true));
    });

    test("buildTimeSignature with beatUnit 3 and validate=true throws", () => {
        assert.throws(
            () => buildTimeSignature(4, 3, true),
            /invalid beat unit/i
        );
    });

    test("buildTimeSignature with beatUnit 5 and validate=true throws", () => {
        assert.throws(
            () => buildTimeSignature(4, 5, true),
            /invalid beat unit/i
        );
    });

    test("buildTimeSignature with beatUnit 7 and validate=true throws", () => {
        assert.throws(
            () => buildTimeSignature(4, 7, true),
            /invalid beat unit/i
        );
    });

    test("buildTimeSignature with beatUnit 0 and validate=true throws", () => {
        assert.throws(
            () => buildTimeSignature(4, 0, true),
            /invalid beat unit/i
        );
    });

    test("buildTimeSignature with invalid unit and validate=false (default) does not throw", () => {
        assert.doesNotThrow(() => buildTimeSignature(4, 7));
        assert.doesNotThrow(() => buildTimeSignature(4, 7, false));
    });
});

describe("buildTimeSignature helper", () => {

    test("4/4 builds correct simple signature", () => {
        const sig = buildTimeSignature(4, 4);

        assert.equal(sig.beatsPerMeasure, 4);
        assert.equal(sig.beatUnit, 4);
        assert.equal(sig.meterType, "simple");
        assert.equal(sig.beatsPerBar, 4);
    });

    test("6/8 builds correct compound signature", () => {
        const sig = buildTimeSignature(6, 8);

        assert.equal(sig.beatsPerMeasure, 6);
        assert.equal(sig.beatUnit, 8);
        assert.equal(sig.meterType, "compound");
        assert.equal(sig.beatsPerBar, 2);
    });

    test("3/4 builds correct simple signature", () => {
        const sig = buildTimeSignature(3, 4);

        assert.equal(sig.meterType, "simple");
        assert.equal(sig.beatsPerBar, 3);
    });

    test("5/4 builds correct simple signature with 5 beats", () => {
        const sig = buildTimeSignature(5, 4);

        assert.equal(sig.meterType, "simple");
        assert.equal(sig.beatsPerBar, 5);
    });

    test("9/8 is compound with 3 beats per bar", () => {
        const sig = buildTimeSignature(9, 8);

        assert.equal(sig.meterType, "compound");
        assert.equal(sig.beatsPerBar, 3);
    });

    test("4/8 is NOT classified as compound (4 is not divisible by 3)", () => {
        const sig = buildTimeSignature(4, 8);

        assert.equal(sig.meterType, "simple");
        assert.equal(sig.beatsPerBar, 4);
    });
});

describe("buildLayout — HH accent-open articulation parsing", () => {

    test(">o on HH produces articulation 'accent-open'", () => {
        const { notes } = buildLayout("HH", ">o--");

        assert.equal(notes.length, 1);
        assert.equal(notes[0]?.articulation, "accent-open");
        assert.equal(notes[0]?.symbol, "o");
    });

    test("o^ on HH produces articulation 'accent-open'", () => {
        const { notes } = buildLayout("HH", "o^--");

        assert.equal(notes.length, 1);
        assert.equal(notes[0]?.articulation, "accent-open");
        assert.equal(notes[0]?.symbol, "o");
    });

    test("plain o on HH produces articulation 'open' (not accent-open)", () => {
        const { notes } = buildLayout("HH", "o---");

        assert.equal(notes.length, 1);
        assert.equal(notes[0]?.articulation, "open");
    });

    test(">x on HH produces articulation 'accent' (not accent-open)", () => {
        const { notes } = buildLayout("HH", ">x--");

        assert.equal(notes.length, 1);
        assert.equal(notes[0]?.articulation, "accent");
        assert.equal(notes[0]?.symbol, "x");
    });

    test("x^ on HH produces articulation 'accent' (not accent-open)", () => {
        const { notes } = buildLayout("HH", "x^--");

        assert.equal(notes.length, 1);
        assert.equal(notes[0]?.articulation, "accent");
        assert.equal(notes[0]?.symbol, "x");
    });

    test(">o on SD produces articulation 'accent' (SD does not support open)", () => {
        const { notes } = buildLayout("SD", ">o--");

        assert.equal(notes.length, 1);
        assert.equal(notes[0]?.articulation, "accent");
    });

    test("o^ on SD produces articulation 'accent' (SD does not support open)", () => {
        const { notes } = buildLayout("SD", "o^--");

        assert.equal(notes.length, 1);
        assert.equal(notes[0]?.articulation, "accent");
    });

    test("multiple notes: >o and o^ and o in same HH pattern parse correctly", () => {
        const { notes } = buildLayout("HH", ">oo^o-");

        assert.equal(notes.length, 3);
        assert.equal(notes[0]?.articulation, "accent-open");
        assert.equal(notes[1]?.articulation, "accent-open");
        assert.equal(notes[2]?.articulation, "open");
    });

    test(">o and >x in same HH pattern produce correct articulations", () => {
        const { notes } = buildLayout("HH", ">o>x");

        assert.equal(notes.length, 2);
        assert.equal(notes[0]?.articulation, "accent-open");
        assert.equal(notes[1]?.articulation, "accent");
    });
});
