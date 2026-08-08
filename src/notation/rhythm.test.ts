/// <reference types="node" />
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { parseDrumDocument } from "./parseDocument";
import { buildVoiceTimeline } from "./rhythm";

describe("voice rhythm timelines", () => {
    test("completes an active lower voice with conventional rests", () => {
        const document = parseDrumDocument("meter: 4/4\nBD: 1, 2&, 3");
        const timeline = buildVoiceTimeline(document, document.measures[0]!, "lower")!;
        assert.deepEqual(timeline.atoms.map(atom => [atom.kind, atom.tick, atom.durationTicks]), [
            ["chord", 0, 12],
            ["rest", 12, 6],
            ["chord", 18, 6],
            ["chord", 24, 12],
            ["rest", 36, 12],
        ]);
    });

    test("combines simultaneous instruments without changing the lower voice", () => {
        const document = parseDrumDocument("meter: 4/4\nHH: eighths\nSD: 2, 4\nBD: 1, 3");
        const upper = buildVoiceTimeline(document, document.measures[0]!, "upper")!;
        const lower = buildVoiceTimeline(document, document.measures[0]!, "lower")!;
        assert.deepEqual(upper.atoms.find(atom => atom.tick === 12)?.events.map(event => event.instrument).sort(), ["HH", "SD"]);
        assert.deepEqual(lower.atoms.map(atom => [atom.kind, atom.tick, atom.durationTicks]), [
            ["chord", 0, 12], ["rest", 12, 12], ["chord", 24, 12], ["rest", 36, 12],
        ]);
    });

    test("splits only the upper pulse when a ghost onset occurs at 3a", () => {
        const document = parseDrumDocument("meter: 4/4\nRC: eighths\nSD: 2, 4; ghost: 3a\nBD: 1, 3");
        const upper = buildVoiceTimeline(document, document.measures[0]!, "upper")!;
        const lower = buildVoiceTimeline(document, document.measures[0]!, "lower")!;
        assert.deepEqual(upper.atoms.filter(atom => atom.tick >= 24 && atom.tick < 36).map(atom => [atom.tick, atom.durationTicks]), [[24, 6], [30, 3], [33, 3]]);
        assert.equal(lower.atoms.find(atom => atom.tick === 24)?.durationTicks, 12);
    });

    test("preserves grid cells and explicit ties", () => {
        const document = parseDrumDocument("meter: 4/4\ngrid: 16\nHH | x ~ . .  . . . .  . . . .  . . . . |");
        const timeline = buildVoiceTimeline(document, document.measures[0]!, "upper")!;
        assert.equal(timeline.atoms[0]?.kind, "chord");
        assert.equal(timeline.atoms[0]?.durationTicks, 6);
        assert.equal(timeline.atoms[0]?.events[0]?.tied, true);
        assert.equal(timeline.atoms[1]?.kind, "rest");
        assert.equal(timeline.atoms[1]?.durationTicks, 6);

        const crossing = parseDrumDocument("meter: 4/4\ngrid: 16\nHH | . . . x  ~ . . .  . . . .  . . . . |");
        const crossingTimeline = buildVoiceTimeline(crossing, crossing.measures[0]!, "upper")!;
        assert.ok(crossingTimeline.atoms.some(atom => atom.tick === 12 && atom.continuation && atom.durationTicks === 3));
        assert.ok(!crossingTimeline.atoms.some(atom => atom.kind === "rest" && atom.tick === 12));
    });

    test("creates dotted rests and natural compound values", () => {
        const simple = parseDrumDocument("meter: 4/4\nBD: 1a");
        const simpleTimeline = buildVoiceTimeline(simple, simple.measures[0]!, "lower")!;
        assert.equal(simpleTimeline.atoms[0]?.notation.base, "eighth");
        assert.equal(simpleTimeline.atoms[0]?.notation.dots, 1);

        const compound = parseDrumDocument("meter: 6/8\nHH: triplets");
        const compoundTimeline = buildVoiceTimeline(compound, compound.measures[0]!, "upper")!;
        assert.ok(compoundTimeline.atoms.every(atom => atom.notation.tuplet === undefined));
    });

    test("creates tuplets and derives grid durations from attacks instead of empty cells", () => {
        const triplets = parseDrumDocument("meter: 4/4\nHH: triplets");
        const tripletTimeline = buildVoiceTimeline(triplets, triplets.measures[0]!, "upper")!;
        assert.equal(tripletTimeline.tupletGroups.length, 4);
        assert.ok(tripletTimeline.atoms.every(atom => atom.notation.tuplet === 3));

        const grid = parseDrumDocument("meter: 4/4\ngrid: 16\nHH | x . x .  . . . .  . . . .  . . . . |");
        const gridTimeline = buildVoiceTimeline(grid, grid.measures[0]!, "upper")!;
        assert.deepEqual(gridTimeline.atoms.slice(0, 2).map(atom => [atom.kind, atom.tick, atom.durationTicks]), [
            ["chord", 0, 6], ["chord", 6, 6],
        ]);
        assert.deepEqual(gridTimeline.beamGroups[0]?.atomIndexes, [0, 1]);
    });

    test("fills complete timelines in supported simple and compound meters", () => {
        const meters = ["3/4", "4/4", "5/4", "6/8", "9/8", "12/8"];
        meters.forEach(meter => {
            const compound = meter.endsWith("/8");
            const document = parseDrumDocument(`meter: ${meter}\nHH: ${compound ? "triplets" : "eighths"}`);
            const measure = document.measures[0]!;
            const timeline = buildVoiceTimeline(document, measure, "upper")!;
            assert.equal(timeline.atoms.reduce((total, atom) => total + atom.durationTicks, 0), measure.beats * 12, meter);
            assert.equal(document.diagnostics.filter(item => item.code === "mixed-subdivision").length, 0, meter);
        });
    });
});

