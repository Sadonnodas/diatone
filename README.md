# Diatone

A phone-first drill for **Roman-numeral ↔ chord fluency** across all 12 major
keys. Read a prompt, answer in a couple of taps with no keyboard, get instant
feedback, repeat. Installable to the home screen and fully usable offline.

**Live:** https://sadonnodas.github.io/diatone/

The name comes from *diatonic* harmony — which is the whole app.

## Features

- **Five drills** — Numerals (Name Chord, Name Numeral, Progression, Transpose),
  Fretboard, Intervals, Circle of fifths, Warm-up.
- **Circle of fifths** — the printed chord wheel's layout (majors innermost,
  each relative minor immediately outside it, vii° on the rim) with two drills.
  *Layout* blanks segments and you name them on the keypad. *Key wedge* zooms
  in on one key, turned to the top, and you place its seven chords — or its
  numerals — where they belong.
- **Chromatic tap-to-build input** — compose any answer from ~13 buttons; the OS
  keyboard never opens. Roots are always fully chromatic, so you produce the
  correct enharmonic spelling from recall (E♯ in F♯, C♭ in G♭, …).
- **Triads or 7th chords**, jazz notation throughout (`A-7`, `C△7`, `Bø7`); the
  parser also accepts textbook forms (`Am7`, `Cmaj7`, `Bm7b5`).
- **Weighted or equal** degree selection, per-degree weight sliders, hide-quality
  mode, auto-advance, streak counter, and a backward review of every answer.
- **Hear the answer** — after you answer, the chord (or progression) sounds in
  the right key over a bass root, under the key's home chord so the numeral has
  a reference. Get
  it wrong and you can A/B what you played against what it was. Piano or guitar,
  and switchable off. The Intervals drill does the same with its two notes.
- **Installable PWA** — works fully offline after the first load (self-hosted
  fonts, precached samples and app shell).
- **Dark, editorial design** — high-contrast serif for the chord/numeral, clean
  grotesque for controls.

## Tech

Vite + React + TypeScript, Tailwind v4, `vite-plugin-pwa` (Workbox). All logic
(chord data, parser, seed engine, chord→pitch) is pure and unit-tested with
Vitest. Playback is plain Web Audio over ~1.9 MB of mono samples — no Tone.js;
a drill fires one-shot notes and needs no transport.

## Develop

```bash
npm install
npm run dev      # local dev server
npm test         # run the logic test suite
npm run build    # production build to dist/
npm run preview  # preview the production build (served at /diatone/)
```

## Deploy

Pushing to `main` builds and publishes to GitHub Pages via
`.github/workflows/deploy.yml`. Pages source must be set to **GitHub Actions**.

> Moving to a user page (`<user>.github.io` with no subpath) means changing
> `base` in `vite.config.ts` and the `start_url`/`scope` in the manifest (and the
> hardcoded `/diatone/` paths in `index.html` and `@font-face` rules) back to `/`.

Built from `DIATONE_SPEC.md` — a self-contained build spec.
