# Visual test patterns

Use these blocks in an Obsidian note to confirm beam splits and subdivision labels.

## 4/4 eighths

```drums time 4/4
HH |x-x-x-x-x-x-x-x-|
SD |----o-------o---|
BD |o-------o-o-----|
```

Expected: beams group per beat (1 & | 2 & | 3 & | 4 &).

## 4/4 sixteenths

```drums time 4/4
HH |x-xx-xx-xx-xx-xx-xx-xx-xx-|
SD |----o-------o-------o----|
BD |o-----o---o-----o---------|
```

Expected: beams split per beat (1 e & a | 2 e & a | 3 e & a | 4 e & a).

## 3/4 eighths

```drums time 3/4
HH |x-x-x-x-x-x-|
SD |----o---o---|
BD |o-----o-----|
```

Expected: beams split per beat across 3 beats.

## 6/8 eighths

```drums time 6/8
HH |x-x-x-x-x-x-|
SD |----o---o---|
BD |o-----o-----|
```

Expected: beams split per beat across 6 beats.

## Triplet grid (3 per beat)

```drums time 4/4
HH |x--x--x--x--x--x--x--x--|
SD |----o-----------o------|
BD |o--------o--------------|
```

Expected: labels show 1 & a, beams split per beat.

## Header line (inline)

```drums time 5/4
HH |x-x-x-x-x-x-x-x-x-x-|
SD |----o-------o-------|
BD |o-------o-------o---|
```

Expected: labels show 1 & 2 & 3 & 4 & 5 & and beams split per beat.

---

## Bravura glyph verification

### Pre-flight checks (verified in CI / build environment)

The items below were confirmed programmatically — no Obsidian required.

| Check | Result | How verified |
|---|---|---|
| TypeScript build (`tsc -noEmit`) | PASS | `npm run build` |
| esbuild production bundle | PASS | `npm run build` |
| All six glyphs resolve at module load | PASS | `smufl.ts` calls `resolveGlyph()` for noteheadBlack, noteheadHalf, noteheadXBlack, noteheadPlusBlack, noteheadCircleX, articAccentAbove; throws on missing entries so a bad codepoint would fail the build |
| Glyph codepoints present in `bravura_metadata.json` | PASS | validated by `resolveGlyph()` against `assets/bravura_metadata.json` |
| Glyph codepoints present in `glyphnames.json` | PASS | validated by `resolveGlyph()` against `assets/glyphnames.json` |
| `Bravura.woff2` exists in project root | PASS | font file present alongside `main.js` / `styles.css` |

### Manual Obsidian checklist

The items below require an Obsidian desktop run. Open a note, paste each
block from the sections below, and tick off each row as you confirm it.

| # | What to check | Pass? |
|---|---|---|
| 1 | HH normal `x` → solid X notehead (noteheadXBlack U+E0A9) | ☐ |
| 2 | HH open `o` → open oval, stroke only (noteheadHalf U+E0A3) | ☐ |
| 3 | HH ghost `(x)` → dimmed X with `( )` flanking it | ☐ |
| 4 | HH accent `>x` → X notehead with chevron above stem top | ☐ |
| 5 | HH accent-open `>o` → open oval with chevron above stem top | ☐ |
| 6 | SD normal `o` → solid filled oval (noteheadBlack U+E0A4) | ☐ |
| 7 | SD ghost `(o)` → dimmed oval with `( )` | ☐ |
| 8 | SD accent `>o` → oval with chevron above stem top | ☐ |
| 9 | BD normal/ghost/accent — same glyphs as SD (rows 6–8) | ☐ |
| 10 | RC `x` → solid X, offset above HH | ☐ |
| 11 | CC `x` → circle-X notehead (noteheadCircleX U+E0B3), above RC | ☐ |
| 12 | HF `x` → plus notehead (noteheadPlusBlack U+E0AF), no stem | ☐ |
| 13 | HT / MT / FT → solid ovals at three distinct vertical positions | ☐ |
| 14 | Accent chevron is visually proportional (not clipped or oversized) | ☐ |
| 15 | Noteheads are the same size in 16th-note and 8th-note grids | ☐ |

If any glyph appears as a blank square or question mark, the Bravura font
file is not loading. Confirm `Bravura.woff2` is in the plugin directory and
check the Obsidian developer console for a font-load error.

If accent glyphs look too large or too small, adjust `font-size` in
`.drum-glyph-accent` in `styles.css` (current value: `24px`).
If noteheads are clipped or overlap, adjust `font-size` in `.drum-glyph`
(current value: `40px`) or `CELL_WIDTH` in `src/renderer/constants.ts`.

---

Paste the blocks below into an Obsidian note one at a time to confirm every
SMuFL glyph renders as a proper music symbol — no blank squares, no fallback
characters (?, □, or tofu).  Check each expected result against what you see.

### Glyph reference

