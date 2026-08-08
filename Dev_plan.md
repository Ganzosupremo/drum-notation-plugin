# Drum Notation Plugin — Technical Status

## Current pipeline

```text
Position syntax / token grid
→ DrumDocument AST and diagnostics
→ independent upper/lower VoiceTimeline
→ shared NotationColumns and responsive systems
→ SVG engraving and in-block diagnostics
```

The public renderer consumes only the v2 AST. The former row-pattern model and compatibility renderer were removed before the first public release.

## Quality gates

- Unit tests for syntax, diagnostics, rhythm values, rests, chords, beams, tuplets and responsive layout.
- Playwright snapshots using the bundled Bravura font in light/dark themes at 360, 768 and 1200 px.
- Runtime checks for content outside the SVG viewBox and systems containing more than four measures.
- Manual checks in Live Preview and Reading View using `TEST_PATTERNS.md`.
- Production bundle below 250 KiB, excluding `Bravura.woff2`.

## Deferred features

- Playback, MIDI and metronome.
- Visual note editor.
- PNG/PDF export.
