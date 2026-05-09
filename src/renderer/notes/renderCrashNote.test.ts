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

type RenderCrashNote = typeof import("./renderCrashNote").renderCrashNote;
let renderCrashNote: RenderCrashNote;
let GLYPHS: typeof import("../smufl").GLYPHS;

before(async () => {
    (globalThis as any).document = {
        createElementNS: (_ns: string, tag: string) => new MockSVGElement(tag),
    };
    const mod = await import("./renderCrashNote");
    renderCrashNote = mod.renderCrashNote;
    const smufl = await import("../smufl");
    GLYPHS = smufl.GLYPHS;
});

describe("renderCrashNote — SMuFL glyph output", () => {

    test("emits a <text> element", () => {
        const svg = makeSVG();
        renderCrashNote(svg as any, 50, 100);
        const texts = svg.children.filter(c => c.tagName === "text");
        assert.ok(texts.length >= 1, "expected at least one text element");
    });

    test("text element carries .drum-glyph class", () => {
        const svg = makeSVG();
        renderCrashNote(svg as any, 50, 100);
        const glyph = svg.children.find(c => c.tagName === "text" && c.classList.has("drum-glyph"));
        assert.ok(glyph, "expected a text element with class drum-glyph");
    });

    test("text element carries .drum-glyph-circle-x class", () => {
        const svg = makeSVG();
        renderCrashNote(svg as any, 50, 100);
        const glyph = svg.children.find(c => c.tagName === "text" && c.classList.has("drum-glyph-circle-x"));
        assert.ok(glyph, "expected a text element with class drum-glyph-circle-x");
    });

    test("textContent equals GLYPHS.noteheadCircleX", () => {
        const svg = makeSVG();
        renderCrashNote(svg as any, 50, 100);
        const glyph = svg.children.find(c => c.tagName === "text" && c.classList.has("drum-glyph"));
        assert.ok(glyph);
        assert.equal(glyph.textContent, GLYPHS.noteheadCircleX);
    });

    test("emits a stem line element", () => {
        const svg = makeSVG();
        renderCrashNote(svg as any, 50, 100);
        const lines = svg.children.filter(c => c.tagName === "line");
        assert.equal(lines.length, 1, "expected exactly one stem line");
    });

    test("glyph uses provided x coordinate", () => {
        const svg = makeSVG();
        renderCrashNote(svg as any, 70, 100);
        const glyph = svg.children.find(c => c.tagName === "text" && c.classList.has("drum-glyph"));
        assert.ok(glyph);
        assert.equal(glyph.getAttribute("x"), "70");
    });

    test("glyph y is offset upward from baseline by 8px", () => {
        const svg = makeSVG();
        renderCrashNote(svg as any, 50, 100);
        const glyph = svg.children.find(c => c.tagName === "text" && c.classList.has("drum-glyph"));
        assert.ok(glyph);
        assert.equal(glyph.getAttribute("y"), "92", "CRASH_Y_OFFSET is -8");
    });

    test("total child count is glyph + stem (2 elements)", () => {
        const svg = makeSVG();
        renderCrashNote(svg as any, 50, 100);
        assert.equal(svg.children.length, 2);
    });
});
