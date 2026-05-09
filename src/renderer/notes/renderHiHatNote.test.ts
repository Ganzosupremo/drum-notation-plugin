import { test, describe, before } from "node:test";
import assert from "node:assert/strict";

class MockClassList {
    classes = new Set<string>();
    add(c: string) { this.classes.add(c); }
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

before(() => {
    (globalThis as any).document = {
        createElementNS: (_ns: string, tag: string) => new MockSVGElement(tag),
    };
});

const { renderHiHatNote } = await import("./renderHiHatNote");

describe("renderHiHatNote — accent-open SVG output", () => {

    test("accent-open renders an open-circle element", () => {
        const svg = makeSVG();
        renderHiHatNote(svg as any, 50, 100, "accent-open");

        const circles = svg.children.filter(c => c.tagName === "circle");
        assert.equal(circles.length, 1, "expected exactly one circle element");
        assert.ok(
            circles[0]?.classList.has("drum-note-open-hh"),
            "circle should have class drum-note-open-hh"
        );
    });

    test("accent-open renders accent-mark lines (two lines from renderAccentMark)", () => {
        const svg = makeSVG();
        renderHiHatNote(svg as any, 50, 100, "accent-open");

        const lines = svg.children.filter(c => c.tagName === "line");
        assert.ok(
            lines.length >= 2,
            `expected at least 2 line elements (stem + accent), got ${lines.length}`
        );
    });

    test("accent-open total child count: 1 circle + 3 lines (stem + 2 accent lines)", () => {
        const svg = makeSVG();
        renderHiHatNote(svg as any, 50, 100, "accent-open");

        assert.equal(svg.children.length, 4, "expected circle, stem line, and 2 accent lines");
    });

    test("accent-open circle uses the provided x and y coordinates", () => {
        const svg = makeSVG();
        renderHiHatNote(svg as any, 80, 120, "accent-open");

        const circle = svg.children.find(c => c.tagName === "circle");
        assert.ok(circle, "expected a circle element");
        assert.equal(circle.getAttribute("cx"), "80");
        assert.equal(circle.getAttribute("cy"), "120");
    });
});

describe("renderHiHatNote — open vs accent-open comparison", () => {

    test("plain 'open' renders circle + stem only (no accent lines)", () => {
        const svg = makeSVG();
        renderHiHatNote(svg as any, 50, 100, "open");

        assert.equal(svg.children.length, 2, "open should have circle + stem only");

        const circles = svg.children.filter(c => c.tagName === "circle");
        assert.equal(circles.length, 1);
        assert.ok(circles[0]?.classList.has("drum-note-open-hh"));
    });

    test("'open' has fewer children than 'accent-open'", () => {
        const svgOpen = makeSVG();
        renderHiHatNote(svgOpen as any, 50, 100, "open");

        const svgAccentOpen = makeSVG();
        renderHiHatNote(svgAccentOpen as any, 50, 100, "accent-open");

        assert.ok(
            svgAccentOpen.children.length > svgOpen.children.length,
            "accent-open should produce more SVG elements than plain open"
        );
    });

    test("'accent-open' has a circle (open HH head) like plain 'open' does", () => {
        const svgOpen = makeSVG();
        renderHiHatNote(svgOpen as any, 50, 100, "open");

        const svgAccentOpen = makeSVG();
        renderHiHatNote(svgAccentOpen as any, 50, 100, "accent-open");

        const openCircles = svgOpen.children.filter(c => c.tagName === "circle");
        const accentOpenCircles = svgAccentOpen.children.filter(c => c.tagName === "circle");

        assert.equal(openCircles.length, 1);
        assert.equal(accentOpenCircles.length, 1);
        assert.equal(
            openCircles[0]?.getAttribute("r"),
            accentOpenCircles[0]?.getAttribute("r"),
            "both open and accent-open should use the same circle radius"
        );
    });
});

describe("renderHiHatNote — normal and accent still work correctly", () => {

    test("normal articulation renders no circle (X-cross head only)", () => {
        const svg = makeSVG();
        renderHiHatNote(svg as any, 50, 100, "normal");

        const circles = svg.children.filter(c => c.tagName === "circle");
        assert.equal(circles.length, 0, "normal HH should not render a circle");
    });

    test("'accent' articulation renders no circle", () => {
        const svg = makeSVG();
        renderHiHatNote(svg as any, 50, 100, "accent");

        const circles = svg.children.filter(c => c.tagName === "circle");
        assert.equal(circles.length, 0, "accent HH should not render a circle");
    });

    test("'accent' renders more lines than 'normal' (adds accent mark)", () => {
        const svgNormal = makeSVG();
        renderHiHatNote(svgNormal as any, 50, 100, "normal");

        const svgAccent = makeSVG();
        renderHiHatNote(svgAccent as any, 50, 100, "accent");

        assert.ok(
            svgAccent.children.length > svgNormal.children.length,
            "accent should add accent-mark lines on top of the normal X-cross"
        );
    });
});
