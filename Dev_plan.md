# Drum Notation Plugin — Architecture & Development Plan

## Overview

This project is a custom Obsidian plugin focused on modern drum groove notation, especially optimized for:

- Worship drumming
- Groove-based notation
- Fast readability
- Mobile/iPad usage
- Markdown integration
- Obsidian knowledge management workflows

The goal is NOT to create a full classical engraving engine like MuseScore or Sibelius.

Instead, the project follows a **Groove-Oriented Notation Engine** philosophy similar to:

- Drumeo notation
- GrooveScribe
- Modern worship charts
- Hybrid groove/tab systems

The plugin renders custom drum notation blocks directly inside Obsidian notes using SVG.

---

# Current System Architecture

The plugin already has a foundational notation engine architecture with separated responsibilities.

Current architecture:

```txt
Parser
↓
Layout Engine
↓
Renderer Layer
↓
SVG Output
```

---

# Current Features Implemented

## 1. Obsidian Plugin Integration

Implemented:
- Community Plugin structure
- Markdown code block processor
- SVG rendering inside notes
- Live rendering in Reading View / Live Preview

Example usage:

````md
```drums
HH |x-x-x-x-x-x-x-x-|
SD |----o-------o---|
BD |o-------o-o-----|
```
````

---

# 2. SVG Rendering System

Implemented:
- SVG-based renderer
- Responsive scalable notation
- Horizontal grid rendering
- Vertical subdivision grid
- Measure/bar lines
- Instrument labels

Why SVG:
- Infinite scaling
- Mobile-friendly
- Fast rendering
- Easy animation/playback integration later
- Export-friendly

---

# 3. Modular Renderer Architecture

Renderer has been split into independent systems.

Current renderer structure:

```txt
renderer/
├── renderNotation.ts
├── renderGrid.ts
├── renderLabels.ts
├── renderNotes.ts
├── renderBarLines.ts
├── renderSubdivisionLabels.ts
├── renderBeams.ts
├── renderStem.ts
├── svgHelpers.ts
├── constants.ts
└── notes/
    ├── renderHiHatNote.ts
    ├── renderSnareNote.ts
    └── renderKickNote.ts
```

Purpose:
- Avoid monolithic rendering logic
- Improve extensibility
- Allow future note types/articulations
- Separate orchestration vs visual rendering

---

# 4. Layout Engine

Implemented:
- `buildLayout()`
- NoteEvent generation
- Subdivision-based positioning
- X-coordinate calculation

Current data model:

```ts
interface NoteEvent {
    instrument: string;
    symbol: string;
    index: number;
    x: number;
}
```

This is a major architectural milestone because the system no longer renders directly from raw text.

Instead:

```txt
Pattern
↓
Tokens
↓
NoteEvents
↓
Renderer
```

This enables future:
- playback
- articulations
- velocity
- grouping
- animation
- MIDI export

---

# 5. Instrument-Specific Note Rendering

Implemented:
- Hi-hat noteheads (X-style)
- Snare noteheads (circle)
- Kick noteheads (larger circle)
- Stem rendering

Current architecture:

```txt
renderHiHatNote()
renderSnareNote()
renderKickNote()
```

This allows future expansion:
- cymbals
- toms
- ghost notes
- accents
- open hats
- chokes
- flams
- drags

---

# 6. Beam Rendering System

Implemented:
- Beam grouping engine
- SVG beam renderer
- Basic note connection logic

Current limitation:
- grouping is subdivision-distance based
- not yet beat-aware

---

# 7. Subdivision Label System

Implemented:
- visual subdivision labels
- beat indicators
- top timeline rendering

Example:

```txt
1 & 2 & 3 & 4 &
```

---

# 8. Separation of Responsibilities

The system is now properly layered:

| System | Responsibility |
|---|---|
| Parser | Parse markdown notation |
| Layout Engine | Generate note positions |
| Beam Engine | Group connected notes |
| Renderer | Draw SVG elements |
| Note Renderers | Draw instrument-specific symbols |

This is important because future features can now be implemented without rewriting the entire engine.

---

# Design Philosophy

## Chosen Direction

The project intentionally chose:

# Groove-Oriented Notation

instead of:

# Classical Engraving Engine

Reason:
- faster readability
- easier mobile usage
- better for worship drumming
- better for groove memorization
- easier markdown integration
- easier editor integration

