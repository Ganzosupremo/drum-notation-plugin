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

type RenderHiHatNote = typeof import("./renderHiHatNote").renderHiHatNote;
let renderHiHatNote: RenderHiHatNote;

before(async () => {
    (globalThis as any).document = {
        createElementNS: (_ns: string, tag: string) => new MockSVGElement(tag),
    };
    const mod = await import("./renderHiHatNote");
    renderHiHatNote = mod.renderHiHatNote;
});

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

    test("accent-open renders an accent-mark glyph element", () => {
        const svg = makeSVG();
        renderHiHatNote(svg as any, 50, 100, "accent-open");

        // After SMuFL migration: accent is a <text> glyph, not lines.
        const texts = svg.children.filter(c => c.tagName === "text");
        assert.ok(
            texts.length >= 1,
            `expected at least 1 text element (accent glyph), got ${texts.length}`
        );
        assert.ok(
            texts.some(t => t.classList.has("drum-glyph-accent")),
            "expected a text element with class drum-glyph-accent"
        );
    });

    test("accent-open total child count: 1 circle + 1 stem + 1 accent glyph", () => {
        const svg = makeSVG();
        renderHiHatNote(svg as any, 50, 100, "accent-open");

        // circle (open HH head) + line (stem) + text (accent glyph)
        assert.equal(svg.children.length, 3, "expected circle, stem line, and accent glyph text");
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

    test("'accent' renders more elements than 'normal' (adds accent glyph)", () => {
        const svgNormal = makeSVG();
        renderHiHatNote(svgNormal as any, 50, 100, "normal");

        const svgAccent = makeSVG();
        renderHiHatNote(svgAccent as any, 50, 100, "accent");

        assert.ok(
            svgAccent.children.length > svgNormal.children.length,
            "accent should add an accent-mark glyph on top of the normal X-cross"
        );
    });
});
