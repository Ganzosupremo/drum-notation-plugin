import { test, describe, before } from "node:test";
import assert from "node:assert/strict";

class MockClassList {
    classes = new Set<string>();
    add(...cs: string[]) { cs.forEach(c => this.classes.add(c)); }
    has(c: string) { return this.classes.has(c); }
}

class MockSVGElement {
    tagName: string;
    attributes = new Map<string, string>();
    children: MockSVGElement[] = [];
    classList = new MockClassList();
    textContent = "";

    constructor(tag: string) { this.tagName = tag; }
    setAttribute(k: string, v: string) { this.attributes.set(k, v); }
    getAttribute(k: string) { return this.attributes.get(k) ?? null; }
    appendChild(child: MockSVGElement): MockSVGElement { this.children.push(child); return child; }
}

function makeSVG(): MockSVGElement {
    return new MockSVGElement("svg");
}

import { BeamGroup } from "../types";

type RenderBeams = typeof import("./renderBeams").renderBeams;
let renderBeams: RenderBeams;
let STEM_TOP: number;

before(async () => {
    (globalThis as any).document = {
        createElementNS: (_ns: string, tag: string) => new MockSVGElement(tag),
    };
    const mod = await import("./renderBeams");
    renderBeams = mod.renderBeams;
    const constants = await import("./constants");
    STEM_TOP = constants.STEM_TOP;
});

describe("renderBeams — single beam group, beamCount=1", () => {

    test("emits exactly one line element", () => {
        const svg = makeSVG();
        const groups: BeamGroup[] = [{ startX: 100, endX: 200, y: 70, beamCount: 1 }];
        renderBeams(svg as any, groups, 1);
        const lines = svg.children.filter(c => c.tagName === "line");
        assert.equal(lines.length, 1);
    });

    test("beam y1 = y2 = group.y − STEM_TOP at scale=1", () => {
        const svg = makeSVG();
        const y = 70;
        const groups: BeamGroup[] = [{ startX: 100, endX: 200, y, beamCount: 1 }];
        renderBeams(svg as any, groups, 1);
        const line = svg.children.find(c => c.tagName === "line");
        assert.ok(line);
        const expected = (y - STEM_TOP).toString();
        assert.equal(line.getAttribute("y1"), expected, `beam y1 should be ${expected}`);
        assert.equal(line.getAttribute("y2"), expected, `beam y2 should be ${expected}`);
    });

    test("beam y position scales with scale=2", () => {
        const svg = makeSVG();
        const y = 70;
        const groups: BeamGroup[] = [{ startX: 100, endX: 200, y, beamCount: 1 }];
        renderBeams(svg as any, groups, 2);
        const line = svg.children.find(c => c.tagName === "line");
        assert.ok(line);
        const expected = (y - STEM_TOP * 2).toString();
        assert.equal(line.getAttribute("y1"), expected, `beam y1 should be ${expected} at scale=2`);
    });

    test("beam x1/x2 match startX/endX", () => {
        const svg = makeSVG();
        const groups: BeamGroup[] = [{ startX: 120, endX: 280, y: 70, beamCount: 1 }];
        renderBeams(svg as any, groups, 1);
        const line = svg.children.find(c => c.tagName === "line");
        assert.ok(line);
        assert.equal(line.getAttribute("x1"), "120");
        assert.equal(line.getAttribute("x2"), "280");
    });

    test("beam line carries the drum-beam CSS class", () => {
        const svg = makeSVG();
        const groups: BeamGroup[] = [{ startX: 100, endX: 200, y: 70, beamCount: 1 }];
        renderBeams(svg as any, groups, 1);
        const line = svg.children.find(c => c.tagName === "line");
        assert.ok(line?.classList.has("drum-beam"), "beam line should have drum-beam class");
    });

});

describe("renderBeams — stacked beams (beamCount=2)", () => {

    test("emits two line elements for beamCount=2", () => {
        const svg = makeSVG();
        const groups: BeamGroup[] = [{ startX: 100, endX: 200, y: 70, beamCount: 2 }];
        renderBeams(svg as any, groups, 1);
        const lines = svg.children.filter(c => c.tagName === "line");
        assert.equal(lines.length, 2);
    });

    test("first beam (b=0) y = group.y − STEM_TOP", () => {
        const svg = makeSVG();
        const y = 70;
        const groups: BeamGroup[] = [{ startX: 100, endX: 200, y, beamCount: 2 }];
        renderBeams(svg as any, groups, 1);
        const lines = svg.children.filter(c => c.tagName === "line");
        const expected = (y - STEM_TOP).toString();
        assert.equal(lines[0]?.getAttribute("y1"), expected);
    });

    test("second beam (b=1) y = group.y − STEM_TOP + 4 (stacks below at scale=1)", () => {
        const svg = makeSVG();
        const y = 70;
        const groups: BeamGroup[] = [{ startX: 100, endX: 200, y, beamCount: 2 }];
        renderBeams(svg as any, groups, 1);
        const lines = svg.children.filter(c => c.tagName === "line");
        const expected = (y - STEM_TOP + 4).toString();
        assert.equal(lines[1]?.getAttribute("y1"), expected, `second beam should stack 4px below at scale=1`);
    });

    test("second beam at scale=2 stacks 8px below the primary", () => {
        const svg = makeSVG();
        const y = 70;
        const groups: BeamGroup[] = [{ startX: 100, endX: 200, y, beamCount: 2 }];
        renderBeams(svg as any, groups, 2);
        const lines = svg.children.filter(c => c.tagName === "line");
        const firstY = parseFloat(lines[0]?.getAttribute("y1")!);
        const secondY = parseFloat(lines[1]?.getAttribute("y1")!);
        assert.equal(secondY - firstY, 8, "second beam should be 4*scale=8 below first at scale=2");
    });

});

describe("renderBeams — multiple groups", () => {

    test("two groups each with beamCount=1 emit two lines", () => {
        const svg = makeSVG();
        const groups: BeamGroup[] = [
            { startX: 100, endX: 150, y: 70, beamCount: 1 },
            { startX: 200, endX: 250, y: 70, beamCount: 1 },
        ];
        renderBeams(svg as any, groups, 1);
        const lines = svg.children.filter(c => c.tagName === "line");
        assert.equal(lines.length, 2);
    });

    test("empty groups array emits no lines", () => {
        const svg = makeSVG();
        renderBeams(svg as any, [], 1);
        assert.equal(svg.children.length, 0);
    });

});