describe("grouping and rhythm diagnostics", () => {
    test("uses meter defaults and accepts an explicit grouping", () => {
        const five = parseDrumDocument("meter: 5/4\nHH: eighths");
        assert.deepEqual(five.grouping, [3, 2]);
        const fiveTimeline = buildVoiceTimeline(five, five.measures[0]!, "upper")!;
        assert.equal(fiveTimeline.beamGroups.length, 2);
        assert.ok(fiveTimeline.beamGroups.every(group => group.startTick < 36 && group.endTick < 36
            || group.startTick >= 36 && group.endTick < 60));
        assert.deepEqual(parseDrumDocument("meter: 6/8\nHH: triplets").grouping, [3, 3]);
        const explicit = parseDrumDocument("meter: 5/4\ngrouping: 2+3\nHH: eighths");
        assert.deepEqual(explicit.grouping, [2, 3]);
        const explicitTimeline = buildVoiceTimeline(explicit, explicit.measures[0]!, "upper")!;
        assert.ok(explicitTimeline.beamGroups.every(group => group.startTick < 24 && group.endTick < 24
            || group.startTick >= 24));
    });

    test("falls back and reports an invalid grouping once", () => {
        const document = parseDrumDocument("meter: 5/4\ngrouping: 2+2\nHH: eighths");
        assert.deepEqual(document.grouping, [3, 2]);
        assert.equal(document.diagnostics.filter(item => item.code === "invalid-grouping").length, 1);
    });

    test("reports a mixed binary and ternary pulse once and keeps other measures valid", () => {
        const document = parseDrumDocument("meter: 4/4\nHH: triplets; open: 1& | eighths");
        assert.equal(document.diagnostics.filter(item => item.code === "mixed-subdivision").length, 1);
        assert.equal(document.measures[0]?.valid, false);
        assert.equal(document.measures[1]?.valid, true);
    });
});
