# Voice Overtone Analyzer

A browser-based practice and research tool for **sustained drones**, **overtone singing**, and **binaural beats**.

Pipeline: **Voice → frequency → harmonics → resonance → time → subjective experience**

This is **not** a “magical consciousness frequency” finder. It measures and visualizes acoustic signals so you can practice, compare sessions, and keep subjective notes.

## Stack

- Vite + React + TypeScript
- Web Audio API (`AnalyserNode`, oscillators, `MediaRecorder`)
- YIN pitch detection for sustained tones
- Canvas realtime visuals (waveform, spectrum, spectrogram)
- IndexedDB (`idb`) for recordings + session logs
- No backend

## Quick start

```bash
cd voice-overtone-analyzer
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

Production build:

```bash
npm run build
npm run preview
```

## Microphone notes

- The browser will ask for **microphone permission**. Deny → analysis cannot run.
- Capture uses `echoCancellation` / `noiseSuppression` / `autoGainControl` **off** for more accurate pitch and spectrum.
- Prefer a quiet room and a consistent mic distance for drones.
- When playing the **reference drone** or **binaural beats**, wear **headphones** so playback does not leak into the mic (feedback / false harmonics).

## Headphones (binaural beats)

Binaural beats need **stereo headphones**. The left and right ears receive slightly different carrier frequencies; the beat is the *difference* you perceive, not a third tone in the air. The binaural panel is visually and conceptually separate from the vocal fundamental (f₀) display.

## Feature overview

| # | Feature | What it does |
|---|---------|----------------|
| 1 | Microphone input | Live capture + clear permission UX |
| 2 | Waveform | Oscilloscope of the mic signal |
| 3 | Fundamental (Hz) | Large f₀ readout via YIN |
| 4 | Musical note | Hz → note + octave (e.g. E2) |
| 5 | Cents / stability | Cents offset + pitch-over-time graph |
| 6 | Frequency spectrum | Live spectrum bars (hero visual) |
| 7 | Harmonic analyzer | Levels at n×f₀; reports strongest harmonic |
| 8 | Spectrogram | Time × frequency waterfall |
| 9 | Formants | Vocal-tract resonance peaks (≠ f₀ / ≠ harmonics) |
| 10 | Reference / drone | Musical tuning tone; optional 4–8 Hz amplitude modulation |
| 11 | Recording | Mic audio + timestamped metrics; review with alignment |
| 12 | Subjective state log | Post-session form; persists in IndexedDB |
| 13 | Binaural beats | Adjustable carriers + beat; Delta→Gamma presets |

### Formants vs fundamental vs harmonics

- **Fundamental (f₀)** — vocal-fold vibration rate (what you “sing as pitch”).
- **Harmonics** — integer multiples of f₀ (2f₀, 3f₀, …) from the voice *source*.
- **Formants** — resonances of the vocal *tract* (filter). They are not required to sit on harmonics; shaping the mouth moves formants and can amplify selected overtones (overtone singing).

### Reference drone / Theta AM

The optional Theta-band control applies **amplitude modulation** (roughly 4–8 Hz) to an audible musical drone. It does **not** mean you can sing 6 Hz with your vocal folds. Adult speaking/singing f₀ is typically on the order of ~80–300 Hz.

## Project layout

```
src/
  audio/          AudioEngine, BinauralGenerator, pitch (YIN), harmonics/formants
  components/     UI panels (spectrum, recording, binaural, …)
  hooks/          useAnalysis
  utils/          music theory helpers, IndexedDB
  App.tsx         Layout wiring all 13 feature areas
```

## Privacy

Everything runs locally in your browser. Recordings and logs stay in IndexedDB on this device — nothing is uploaded.

## License

Use freely for personal practice and research.
