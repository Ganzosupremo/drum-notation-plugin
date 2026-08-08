# Drum Notation Plugin — Agent Guide

## Project overview

- Obsidian Community Plugin written in TypeScript and bundled to `main.js`.
- Renders v2 position syntax and explicit token grids as responsive SVG drum notation.
- Entry point: `src/main.ts`.

## Commands

```bash
npm install
npx playwright install chromium
npm run check
npm run package
```

## Active architecture

```text
src/main.ts                         Obsidian lifecycle and processor
src/notation/parseDocument.ts       v2 position/grid parser
src/notation/directives.ts          meter, grid, feel and hairpin headers
src/notation/rhythm.ts              per-voice timelines, rests and beams
src/notation/engravingLayout.ts     responsive notation columns and systems
src/renderer/renderDocument.ts      stable renderer facade
src/renderer/engraving.ts           SVG music engraving
src/renderer/renderDiagnostics.ts   source-aware diagnostics panel
```

## Conventions

- Keep `main.ts` minimal and keep musical logic out of the Obsidian lifecycle.
- Do not reintroduce the removed legacy pattern model or renderer.
- Avoid heavy runtime dependencies; development-only visual tooling is acceptable.
- Keep rendering deterministic and destroy observers/listeners in plugin lifecycle cleanup.
- Do not commit generated `main.js`, `release/`, `.visual-test/`, or Playwright reports.

## Testing and release

- Unit tests cover parser, timeline, layout, SVG structure and SMuFL declarations.
- Playwright snapshots use bundled Bravura in pinned Chromium across themes and responsive widths.
- Manual Obsidian checks live in `TEST_PATTERNS.md` and cover Live Preview and Reading View.
- Release artifacts are `main.js`, `manifest.json`, `styles.css`, and `Bravura.woff2`.
