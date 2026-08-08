# Drum notation v2 visual checks

Paste these blocks into Obsidian and verify them in Live Preview and Reading View.

## Position syntax and shared stems

```drums
meter: 4/4
HH: eighths; open: 4&; accent: 1, 3
SD: 2, 4; ghost: 3a
BD: 1, 2&, 3
```

Expected: HH and SD events at the same tick share an upper stem; BD uses the lower voice. Clef and 4/4 are visible, counting is hidden.

## Sixteenth token grid

```drums
meter: 4/4
grid: 16
style: practice
HH | x . x .  x . x o  x . x .  x . x . |
SD | . . . .  o . . .  . . . .  >o . (o) . |
BD | o . . .  . . o .  o . . .  . o . . |
```

Expected: `1 e & a` is visible, sixteenths receive secondary beams, the open HH has a circle, and accents/ghosts remain visible.

## Compound meter

```drums
meter: 6/8
HH: triplets
SD: 1a, 2a
BD: 1, 2&
```

Expected: two compound pulses, three subdivisions per pulse, and 6/8 time signature.

## Multiple responsive measures

```drums
meter: 4/4
HH: eighths | eighths | eighths | eighths
SD: 2, 4 | 2, 4 | 2, 4 | 2, 4
BD: 1, 3 | 1, 3& | 1, 3 | 1, 2&, 3
```

Expected: one system on a wide desktop when space permits, fewer measures per system as the pane narrows, and one per system on mobile.

## Partial-error rendering

```drums
meter: 4/4
grid: 8
HH | x . x | x . x . x . x . |
SD | . . o . o . . . | . . o . . . o . |
```

Expected: a precise length warning for the first HH measure while valid events and the second measure still render.

## Legacy migration

```drums
HH |x-x-x-x-x-x-x-x-|
SD |----o-------o---|
BD |o-------o-------|
```

Expected: rendered as eighth notes with one migration warning, not as a sixteenth grid.

## Theme and scaling

Repeat the checks in light/dark themes and at 80%, 100%, and 150% notation scale. No notehead, articulation, clef, or lower-voice stem should be clipped.
