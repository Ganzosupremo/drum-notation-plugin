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

type RenderSnareNote = typeof import("./renderSnareNote").renderSnareNote;
let renderSnareNote: RenderSnareNote;
let GLYPHS: typeof import("../smufl").GLYPHS;

before(async () => {
    (globalThis as any).document = {
        createElementNS: (_ns: string, tag: string) => new MockSVGElement(tag),
    };
    const mod = await import("./renderSnareNote");
    renderSnareNote = mod.renderSnareNote;
    const smufl = await import("../smufl");
    GLYPHS = smufl.GLYPHS;
});

describe("renderSnareNote — normal", () => {

    test("emits a <text> element", () => {
        const svg = makeSVG();
        renderSnareNote(svg as any, 50, 100, "normal");
        const texts = svg.children.filter(c => c.tagName === "text");
        assert.ok(texts.length >= 1, "expected at least one text element");
    });

    test("text element carries .drum-glyph class", () => {
        const svg = makeSVG();
        renderSnareNote(svg as any, 50, 100, "normal");
        const glyph = svg.children.find(c => c.tagName === "text" && c.classList.has("drum-glyph"));
        assert.ok(glyph, "expected a text element with class drum-glyph");
    });

    test("textContent equals GLYPHS.noteheadBlack", () => {
        const svg = makeSVG();
        renderSnareNote(svg as any, 50, 100, "normal");
        const glyph = svg.children.find(c => c.tagName === "text" && c.classList.has("drum-glyph"));
        assert.ok(glyph, "expected a drum-glyph text element");
        assert.equal(glyph.textContent, GLYPHS.noteheadBlack);
    });

    test("uses provided x and y coordinates", () => {
        const svg = makeSVG();
        renderSnareNote(svg as any, 80, 120, "normal");
        const glyph = svg.children.find(c => c.tagName === "text" && c.classList.has("drum-glyph"));
        assert.ok(glyph);
        assert.equal(glyph.getAttribute("x"), "80");
        assert.equal(glyph.getAttribute("y"), "120");
    });

    test("emits a stem line element", () => {
        const svg = makeSVG();
        renderSnareNote(svg as any, 50, 100, "normal");
        const lines = svg.children.filter(c => c.tagName === "line");
        assert.equal(lines.length, 1, "expected exactly one stem line");
    });

    test("normal has glyph + stem only (2 children, no accent)", () => {
        const svg = makeSVG();
        renderSnareNote(svg as any, 50, 100, "normal");
        assert.equal(svg.children.length, 2);
        const accentTexts = svg.children.filter(c => c.tagName === "text" && c.classList.has("drum-glyph-accent"));
        assert.equal(accentTexts.length, 0, "normal should have no accent glyph");
    });
});

describe("renderSnareNote — ghost", () => {

    test("ghost wraps notehead in a <g> with opacity attribute", () => {
        const svg = makeSVG();
        renderSnareNote(svg as any, 50, 100, "ghost");
        const g = svg.children.find(c => c.tagName === "g");
        assert.ok(g, "expected a <g> wrapper element");
        assert.equal(g.getAttribute("opacity"), "0.45");
    });

    test("ghost glyph inside <g> carries .drum-glyph and is noteheadBlack", () => {
        const svg = makeSVG();
        renderSnareNote(svg as any, 50, 100, "ghost");
        const g = svg.children.find(c => c.tagName === "g");
        assert.ok(g);
        const glyph = g.children.find(c => c.tagName === "text" && c.classList.has("drum-glyph"));
        assert.ok(glyph, "expected a drum-glyph text inside the <g>");
        assert.equal(glyph.textContent, GLYPHS.noteheadBlack);
    });

    test("ghost renders opening and closing parentheses", () => {
        const svg = makeSVG();
        renderSnareNote(svg as any, 50, 100, "ghost");
        const parens = svg.children.filter(c => c.tagName === "text" && c.classList.has("drum-note-ghost-paren"));
        assert.equal(parens.length, 2, "expected two ghost paren text elements");
        assert.ok(parens.some(p => p.textContent === "("), "expected opening paren");
        assert.ok(parens.some(p => p.textContent === ")"), "expected closing paren");
    });

    test("ghost does not emit a stem line", () => {
        const svg = makeSVG();
        renderSnareNote(svg as any, 50, 100, "ghost");
        const lines = svg.children.filter(c => c.tagName === "line");
        assert.equal(lines.length, 0, "ghost variant should not render a stem");
    });
});

describe("renderSnareNote — accent", () => {

    test("accent emits a second <text> element for the accent mark", () => {
        const svg = makeSVG();
        renderSnareNote(svg as any, 50, 100, "accent");
        const texts = svg.children.filter(c => c.tagName === "text");
        assert.ok(texts.length >= 2, "expected at least 2 text elements for notehead + accent");
    });

    test("accent glyph carries .drum-glyph-accent class", () => {
        const svg = makeSVG();
        renderSnareNote(svg as any, 50, 100, "accent");
        const accentGlyph = svg.children.find(c => c.tagName === "text" && c.classList.has("drum-glyph-accent"));
        assert.ok(accentGlyph, "expected a drum-glyph-accent text element");
    });

    test("accent glyph textContent equals GLYPHS.articAccentAbove", () => {
        const svg = makeSVG();
        renderSnareNote(svg as any, 50, 100, "accent");
        const accentGlyph = svg.children.find(c => c.tagName === "text" && c.classList.has("drum-glyph-accent"));
        assert.ok(accentGlyph);
        assert.equal(accentGlyph.textContent, GLYPHS.articAccentAbove);
    });

    test("accent has more children than normal", () => {
        const svgNormal = makeSVG();
        renderSnareNote(svgNormal as any, 50, 100, "normal");
        const svgAccent = makeSVG();
        renderSnareNote(svgAccent as any, 50, 100, "accent");
        assert.ok(svgAccent.children.length > svgNormal.children.length);
    });
});
