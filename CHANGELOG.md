# Changelog

## 1.1.0-beta.3

- Adds persistent 0%-150% playback-volume controls for every instrument.
- Rebalances the default mix by lowering hi-hat, ride, and other cymbals relative to kick and snare.
- Applies the same instrument mix to synthesized and acoustic kits, including true 0% mute and a reset-all action.
- Adds an independent metronome volume plus separately selectable and previewable first-beat and regular-beat voices.
- Adds high/low woodblock, cowbell, bongo and conga metronome voices, along with click, clave, rimshot and shaker options.
- Adds the `Acústico · Crispy` kit, built around a brighter, tighter version of the hard acoustic snare sample.

## 1.1.0-beta.2

- Adds selectable `Acústico · Studio` and `Acústico · Heavy` kits backed by curated CC0 recordings.
- Adds velocity-layer selection, per-sample tuning, decoded-buffer sharing, and synthesized fallback for incomplete mappings.
- Embeds the acoustic subset in `main.js` so BRAT and manual mobile installations work offline without extra files.

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
