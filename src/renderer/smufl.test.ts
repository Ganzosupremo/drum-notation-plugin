/// <reference types="node" />
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { GLYPHS } from "./smufl";

test("declared runtime glyphs match the build-time SMuFL catalogue", () => {
    const catalogue = JSON.parse(readFileSync(join(process.cwd(), "assets", "glyphnames.json"), "utf8")) as Record<string, { codepoint?: string }>;
    Object.entries(GLYPHS).forEach(([name, glyph]) => {
        const codepoint = catalogue[name]?.codepoint;
        assert.ok(codepoint, `${name} must exist in glyphnames.json`);
        assert.equal(glyph.codePointAt(0), Number.parseInt(codepoint!.slice(2), 16), name);
    });
});
