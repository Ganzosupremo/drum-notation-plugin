import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { parseDrumDocument } from "../notation/parseDocument";
import { TranscribedDrumEvent, transcribedEventsToDrumSource } from "./toDrumSource";

describe("transcribedEventsToDrumSource", () => {
    test("quantizes simultaneous kit events into parseable 16th-note grid source", () => {
        const events: TranscribedDrumEvent[] = [
            { timeSeconds: 0, instrument: "kick" },
            { timeSeconds: 0, instrument: "hi-hat-closed" },
            { timeSeconds: 60 / 66, instrument: "snare" },
            { timeSeconds: 2 * 60 / 66, instrument: "kick" },
            { timeSeconds: 3 * 60 / 66, instrument: "snare" },
            { timeSeconds: 4 * 60 / 66, instrument: "hi-hat-open" },
        ];

        const result = transcribedEventsToDrumSource(events, { tempoBpm: 66 });
        const parsed = parseDrumDocument(result.source);

        assert.equal(result.measureCount, 2);
        assert.equal(result.acceptedEvents, 6);
        assert.equal(parsed.diagnostics.filter(diagnostic => diagnostic.severity === "error").length, 0);
        assert.deepEqual(parsed.measures.map(measure => measure.events.map(event => `${event.instrument}:${event.tick}`)), [
            ["HH:0", "BD:0", "SD:12", "BD:24", "SD:36"],
            ["HH:0"],
        ]);
        assert.match(result.source, /HH \| x . . . {2}. . . . {2}. . . . {2}. . . . \| o/);
    });

    test("uses confidence to resolve duplicate events and preserves events before the downbeat for review", () => {
        const result = transcribedEventsToDrumSource([
            { timeSeconds: 0.1, instrument: "kick", confidence: 0.9 },
            { timeSeconds: 1, instrument: "snare", confidence: 0.4 },
            { timeSeconds: 1.01, instrument: "snare", confidence: 0.8 },
        ], { tempoBpm: 60, firstDownbeatSeconds: 1 });

        assert.equal(result.acceptedEvents, 1);
        assert.deepEqual(result.discardedEvents, [{ timeSeconds: 0.1, instrument: "kick", confidence: 0.9, reason: "before-first-downbeat" }]);
        assert.match(result.source, /^meter: 4\/4\ngrid: 16\ntempo: 60\nSD \| o/m);
    });
});
