/// <reference types="node" />
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { parseDrumDocument } from "./parseDocument";
import { buildEngravingSystems } from "./engravingLayout";

function firstMeasure(source: string, width = 720, scale = 1) {
    const document = parseDrumDocument(source);
    const layout = buildEngravingSystems(document, width, scale, false)[0]?.measures[0];
    assert.ok(layout);
    return layout;
}

describe("musical engraving layout", () => {
    test("assigns exactly one x coordinate to simultaneous upper and lower events", () => {
        const layout = firstMeasure("4/4\nH: 1\nS: 1\nK: 1");
        const column = layout.columns.find(item => item.tick === 0);
        assert.ok(column);
        assert.equal(layout.xAtTick(0), column.x);
        assert.equal(layout.columns.filter(item => item.tick === 0).length, 1);
    });

    test("ghosts, dots and dense rhythms increase the natural width", () => {
        const plain = firstMeasure("4/4\nS: 1", 320);
        const ghost = firstMeasure("4/4\nS: (1)", 320);
        const dotted = firstMeasure("4/4\nK: 1a", 320);
        const dense = firstMeasure("4/4\nH: 16ths\nS: 1e 1& 1a 2e 2& 2a 3e 3& 3a 4e 4& 4a", 320);
        assert.ok(ghost.columns.find(column => column.tick === 0)!.leftExtent
            > plain.columns.find(column => column.tick === 0)!.leftExtent);
        assert.ok(dotted.columns.some(column => column.rightExtent > 14));
        assert.ok(dense.requiredWidth > plain.requiredWidth);
    });

    test("justifies sparse systems to the container and never packs more than four measures", () => {
        const four = parseDrumDocument("4/4\nH: 1 | 1 | 1 | 1");
        const systems = buildEngravingSystems(four, 1200, 1, false);
        assert.equal(systems.length, 1);
        assert.equal(systems[0]?.measures.length, 4);
        assert.equal(systems[0]?.width, 1200);

        const five = parseDrumDocument("4/4\nH: 1 | 1 | 1 | 1 | 1");
        assert.deepEqual(buildEngravingSystems(five, 1600, 1, false).map(system => system.measures.length), [4, 1]);
    });

    test("uses one measure per mobile system and preserves collision clearance at every scale", () => {
        const document = parseDrumDocument("4/4\nH: 16ths | 16ths\nS: (1e) (2e) (3e) (4e) | (1e) (2e) (3e) (4e)");
        assert.equal(buildEngravingSystems(document, 480, 1, false).length, 2);
        for (const scale of [0.8, 1, 1.5]) {
            const layout = buildEngravingSystems(document, 900, scale, false)[0]?.measures[0];
            assert.ok(layout);
            for (let index = 1; index < layout.columns.length; index++) {
                const previous = layout.columns[index - 1]!;
                const current = layout.columns[index]!;
                assert.ok(previous.x + previous.rightExtent + 6 * scale <= current.x - current.leftExtent + 1e-8);
            }
        }
    });

    test("keeps an overfull dense measure at its natural width for horizontal scrolling", () => {
        const document = parseDrumDocument("4/4\nH: 16ths\nS: (1e) (1&) (1a) (2e) (2&) (2a) (3e) (3&) (3a) (4e) (4&) (4a)");
        const system = buildEngravingSystems(document, 320, 1.5, true)[0];
        assert.ok(system);
        assert.ok(system.width > 320);
        assert.ok(system.measures[0]!.width >= system.measures[0]!.requiredWidth);
    });
});
