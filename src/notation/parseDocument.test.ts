/// <reference types="node" />
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { parseDrumDocument } from "./parseDocument";
import { buildMeasureChords } from "../renderer/renderDocument";
import { serializeCompactDocument } from "./serializeCompact";

describe("drum document v2 position syntax", () => {
    test("normalizes compact syntax to the same musical events as long syntax", () => {
        const long = parseDrumDocument([
            "meter: 4/4",
            "RC: eighths; accent: 1, 3",
            "SD: 2, 4; ghost: 3a",
            "BD: 1, 2&, 3",
        ].join("\n"));
        const compact = parseDrumDocument([
            "4/4",
            "R: 8ths >1 >3",
            "S: 2 4 (3a)",
            "K: 1 2& 3",
        ].join("\n"));
        const musicalEvents = (document: typeof long) => document.measures.map(measure => measure.events.map(event => ({
            instrument: event.instrument,
            tick: event.tick,
            durationTicks: event.durationTicks,
            articulation: event.articulation,
        })));
        assert.deepEqual(musicalEvents(compact), musicalEvents(long));
        assert.deepEqual(compact.timeSignature, long.timeSignature);
    });

    test("supports compact open, accent-open, preset and instrument aliases", () => {
        const document = parseDrumDocument([
            "4/4",
            "H: 4ths o2 >o3",
            "C: 1",
            "T1: 1e",
            "T2: 1&",
            "T3: 1a",
            "P: 4",
        ].join("\n"));
        const events = document.measures[0]?.events ?? [];
        assert.equal(events.find(event => event.instrument === "HH" && event.tick === 12)?.articulation, "open");
        assert.equal(events.find(event => event.instrument === "HH" && event.tick === 24)?.articulation, "accent-open");
        assert.deepEqual([...new Set(events.map(event => event.instrument))].sort(), ["CC", "HF", "HH", "HT", "MT", "FT"].sort());
    });

    test("treats aliases case-insensitively and accepts every short preset", () => {
        const quarters = parseDrumDocument("4/4\nh: 4ths");
        const eighths = parseDrumDocument("4/4\nr: 8ths");
        const sixteenths = parseDrumDocument("4/4\ns: 16ths");
        const triplets = parseDrumDocument("4/4\nt1: tri");
        assert.equal(quarters.measures[0]?.events.length, 4);
        assert.equal(eighths.measures[0]?.events.length, 8);
        assert.equal(sixteenths.measures[0]?.events.length, 16);
        assert.equal(triplets.measures[0]?.events.length, 12);
        assert.equal(triplets.measures[0]?.events[0]?.instrument, "HT");
    });

    test("expands local measure repeats and preserves source positions", () => {
        const document = parseDrumDocument([
            "4/4",
            "H: 8ths x2",
            "S: 2 4 | %",
            "K: 1 3 | % x1",
        ].join("\n"));
        assert.equal(document.measures.length, 2);
        assert.deepEqual(document.measures[0]?.events.map(event => [event.instrument, event.tick]), document.measures[1]?.events.map(event => [event.instrument, event.tick]));
        assert.equal(document.measures[1]?.events.find(event => event.instrument === "HH")?.source.line, 2);
    });

    test("supports x64 and diagnoses invalid or source-less repeats without losing valid output", () => {
        assert.equal(parseDrumDocument("4/4\nH: 1 x1").measures.length, 1);
        assert.equal(parseDrumDocument("4/4\nH: 1 x64").measures.length, 64);
        const invalid = parseDrumDocument("4/4\nH: 1 x65\nS: %\nK: 1 x0");
        assert.equal(invalid.measures.length, 1);
        assert.equal(invalid.measures[0]?.events.filter(event => event.instrument === "HH").length, 1);
        assert.equal(invalid.diagnostics.filter(item => item.code === "invalid-repeat").length, 2);
        assert.equal(invalid.diagnostics.filter(item => item.code === "repeat-without-source").length, 1);
    });

    test("reports contradictory compact articulations once", () => {
        const document = parseDrumDocument("4/4\nH: o1 (1)");
        assert.equal(document.diagnostics.filter(item => item.code === "conflicting-articulation").length, 1);
    });

    test("parses the extended kit, techniques and ornaments in compact and long syntax", () => {
        const compact = parseDrumDocument("4/4\nS: cs1 rs2 f3 d3a rr4\nR: 8ths b1 b3\nCH: 1 3\nSP: 2& 4&");
        const events = compact.measures[0]?.events ?? [];
        assert.equal(events.find(event => event.instrument === "SD" && event.tick === 0)?.technique, "cross-stick");
        assert.equal(events.find(event => event.instrument === "SD" && event.tick === 12)?.technique, "rimshot");
        assert.equal(events.find(event => event.instrument === "SD" && event.tick === 24)?.ornament, "flam");
        assert.equal(events.find(event => event.instrument === "SD" && event.tick === 33)?.ornament, "drag");
        assert.equal(events.find(event => event.instrument === "SD" && event.tick === 36)?.ornament, "roll");
        assert.equal(events.find(event => event.instrument === "RC" && event.tick === 0)?.technique, "bell");
        assert.ok(events.some(event => event.instrument === "CH"));
        assert.ok(events.some(event => event.instrument === "SP"));

        const long = parseDrumDocument("4/4\nSD: cross-stick: 1; rimshot: 2; flam: 3; drag: 3a; roll: 4\nRC: bell: 1 3");
        assert.deepEqual(
            long.measures[0]?.events.map(event => [event.instrument, event.tick, event.technique, event.ornament]),
            events.filter(event => event.instrument === "SD" || event.instrument === "RC")
                .filter(event => event.instrument !== "RC" || event.tick === 0 || event.tick === 24)
                .map(event => [event.instrument, event.tick, event.technique, event.ornament]),
        );
    });

    test("validates technique capabilities and retains an exact range for repeated tokens", () => {
        const document = parseDrumDocument("4/4\nS: cs1 rs1 2 2\nH: b1");
        const conflict = document.diagnostics.find(item => item.code === "conflicting-technique");
        assert.equal(conflict?.location.column, 8);
        assert.equal(conflict?.location.endColumn, 11);
        assert.equal(conflict?.location.startOffset, 11);
        assert.equal(document.diagnostics.filter(item => item.code === "conflicting-technique").length, 1);
        assert.equal(document.diagnostics.filter(item => item.code === "unsupported-technique").length, 1);
    });

    test("supports extended grid tokens and configurable staff positions", () => {
        const document = parseDrumDocument("4/4\npositions: CH=-9, SD=0\ngrid: 8\nSD | cs . rs . f . rr . |\nRC | b . x . b . x . |");
        assert.equal(document.instrumentPositions.CH, -9);
        assert.equal(document.instrumentPositions.SD, 0);
        assert.deepEqual(document.measures[0]?.events.filter(event => event.instrument === "SD").map(event => [event.technique, event.ornament]), [
            ["cross-stick", undefined], ["rimshot", undefined], [undefined, "flam"], [undefined, "roll"],
        ]);
    });

    test("serializes a legacy groove to parseable compact v2 syntax", () => {
        const legacy = parseDrumDocument("HH |x-x-x-x-x-x-x-x-|\nSD |----o-------o---|\nBD |o-------o-------|");
        const migrated = parseDrumDocument(serializeCompactDocument(legacy));
        const onsets = (document: typeof legacy) => document.measures.map(measure => measure.events.map(event => [event.instrument, event.tick, event.articulation]));
        assert.deepEqual(onsets(migrated), onsets(legacy));
        assert.equal(migrated.sourceMode, "positions");
    });

    test("offers a safe copyable correction for a nearby instrument name", () => {
        const document = parseDrumDocument("4/4\nHS: 1 2");
        const diagnostic = document.diagnostics.find(item => item.code === "unknown-instrument");
        assert.equal(diagnostic?.suggestion, "Did you mean HH?");
        assert.equal(diagnostic?.fixes?.[0]?.replacement, "HH");
        assert.equal(diagnostic?.fixes?.[0]?.range.endColumn, 3);
    });

    test("parses presets, positions and articulations", () => {
        const document = parseDrumDocument([
            "meter: 4/4",
            "HH: eighths; open: 4&; accent: 1, 3",
            "SD: 2, 4; ghost: 3a",
            "BD: 1, 2&, 3",
        ].join("\n"));

        assert.equal(document.sourceMode, "positions");
        assert.equal(document.measures.length, 1);
        assert.equal(document.measures[0]?.events.filter(event => event.instrument === "HH").length, 8);
        assert.equal(document.measures[0]?.events.find(event => event.instrument === "HH" && event.tick === 42)?.articulation, "open");
        assert.equal(document.measures[0]?.events.find(event => event.instrument === "SD" && event.tick === 33)?.articulation, "ghost");
        assert.equal(document.measures[0]?.events.find(event => event.instrument === "BD" && event.tick === 18)?.voice, "lower");
        assert.equal(document.diagnostics.filter(item => item.severity === "error").length, 0);
    });

    test("preserves measure separators and resets positions", () => {
        const document = parseDrumDocument("meter: 4/4\nSD: 2, 4 | 1&, 3");
        assert.equal(document.measures.length, 2);
        assert.deepEqual(document.measures[0]?.events.map(event => event.tick), [12, 36]);
        assert.deepEqual(document.measures[1]?.events.map(event => event.tick), [6, 24]);
    });

    test("scopes presets and modifiers to their measure and preserves onset durations", () => {
        const document = parseDrumDocument([
            "meter: 4/4",
            "RC: eighths; accent: 1, 3 | eighths",
            "SD: 2, 4; ghost: 3a | 2, 4; ghost: 2a, 3a",
            "BD: 1, 2&, 3 | 1, 2&, 3, 3a",
        ].join("\n"));

        assert.equal(document.measures.length, 2);
        const events = (measure: number, instrument: string) =>
            document.measures[measure]?.events.filter(event => event.instrument === instrument) ?? [];
        const articulations = (measure: number, instrument: string, articulation: string) =>
            events(measure, instrument).filter(event => event.articulation === articulation).map(event => event.tick);
        const durations = (measure: number, instrument: string) =>
            events(measure, instrument).map(event => [event.tick, event.durationTicks]);

        assert.deepEqual(articulations(0, "RC", "accent"), [0, 24]);
        assert.deepEqual(articulations(1, "RC", "accent"), []);
        assert.deepEqual(articulations(0, "SD", "ghost"), [33]);
        assert.deepEqual(articulations(1, "SD", "ghost"), [21, 33]);
        assert.deepEqual(durations(0, "BD"), [[0, 12], [18, 6], [24, 12]]);
        assert.deepEqual(durations(1, "BD"), [[0, 12], [18, 6], [24, 12], [33, 3]]);
        assert.equal(document.diagnostics.filter(item => item.severity === "error").length, 0);
    });

    test("uses compound pulse offsets", () => {
        const document = parseDrumDocument("meter: 6/8\nHH: triplets\nSD: 1&, 2a");
        assert.equal(document.timeSignature.beatsPerBar, 2);
        assert.deepEqual(document.measures[0]?.events.filter(event => event.instrument === "SD").map(event => event.tick), [4, 20]);
        assert.equal(document.measures[0]?.subdivisionsPerBeat, 3);
    });
});

