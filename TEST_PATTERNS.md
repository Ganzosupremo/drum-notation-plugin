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
