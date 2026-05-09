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

type RenderHiHatFootNote = typeof import("./renderHiHatFootNote").renderHiHatFootNote;
let renderHiHatFootNote: RenderHiHatFootNote;
let GLYPHS: typeof import("../smufl").GLYPHS;

before(async () => {
    (globalThis as any).document = {
        createElementNS: (_ns: string, tag: string) => new MockSVGElement(tag),
    };
    const mod = await import("./renderHiHatFootNote");
    renderHiHatFootNote = mod.renderHiHatFootNote;
    const smufl = await import("../smufl");
    GLYPHS = smufl.GLYPHS;
});

describe("renderHiHatFootNote — SMuFL glyph output", () => {

    test("emits exactly one <text> element", () => {
        const svg = makeSVG();
        renderHiHatFootNote(svg as any, 50, 100);
        const texts = svg.children.filter(c => c.tagName === "text");
        assert.equal(texts.length, 1, "expected exactly one text element");
    });

    test("text element carries .drum-glyph class", () => {
        const svg = makeSVG();
        renderHiHatFootNote(svg as any, 50, 100);
        const glyph = svg.children.find(c => c.tagName === "text" && c.classList.has("drum-glyph"));
        assert.ok(glyph, "expected a text element with class drum-glyph");
    });

    test("text element carries .drum-glyph-plus class", () => {
        const svg = makeSVG();
        renderHiHatFootNote(svg as any, 50, 100);
        const glyph = svg.children.find(c => c.tagName === "text" && c.classList.has("drum-glyph-plus"));
        assert.ok(glyph, "expected a text element with class drum-glyph-plus");
    });

    test("textContent equals GLYPHS.noteheadPlusBlack", () => {
        const svg = makeSVG();
        renderHiHatFootNote(svg as any, 50, 100);
        const glyph = svg.children.find(c => c.tagName === "text" && c.classList.has("drum-glyph"));
        assert.ok(glyph);
        assert.equal(glyph.textContent, GLYPHS.noteheadPlusBlack);
    });

    test("glyph uses provided x and y coordinates", () => {
        const svg = makeSVG();
        renderHiHatFootNote(svg as any, 65, 110);
        const glyph = svg.children.find(c => c.tagName === "text" && c.classList.has("drum-glyph"));
        assert.ok(glyph);
        assert.equal(glyph.getAttribute("x"), "65");
        assert.equal(glyph.getAttribute("y"), "110");
    });

    test("does not emit a stem line (stemless notehead)", () => {
        const svg = makeSVG();
        renderHiHatFootNote(svg as any, 50, 100);
        const lines = svg.children.filter(c => c.tagName === "line");
        assert.equal(lines.length, 0, "hi-hat foot note should have no stem");
    });

    test("total child count is 1 (glyph only)", () => {
        const svg = makeSVG();
        renderHiHatFootNote(svg as any, 50, 100);
        assert.equal(svg.children.length, 1);
    });
});
