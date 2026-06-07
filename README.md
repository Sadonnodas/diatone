# Diatone

A phone-first drill for **Roman-numeral ↔ chord fluency** across all 12 major
keys. Read a prompt, answer in a couple of taps with no keyboard, get instant
feedback, repeat. Installable to the home screen and fully usable offline.

**Live:** https://sadonnodas.github.io/diatone/

The name comes from *diatonic* harmony — which is the whole app.

## Features

- **Four modes** — Name Chord, Name Numeral, Progression, Transpose.
- **Chromatic tap-to-build input** — compose any answer from ~13 buttons; the OS
  keyboard never opens. Roots are always fully chromatic, so you produce the
  correct enharmonic spelling from recall (E♯ in F♯, C♭ in G♭, …).
- **Triads or 7th chords**, jazz notation throughout (`A-7`, `C△7`, `Bø7`); the
  parser also accepts textbook forms (`Am7`, `Cmaj7`, `Bm7b5`).
- **Weighted or equal** degree selection, per-degree weight sliders, hide-quality
  mode, auto-advance, streak counter, and a backward review of every answer.
- **Installable PWA** — works fully offline after the first load (self-hosted
  fonts, precached app shell).
- **Dark, editorial design** — high-contrast serif for the chord/numeral, clean
  grotesque for controls.

## Tech

Vite + React + TypeScript, Tailwind v4, `vite-plugin-pwa` (Workbox). All logic
(chord data, parser, seed engine) is pure and unit-tested with Vitest.

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
