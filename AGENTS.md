# Drum Notation Plugin — Agent Guide

## Project overview

- Obsidian Community Plugin (TypeScript compiled to bundled `main.js`).
- Renders groove-based drum notation blocks as SVG in markdown.
- Entry point: `src/main.ts`.

## Tooling

- Node.js LTS (18+ recommended)
- Package manager: npm
- Bundler: esbuild (`esbuild.config.mjs`)

## Build commands

```bash
npm install
npm run dev
npm run build
```

## Code structure

```
src/
  main.ts              # Plugin lifecycle
  parser.ts            # Parse drum blocks + headers
  settings.ts          # Plugin settings
  types.ts             # Shared types and notation model
  notation/layout/     # Layout + beam grouping
  renderer/            # SVG rendering pipeline
  renderer/notes/      # Instrument-specific renderers
```

## Current capabilities

- `drums` code block rendering
- Time signature headers (inline or inside block)
- Subdivision overrides (grid/subdiv)
- Beat-aware beam grouping
- SVG subdivision labels

## Current gaps

- Secondary beams for 16ths
- Articulations (ghost, accent, open hat)
- Cymbals and toms
- Playback and export

## Conventions

- Keep `main.ts` minimal (wire up parsing + rendering)
- Split functionality across modules
- Avoid heavy dependencies
- Keep rendering fast and deterministic

## Testing

- Use [TEST_PATTERNS.md](TEST_PATTERNS.md) in an Obsidian note
- Verify labels, beams, and grid alignment for multiple meters

## Release notes

- Release artifacts: `main.js`, `manifest.json`, `styles.css`
- Do not commit build artifacts
