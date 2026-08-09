# Drum Notation Renderer for Obsidian

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

## Extended kit and techniques

China (`CH`) and splash (`SP`) are first-class cymbals. Techniques and ornaments can be written compactly:

```drums
4/4
S: cs1 rs2 f3 d3a rr4
R: 8ths b1 b3
CH: 1 3
SP: 2& 4&
```

`cs`, `rs`, and `b` mean cross-stick, rimshot, and ride bell. `f`, `d`, and `rr` mean flam, drag, and roll. Long clauses such as `cross-stick: 1`, `bell: 3`, and `flam: 2` are equivalent. Repeat a position to combine features, for example `S: >2 f2` for an accented flam.

Grid mode accepts `cs`, `rs`, `b`, `f`, `d`, and `rr` as single-cell tokens. Techniques are validated against the instrument: cross-stick/rimshot belong to SD and bell belongs to RC.

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
positions: CH=-7, SP=-6, SD=-1  # half-space steps from the middle line
```

Regular simple meters group beams by pulse, 5/4 defaults to `3+2`, and compound meters use groups of three eighth-note units. Primary beams may cross short internal rests, while larger rests and grouping boundaries break them. Simple-meter triplets show a `3`; compound pulses are treated as natural ternary groups.

The renderer displays percussion clef and time signature by default. Musical elements at the same tick share a column, and spacing expands for dense rhythms, ghosts, flags, dots, and rests. Systems are justified to the pane width, contain at most four measures, and use one measure below 520 px. An overfull dense measure keeps its readable natural width and can scroll horizontally.

Diagnostics appear inside the rendered block with the exact source token highlighted. Deterministic corrections can be copied as a corrected block. The plugin never changes the note automatically.

## Development and release

```bash
npm install
npx playwright install chromium
npm run check
npm run package
```

`npm run package` stages the three Obsidian release assets (`main.js`, `manifest.json`, and a self-contained `styles.css`) in `release/`. Bravura is embedded in the packaged CSS, so mobile installs work offline without a separate font file. The command also creates `drum-notation-renderer-mobile.zip`, ready to extract into `.obsidian/plugins/` on Android, iPhone, or iPad. Generated artifacts are not committed. Unit tests cover parsing, rhythm and layout; Playwright snapshots cover Chromium rendering at mobile, tablet and desktop widths in both themes.

Playback, MIDI, visual editing, and image/PDF export are outside the current scope.
