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
let GLYPHS: typeof import("../smufl").GLYPHS;

before(async () => {
    (globalThis as any).document = {
        createElementNS: (_ns: string, tag: string) => new MockSVGElement(tag),
    };
    const mod = await import("./renderHiHatNote");
    renderHiHatNote = mod.renderHiHatNote;
    const smufl = await import("../smufl");
    GLYPHS = smufl.GLYPHS;
});

describe("renderHiHatNote — accent-open SVG output", () => {

    test("accent-open renders an open notehead glyph (noteheadHalf)", () => {
        const svg = makeSVG();
        renderHiHatNote(svg as any, 50, 100, "accent-open");

        const glyphs = svg.children.filter(c => c.tagName === "text" && c.classList.has("drum-glyph-open-hh"));
        assert.equal(glyphs.length, 1, "expected exactly one open-HH glyph text element");
        assert.equal(glyphs[0]?.textContent, GLYPHS.noteheadHalf, "expected noteheadHalf glyph character");
    });

    test("accent-open renders an accent-mark glyph element", () => {
        const svg = makeSVG();
        renderHiHatNote(svg as any, 50, 100, "accent-open");

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

    test("accent-open total child count: 1 open glyph + 1 stem + 1 accent glyph", () => {
        const svg = makeSVG();
        renderHiHatNote(svg as any, 50, 100, "accent-open");

        // text (open HH glyph) + line (stem) + text (accent glyph)
        assert.equal(svg.children.length, 3, "expected open-HH glyph, stem line, and accent glyph text");
    });

    test("accent-open open-HH glyph uses the provided x and y coordinates", () => {
        const svg = makeSVG();
        renderHiHatNote(svg as any, 80, 120, "accent-open");

        const glyph = svg.children.find(c => c.tagName === "text" && c.classList.has("drum-glyph-open-hh"));
        assert.ok(glyph, "expected an open-HH glyph text element");
        assert.equal(glyph.getAttribute("x"), "80");
        assert.equal(glyph.getAttribute("y"), "120");
    });
});

describe("renderHiHatNote — open vs accent-open comparison", () => {

    test("plain 'open' renders open-HH glyph + stem only (no accent)", () => {
        const svg = makeSVG();
        renderHiHatNote(svg as any, 50, 100, "open");

        assert.equal(svg.children.length, 2, "open should have open-HH glyph + stem only");

        const glyphs = svg.children.filter(c => c.tagName === "text" && c.classList.has("drum-glyph-open-hh"));
        assert.equal(glyphs.length, 1);
        assert.equal(glyphs[0]?.textContent, GLYPHS.noteheadHalf);
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

    test("'accent-open' uses the same open notehead glyph as plain 'open'", () => {
        const svgOpen = makeSVG();
        renderHiHatNote(svgOpen as any, 50, 100, "open");

        const svgAccentOpen = makeSVG();
        renderHiHatNote(svgAccentOpen as any, 50, 100, "accent-open");

        const openGlyph = svgOpen.children.find(c => c.tagName === "text" && c.classList.has("drum-glyph-open-hh"));
        const accentOpenGlyph = svgAccentOpen.children.find(c => c.tagName === "text" && c.classList.has("drum-glyph-open-hh"));

        assert.ok(openGlyph, "open should have an open-HH glyph");
        assert.ok(accentOpenGlyph, "accent-open should have an open-HH glyph");
        assert.equal(
            openGlyph.textContent,
            accentOpenGlyph.textContent,
            "both open and accent-open should use the same notehead glyph character"
        );
    });
});

describe("renderHiHatNote — normal and accent still work correctly", () => {

    test("normal articulation renders an X notehead glyph (no open-HH glyph)", () => {
        const svg = makeSVG();
        renderHiHatNote(svg as any, 50, 100, "normal");

        const openHHGlyphs = svg.children.filter(c => c.tagName === "text" && c.classList.has("drum-glyph-open-hh"));
        assert.equal(openHHGlyphs.length, 0, "normal HH should not render an open-HH glyph");

        const xGlyphs = svg.children.filter(c => c.tagName === "text" && c.classList.has("drum-glyph"));
        assert.ok(xGlyphs.some(g => g.textContent === GLYPHS.noteheadXBlack), "normal HH should render noteheadXBlack");
    });

    test("'accent' articulation renders no open-HH glyph", () => {
        const svg = makeSVG();
        renderHiHatNote(svg as any, 50, 100, "accent");

        const openHHGlyphs = svg.children.filter(c => c.tagName === "text" && c.classList.has("drum-glyph-open-hh"));
        assert.equal(openHHGlyphs.length, 0, "accent HH should not render an open-HH glyph");
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
