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
let STEM_BOTTOM: number;
let STEM_TOP: number;

before(async () => {
    (globalThis as any).document = {
        createElementNS: (_ns: string, tag: string) => new MockSVGElement(tag),
    };
    const mod = await import("./renderTomNote");
    renderTomNote = mod.renderTomNote;
    const smufl = await import("../smufl");
    GLYPHS = smufl.GLYPHS;
    const constants = await import("../constants");
    STEM_BOTTOM = constants.STEM_BOTTOM;
    STEM_TOP = constants.STEM_TOP;
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

describe("renderTomNote — renders at provided y (no internal offset)", () => {

    // The y passed to renderTomNote is the pre-computed staff position.
    // All toms render their notehead at exactly the y provided; the caller
    // (renderNotation) is responsible for computing the correct staff y.

    test("MT renders notehead at the provided y", () => {
        const svg = makeSVG();
        renderTomNote(svg as any, "MT", 50, 100);
        const glyph = svg.children.find(c => c.tagName === "text" && c.classList.has("drum-glyph"));
        assert.ok(glyph);
        assert.equal(glyph.getAttribute("y"), "100");
    });

    test("HT renders notehead at the provided y", () => {
        const svg = makeSVG();
        renderTomNote(svg as any, "HT", 50, 100);
        const glyph = svg.children.find(c => c.tagName === "text" && c.classList.has("drum-glyph"));
        assert.ok(glyph);
        assert.equal(glyph.getAttribute("y"), "100");
    });

    test("FT renders notehead at the provided y", () => {
        const svg = makeSVG();
        renderTomNote(svg as any, "FT", 50, 100);
        const glyph = svg.children.find(c => c.tagName === "text" && c.classList.has("drum-glyph"));
        assert.ok(glyph);
        assert.equal(glyph.getAttribute("y"), "100");
    });

    test("unknown instrument renders notehead at the provided y", () => {
        const svg = makeSVG();
        renderTomNote(svg as any, "UNKNOWN", 50, 100);
        const glyph = svg.children.find(c => c.tagName === "text" && c.classList.has("drum-glyph"));
        assert.ok(glyph);
        assert.equal(glyph.getAttribute("y"), "100");
    });
});

describe("renderTomNote — stem direction", () => {

    test("HT stem goes upward (y2 < y1)", () => {
        const svg = makeSVG();
        renderTomNote(svg as any, "HT", 50, 100);
        const stem = svg.children.find(c => c.tagName === "line");
        assert.ok(stem);
        const y1 = parseFloat(stem.getAttribute("y1")!);
        const y2 = parseFloat(stem.getAttribute("y2")!);
        assert.ok(y2 < y1, `HT stem should go up: y2 (${y2}) < y1 (${y1})`);
    });

    test("MT stem goes upward (y2 < y1)", () => {
        const svg = makeSVG();
        renderTomNote(svg as any, "MT", 50, 100);
        const stem = svg.children.find(c => c.tagName === "line");
        assert.ok(stem);
        const y1 = parseFloat(stem.getAttribute("y1")!);
        const y2 = parseFloat(stem.getAttribute("y2")!);
        assert.ok(y2 < y1, `MT stem should go up: y2 (${y2}) < y1 (${y1})`);
    });

    test("FT stem goes downward (y2 > y1)", () => {
        const svg = makeSVG();
        renderTomNote(svg as any, "FT", 50, 100);
        const stem = svg.children.find(c => c.tagName === "line");
        assert.ok(stem);
        const y1 = parseFloat(stem.getAttribute("y1")!);
        const y2 = parseFloat(stem.getAttribute("y2")!);
        assert.ok(y2 > y1, `FT stem should go down: y2 (${y2}) > y1 (${y1})`);
    });

    test("HT stem tip is y − STEM_TOP at scale=1", () => {
        const svg = makeSVG();
        renderTomNote(svg as any, "HT", 50, 100);
        const stem = svg.children.find(c => c.tagName === "line");
        assert.ok(stem);
        const expected = (100 - STEM_TOP).toString();
        assert.equal(stem.getAttribute("y2"), expected);
    });

    test("FT stem tip is y + STEM_TOP at scale=1", () => {
        const svg = makeSVG();
        renderTomNote(svg as any, "FT", 50, 100);
        const stem = svg.children.find(c => c.tagName === "line");
        assert.ok(stem);
        const expected = (100 + STEM_TOP).toString();
        assert.equal(stem.getAttribute("y2"), expected);
    });
});
