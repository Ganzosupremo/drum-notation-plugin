# Drum notation v2 visual checks

Paste these blocks into Obsidian and verify them in Live Preview and Reading View.

## Compact syntax and repeats

```drums
4/4
R: 8ths >1 >3 x2
S: 2 4 (3a) | %
K: 1 2& 3 | %
```

Expected: the bare meter and aliases are accepted, the ride accents and snare ghost render in both measures, and `%`/`x2` produce the same repeated groove without warnings.

## Position syntax and shared stems

```drums
meter: 4/4
HH: eighths; open: 4&; accent: 1, 3
SD: 2, 4; ghost: 3a
BD: 1, 2&, 3
```

Expected: HH and SD events at the same tick share an upper stem; BD uses the lower voice. Clef and 4/4 are visible, counting is hidden.

## Extended kit, techniques and ornaments

```drums
4/4
S: cs1 rs2 f3 d3a rr4
R: 8ths b1 b3
CH: 1 3
SP: 2& 4&
```

Expected: cross-stick uses an X head, rimshot has its slash, ride bells use diamond heads, flam has one grace note, drag has two, and the roll has three tremolo strokes. China and splash remain separate cymbal voices without clipping.

## Configurable staff positions

```drums
4/4
positions: CH=-9, SP=-7, SD=0, BD=4
CH: 1 3
SP: 2 4
S: 2 4
K: 1 3
```

Expected: the block overrides global positions, ledger lines remain local, and the viewBox expands to contain the relocated instruments.

## Voice rhythm and conventional rests

```drums
meter: 4/4
RC: eighths; accent: 1, 3 | eighths
SD: 2, 4; ghost: 3a | 2, 4; ghost: 2a, 3a
BD: 1, 2&, 3 | 1, 2&, 3, 3a
```

Expected: only the first measure has ride accents; ghost notes remain in their own measure. The lower voice shows a quarter on beat 1, an eighth rest plus offbeat kick on beat 2, and does not inherit the `3a` duration for earlier notes.

## Explicit grouping and beam rests

```drums
meter: 5/4
grouping: 2+3
HH: eighths
SD: 2, 4
BD: 1, 3, 5
```

Expected: beams do not cross the `2+3` boundary. Short internal rests may sit beneath a continuous primary beam; stems and secondary hooks remain local.

## Sixteenth token grid

```drums
meter: 4/4
grid: 16
style: practice
HH | x . x .  x . x o  x . x .  x . x . |
SD | . . . .  o . . .  . . . .  >o . (o) . |
BD | o . . .  . . o .  o . . .  . o . . |
```

Expected: `1 e & a` is visible, dense attacks receive secondary beams, isolated flags use music glyphs, the open HH has a circle, and accents/ghosts remain visible. Empty cells do not create a forest of rests.

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

## Dense adaptive spacing

```drums
4/4
style: practice
H: 16ths o4& >1 >2 >3 >4
S: (1e) (1a) 2 (2a) (3e) 4 (4a)
K: 1 1a 2& 3 3a 4&
```

Expected: all voices and count labels align in shared columns; ghost parentheses, flags, dots, accents, and the open marker do not collide. In a narrow pane the measure keeps its natural width and the block scrolls horizontally.

## Partial-error rendering

```drums
meter: 4/4
grid: 8
HH | x . x | x . x . x . x . |
SD | . . o . o . . . | . . o . . . o . |
```

Expected: a precise length warning for the first HH measure while valid events and the second measure still render.

## In-block source diagnostics

```drums
4/4
S: cs1 rs1 2 4
H: b1
```

Expected: the rendered block highlights `rs1` as a technique conflict and `b1` as unsupported on HH. The affected measure is tinted while the remaining attacks still render.

## Theme and scaling

Repeat the checks in Live Preview and Reading View using this matrix:

- Light and dark themes.
- Narrow pane below 520 px, tablet around 768 px, and desktop at 1200 px or wider.
- Notation scale at 80%, 100%, and 150%.
- Styles `standard`, `compact`, and `practice`.

Confirm that no notehead, articulation, clef, count label, tuplet, diagnostic, or lower-voice stem is clipped. Mobile must use one measure per system, desktop systems must never exceed four, and dense measures must scroll horizontally instead of compressing collisions.
## Playback and metronome

```drums
tempo: 100
4/4
H: 8ths o4&
S: 2 4 (3a)
K: 1 2& 3
```

Expected: the Kit selector shows `Sintetizado`, `Acústico · Studio`, `Acústico · Heavy`, and `Acústico · Crispy`. Use the speaker beside the selector to audition all four. The Crispy kit should have a bright, tight snare without overpowering the kick. The acoustic kits must load before playback, use a real open hi-hat sample at `4&`, and remain audible after disconnecting the device from the network. Play starts an accented metronome voice on beat 1, the cursor crosses the measure, BPM changes restart playback at the new speed, and stop silences scheduled audio. Disabling Metronome leaves the drum part audible. Starting another rendered block stops this one. Repeat in Reading View and Live Preview on desktop and mobile.

In plugin settings, confirm that each instrument has a 0%-150% playback-volume slider. Defaults must show BD/SD at 100%, HH at 45%, and RC at 50%. Set HH to 0% and verify that it is silent while SD/BD remain audible; then use the section reset button and verify all defaults are restored. Repeat with both an acoustic kit and `Sintetizado`.

Change `Metronome volume`, then audition several combinations with the speaker buttons beside `Metronome first beat` and `Metronome regular beats`. Include high/low bongo, cowbell and conga pairs, then set volume to 0% and restart Obsidian.

Expected: previews and notation playback use the selected voices and level. The first pulse differs from regular pulses, 0% fully mutes the metronome without muting the drum kit, and all three values persist after restart. Resetting volume restores 65%; new installations default to high/low woodblock.

### Custom vault kit

Add wav and flac one-shots to the vault. In plugin settings, map kick, snare, closed/open hi-hat, and ride using `Choose audio…`; preview each mapping with its speaker button. Use the import button on another row to select a file outside the vault, then select `Custom · Vault` in a rendered block and use the kit audition button.

Expected: imported files appear under `Drum Notation Samples`, duplicate filenames receive a numeric suffix, settings persist after restart, and mapped instruments use the selected recordings. Unmapped instruments and deleted or unreadable files use synthesized fallback. Clearing one mapping affects only that sound; clearing all mappings leaves the custom kit fully synthesized. Confirm the files remain after a BRAT update on desktop and mobile.
