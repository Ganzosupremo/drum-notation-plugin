import assert from "node:assert/strict";
import test from "node:test";
import { hasAudioClockAdvanced, shouldReplaceAudioContext, shouldResumeAudioContext } from "./audioActivation";

test("replaces contexts interrupted by iPadOS or invalidated after backgrounding", () => {
    assert.equal(shouldReplaceAudioContext("interrupted", false), true);
    assert.equal(shouldReplaceAudioContext("closed", false), true);
    assert.equal(shouldReplaceAudioContext("running", true), true);
    assert.equal(shouldReplaceAudioContext("running", false), false);
});

test("resumes every context state except running", () => {
    assert.equal(shouldResumeAudioContext("suspended"), true);
    assert.equal(shouldResumeAudioContext("interrupted"), true);
    assert.equal(shouldResumeAudioContext("closed"), true);
    assert.equal(shouldResumeAudioContext("running"), false);
});

test("detects WebKit contexts whose running clock is actually frozen", () => {
    assert.equal(hasAudioClockAdvanced(10, 10), false);
    assert.equal(hasAudioClockAdvanced(10, 10.0005), false);
    assert.equal(hasAudioClockAdvanced(10, 10.08), true);
});
