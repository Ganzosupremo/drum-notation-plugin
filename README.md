# Drum Notation Plugin for Obsidian

Write drum grooves as musical positions or token grids and render them as responsive SVG drum notation. Version 2 uses a shared timeline, upper/lower voices, chord stems, beat-aware beams, percussion clef, time signature, and automatic system wrapping.

## Position syntax (recommended)

````md
```drums
4/4
H: 8ths o4& >1 >3
S: 2 4 (3a)
K: 1 2& 3
```
````

Positions use beat numbers plus optional `e`, `&`, or `a`. Separate measures with `|`:

```text
S: 2 4 | 1& 3
```

Instrument aliases are `H` (HH), `R` (RC), `C` (CC), `S` (SD), `K` (BD), `P` (HF), and `T1`/`T2`/`T3` (HT/MT/FT). Presets may be written as `4ths`, `8ths`, `16ths`, or `tri`; the long names remain valid.

Compact decorations are `>1` for an accent, `(3a)` for a ghost, `o4&` for an open hi-hat, and `>o4&` for accent plus open. They can decorate a preset attack or create an attack at that position. Commas and spaces are interchangeable. The equivalent long form (`meter:`, canonical instruments, semicolon clauses, and long preset names) remains fully supported.

Repeat the previous measure of one instrument with `%`, or add `xN` to produce `N` total copies of a segment (1–64):

```text
R: 8ths >1 >3 x2
S: 2 4 (3a) | %
K: 1 2& 3 | % x2
```

The renderer derives a complete rhythm for each voice. Position events last until the next onset in that voice or the end of the current pulse; leading and empty-pulse rests are written automatically. Upper and lower voices remain independent.

## Token grid

Use a grid when every subdivision needs to be visible in the source:

````md
```drums
meter: 4/4
grid: 16
HH | x . x .  x . x o  x . x .  x . x . |
SD | . . . .  o . . .  . . . .  >o . (o) . |
BD | o . . .  . . o .  o . . .  . o . . |
```
````

Each token consumes one cell. Whitespace is only visual grouping, `.` means no new attack, and `|` is a measure boundary. The rhythm engine joins the space until the next attack into a readable note value; only `~` requests an explicit held duration. Supported note tokens include `x`, `o`, `>x`, `>o`, `(x)`, `(o)`, and `~`.

`grid: 8`, `grid: 16`, and `grid: triplets` mean two, four, and three cells per pulse respectively.

## Display directives

Directives can be placed inside a block:

```text
style: standard    # standard, compact, or practice
count: true        # show 1 e & a labels
labels: true       # show the instrument legend
feel: swing
grouping: 3+2      # optional beam grouping; values must add up to the meter numerator
```

Regular simple meters group beams by pulse, 5/4 defaults to `3+2`, and compound meters use groups of three eighth-note units. Primary beams may cross short internal rests, while larger rests and grouping boundaries break them. Simple-meter triplets show a `3`; compound pulses are treated as natural ternary groups.

The renderer displays percussion clef and time signature by default. Musical elements at the same tick share a column, and spacing expands for dense rhythms, ghosts, flags, dots, and rests. Systems are justified to the pane width, contain at most four measures, and use one measure below 520 px. An overfull dense measure keeps its readable natural width and can scroll horizontally.

## Legacy blocks

Existing compact blocks continue to render:

````md
```drums
HH |x-x-x-x-x-x-x-x-|
SD |----o-------o---|
BD |o-------o-------|
```
````

When all hits fall on alternating cells, version 2 interprets this convention as eighth notes instead of sixteenths. A non-blocking migration notice recommends adding an explicit grid or converting to position syntax. The plugin never rewrites vault notes.

## Development and release

```bash
npm install
npm test
npm run lint
npm run build
```

Release files are `main.js`, `manifest.json`, `styles.css`, and `Bravura.woff2`. Generated `main.js` is uploaded with releases and is not committed.

Playback, MIDI, visual editing, and image/PDF export are outside the current scope.

## Future improvements

- Cross-stick, rimshot, cymbal bell, china, splash, flams, drags, and rolls.
- Localized diagnostics with exact source highlighting and copyable migrations.
- Removal of the compatibility renderer after the legacy transition.
- Browser-based visual regression tests for glyphs, clipping, themes, and scale.
