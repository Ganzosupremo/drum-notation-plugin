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

type RenderBarLines = typeof import("./renderBarLines").renderBarLines;
type RenderBracketLines = typeof import("./renderBarLines").renderBracketLines;
let renderBarLines: RenderBarLines;
let renderBracketLines: RenderBracketLines;

const START_X = 120;
const CELL_WIDTH = 40;

before(async () => {
    (globalThis as any).document = {
        createElementNS: (_ns: string, tag: string) => new MockSVGElement(tag),
    };
    const mod = await import("./renderBarLines");
    renderBarLines = mod.renderBarLines;
    renderBracketLines = mod.renderBracketLines;
});

// ─── renderBarLines ───────────────────────────────────────────────────────────

describe("renderBarLines — single measure (4/4, 16th notes, 16 cells)", () => {

    test("emits exactly one line element", () => {
        const svg = makeSVG();
        renderBarLines(svg as any, 0, 100, 16, 4, 4, CELL_WIDTH);
        const lines = svg.children.filter(c => c.tagName === "line");
        assert.equal(lines.length, 1, "expected exactly one barline for a single measure");
    });

    test("the barline carries the drum-bar CSS class", () => {
        const svg = makeSVG();
        renderBarLines(svg as any, 0, 100, 16, 4, 4, CELL_WIDTH);
        const lines = svg.children.filter(c => c.tagName === "line");
        assert.ok(lines[0]?.classList.has("drum-bar"), "barline should have drum-bar class");
    });

    test("the barline x position is at the right edge of cell 16 (x = START_X + 15*cellWidth + cellWidth/2)", () => {
        const svg = makeSVG();
        renderBarLines(svg as any, 0, 100, 16, 4, 4, CELL_WIDTH);
        const lines = svg.children.filter(c => c.tagName === "line");
        const expectedX = START_X + 15 * CELL_WIDTH + CELL_WIDTH / 2;
        assert.equal(lines[0]?.getAttribute("x1"), expectedX.toString());
        assert.equal(lines[0]?.getAttribute("x2"), expectedX.toString());
    });

    test("the barline spans topY to bottomY", () => {
        const svg = makeSVG();
        renderBarLines(svg as any, 10, 90, 16, 4, 4, CELL_WIDTH);
        const lines = svg.children.filter(c => c.tagName === "line");
        assert.equal(lines[0]?.getAttribute("y1"), "10");
        assert.equal(lines[0]?.getAttribute("y2"), "90");
    });

});

describe("renderBarLines — two measures (4/4, 16th notes, 32 cells)", () => {

    test("emits exactly two line elements", () => {
        const svg = makeSVG();
        renderBarLines(svg as any, 0, 100, 32, 4, 4, CELL_WIDTH);
        const lines = svg.children.filter(c => c.tagName === "line");
        assert.equal(lines.length, 2, "expected exactly two barlines for a two-measure pattern");
    });

    test("first barline is at the end of measure 1 (cell 16)", () => {
        const svg = makeSVG();
        renderBarLines(svg as any, 0, 100, 32, 4, 4, CELL_WIDTH);
        const lines = svg.children.filter(c => c.tagName === "line");
        const expectedX = START_X + 15 * CELL_WIDTH + CELL_WIDTH / 2;
        assert.equal(lines[0]?.getAttribute("x1"), expectedX.toString(), "first barline should be at end of measure 1");
    });

    test("second barline is at the end of measure 2 (cell 32)", () => {
        const svg = makeSVG();
        renderBarLines(svg as any, 0, 100, 32, 4, 4, CELL_WIDTH);
        const lines = svg.children.filter(c => c.tagName === "line");
        const expectedX = START_X + 31 * CELL_WIDTH + CELL_WIDTH / 2;
        assert.equal(lines[1]?.getAttribute("x1"), expectedX.toString(), "second barline should be at end of measure 2");
    });

    test("both barlines carry the drum-bar CSS class", () => {
        const svg = makeSVG();
        renderBarLines(svg as any, 0, 100, 32, 4, 4, CELL_WIDTH);
        const lines = svg.children.filter(c => c.tagName === "line");
        assert.ok(lines[0]?.classList.has("drum-bar"));
        assert.ok(lines[1]?.classList.has("drum-bar"));
    });

});

describe("renderBarLines — no barlines when length is zero or period is zero", () => {

    test("length of 0 emits no lines", () => {
        const svg = makeSVG();
        renderBarLines(svg as any, 0, 100, 0, 4, 4, CELL_WIDTH);
        assert.equal(svg.children.length, 0);
    });

    test("beatsPerBar of 0 emits no lines (period is 0)", () => {
        const svg = makeSVG();
        renderBarLines(svg as any, 0, 100, 16, 0, 4, CELL_WIDTH);
        assert.equal(svg.children.length, 0);
    });

});

// ─── renderBracketLines ───────────────────────────────────────────────────────

