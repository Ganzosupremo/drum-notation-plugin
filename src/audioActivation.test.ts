import assert from "node:assert/strict";
import test from "node:test";
import { shouldReplaceAudioContext, shouldResumeAudioContext } from "./audioActivation";

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
