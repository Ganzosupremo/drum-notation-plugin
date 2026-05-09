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

type RenderFallbackNote = typeof import("./renderFallbackNote").renderFallbackNote;
let renderFallbackNote: RenderFallbackNote;
let GLYPHS: typeof import("../smufl").GLYPHS;

before(async () => {
    (globalThis as any).document = {
        createElementNS: (_ns: string, tag: string) => new MockSVGElement(tag),
    };
    const mod = await import("./renderFallbackNote");
    renderFallbackNote = mod.renderFallbackNote;
    const smufl = await import("../smufl");
    GLYPHS = smufl.GLYPHS;
});

describe("renderFallbackNote — SMuFL glyph output", () => {

    test("emits exactly one <text> element", () => {
        const svg = makeSVG();
        renderFallbackNote(svg as any, 50, 100);
        const texts = svg.children.filter(c => c.tagName === "text");
        assert.equal(texts.length, 1, "expected exactly one text element");
    });

    test("text element carries .drum-glyph class", () => {
        const svg = makeSVG();
        renderFallbackNote(svg as any, 50, 100);
        const glyph = svg.children.find(c => c.tagName === "text" && c.classList.has("drum-glyph"));
        assert.ok(glyph, "expected a text element with class drum-glyph");
    });

    test("text element carries .drum-note-fallback class", () => {
        const svg = makeSVG();
        renderFallbackNote(svg as any, 50, 100);
        const glyph = svg.children.find(c => c.tagName === "text" && c.classList.has("drum-note-fallback"));
        assert.ok(glyph, "expected a text element with class drum-note-fallback");
    });

    test("textContent equals GLYPHS.noteheadBlack", () => {
        const svg = makeSVG();
        renderFallbackNote(svg as any, 50, 100);
        const glyph = svg.children.find(c => c.tagName === "text" && c.classList.has("drum-glyph"));
        assert.ok(glyph);
        assert.equal(glyph.textContent, GLYPHS.noteheadBlack);
    });

    test("glyph uses provided x coordinate", () => {
        const svg = makeSVG();
        renderFallbackNote(svg as any, 70, 100);
        const glyph = svg.children.find(c => c.tagName === "text" && c.classList.has("drum-glyph"));
        assert.ok(glyph);
        assert.equal(glyph.getAttribute("x"), "70");
    });

    test("glyph y is offset upward by 2px from provided y", () => {
        const svg = makeSVG();
        renderFallbackNote(svg as any, 50, 100);
        const glyph = svg.children.find(c => c.tagName === "text" && c.classList.has("drum-glyph"));
        assert.ok(glyph);
        assert.equal(glyph.getAttribute("y"), "98", "fallback glyph applies y-2 offset");
    });

    test("does not emit a stem line", () => {
        const svg = makeSVG();
        renderFallbackNote(svg as any, 50, 100);
        const lines = svg.children.filter(c => c.tagName === "line");
        assert.equal(lines.length, 0, "fallback note should have no stem");
    });

    test("total child count is 1 (glyph only)", () => {
        const svg = makeSVG();
        renderFallbackNote(svg as any, 50, 100);
        assert.equal(svg.children.length, 1);
    });
});
