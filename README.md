# Drum Notation Plugin for Obsidian

Write drum grooves as musical positions or token grids and render them as responsive SVG drum notation. Version 2 uses a shared timeline, upper/lower voices, chord stems, beat-aware beams, percussion clef, time signature, and automatic system wrapping.

## Position syntax (recommended)

````md
```drums
meter: 4/4
HH: eighths; open: 4&; accent: 1, 3
SD: 2, 4; ghost: 3a
BD: 1, 2&, 3
```
````

Positions use beat numbers plus optional `e`, `&`, or `a`. Separate measures with `|`:

```text
SD: 2, 4 | 1&, 3
```

Available presets are `quarters`, `eighths`, `sixteenths`, and `triplets`. Articulation clauses are `open:`, `accent:`, `ghost:`, and `normal:`.

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

Each token consumes one cell. Whitespace is only visual grouping, `.` is a rest, and `|` is a measure boundary. Supported note tokens include `x`, `o`, `>x`, `>o`, `(x)`, `(o)`, and `~`.

`grid: 8`, `grid: 16`, and `grid: triplets` mean two, four, and three cells per pulse respectively.

## Display directives

Directives can be placed inside a block:

```text
style: standard    # standard, compact, or practice
count: true        # show 1 e & a labels
labels: true       # show the instrument legend
feel: swing
```

The renderer displays percussion clef and time signature by default. It wraps one to four measures per system according to the available width; mobile layouts use one measure per system.

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
