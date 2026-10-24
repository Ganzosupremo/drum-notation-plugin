import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { parseDrumDocument } from "../notation/parseDocument";
import { midiToDrumEvents } from "./midiDrums";
import { parseMidiFile } from "./midiFile";
import { transcribedEventsToDrumSource } from "./toDrumSource";

function variableLength(value: number): number[] {
    const bytes = [value & 0x7f];
    let rest = value >> 7;
    while (rest > 0) {
        bytes.unshift((rest & 0x7f) | 0x80);
        rest >>= 7;
    }
    return bytes;
}

function chunk(type: string, body: number[]): number[] {
    const length = body.length;
    return [...type].map(character => character.charCodeAt(0))
        .concat([(length >>> 24) & 0xff, (length >>> 16) & 0xff, (length >>> 8) & 0xff, length & 0xff], body);
}

function tempoEvent(delta: number, bpm: number): number[] {
    const micros = Math.round(60_000_000 / bpm);
    return [...variableLength(delta), 0xff, 0x51, 0x03, (micros >> 16) & 0xff, (micros >> 8) & 0xff, micros & 0xff];
}

const END_OF_TRACK = [0x00, 0xff, 0x2f, 0x00];

function midiFile(format: number, ticksPerQuarter: number, tracks: number[][]): Uint8Array {
    const header = chunk("MThd", [0, format, 0, tracks.length, (ticksPerQuarter >> 8) & 0xff, ticksPerQuarter & 0xff]);
    return new Uint8Array(header.concat(...tracks.map(track => chunk("MTrk", track.concat(END_OF_TRACK)))));
}

describe("parseMidiFile", () => {
    test("reads note-ons with running status and ignores zero-velocity note-offs", () => {
        const file = midiFile(0, 480, [[
            ...tempoEvent(0, 100),
            0x00, 0x99, 36, 100,
            0x00, 42, 80,
            ...variableLength(240), 36, 0,
            ...variableLength(240), 0x99, 38, 110,
            0x00, 0x89, 38, 0,
        ]]);

        const parsed = parseMidiFile(file);

        assert.equal(parsed.ticksPerQuarter, 480);
        assert.deepEqual(parsed.notes, [
            { timeSeconds: 0, channel: 9, note: 36, velocity: 100 },
            { timeSeconds: 0, channel: 9, note: 42, velocity: 80 },
            { timeSeconds: 0.6, channel: 9, note: 38, velocity: 110 },
        ]);
    });

    test("applies tempo changes from the conductor track to every track", () => {
        const file = midiFile(1, 96, [
            [...tempoEvent(0, 120), ...tempoEvent(192, 60)],
            [0x00, 0x99, 36, 100, ...variableLength(384), 0x99, 38, 100],
        ]);

        const parsed = parseMidiFile(file);

        assert.deepEqual(parsed.tempos.map(tempo => tempo.tick), [0, 192]);
        assert.deepEqual(parsed.notes.map(note => note.timeSeconds), [0, 3]);
    });

    test("defaults to 120 BPM and skips sysex and program changes", () => {
        const file = midiFile(0, 4, [[
            0x00, 0xf0, 0x02, 0x7e, 0xf7,
            0x00, 0xc9, 0x00,
            ...variableLength(4), 0x99, 49, 127,
        ]]);

        const parsed = parseMidiFile(file);

        assert.equal(parsed.tempos[0]!.microsecondsPerQuarter, 500_000);
        assert.deepEqual(parsed.notes, [{ timeSeconds: 0.5, channel: 9, note: 49, velocity: 127 }]);
    });

    test("reads text and marker events and the first time signature", () => {
        const text = (delta: number, type: number, value: string) =>
            [...variableLength(delta), 0xff, type, value.length, ...[...value].map(character => character.charCodeAt(0))];
        const file = midiFile(0, 480, [[
            ...tempoEvent(0, 60),
            0x00, 0xff, 0x58, 0x04, 3, 2, 24, 8,
            ...text(480, 0x01, "downbeat"),
            ...text(480, 0x06, "chorus"),
            ...variableLength(0), 0xff, 0x58, 0x04, 4, 2, 24, 8,
        ]]);

        const parsed = parseMidiFile(file);

        assert.deepEqual(parsed.markers, [{ timeSeconds: 1, text: "downbeat" }, { timeSeconds: 2, text: "chorus" }]);
        assert.equal(parsed.beatsPerBar, 3);
    });

    test("rejects files that are not tick-based MIDI", () => {
        assert.throws(() => parseMidiFile(new TextEncoder().encode("RIFF0000WAVEfmt ")), /Not a MIDI file/);
        const smpte = midiFile(0, 0xe728, [[]]);
        assert.throws(() => parseMidiFile(smpte), /SMPTE/);
        assert.throws(() => parseMidiFile(midiFile(2, 96, [[]])), /format 2/);
    });
});

describe("midiToDrumEvents", () => {
    test("maps General MIDI drums, prefers channel 10 and reports unmapped notes", () => {
        const file = midiFile(1, 480, [
            [...tempoEvent(0, 90)],
            [
                0x00, 0x99, 36, 127,
                0x00, 0x99, 39, 90,
                0x00, 0x90, 60, 100,
                ...variableLength(480), 0x99, 38, 64,
            ],
        ]);

        const result = midiToDrumEvents(parseMidiFile(file));

        assert.equal(result.usedDrumChannelOnly, true);
        assert.equal(result.initialTempoBpm, 90);
        assert.equal(result.firstHitSeconds, 0);
        assert.deepEqual(result.events.map(event => event.instrument), ["kick", "snare"]);
        assert.equal(result.events[0]!.confidence, 1);
        assert.deepEqual([...result.unmappedNotes], [[39, 1]]);
    });

    test("uses a downbeat marker and the time signature as import defaults", () => {
        const file = midiFile(0, 480, [[
            ...tempoEvent(0, 120),
            0x00, 0xff, 0x58, 0x04, 3, 2, 24, 8,
            0x00, 0x99, 42, 100,
            ...variableLength(240), 0xff, 0x01, 0x08, ...[..."downbeat"].map(character => character.charCodeAt(0)),
            0x00, 0x99, 36, 100,
        ]]);

        const result = midiToDrumEvents(parseMidiFile(file));

        assert.equal(result.firstHitSeconds, 0);
        assert.equal(result.downbeatSeconds, 0.25);
        assert.equal(result.beatsPerBar, 3);
    });

    test("treats every channel as drums when channel 10 is unused and yields parseable source", () => {
        const sixteenth = 120;
        const track: number[] = [...tempoEvent(0, 100)];
        for (let step = 0; step < 16; step++) {
            track.push(...variableLength(step === 0 ? 0 : sixteenth), 0x90, step % 2 === 0 ? 42 : 46, 90);
            if (step % 8 === 0) track.push(0x00, 0x90, 36, 110);
            if (step % 8 === 4) track.push(0x00, 0x90, 38, 110);
        }

        const midi = midiToDrumEvents(parseMidiFile(midiFile(0, 480, [track])));
        const result = transcribedEventsToDrumSource(midi.events, { tempoBpm: midi.initialTempoBpm });
        const parsed = parseDrumDocument(result.source);

        assert.equal(midi.usedDrumChannelOnly, false);
        assert.equal(result.measureCount, 1);
        assert.equal(parsed.diagnostics.filter(diagnostic => diagnostic.severity === "error").length, 0);
        assert.match(result.source, /^tempo: 100$/m);
        assert.match(result.source, /^SD \| \. \. \. \. {2}o \. \. \./m);
        assert.match(result.source, /^BD \| o \. \. \./m);
    });
});