This is similar to:
- GrooveScribe
- Drumeo notation
- modern session charts

NOT:
- Sibelius
- Finale
- MuseScore

---

# Current Limitations

## 1. Beam Grouping

Current:
- beams connect by note distance

Needed:
- beat-aware grouping
- measure-aware grouping

---

## 2. Parser Simplicity

Current parser:
- subdivision-per-character

Future parser:
- time-signature aware
- token aware
- intelligent grouping

---

## 3. No Time Signature Engine

Not implemented yet:
- 4/4
- 6/8
- 12/8
- triplets
- tuplets

---

## 4. No Playback

Currently visual only.

No:
- MIDI
- audio
- metronome
- playback cursor

---

# Planned Features (Short-Term)

## Phase 1 — Core Groove Engine

Priority: HIGH

### Beat-aware beam grouping

Example:

```txt
1 & | 2 &
```

should render separate beam groups.

---

### Ghost notes

Visual style:
- smaller notehead
- lower opacity
- parentheses

---

### Accents

Visual:
- accent marks above notes

---

### Open hi-hats

Visual articulation support.

---

### Additional cymbals

- Crash
- Ride
- China
- Splash

---

### Tom lanes

- High Tom
- Mid Tom
- Floor Tom

---

### Better subdivision labels

Support:
- 16ths
- triplets
- compound meters

---

# Planned Features (Mid-Term)

## Phase 2 — Groove Intelligence

### Time Signature System

Support:
- 4/4
- 3/4
- 6/8
- 12/8

---

### Subdivision Modes

Support:
- quarters
- 8ths
- 16ths
- triplets
- swung notes

---

### Groove Presets

Example:

```yaml
groove: worship-toms
```

Plugin auto-generates:
- hats
- toms
- kick patterns
- accents

---

### Groove Library

Searchable groove database using Obsidian tags + metadata.

---

### Dataview Integration

Example:

```dataview
TABLE tempo, feel
FROM #grooves
WHERE contains(tags, "worship")
```

---

# Planned Features (Long-Term)

## Phase 3 — Interactive System

### MIDI Playback

Using:
- Tone.js
- WebAudio

---

### Playback Cursor

Animated playback over notation.

---

### Click/Metronome

Integrated groove practice system.

---

### Visual Editor

Possibly:
- drag & drop notes
- click-to-add notes
- mobile editing

---

### Groove Analysis

Potential future:
- automatic groove categorization
- similarity matching
- groove recommendation

---

# Potential Future “Pro” Features

These are not immediate priorities but would be powerful.

## 1. Song Section Integration

Example:

```yaml
song: Washed
section: Chorus
feel: Worship Build
tempo: 74
```

Render groove automatically per section.

---

## 2. Obsidian Canvas Integration

Visual groove flow between:
- Verse
- Chorus
- Bridge
- Build

---

## 3. Practice System

- looping
- tempo increase
- practice mode
- metronome sync

---

## 4. Export Features

Potential:
- PNG
- PDF
- SVG export
- MIDI export

---

# Recommended Next Development Priorities

## Immediate Priority List

### 1. Refactor renderNotes()

Make it receive:
- `NoteEvent[]`

instead of:
- raw patterns

This removes duplicated layout calculations.

---

### 2. Beat-aware beam grouping

Most important visual improvement.

---

### 3. Ghost notes

Huge visual quality increase.

---

### 4. Time signature engine

Required before advanced subdivisions.

---

### 5. Cymbal/tom support

Essential for real grooves.

---

# Technical Notes

## Current Rendering Order

Correct rendering order:

```txt
Grid
↓
Beams
↓
Notes
↓
Bar Lines
```

because SVG renders in insertion order.

---

# Recommended Future Architecture

Future ideal architecture:

```txt
Markdown
↓
Parser
↓
Notation Model
↓
Layout Engine
↓
Render Instructions
↓
SVG Renderer
```

This would allow:
- playback
- export
- editor tools
- animations
- intelligent groove processing

without rewriting the renderer.

---

# Current Project Status

Current status:
- MVP renderer completed
- foundational architecture established
- notation engine direction defined
- renderer modularized
- groove-oriented approach validated

The project is already beyond “prototype” stage and now has the basis of a real notation engine architecture.
