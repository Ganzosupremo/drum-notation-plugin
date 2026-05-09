# Drum Notation Plugin — Architecture & Development Plan

## Overview

This plugin renders groove-oriented drum notation inside Obsidian using SVG. It prioritizes fast readability, mobile-friendly scaling, and markdown-first workflows rather than classical engraving.

## Current Architecture

```
Parser
↓
Notation Model
↓
Layout Engine
↓
Renderer Layer
↓
SVG Output
```

## Implemented (Current State)

### Obsidian integration
- Markdown code block processor for `drums`
- Live rendering in reading view and live preview
- Settings tab with default beats-per-bar

### Rendering
- SVG renderer with grid, labels, bar lines
- Modular renderer layout and note renderers
- Instrument noteheads: HH, SD, BD
- Beam rendering layer

### Layout
- `buildLayout()` generates `NoteEvent[]` with x positions

### Time and grouping
- Time signature parsing (`time: 4/4`, `time 6/8`, inline ` ```drums time 6/8`)
- Meter awareness (simple vs compound)
- Beat-aware beam grouping
- Subdivision label logic tied to time signature
- Subdivision override headers (e.g., `subdiv 4`, `grid 16ths`)

### Validation
- Warnings for malformed header values rendered above SVG

## Current Limitations

- No secondary beams for 16ths (single-beam only)
- No note duration model (all symbols are treated as equal subdivisions)
- No accents, ghost notes, or articulations
- No cymbals or tom lanes
- No playback or MIDI

## Short-Term Priorities (Next)

### 1. Secondary beam rendering
- Support double beams for 16ths and triplet styling
- Visual grouping by beat with multi-beam stacks

### 2. Articulations
- Ghost notes (smaller, lighter, or parenthesized)
- Accents (upward wedge above notes)
- Open hi-hat articulation

### 3. Instrument expansion
- Additional cymbals (ride, crash, china, splash)
- Tom lanes (high, mid, floor)

### 4. Parser upgrades
- Token-aware parsing (symbols + modifiers)
- Measure-aware parsing with bar separators

## Mid-Term (Groove Intelligence)

- Time signature engine with explicit beat units
- Subdivision modes (straight, swung, triplet)
- Groove presets and library integration
- Dataview metadata parsing

## Long-Term (Interactive)

- Playback cursor and metronome
- MIDI or WebAudio playback
- Visual editor (click to add notes)
- Export (SVG/PNG/MIDI)

## Visual Test Suite

Use [TEST_PATTERNS.md](TEST_PATTERNS.md) to validate beam grouping and subdivision labels.

## Design Notes

- Target: groove charts similar to GrooveScribe / modern worship charts
- Avoid heavy dependencies
- Keep rendering deterministic and fast for mobile