describe("renderBracketLines — with cellCount (16 cells)", () => {

    test("emits exactly two line elements", () => {
        const svg = makeSVG();
        renderBracketLines(svg as any, 0, 100, 16, CELL_WIDTH);
        const lines = svg.children.filter(c => c.tagName === "line");
        assert.equal(lines.length, 2, "expected opening and closing bracket lines");
    });

    test("opening bracket is at START_X", () => {
        const svg = makeSVG();
        renderBracketLines(svg as any, 0, 100, 16, CELL_WIDTH);
        const lines = svg.children.filter(c => c.tagName === "line");
        assert.equal(lines[0]?.getAttribute("x1"), START_X.toString(), "opening bracket x1 should be START_X");
        assert.equal(lines[0]?.getAttribute("x2"), START_X.toString(), "opening bracket x2 should be START_X");
    });

    test("closing bracket is at START_X + (cellCount-1)*cellWidth + cellWidth/2", () => {
        const svg = makeSVG();
        renderBracketLines(svg as any, 0, 100, 16, CELL_WIDTH);
        const lines = svg.children.filter(c => c.tagName === "line");
        const expectedCloseX = START_X + 15 * CELL_WIDTH + CELL_WIDTH / 2;
        assert.equal(lines[1]?.getAttribute("x1"), expectedCloseX.toString(), "closing bracket x1 should be at right edge");
        assert.equal(lines[1]?.getAttribute("x2"), expectedCloseX.toString(), "closing bracket x2 should be at right edge");
    });

    test("closing bracket x matches single-measure barline x", () => {
        const svgBracket = makeSVG();
        renderBracketLines(svgBracket as any, 0, 100, 16, CELL_WIDTH);
        const bracketLines = svgBracket.children.filter(c => c.tagName === "line");
        const closeX = bracketLines[1]?.getAttribute("x1");

        const svgBar = makeSVG();
        renderBarLines(svgBar as any, 0, 100, 16, 4, 4, CELL_WIDTH);
        const barLines = svgBar.children.filter(c => c.tagName === "line");
        const barX = barLines[0]?.getAttribute("x1");

        assert.equal(closeX, barX, "closing bracket and single-measure barline should share the same x");
    });

    test("both lines span topY to bottomY", () => {
        const svg = makeSVG();
        renderBracketLines(svg as any, 5, 95, 16, CELL_WIDTH);
        const lines = svg.children.filter(c => c.tagName === "line");
        for (const line of lines) {
            assert.equal(line.getAttribute("y1"), "5");
            assert.equal(line.getAttribute("y2"), "95");
        }
    });

    test("both lines carry the drum-bar CSS class", () => {
        const svg = makeSVG();
        renderBracketLines(svg as any, 0, 100, 16, CELL_WIDTH);
        const lines = svg.children.filter(c => c.tagName === "line");
        for (const line of lines) {
            assert.ok(line.classList.has("drum-bar"));
        }
    });

});

describe("renderBracketLines — without cellCount", () => {

    test("emits only the opening bracket (one line) when cellCount is omitted", () => {
        const svg = makeSVG();
        renderBracketLines(svg as any, 0, 100, undefined, CELL_WIDTH);
        const lines = svg.children.filter(c => c.tagName === "line");
        assert.equal(lines.length, 1, "expected only opening bracket when cellCount is not provided");
    });

    test("emits only the opening bracket when cellCount is 0", () => {
        const svg = makeSVG();
        renderBracketLines(svg as any, 0, 100, 0, CELL_WIDTH);
        const lines = svg.children.filter(c => c.tagName === "line");
        assert.equal(lines.length, 1, "expected only opening bracket when cellCount is 0");
    });

});

describe("renderBracketLines — two-measure closing bracket x (32 cells)", () => {

    test("closing bracket x for 32 cells is at START_X + 31*cellWidth + cellWidth/2", () => {
        const svg = makeSVG();
        renderBracketLines(svg as any, 0, 100, 32, CELL_WIDTH);
        const lines = svg.children.filter(c => c.tagName === "line");
        const expectedCloseX = START_X + 31 * CELL_WIDTH + CELL_WIDTH / 2;
        assert.equal(lines[1]?.getAttribute("x1"), expectedCloseX.toString());
    });

    test("closing bracket x for 32 cells matches the second barline x in a two-measure pattern", () => {
        const svgBracket = makeSVG();
        renderBracketLines(svgBracket as any, 0, 100, 32, CELL_WIDTH);
        const bracketLines = svgBracket.children.filter(c => c.tagName === "line");
        const closeX = bracketLines[1]?.getAttribute("x1");

        const svgBar = makeSVG();
        renderBarLines(svgBar as any, 0, 100, 32, 4, 4, CELL_WIDTH);
        const barLines = svgBar.children.filter(c => c.tagName === "line");
        const lastBarX = barLines[barLines.length - 1]?.getAttribute("x1");

        assert.equal(closeX, lastBarX, "closing bracket should align with the final barline of the last measure");
    });

});
