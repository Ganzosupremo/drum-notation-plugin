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

type RenderTomNote = typeof import("./renderTomNote").renderTomNote;
let renderTomNote: RenderTomNote;
let GLYPHS: typeof import("../smufl").GLYPHS;

before(async () => {
    (globalThis as any).document = {
        createElementNS: (_ns: string, tag: string) => new MockSVGElement(tag),
    };
    const mod = await import("./renderTomNote");
    renderTomNote = mod.renderTomNote;
    const smufl = await import("../smufl");
    GLYPHS = smufl.GLYPHS;
});

describe("renderTomNote — SMuFL glyph output", () => {

    test("emits a <text> element", () => {
        const svg = makeSVG();
        renderTomNote(svg as any, "MT", 50, 100);
        const texts = svg.children.filter(c => c.tagName === "text");
        assert.ok(texts.length >= 1, "expected at least one text element");
    });

    test("text element carries .drum-glyph class", () => {
        const svg = makeSVG();
        renderTomNote(svg as any, "MT", 50, 100);
        const glyph = svg.children.find(c => c.tagName === "text" && c.classList.has("drum-glyph"));
        assert.ok(glyph, "expected a text element with class drum-glyph");
    });

    test("textContent equals GLYPHS.noteheadBlack", () => {
        const svg = makeSVG();
        renderTomNote(svg as any, "MT", 50, 100);
        const glyph = svg.children.find(c => c.tagName === "text" && c.classList.has("drum-glyph"));
        assert.ok(glyph);
        assert.equal(glyph.textContent, GLYPHS.noteheadBlack);
    });

    test("emits a stem line element", () => {
        const svg = makeSVG();
        renderTomNote(svg as any, "MT", 50, 100);
        const lines = svg.children.filter(c => c.tagName === "line");
        assert.equal(lines.length, 1, "expected exactly one stem line");
    });

    test("glyph uses the provided x coordinate", () => {
        const svg = makeSVG();
        renderTomNote(svg as any, "MT", 80, 100);
        const glyph = svg.children.find(c => c.tagName === "text" && c.classList.has("drum-glyph"));
        assert.ok(glyph);
        assert.equal(glyph.getAttribute("x"), "80");
    });
});

describe("renderTomNote — y offset per instrument", () => {

    test("MT applies zero y offset", () => {
        const svg = makeSVG();
        renderTomNote(svg as any, "MT", 50, 100);
        const glyph = svg.children.find(c => c.tagName === "text" && c.classList.has("drum-glyph"));
        assert.ok(glyph);
        assert.equal(glyph.getAttribute("y"), "100", "MT y offset is 0");
    });

    test("HT applies -4 y offset", () => {
        const svg = makeSVG();
        renderTomNote(svg as any, "HT", 50, 100);
        const glyph = svg.children.find(c => c.tagName === "text" && c.classList.has("drum-glyph"));
        assert.ok(glyph);
        assert.equal(glyph.getAttribute("y"), "96", "HT y offset is -4");
    });

    test("FT applies +4 y offset", () => {
        const svg = makeSVG();
        renderTomNote(svg as any, "FT", 50, 100);
        const glyph = svg.children.find(c => c.tagName === "text" && c.classList.has("drum-glyph"));
        assert.ok(glyph);
        assert.equal(glyph.getAttribute("y"), "104", "FT y offset is +4");
    });

    test("unknown instrument defaults to zero y offset", () => {
        const svg = makeSVG();
        renderTomNote(svg as any, "UNKNOWN", 50, 100);
        const glyph = svg.children.find(c => c.tagName === "text" && c.classList.has("drum-glyph"));
        assert.ok(glyph);
        assert.equal(glyph.getAttribute("y"), "100", "unknown instrument should default y offset to 0");
    });
});