| CSS class / context | SMuFL name | Unicode | Expected appearance |
|---|---|---|---|
| `.drum-glyph` (HH normal) | noteheadXBlack | U+E0A9 | Solid X notehead |
| `.drum-glyph` (HH open) | noteheadHalf | U+E0A3 | Open oval notehead (stroke only) |
| `.drum-glyph` (SD / BD / Tom) | noteheadBlack | U+E0A4 | Solid filled oval |
| `.drum-glyph` (CC) | noteheadCircleX | U+E0B3 | X inside a circle |
| `.drum-glyph` (HF) | noteheadPlusBlack | U+E0AF | Solid plus sign |
| `.drum-glyph-accent` | articAccentAbove | U+E4A0 | Chevron `>` above stem top |

---

### HH — all articulations (noteheadXBlack, noteheadHalf, articAccentAbove)

```drums time 4/4
HH |x-o-(x)->x->o-|
```

Expected:
- Beat 1: solid X notehead (`x`, noteheadXBlack)
- Beat 2: open oval notehead, stroke-only (`o`, noteheadHalf)
- Beat 3: solid X, dimmed, with parentheses `( )` on either side (`(x)`, ghost)
- Beat 4a: solid X with a chevron `>` above the stem top (`>x`, accent)
- Beat 4b: open oval with a chevron `>` above the stem top (`>o`, accent-open)

---

### SD — all articulations (noteheadBlack, articAccentAbove)

```drums time 4/4
SD |o-(o)->o----|
```

Expected:
- Beat 1: solid filled oval (`o`, noteheadBlack)
- Beat 2: solid filled oval, dimmed, with `( )` (`(o)`, ghost)
- Beat 3: solid filled oval with a chevron `>` above (`>o`, accent)

---

### BD — all articulations (noteheadBlack, articAccentAbove)

```drums time 4/4
BD |o-(o)->o----|
```

Expected:
- Beat 1: solid filled oval (`o`, noteheadBlack)
- Beat 2: solid filled oval, dimmed, with `( )` (`(o)`, ghost)
- Beat 3: solid filled oval with a chevron `>` above (`>o`, accent)

---

### RC — ride cymbal (noteheadXBlack)

```drums time 4/4
RC |x-x-x-x-x-x-x-x-|
```

Expected: solid X noteheads on every eighth, positioned slightly above the
HH row when both lanes are rendered together.

---

### CC — crash cymbal (noteheadCircleX)

```drums time 4/4
CC |x---------------|
```

Expected: X-inside-circle notehead (noteheadCircleX) on beat 1, positioned
above the HH/RC row.

---

### HF — hi-hat foot / pedal (noteheadPlusBlack)

```drums time 4/4
HF |x---x---x---x---|
```

Expected: plus-sign noteheads (noteheadPlusBlack) on each beat, no stem, at
the bottom of the chart.

---

### Toms — HT / MT / FT (noteheadBlack, three vertical positions)

```drums time 4/4
HT |x---x---x---x---|
MT |x---x---x---x---|
FT |x---x---x---x---|
```

Expected: solid filled ovals on each beat.  HT sits slightly above the row
centre, FT slightly below — three clearly distinct vertical positions.

---

### Full kit — one-bar groove covering all instruments

Paste this into Obsidian to see every glyph type on a single chart:

```drums time 4/4
HH |x-x-x-x-x-x-x-x-|
RC |x---------------|
CC |x---------------|
SD |----o-------o---|
BD |o-------o-------|
HT |----------x-----|
MT |------------x---|
FT |--------------x-|
HF |x---x---x---x---|
```

Expected:
- HH row: solid X noteheads (noteheadXBlack)
- RC row: solid X notehead on beat 1, offset above HH
- CC row: circle-X notehead on beat 1, offset above RC
- SD row: solid oval on beats 2 and 4 (noteheadBlack)
- BD row: solid ovals on beats 1 and 3
- HT / MT / FT rows: solid ovals at distinct vertical offsets
- HF row: plus noteheads on each beat, no stem

---

### Accent vs ghost side by side

```drums time 4/4
HH |>x-(x)>o-o--|
SD |>o-(o)-o----|
BD |>o-(o)-o----|
```

Expected:
- Every `>` note has a clearly visible chevron glyph above its stem top
  (articAccentAbove, 24 px font-size should be proportional to the 40 px notehead)
- Every `(x)` / `(o)` note is visibly dimmer and flanked by parentheses

---

### Proportionality check

Render both blocks below and compare side by side to confirm glyph sizing.

Sixteenth-note density (small cells):

```drums time 4/4 subdiv 4
HH |xxxxxxxxxxxxxxxx|
SD |----o-------o---|
BD |o-------o-------|
```

Eighth-note density (larger cells):

```drums time 4/4
HH |x-x-x-x-x-x-x-x-|
SD |----o-------o---|
BD |o-------o-------|
```

Expected: noteheads appear the same physical size in both charts; they
should never be clipped by the cell boundary or overlap adjacent noteheads.
If clipping is visible, increase `CELL_WIDTH` in `src/renderer/constants.ts`
or reduce `.drum-glyph` `font-size` in `styles.css`.
