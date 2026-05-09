import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { parseDrumNotation } from "./parser";

describe("inner pipe segment-joining (parseDrumNotation)", () => {

    test("pattern with inner pipes is joined into a single pattern string", () => {
        const source = "HH |x-x-|x-x-|";
        const result = parseDrumNotation(source);

        assert.equal(result.lines.length, 1);
        assert.equal(result.lines[0]?.instrument, "HH");
        assert.equal(result.lines[0]?.pattern, "x-x-x-x-");
    });

    test("pattern without inner pipes extracts pattern correctly", () => {
        const source = "HH |x-x-x-x-|";
        const result = parseDrumNotation(source);

        assert.equal(result.lines.length, 1);
        assert.equal(result.lines[0]?.instrument, "HH");
        assert.equal(result.lines[0]?.pattern, "x-x-x-x-");
    });

    test("pattern with only a closing pipe (no inner pipes) extracts pattern correctly", () => {
        const source = "SD |o---|";
        const result = parseDrumNotation(source);

        assert.equal(result.lines.length, 1);
        assert.equal(result.lines[0]?.instrument, "SD");
        assert.equal(result.lines[0]?.pattern, "o---");
    });

    test("pattern with no closing pipe extracts pattern correctly", () => {
        const source = "BD |o---";
        const result = parseDrumNotation(source);

        assert.equal(result.lines.length, 1);
        assert.equal(result.lines[0]?.instrument, "BD");
        assert.equal(result.lines[0]?.pattern, "o---");
    });

    test("multiple lines with inner pipes all parse correctly", () => {
        const source = [
            "HH |x-x-|x-x-|",
            "SD |----|-o--|",
            "BD |o---|----| ",
        ].join("\n");
        const result = parseDrumNotation(source);

        assert.equal(result.lines.length, 3);
        assert.equal(result.lines[0]?.instrument, "HH");
        assert.equal(result.lines[0]?.pattern, "x-x-x-x-");
        assert.equal(result.lines[1]?.instrument, "SD");
        assert.equal(result.lines[1]?.pattern, "-----o--");
        assert.equal(result.lines[2]?.instrument, "BD");
        assert.equal(result.lines[2]?.pattern, "o-------");
    });

    test("three inner pipes are joined in order", () => {
        const source = "HH |x-|x-|x-|x-|";
        const result = parseDrumNotation(source);

        assert.equal(result.lines.length, 1);
        assert.equal(result.lines[0]?.instrument, "HH");
        assert.equal(result.lines[0]?.pattern, "x-x-x-x-");
    });

    test("inner-pipe pattern and equivalent single-segment pattern produce identical results", () => {
        const withInner = parseDrumNotation("HH |x-x-|x-x-|");
        const withoutInner = parseDrumNotation("HH |x-x-x-x-|");

        assert.deepEqual(withInner.lines, withoutInner.lines);
    });

    test("line with no opening pipe is skipped (no valid instrument/pattern split)", () => {
        const source = "HH x-x-x-x-";
        const result = parseDrumNotation(source);

        assert.equal(result.lines.length, 0);
    });
});