describe("drum document v2 grid and legacy syntax", () => {
    test("token grid treats whitespace as grouping only", () => {
        const document = parseDrumDocument([
            "meter: 4/4",
            "grid: 16",
            "HH | x . x .  x . x o  x . x .  x . x . |",
            "SD | . . . .  o . . .  . . . .  >o . (o) . |",
        ].join("\n"));
        assert.equal(document.sourceMode, "grid");
        assert.equal(document.measures[0]?.subdivisionsPerBeat, 4);
        assert.equal(document.measures[0]?.events.find(event => event.instrument === "HH" && event.tick === 21)?.articulation, "open");
        assert.equal(document.diagnostics.filter(item => item.code === "measure-length").length, 0);
    });

    test("corrects legacy spaced eighth-note convention", () => {
        const document = parseDrumDocument([
            "HH |x-x-x-x-x-x-x-x-|",
            "SD |----o-------o---|",
            "BD |o-------o-------|",
        ].join("\n"));
        assert.equal(document.sourceMode, "legacy");
        assert.equal(document.measures[0]?.subdivisionsPerBeat, 2);
        assert.deepEqual(document.measures[0]?.events.filter(event => event.instrument === "SD").map(event => event.tick), [12, 36]);
        assert.equal(document.diagnostics.filter(item => item.code === "legacy-syntax").length, 1);
    });

    test("normalizes instrument case and reports invalid lengths without discarding valid events", () => {
        const document = parseDrumDocument("meter: 4/4\ngrid: 8\nhh | x . x |");
        assert.equal(document.instruments[0]?.instrument, "HH");
        assert.equal(document.measures[0]?.events.length, 2);
        assert.equal(document.measures[0]?.valid, false);
        assert.ok(document.diagnostics.some(item => item.code === "measure-length"));
    });

    test("deduplicates malformed header diagnostics", () => {
        const document = parseDrumDocument("time: nope\nHH |x---|");
        assert.equal(document.diagnostics.filter(item => item.code === "header").length, 1);
    });

    test("distinguishes diagnostics originating in the fence header", () => {
        const document = parseDrumDocument("H: 1 3", "time nope");
        const diagnostic = document.diagnostics.find(item => item.code === "header");
        assert.equal(diagnostic?.location.source, "fence-header");
        assert.equal(diagnostic?.location.endColumn, 10);
    });
});

describe("timeline chord grouping", () => {
    test("combines simultaneous upper notes and keeps kick in lower voice", () => {
        const document = parseDrumDocument("meter: 4/4\nHH: 1, 2\nSD: 1, 2\nBD: 1");
        const measure = document.measures[0];
        assert.ok(measure);
        const upper = buildMeasureChords(measure, "upper", 0, 240);
        const lower = buildMeasureChords(measure, "lower", 0, 240);
        assert.equal(upper[0]?.events.length, 2);
        assert.deepEqual(upper[0]?.events.map(event => event.instrument).sort(), ["HH", "SD"]);
        assert.equal(lower[0]?.events[0]?.instrument, "BD");
    });
});
