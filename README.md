# Drum Notation Plugin for Obsidian

Groove-oriented drum notation renderer for Obsidian. This plugin turns fenced `drums` code blocks into scalable SVG notation that is optimized for fast readability and mobile use.

## What it is

- A custom drum notation engine focused on groove charts (not classical engraving).
- SVG-based rendering with a modular layout and renderer pipeline.
- Beat-aware beam grouping and subdivision labels that adapt to the time signature.
- Designed for worship, modern session charts, and Obsidian-based workflows.

## What it is not

- Not a full engraving engine like MuseScore or Sibelius.
- Not a MIDI or playback system (visual only for now).

## Usage

Write a `drums` code block in any note:

```md
```drums
HH |x-x-x-x-x-x-x-x-|
SD |----o-------o---|
BD |o-------o-o-----|
```
```

### Time signature (header or inline)

Header line inside the block:

```md
```drums
time: 6/8
HH |x-x-x-x-x-x-|
SD |----o---o---|
BD |o-----o-----|
```
```

Inline header on the code fence:

```md
```drums time 6/8
HH |x-x-x-x-x-x-|
SD |----o---o---|
BD |o-----o-----|
```
```

### Subdivision override

Force the subdivision mode per beat when needed:

```md
```drums time 4/4 subdiv 4
HH |x-xx-xx-xx-xx-xx-xx-xx-xx-|
SD |----o-------o-------o----|
BD |o-----o---o-----o---------|
```
```

Supported header keys:
- `time`, `timesig`, `timesignature`, `meter`, `ts`
- `beats`, `beatsperbar`, `beats-per-bar`, `bpb`
- `subdivisions`, `subdivision`, `subdiv`, `grid`, `resolution`

Supported subdivision values:
- `2`, `3`, `4`
- `8`, `8ths`, `eighths`
- `16`, `16ths`, `sixteenths`
- `triplet`, `triplets`

## Settings

- **Beats per bar**: default time signature numerator used for beam grouping when no header is provided.

## Development

Install dependencies:

```bash
npm install
```

Start watch build:

```bash
npm run dev
```

Production build:

```bash
npm run build
```

## Manual install

Copy the release artifacts into your vault:

```
<Vault>/.obsidian/plugins/<plugin-id>/
  main.js
  manifest.json
  styles.css
```

## License

See LICENSE.
