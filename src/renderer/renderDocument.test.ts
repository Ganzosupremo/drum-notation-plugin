/// <reference types="node" />
import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { parseDrumDocument } from "../notation/parseDocument";
import { renderDrumDocument } from "./renderDocument";

class MockClassList {
    readonly values = new Set<string>();
    add(...values: string[]) { values.forEach(value => this.values.add(value)); }
}

class MockElement {
    readonly children: MockElement[] = [];
    readonly attributes = new Map<string, string>();
    readonly classList = new MockClassList();
    readonly css = new Map<string, string>();
    className = "";
    textContent = "";
    clientWidth = 720;
    parent?: MockElement;

    constructor(readonly tagName: string) {}

    setAttribute(name: string, value: string) { this.attributes.set(name, value); }
    appendChild(child: MockElement) { child.parent = this; this.children.push(child); return child; }
    createDiv() { return this.appendChild(new MockElement("div")); }
    replaceChildren() { this.children.splice(0); }
    setCssProps(values: Record<string, string>) { Object.entries(values).forEach(([key, value]) => this.css.set(key, value)); }
    remove() {
        if (!this.parent) return;
        const index = this.parent.children.indexOf(this);
        if (index >= 0) this.parent.children.splice(index, 1);
    }
}

function descendants(root: MockElement): MockElement[] {
    return root.children.flatMap(child => [child, ...descendants(child)]);
}

before(() => {
    (globalThis as unknown as { document: unknown }).document = {
        createElementNS: (_namespace: string, tag: string) => new MockElement(tag),
    };
});

