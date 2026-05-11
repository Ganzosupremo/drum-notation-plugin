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

    test("accent-open renders an X notehead glyph (noteheadXBlack), not noteheadHalf", () => {
        const svg = makeSVG();
        renderHiHatNote(svg as any, 50, 100, "accent-open");

        const glyphs = svg.children.filter(c => c.tagName === "text" && c.classList.has("drum-glyph"));
        assert.ok(glyphs.length >= 1, "expected at least one glyph text element");
        assert.ok(
            glyphs.some(g => g.textContent === GLYPHS.noteheadXBlack),
            "expected noteheadXBlack glyph character"
        );
    });

    test("accent-open renders an open circle marker above the stem", () => {
        const svg = makeSVG();
        renderHiHatNote(svg as any, 50, 100, "accent-open");

        const circles = svg.children.filter(c => c.tagName === "circle");
        assert.equal(circles.length, 1, "expected exactly one open circle element");
        assert.equal(circles[0]?.getAttribute("fill"), "none");
    });

    test("accent-open renders an accent-mark glyph element", () => {
        const svg = makeSVG();
        renderHiHatNote(svg as any, 50, 100, "accent-open");

        const texts = svg.children.filter(c => c.tagName === "text");
        assert.ok(
            texts.some(t => t.classList.has("drum-glyph-accent")),
            "expected a text element with class drum-glyph-accent"
        );
    });

    test("accent-open total child count: 1 notehead + 1 stem + 1 open circle + 1 accent glyph", () => {
        const svg = makeSVG();
        renderHiHatNote(svg as any, 50, 100, "accent-open");

        // text (X notehead) + line (stem) + circle (open marker) + text (accent glyph)
        assert.equal(svg.children.length, 4, "expected X notehead, stem line, open circle, and accent glyph");
    });

    test("accent-open notehead glyph uses the provided x and y coordinates", () => {
        const svg = makeSVG();
        renderHiHatNote(svg as any, 80, 120, "accent-open");

        const glyph = svg.children.find(c => c.tagName === "text" && c.classList.has("drum-glyph") && !c.classList.has("drum-glyph-accent"));
        assert.ok(glyph, "expected a notehead glyph text element");
        assert.equal(glyph.getAttribute("x"), "80");
        assert.equal(glyph.getAttribute("y"), "120");
    });
});

describe("renderHiHatNote — open vs accent-open comparison", () => {

    test("plain 'open' renders X notehead + stem + open circle only (no accent)", () => {
        const svg = makeSVG();
        renderHiHatNote(svg as any, 50, 100, "open");

        // text (X notehead) + line (stem) + circle (open marker)
        assert.equal(svg.children.length, 3, "open should have X notehead + stem + open circle only");

        const circles = svg.children.filter(c => c.tagName === "circle");
        assert.equal(circles.length, 1, "expected one open circle");

        const glyphs = svg.children.filter(c => c.tagName === "text" && c.classList.has("drum-glyph"));
        assert.equal(glyphs.length, 1);
        assert.equal(glyphs[0]?.textContent, GLYPHS.noteheadXBlack);
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

    test("'accent-open' uses the same notehead glyph as plain 'open'", () => {
        const svgOpen = makeSVG();
        renderHiHatNote(svgOpen as any, 50, 100, "open");

        const svgAccentOpen = makeSVG();
        renderHiHatNote(svgAccentOpen as any, 50, 100, "accent-open");

        const openGlyph = svgOpen.children.find(c => c.tagName === "text" && c.classList.has("drum-glyph") && !c.classList.has("drum-glyph-accent"));
        const accentOpenGlyph = svgAccentOpen.children.find(c => c.tagName === "text" && c.classList.has("drum-glyph") && !c.classList.has("drum-glyph-accent"));

        assert.ok(openGlyph, "open should have a notehead glyph");
        assert.ok(accentOpenGlyph, "accent-open should have a notehead glyph");
        assert.equal(
            openGlyph.textContent,
            accentOpenGlyph.textContent,
            "both open and accent-open should use the same notehead glyph character"
        );
    });
});

describe("renderHiHatNote — normal and accent still work correctly", () => {

    test("normal articulation renders an X notehead glyph (no open circle)", () => {
        const svg = makeSVG();
        renderHiHatNote(svg as any, 50, 100, "normal");

        const circles = svg.children.filter(c => c.tagName === "circle");
        assert.equal(circles.length, 0, "normal HH should not render an open circle");

        const xGlyphs = svg.children.filter(c => c.tagName === "text" && c.classList.has("drum-glyph"));
        assert.ok(xGlyphs.some(g => g.textContent === GLYPHS.noteheadXBlack), "normal HH should render noteheadXBlack");
    });

    test("'accent' articulation renders no open circle", () => {
        const svg = makeSVG();
        renderHiHatNote(svg as any, 50, 100, "accent");

        const circles = svg.children.filter(c => c.tagName === "circle");
        assert.equal(circles.length, 0, "accent HH should not render an open circle");
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
