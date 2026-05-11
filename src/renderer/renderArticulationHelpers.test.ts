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

type RenderOpenCircle = typeof import("./renderArticulationHelpers").renderOpenCircle;
type RenderAccentMark = typeof import("./renderArticulationHelpers").renderAccentMark;
let renderOpenCircle: RenderOpenCircle;
let renderAccentMark: RenderAccentMark;

let STEM_TOP: number;
let OPEN_CIRCLE_ABOVE_STEM: number;
let OPEN_CIRCLE_RADIUS: number;
let ACCENT_ABOVE_STEM: number;

before(async () => {
    (globalThis as any).document = {
        createElementNS: (_ns: string, tag: string) => new MockSVGElement(tag),
    };
    const mod = await import("./renderArticulationHelpers");
    renderOpenCircle = mod.renderOpenCircle;
    renderAccentMark = mod.renderAccentMark;

    const constants = await import("./constants");
    STEM_TOP = constants.STEM_TOP;
    OPEN_CIRCLE_ABOVE_STEM = constants.OPEN_CIRCLE_ABOVE_STEM;
    OPEN_CIRCLE_RADIUS = constants.OPEN_CIRCLE_RADIUS;
    ACCENT_ABOVE_STEM = constants.ACCENT_ABOVE_STEM;
});

describe("renderOpenCircle — vertical position", () => {

    test("circle cy is y − (STEM_TOP + OPEN_CIRCLE_ABOVE_STEM) at scale=1", () => {
        const svg = makeSVG();
        renderOpenCircle(svg as any, 50, 100, 1);
        const circle = svg.children.find(c => c.tagName === "circle");
        assert.ok(circle, "expected a circle element");
        const expected = 100 - (STEM_TOP + OPEN_CIRCLE_ABOVE_STEM);
        assert.equal(circle.getAttribute("cy"), expected.toString(), `expected cy=${expected}`);
    });

    test("circle cy scales with scale=2", () => {
        const svg = makeSVG();
        renderOpenCircle(svg as any, 50, 100, 2);
        const circle = svg.children.find(c => c.tagName === "circle");
        assert.ok(circle);
        const expected = 100 - (STEM_TOP + OPEN_CIRCLE_ABOVE_STEM) * 2;
        assert.equal(circle.getAttribute("cy"), expected.toString(), `expected cy=${expected} at scale=2`);
    });

    test("circle radius is OPEN_CIRCLE_RADIUS at scale=1", () => {
        const svg = makeSVG();
        renderOpenCircle(svg as any, 50, 100, 1);
        const circle = svg.children.find(c => c.tagName === "circle");
        assert.ok(circle);
        assert.equal(circle.getAttribute("r"), OPEN_CIRCLE_RADIUS.toString());
    });

    test("circle radius scales with scale=2", () => {
        const svg = makeSVG();
        renderOpenCircle(svg as any, 50, 100, 2);
        const circle = svg.children.find(c => c.tagName === "circle");
        assert.ok(circle);
        assert.equal(circle.getAttribute("r"), (OPEN_CIRCLE_RADIUS * 2).toString());
    });

    test("circle cx matches the provided x coordinate", () => {
        const svg = makeSVG();
        renderOpenCircle(svg as any, 75, 120, 1);
        const circle = svg.children.find(c => c.tagName === "circle");
        assert.ok(circle);
        assert.equal(circle.getAttribute("cx"), "75");
    });

});

describe("renderAccentMark — default vertical position (no tipYOverride)", () => {

    test("accent baseline is y − (STEM_TOP + ACCENT_ABOVE_STEM) at scale=1", () => {
        const svg = makeSVG();
        renderAccentMark(svg as any, 50, 100, undefined, 1);
        const text = svg.children.find(c => c.tagName === "text");
        assert.ok(text, "expected a text element");
        const expected = 100 - (STEM_TOP + ACCENT_ABOVE_STEM);
        assert.equal(text.getAttribute("y"), expected.toString(), `expected y=${expected}`);
    });

    test("accent baseline scales with scale=2", () => {
        const svg = makeSVG();
        renderAccentMark(svg as any, 50, 100, undefined, 2);
        const text = svg.children.find(c => c.tagName === "text");
        assert.ok(text);
        const expected = 100 - (STEM_TOP + ACCENT_ABOVE_STEM) * 2;
        assert.equal(text.getAttribute("y"), expected.toString(), `expected y=${expected} at scale=2`);
    });

    test("accent baseline is strictly above the beam level (y − STEM_TOP)", () => {
        const svg = makeSVG();
        const y = 100;
        renderAccentMark(svg as any, 50, y, undefined, 1);
        const text = svg.children.find(c => c.tagName === "text");
        assert.ok(text);
        const accentY = parseFloat(text.getAttribute("y")!);
        const beamY = y - STEM_TOP;
        assert.ok(accentY < beamY, `accent baseline (${accentY}) should be above beam (${beamY})`);
    });

});

describe("renderAccentMark — tipYOverride", () => {

    test("uses tipYOverride as the y attribute when provided", () => {
        const svg = makeSVG();
        renderAccentMark(svg as any, 50, 100, 57, 1);
        const text = svg.children.find(c => c.tagName === "text");
        assert.ok(text);
        assert.equal(text.getAttribute("y"), "57");
    });

    test("tipYOverride is independent of scale", () => {
        const svgA = makeSVG();
        const svgB = makeSVG();
        renderAccentMark(svgA as any, 50, 100, 57, 1);
        renderAccentMark(svgB as any, 50, 100, 57, 2);
        const textA = svgA.children.find(c => c.tagName === "text");
        const textB = svgB.children.find(c => c.tagName === "text");
        assert.equal(textA?.getAttribute("y"), "57");
        assert.equal(textB?.getAttribute("y"), "57");
    });

});