describe("responsive document renderer", () => {
    test("renders a shared upper stem for a simultaneous HH and SD chord", () => {
        const container = new MockElement("div");
        const documentModel = parseDrumDocument("meter: 4/4\nHH: 1\nSD: 1\nBD: 1");
        const rendered = renderDrumDocument(documentModel, container as unknown as HTMLElement);
        const elements = descendants(container);
        const upperHeads = elements.filter(element => element.tagName === "text"
            && ["HH", "SD"].includes(element.attributes.get("data-instrument") ?? ""));
        const stems = elements.filter(element => element.tagName === "line" && element.classList.values.has("drum-note"));
        assert.equal(upperHeads.length, 2);
        assert.equal(stems.length, 2, "one shared upper stem plus one lower kick stem");
        const kick = elements.find(element => element.attributes.get("data-instrument") === "BD");
        assert.ok(kick);
        assert.ok(upperHeads.every(head => head.attributes.get("x") === kick.attributes.get("x")), "all voices at the same tick share one notation column");
        rendered.destroy();
    });

    test("renders compact aliases, decorations and repeats through the shared layout", () => {
        const container = new MockElement("div");
        const documentModel = parseDrumDocument("4/4\nR: 8ths >1 >3 x2\nS: 2 4 (3a) | %\nK: 1 2& 3 | %");
        const rendered = renderDrumDocument(documentModel, container as unknown as HTMLElement);
        const elements = descendants(container);
        assert.equal(elements.filter(element => element.classList.values.has("drum-glyph-accent")).length, 4);
        assert.equal(elements.filter(element => element.classList.values.has("drum-glyph-ghost")).length, 2);
        assert.equal(elements.filter(element => element.tagName === "svg").length, 1);
        rendered.destroy();
    });

    test("wraps one to four measures according to container width", () => {
        const container = new MockElement("div");
        const documentModel = parseDrumDocument([
            "meter: 4/4",
            "HH: eighths | eighths | eighths | eighths",
            "SD: 2, 4 | 2, 4 | 2, 4 | 2, 4",
        ].join("\n"));
        container.clientWidth = 480;
        const rendered = renderDrumDocument(documentModel, container as unknown as HTMLElement);
        assert.equal(descendants(container).filter(element => element.tagName === "svg").length, 4);
        container.clientWidth = 1200;
        rendered.rerender();
        assert.equal(descendants(container).filter(element => element.tagName === "svg").length, 1);
        rendered.destroy();
    });

    test("preserves the natural SVG width when a dense measure overflows", () => {
        const container = new MockElement("div");
        container.clientWidth = 240;
        const documentModel = parseDrumDocument("4/4\nstyle: practice\nH: 16ths\nS: (1e) (1&) (1a) (2e) (2&) (2a) (3e) (3&) (3a) (4e) (4&) (4a)");
        const rendered = renderDrumDocument(documentModel, container as unknown as HTMLElement, { scale: 1.5 });
        const svg = descendants(container).find(element => element.tagName === "svg");
        assert.ok(Number(svg?.attributes.get("width")) > container.clientWidth);
        rendered.destroy();
    });

    test("expands the viewBox at 150 percent scale", () => {
        const container = new MockElement("div");
        const documentModel = parseDrumDocument("meter: 4/4\nHH: eighths\nBD: 1, 3");
        const rendered = renderDrumDocument(documentModel, container as unknown as HTMLElement, { scale: 1.5 });
        const svg = descendants(container).find(element => element.tagName === "svg");
        assert.ok(Number(svg?.attributes.get("height")) > 155);
        assert.ok(svg?.attributes.get("viewBox")?.endsWith(` ${svg?.attributes.get("height")}`));
        rendered.destroy();
    });

    test("renders smart rests, tuplet labels, secondary hooks and sloped beams", () => {
        const container = new MockElement("div");
        const documentModel = parseDrumDocument([
            "meter: 4/4",
            "grid: 16",
            "HH | x . . .  . . . .  . . . .  . . . . |",
            "SD | . o . .  . . . .  . . . .  . . . . |",
            "BD | . . . o  . . . .  . . . .  . . . . |",
        ].join("\n"));
        const rendered = renderDrumDocument(documentModel, container as unknown as HTMLElement);
        const elements = descendants(container);
        assert.ok(elements.some(element => element.classList.values.has("drum-rest")));
        assert.ok(elements.some(element => element.classList.values.has("drum-beam-hook")));
        const primary = elements.find(element => element.classList.values.has("drum-beam")
            && !element.classList.values.has("drum-beam-hook"));
        assert.notEqual(primary?.attributes.get("y1"), primary?.attributes.get("y2"));
        assert.ok(elements.some(element => element.classList.values.has("drum-flag-glyph")));
        rendered.destroy();

        const tripletContainer = new MockElement("div");
        const triplets = renderDrumDocument(parseDrumDocument("meter: 4/4\nHH: triplets"), tripletContainer as unknown as HTMLElement);
        assert.equal(descendants(tripletContainer).filter(element => element.classList.values.has("drum-tuplet-number")).length, 4);
        triplets.destroy();
    });

    test("renders the reported two-measure groove without leaking articulations or durations", () => {
        const container = new MockElement("div");
        const model = parseDrumDocument([
            "meter: 4/4",
            "RC: eighths; accent: 1, 3 | eighths",
            "SD: 2, 4; ghost: 3a | 2, 4; ghost: 2a, 3a",
            "BD: 1, 2&, 3 | 1, 2&, 3, 3a",
        ].join("\n"));
        const rendered = renderDrumDocument(model, container as unknown as HTMLElement);
        const elements = descendants(container);
        assert.equal(elements.filter(element => element.classList.values.has("drum-glyph-accent")).length, 2);
        assert.equal(elements.filter(element => element.classList.values.has("drum-glyph-ghost")).length, 3);
        assert.equal(elements.filter(element => element.attributes.get("data-instrument") === "BD").length, 7);
        assert.ok(elements.some(element => element.classList.values.has("drum-rest") && element.attributes.get("data-voice") === "lower"));
        rendered.destroy();
    });

    test("does not render sustain bars for ordinary eighth notes in a sixteenth-resolution measure", () => {
        const container = new MockElement("div");
        const documentModel = parseDrumDocument([
            "meter: 4/4",
            "HH: eighths; accent: 1, 3",
            "SD: 2, 4; ghost: 3a",
        ].join("\n"));
        const rendered = renderDrumDocument(documentModel, container as unknown as HTMLElement);
        const elements = descendants(container);
        assert.equal(elements.filter(element => element.classList.values.has("drum-duration")).length, 0);
        const accents = elements.filter(element => element.classList.values.has("drum-glyph-accent"));
        assert.ok(accents.length > 0);
        assert.ok(accents.every(element => element.classList.values.has("drum-glyph")), "accent must use the Bravura font class");
        rendered.destroy();
    });

    test("renders a curved tie only for an explicit tie token", () => {
        const container = new MockElement("div");
        const documentModel = parseDrumDocument("meter: 4/4\ngrid: 16\nHH | x ~ . .  . . . .  . . . .  . . . . |");
        const rendered = renderDrumDocument(documentModel, container as unknown as HTMLElement);
        assert.equal(descendants(container).filter(element => element.classList.values.has("drum-tie")).length, 1);
        rendered.destroy();
    });
});
