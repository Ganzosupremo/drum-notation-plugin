# Sample kit integration

Playback timing is independent from sound generation. `DrumPlaybackManager` owns the transport, metronome and active audio sources; `PlaybackKitRegistry` supplies the selectable kits.

Users can also configure `Custom · Vault` without editing plugin files. Its one-shot mappings are stored as vault-relative paths in plugin settings, while imported audio is copied into `Drum Notation Samples` at the vault root. Unmapped, deleted, or undecodable files use the synthesized fallback. This separation keeps user audio intact across BRAT updates.

The release includes three offline sample presets: `Acústico · Studio` follows written dynamics with multiple velocity layers, `Acústico · Heavy` favors the strongest kick, snare and tom recordings, and `Acústico · Crispy` raises and tightens the hard snare while selecting a lighter cymbal mix. All three share decoded buffers when the user switches kits.

Register a sample kit before Markdown processors render their controls:

```ts
this.playbackManager.registerKit(new SamplePlaybackKit({
    id: "acoustic-studio",
    label: "Acoustic Studio",
    samples: {
        BD: "samples/acoustic/kick.wav",
        SD: "samples/acoustic/snare.wav",
        "SD:rimshot": "samples/acoustic/snare-rimshot.wav",
        HH: "samples/acoustic/hihat-closed.wav",
        "HH:open": "samples/acoustic/hihat-open.wav",
    },
    loadSample: path => this.app.vault.adapter.readBinary(`${this.manifest.dir}/${path}`),
}));
```

## Mapping keys

- Base instruments: `BD`, `SD`, `HH`, `HF`, `HT`, `MT`, `FT`, `RC`, `CC`, `CH`, and `SP`.
- Techniques: `SD:cross-stick`, `SD:rimshot`, and `RC:bell`.
- Articulation: `HH:open`.
- When a specialized key is absent, playback tries the base instrument.
- When neither sample loads, playback uses the synthesized kit for that hit.

A mapping can be a path, one `SampleLayer`, or multiple velocity layers:

```ts
SD: [
    { url: "samples/snare-soft.wav", maxVelocity: 0.55 },
    { url: "samples/snare-hard.wav", minVelocity: 0.56, gain: 0.9 },
]
```

`gain` adjusts one layer and `playbackRate` tunes it without duplicating the audio asset; the built-in middle and floor tom mappings use this to derive three distinct pitches from two recorded drums.

Samples are decoded once per `AudioContext` and reused by every block. The built-in subset is imported through esbuild's binary loader, which places it inside `main.js`; this is required because BRAT does not install arbitrary additional release assets.

## Bundled sample provenance

The acoustic samples under `assets/audio/cc0-acoustic/` come from `ferrosintesis-samples-drumkit` 0.2.0 and `ferrosintesis-samples-drumkit2` 0.1.0. Their source recordings are Virtuosity Drums by Versilian Studios / Karoryfer Samples plus one china from Karoryfer's Big Rusty Drums. All are dedicated to the public domain under CC0 1.0. The exact notice and license accompany the source assets.
