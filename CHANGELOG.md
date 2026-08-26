# Changelog

## 1.1.0-beta.1

- Adds play and stop controls to every rendered drum block.
- Adds synthesized drum playback for kicks, snares, toms, hi-hats and cymbals, including accents, ghost notes and ornaments.
- Adds an optional accented metronome, live BPM control and `tempo:`/`bpm:` block directives.
- Adds swing-aware scheduling and a moving score cursor.
- Stops playback cleanly when another block starts or the plugin unloads.

## 1.0.1

- Fixes automated review errors by creating HTML and SVG elements from their owning document.
- Uses the block's host window for animation frames so popout windows render correctly.
- Adds searchable declarative setting definitions while retaining compatibility with Obsidian before 1.13.
- Replaces the unsupported diagnostic text decoration with a compatible inset highlight.
- Updates the local Obsidian review lint rules and API types to their current pinned versions.

## 1.0.0

- Introduces position and token-grid drum notation with compact aliases and repeats.
- Adds independent voice timelines, conventional rests, chords, ties, tuplets and professional beam grouping.
- Adds responsive collision-aware systems, extended instruments, techniques, ornaments and source-aware diagnostics.
- Removes the unpublished legacy pattern model and renderer.
- Adds Chromium visual regression, bundle verification and reproducible release staging.
