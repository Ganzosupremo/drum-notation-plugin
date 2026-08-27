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
tempo: 100                       # playback pulse in BPM (20–300)
```

Regular simple meters group beams by pulse, 5/4 defaults to `3+2`, and compound meters use groups of three eighth-note units. Primary beams may cross short internal rests, while larger rests and grouping boundaries break them. Simple-meter triplets show a `3`; compound pulses are treated as natural ternary groups.

The renderer displays percussion clef and time signature by default. Musical elements at the same tick share a column, and spacing expands for dense rhythms, ghosts, flags, dots, and rests. Systems are justified to the pane width, contain at most four measures, and use one measure below 520 px. An overfull dense measure keeps its readable natural width and can scroll horizontally.

Diagnostics appear inside the rendered block with the exact source token highlighted. Deterministic corrections can be copied as a corrected block. The plugin never changes the note automatically.

## Playback and metronome

Every rendered block includes play/stop, kit, BPM and metronome controls. Four kits are available: `Sintetizado`, `Acústico · Studio`, `Acústico · Heavy`, and `Acústico · Crispy`. The Crispy preset uses a slightly brighter, tighter tuning around the hard snare recording. The speaker beside the kit selector plays a short kit audition. The acoustic presets use embedded CC0 samples, work offline after a BRAT install, and cover kick, snare, cross-stick, closed/open/pedal hi-hat, three tom pitches, ride/bell, crash, china, and splash. Playback follows accents and ghost notes, performs flam/drag/roll ornaments, and delays eighth-note offbeats when `feel: swing` is active. A moving cursor tracks the current position in the score.

Set a block's initial tempo with `tempo: 120` or `bpm: 120`. Changing BPM in the controls affects the current rendered block without rewriting the note. Starting a different block stops the one that is already playing.

Plugin settings include an independent 0%-150% playback volume for every instrument. The default mix keeps kick and snare at 100%, lowers hi-hat to 45% and ride to 50%, and moderates the other cymbals. These levels apply to synthesized and acoustic kits and may be reset together.

The metronome has its own 0%-150% volume control and independent selectors for the accented first beat and regular beats. Available synthesized percussion voices include high/low click, woodblock, cowbell, bongo and conga, plus clave, rimshot and shaker. A speaker button beside each selector previews the exact voice immediately; the default pair is high/low woodblock.

Playback kits are registered independently from the transport. A kit may synthesize audio or load cached samples, provide velocity layers and playback-rate tuning, and override individual sounds with keys such as `SD:rimshot`, `SD:cross-stick`, `RC:bell`, and `HH:open`. Missing or unreadable samples fall back to the synthesized kit so partial kits remain usable. See `SAMPLE_KITS.md` for the integration contract and sample provenance.

## Development and release

```bash
npm install
npx playwright install chromium
npm run check
npm run package
```

`npm run package` stages the three Obsidian release assets (`main.js`, `manifest.json`, and a self-contained `styles.css`) in `release/`. Bravura is embedded in the packaged CSS and the curated drum samples are embedded in `main.js`, because BRAT only installs the three standard plugin files. Mobile and desktop playback therefore work offline without extra assets. The command also creates `drum-notation-renderer-mobile.zip`, ready to extract into `.obsidian/plugins/` on Android, iPhone, or iPad. Generated artifacts are not committed. Unit tests cover parsing, rhythm and layout; Playwright snapshots cover Chromium rendering at mobile, tablet and desktop widths in both themes.

MIDI, visual editing, user-imported sample folders, and image/PDF export are outside the current scope.
