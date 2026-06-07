# Diatone — Build Spec (greenfield, mobile-first PWA)

This is a **self-contained build spec** for a fresh project. There is no existing
codebase to copy from — everything needed (data, parser, display rules) is inline
in this document. Build it from scratch.

**Diatone** is a phone-first drill for Roman-numeral ↔ chord fluency across all 12
major keys. **Goal in one line:** read a prompt, answer in a couple of taps with no
keyboard, see instant feedback, repeat — installable to the home screen and fully
usable offline. The name comes from *diatonic* harmony, which is the whole app.

Target platform: a static **GitHub Pages** site, added to the iPhone/Android home
screen so it behaves like a native app, fully usable with no internet connection.

---

## 0. Non-negotiables (read first)

1. **Fully client-side.** No backend, no API calls, no network at runtime. All data
   is bundled. This is what makes offline trivial.
2. **Installable + offline.** Web app manifest + service worker precaching the whole
   app shell. After first load, it must run with airplane mode on.
3. **GitHub Pages base path.** The single most common deploy failure. The app is
   served from `https://<user>.github.io/<repo>/`, so Vite needs `base: '/<repo>/'`
   and the manifest `start_url`/`scope` and SW registration must respect that base.
   Get this right early or every asset 404s on Pages while working fine locally.
4. **Spam-friendly answering.** The whole loop — read prompt, answer, see result,
   next — should be doable in a couple of taps with the keyboard never (or barely)
   appearing. See §17 for the recommended tap-to-build input.
5. **Music theory must be exact.** Enharmonic spellings matter (E# in F# major,
   Cb in Gb major, etc.). The data in §6 is authoritative — use it verbatim.

---

## 1. Tech stack

- **Vite + React + TypeScript** — fast builds, clean PWA story.
- **`vite-plugin-pwa`** — generates the manifest + Workbox service worker, handles
  precaching for offline. Strongly preferred over hand-rolling a service worker.
- **Tailwind CSS** with a custom dark theme — see §1.5 for the full token set. The app
  is **dark-only**; do not build a light theme.
- **Fonts:** `Fraunces` (display) + `Hanken Grotesk` (UI), loaded from Google Fonts.
- **State:** `useState` + `useReducer` only. No Redux/Zustand — the scope is small.
- **No router.** One screen + a slide-up settings sheet.

TypeScript is recommended over plain JS because the parser, seed model, and chord
data benefit a lot from types — but the logic below is given in plain JS and ports
trivially.

---

## 1.5 Visual design — dark, editorial, premium

Dark-only by intent (a night-practice tool). The look is **editorial-meets-utility**:
a near-black canvas where the chord/numeral is treated like fine typesetting — set in
a high-contrast serif at large size — while the controls stay utilitarian in a clean
grotesque. That contrast is the signature. A reference mockup of the play screen ships
alongside this spec (`diatone_mockup.html`); reproduce its feel.

**Premium-not-cheap rules:** depth comes from *surface lightness steps* and hairline
borders, never drop shadows. No gradient decoration, no neon/glow on controls. The
accent is used *scarcely* (selected state, streak, links) so it stays intentional —
the semantic feedback colours, not the accent, carry correct/incorrect.

Design tokens (CSS variables; wire into Tailwind's theme):

```css
:root {
  /* surfaces — depth via lightness, not shadow */
  --bg:          #0A0C10;  /* app canvas */
  --surface-1:   #13171E;  /* sheets, cards */
  --surface-2:   #1A202A;  /* keys, raised elements */
  --surface-3:   #262F3D;  /* pressed / hover */
  --line:        rgba(255,255,255,.07);  /* default hairline */
  --line-strong: rgba(255,255,255,.14);  /* emphasis hairline */
  /* text — never pure white (glare at night) */
  --text:        #EAEDF2;
  --text-2:      #929AA7;
  --text-3:      #586271;
  /* accent — iris/periwinkle, deliberately off-green so it never
     competes with the "correct" colour */
  --accent:      #9B8CFF;
  --accent-deep: #7E6EF0;  /* fills / active */
  --accent-dim:  rgba(155,140,255,.13);  /* selected-key bg */
  /* semantic feedback — soft, not stoplight */
  --correct:     #5FE0A0;  --correct-dim: rgba(95,224,160,.13);
  --wrong:       #F2767F;  --wrong-dim:   rgba(242,118,127,.13);
  /* shape */
  --radius:      14px;     /* keys, cards; pills for toggles */
  --font-display:'Fraunces', Georgia, serif;
  --font-ui:     'Hanken Grotesk', system-ui, sans-serif;
}
```

Usage:
- **Hero prompt / chord / numeral, wordmark:** `--font-display`, large, with
  `font-variation-settings: "opsz" 144` at hero size for max optical contrast.
- **Everything else** (keypad letters, labels, captions, buttons): `--font-ui`.
- **Atmosphere (subliminal only):** one faint radial accent glow behind the hero
  (~8–10% opacity) + ~4% film-grain overlay (`feTurbulence` data-URI). No other effects.
- **Keys:** `--surface-2` bg, 0.5px `--line-strong` border, `--radius`; pressed →
  `--surface-3` + `scale(.95)`; selected root → `--accent` text, accent-tinted border,
  `--accent-dim` bg.
- **Motion:** ~80 ms ease press-scale; ~500 ms very-subtle bg tint on feedback;
  staggered fade-up on screen load via per-element `animation-delay` (one orchestrated
  entrance beats scattered micro-animations).
- **`color-scheme: dark`** on `:root` so native form controls, scrollbars, and the iOS
  status bar render dark.

> **Glyph rendering caveat:** verify the chosen fonts render the jazz quality glyphs
> `△` (U+25B3), `ø` (U+00F8), `°` (U+00B0) consistently. `°`/`ø` are safe; `△` is the
> risky one. If it renders inconsistently, draw the quality glyphs as small styled
> spans / SVG rather than relying on font coverage.

---

## 2. GitHub Pages + PWA + offline (the deployment-critical part)

### 2.1 Vite base path
In `vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const REPO = 'diatone'; // <-- your repo name

export default defineConfig({
  base: `/${REPO}/`,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Diatone',
        short_name: 'Diatone',
        description: 'Roman-numeral ↔ chord drill in all 12 major keys.',
        start_url: `/${REPO}/`,
        scope: `/${REPO}/`,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0A0C10',   // app canvas (§1.5)
        theme_color: '#0A0C10',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // App is fully static — precache everything so it runs offline.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: `/${REPO}/index.html`
      }
    })
  ]
});
```

> If you ever move this to a *user* page (`<user>.github.io` with no subpath),
> change `base`, `start_url`, and `scope` back to `/`.

### 2.2 iOS home-screen support
iOS Safari ignores some manifest fields, so add these to `index.html`:

```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Diatone" />
<link rel="apple-touch-icon" href="/diatone/apple-touch-icon.png" />
<meta name="theme-color" content="#0A0C10" />
<meta name="color-scheme" content="dark" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Hanken+Grotesk:wght@400;500;600&display=swap" rel="stylesheet" />
```

`viewport-fit=cover` + `env(safe-area-inset-*)` padding keeps controls clear of the
notch/home indicator in standalone mode.

> **Offline + fonts:** the Google Fonts `<link>` is a network dependency. For true
> offline use, **self-host the two font families** (drop the `.woff2` files in the
> project and `@font-face` them) so the service worker precaches them — otherwise the
> first offline launch falls back to the system serif/sans. The `globPatterns` in
> §2.1 already include `woff2`.

### 2.3 Icons
Provide a single square source (≥512×512) and generate `icon-192`, `icon-512`,
`icon-512-maskable`, `apple-touch-icon` (180×180), and `favicon.ico`. For maskable,
keep the glyph inside the central ~80% safe zone so Android's mask doesn't clip it.

> **Mark suggestion:** a single serif glyph on the `--bg` canvas in `--accent` — e.g.
> a large `△` (the maj7 symbol) or a stacked `iv`/`I`. Flat, one colour, no gradient.
> Keep it consistent with the editorial-serif identity (§1.5).

### 2.4 Deploy via GitHub Actions
`.github/workflows/deploy.yml` — builds and publishes to Pages on push to `main`:

```yaml
name: Deploy
on:
  push: { branches: [main] }
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages, url: '${{ steps.deployment.outputs.page_url }}' }
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Then in the repo: **Settings → Pages → Source: GitHub Actions**.

### 2.5 Offline verification (acceptance)
- Load the site once with network on.
- Turn on airplane mode (or DevTools → Offline).
- Reload → app still opens, all modes playable, no asset 404s.
- Updating: `registerType: 'autoUpdate'` swaps the SW on next load; no manual
  refresh prompt needed.

---

## 3. Project structure (suggested)

```
diatone/
├─ public/
│  ├─ icons/ (icon-192.png, icon-512.png, icon-512-maskable.png)
│  ├─ fonts/ (self-hosted Fraunces + Hanken Grotesk .woff2 — see §2.2)
│  ├─ apple-touch-icon.png
│  └─ favicon.ico
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx                  # one-screen shell + settings sheet
│  ├─ lib/
│  │  ├─ chordData.ts          # §6 — the 13-key table, verbatim
│  │  ├─ patterns.ts           # §7 — COMMON_PATTERNS.Major
│  │  ├─ jazz.ts               # §8 chordToJazz / progressionToJazz, §9 display7th
│  │  ├─ normalize.ts          # §10 the parser
│  │  └─ engine.ts             # pickSeed / isSeedValid / buildQuestionFromSeed
│  ├─ state/
│  │  └─ trainerReducer.ts     # settings + seed + feedback + history
│  ├─ components/
│  │  ├─ Prompt.tsx
│  │  ├─ AnswerInput.tsx       # tap-to-build (§17) and/or text + palette (§11)
│  │  ├─ Feedback.tsx
│  │  ├─ SettingsSheet.tsx
│  │  └─ Review.tsx
│  └─ index.css                # tailwind
├─ index.html
├─ vite.config.ts
└─ .github/workflows/deploy.yml
```

Everything in `src/lib/` is pure and unit-testable with no DOM. Build and test that
layer first.

---

## 4. Build plan (phased — good order for Claude Code)

1. **Scaffold** Vite + React + TS + Tailwind. Confirm `npm run dev` works.
2. **Pure logic layer** (`src/lib/*`): paste `chordData`, `COMMON_PATTERNS`,
   `normalize`, `display7th`, jazz substitution, and the seed engine. Write a few
   tests against §15's checklist *before* any UI. This is the riskiest correctness
   work — nail it in isolation.
3. **Minimal play loop:** render a prompt from a seed, accept a typed answer,
   show correct/incorrect, Next Question. No settings yet — hardcode keys
   `['C','G','F']`, modes `[1,4]`, triads.
4. **Tap-to-build input** (§17) replacing/augmenting the text field.
5. **Settings sheet** (§3 settings) with the seed-rebuild behavior (§5/§13).
6. **Review** history (§12).
7. **PWA wiring** (§2): manifest, SW, icons, base path. Verify offline + install.
8. **Polish:** big prompt text, streak counter, auto-advance, safe-area padding.

---

## 5. Notation conventions

- Prompts always render in **jazz chart form** (`A-7`, `C△7`, `Bø7`).
- The parser also accepts standard textbook form on input (`Am7`, `Cmaj7`, `Bm7b5`).
- There is **no** "standard vs jazz" toggle — display is always jazz, input accepts
  both. Don't add the toggle.
- Always **major keys only**. No minor-key data in this version.

---

## 6. Core data — `chordData` (use verbatim)

Each major key has a `triads` form and a `sevenths` form. Numerals are identical
across all keys (diatonic to the major scale). Enharmonic spellings are deliberate
and correct — do not "simplify" them.

> **Confirmed verbatim against the original `useChordTrainer.js`.** This table is
> the source of truth; copy it exactly.

> Note: 13 entries are listed for 12 pitch classes — **F# and Gb are both included
> on purpose**. The original Setup presents 12 keys on a circle-of-fifths wheel
> (using **F#** at the 6-sharp position) and offers **Gb** separately as an
> "Enharmonic Keys" extra. Treat them as two distinct selectable keys.

```js
export const chordData = {
  'C':  { triads:   { chords: ['C','Dm','Em','F','G','Am','Bdim'],
                      numerals: ['I','ii','iii','IV','V','vi','vii°'] },
          sevenths: { chords: ['Cmaj7','Dm7','Em7','Fmaj7','G7','Am7','Bm7b5'],
                      numerals: ['I','ii','iii','IV','V','vi','vii°'] } },

  'G':  { triads:   { chords: ['G','Am','Bm','C','D','Em','F#dim'],
                      numerals: ['I','ii','iii','IV','V','vi','vii°'] },
          sevenths: { chords: ['Gmaj7','Am7','Bm7','Cmaj7','D7','Em7','F#m7b5'],
                      numerals: ['I','ii','iii','IV','V','vi','vii°'] } },

  'D':  { triads:   { chords: ['D','Em','F#m','G','A','Bm','C#dim'],
                      numerals: ['I','ii','iii','IV','V','vi','vii°'] },
          sevenths: { chords: ['Dmaj7','Em7','F#m7','Gmaj7','A7','Bm7','C#m7b5'],
                      numerals: ['I','ii','iii','IV','V','vi','vii°'] } },

  'A':  { triads:   { chords: ['A','Bm','C#m','D','E','F#m','G#dim'],
                      numerals: ['I','ii','iii','IV','V','vi','vii°'] },
          sevenths: { chords: ['Amaj7','Bm7','C#m7','Dmaj7','E7','F#m7','G#m7b5'],
                      numerals: ['I','ii','iii','IV','V','vi','vii°'] } },

  'E':  { triads:   { chords: ['E','F#m','G#m','A','B','C#m','D#dim'],
                      numerals: ['I','ii','iii','IV','V','vi','vii°'] },
          sevenths: { chords: ['Emaj7','F#m7','G#m7','Amaj7','B7','C#m7','D#m7b5'],
                      numerals: ['I','ii','iii','IV','V','vi','vii°'] } },

  'B':  { triads:   { chords: ['B','C#m','D#m','E','F#','G#m','A#dim'],
                      numerals: ['I','ii','iii','IV','V','vi','vii°'] },
          sevenths: { chords: ['Bmaj7','C#m7','D#m7','Emaj7','F#7','G#m7','A#m7b5'],
                      numerals: ['I','ii','iii','IV','V','vi','vii°'] } },

  'F#': { triads:   { chords: ['F#','G#m','A#m','B','C#','D#m','E#dim'],
                      numerals: ['I','ii','iii','IV','V','vi','vii°'] },
          sevenths: { chords: ['F#maj7','G#m7','A#m7','Bmaj7','C#7','D#m7','E#m7b5'],
                      numerals: ['I','ii','iii','IV','V','vi','vii°'] } },

  'Gb': { triads:   { chords: ['Gb','Abm','Bbm','Cb','Db','Ebm','Fdim'],
                      numerals: ['I','ii','iii','IV','V','vi','vii°'] },
          sevenths: { chords: ['Gbmaj7','Abm7','Bbm7','Cbmaj7','Db7','Ebm7','Fm7b5'],
                      numerals: ['I','ii','iii','IV','V','vi','vii°'] } },

  'Db': { triads:   { chords: ['Db','Ebm','Fm','Gb','Ab','Bbm','Cdim'],
                      numerals: ['I','ii','iii','IV','V','vi','vii°'] },
          sevenths: { chords: ['Dbmaj7','Ebm7','Fm7','Gbmaj7','Ab7','Bbm7','Cm7b5'],
                      numerals: ['I','ii','iii','IV','V','vi','vii°'] } },

  'Ab': { triads:   { chords: ['Ab','Bbm','Cm','Db','Eb','Fm','Gdim'],
                      numerals: ['I','ii','iii','IV','V','vi','vii°'] },
          sevenths: { chords: ['Abmaj7','Bbm7','Cm7','Dbmaj7','Eb7','Fm7','Gm7b5'],
                      numerals: ['I','ii','iii','IV','V','vi','vii°'] } },

  'Eb': { triads:   { chords: ['Eb','Fm','Gm','Ab','Bb','Cm','Ddim'],
                      numerals: ['I','ii','iii','IV','V','vi','vii°'] },
          sevenths: { chords: ['Ebmaj7','Fm7','Gm7','Abmaj7','Bb7','Cm7','Dm7b5'],
                      numerals: ['I','ii','iii','IV','V','vi','vii°'] } },

  'Bb': { triads:   { chords: ['Bb','Cm','Dm','Eb','F','Gm','Adim'],
                      numerals: ['I','ii','iii','IV','V','vi','vii°'] },
          sevenths: { chords: ['Bbmaj7','Cm7','Dm7','Ebmaj7','F7','Gm7','Am7b5'],
                      numerals: ['I','ii','iii','IV','V','vi','vii°'] } },

  'F':  { triads:   { chords: ['F','Gm','Am','Bb','C','Dm','Edim'],
                      numerals: ['I','ii','iii','IV','V','vi','vii°'] },
          sevenths: { chords: ['Fmaj7','Gm7','Am7','Bbmaj7','C7','Dm7','Em7b5'],
                      numerals: ['I','ii','iii','IV','V','vi','vii°'] } },
};
```

Default selected keys: `['C','G','F']`.

---

## 7. Common progressions — `COMMON_PATTERNS.Major` (verbatim from source)

Used by modes 2 (Progression) and 3 (Transpose). A pattern is a list of numerals
(matching §6). These are the **exact ten** from the original — use them as-is, this
is the source of truth:

```js
export const COMMON_PATTERNS = {
  Major: [
    ['I', 'V', 'vi', 'IV'], ['I', 'IV', 'V', 'IV'], ['vi', 'IV', 'I', 'V'], ['I', 'vi', 'ii', 'V'],
    ['I', 'iii', 'vi', 'IV'], ['ii', 'V', 'I', 'vi'], ['I', 'V', 'ii', 'IV'],
    ['vi', 'ii', 'V', 'I'], ['I', 'IV', 'vi', 'V'], ['iii', 'vi', 'IV', 'V'],
  ],
};
```

> Pattern matching is case/°-insensitive: the builder finds each pattern entry by
> `numerals.findIndex(kn => kn.toLowerCase().replace('°','') === n.toLowerCase().replace('°',''))`.
> So a pattern written `['ii','V','I','vi']` resolves correctly against the stored
> `['I','ii','iii','IV','V','vi','vii°']` regardless of case.

> The original also defines a `COMMON_PATTERNS.Minor` set. This version is
> **major-only** — leave Minor out (it's in §20, out of scope).

---

## 8. Game modes

| Mode | ID | Prompt example | Student answers |
|---|---|---|---|
| **Name Chord** | 1 | `In G, what is the chord for: V` | `D` (triad) / `D7` i.e. `D-7` etc. (tetrad) |
| **Name Numeral** | 4 | `In G, what is the numeral for: A-` | `vi` (triad) / `vi-7` etc. (tetrad) |
| **Progression** | 2 | `In G, what are the chords for: I VI II V` | `G Em Am D` |
| **Transpose** | 3 | `Transpose from C to G: C A- D- G` | `G Em Am D` |

- Mode 3 requires **≥ 2 selected keys** (a source and a different target). Drop
  mode 3 from rotation if only one key is selected.
- Default selected modes: `[1, 4]`.

---

## 9. Settings (user-configurable)

| Setting | Type | Default | Effect |
|---|---|---|---|
| `selectedKeys` | string[] | `['C','G','F']` | Pool of major keys (13 available, §6). |
| `selectedModes` | int[] | `[1, 4]` | Which modes are in rotation. |
| `use7thChords` | bool | `false` | Triads (3-note) vs tetrads / 7-chords. |
| `degreeToggles` | record | all `true` | Which scale degrees (I…vii°) are eligible. |
| `generationMethod` | `'random' \| 'weighted'` | `'weighted'` | Equal vs frequency-weighted. |
| `majorWeights` | int[7] | `[10,6,4,8,10,8,2]` | Per-degree sliders 0–10 (weighted mode). |
| `hideQuality` | bool | `false` | Strip quality from numerals (→ I, II, VI…); prompt asks for "triad"/"tetrad". |
| `autoAdvance` | bool | `true` | Advance ~1.5 s after a correct answer. |

The two most-used toggles are `hideQuality` and `use7thChords` — make them reachable
in **one tap**, not buried in the sheet (e.g. as pills on the main screen).

### Exact initialization (from the original `handleStart`)
```js
const initialSettings = {
  selectedKeys: ['C', 'G', 'F'],
  selectedModes: [1, 4],
  use7thChords: false,
  generationMethod: 'weighted',
  majorWeights: [10, 6, 4, 8, 10, 8, 2],
  degreeToggles: { I: true, ii: true, iii: true, IV: true, V: true, vi: true, 'vii°': true },
  autoAdvance: true,
  hideQuality: false,
};
```

> **`degreeToggles` key order is load-bearing.** `degreeIndex` (0–6) maps to
> `Object.keys(degreeToggles)` order, which must stay `I, ii, iii, IV, V, vi, vii°`
> to line up with the `chords`/`numerals` arrays. Don't reorder or rename these keys.

In the settings UI, the per-degree weight sliders and degree toggles relabel in
7-chord mode using:
```js
const scaleDegreeNames = {
  triads:   ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'],
  sevenths: ['Imaj7', 'iim7', 'iiim7', 'IVmaj7', 'V7', 'vim7', 'viiø7'],
};
```

---

## 10. Question generation — the seed pattern

A question is identified by a **seed** of random choices. The visible question is
*derived* from `seed + settings`.

```js
{
  key,          // 'G'
  mode,         // 1 | 2 | 3 | 4
  degreeIndex,  // 0..6   (modes 1 & 4)
  basePattern,  // ['I','V','vi','IV']  (modes 2 & 3)
  keyTo         // 'D'    (mode 3 only)
}
```

**Key architectural rule:** toggling a setting (`use7thChords`, `hideQuality`, …)
**rebuilds the same seed's question** with the new settings — it does **not** roll a
fresh random question. Only **Next Question**, or invalidating the seed, rolls anew.

A seed becomes invalid when:
- `seed.key` is no longer in `selectedKeys`
- `seed.mode` is no longer in `selectedModes`
- `seed.degreeIndex`'s degree is no longer enabled (modes 1, 4)
- `seed.keyTo` is no longer in `selectedKeys` (mode 3)

On invalidation, automatically roll a fresh seed.

### Selection logic
- Modes 1 & 4: pick `degreeIndex` from enabled degrees — weighted by `majorWeights`
  (weighted mode) or uniform (random mode).
- Modes 2 & 3: pick a random pattern from `COMMON_PATTERNS.Major`.
- Mode 3: pick `keyTo` from `selectedKeys` minus the source key.
- Drop mode 3 from the pool when only one key is selected.

### Verbatim engine (port directly — logic must not change)

```js
const pickSeed = (settings) => {
  const { selectedKeys, selectedModes, majorWeights, degreeToggles, generationMethod } = settings;
  if (selectedKeys.length === 0 || selectedModes.length === 0) return null;

  const availableDegreeIndexes = Object.keys(degreeToggles)
    .map((deg, i) => (degreeToggles[deg] ? i : -1))
    .filter((i) => i !== -1);
  if (availableDegreeIndexes.length === 0) return null;

  // Mode 3 needs ≥2 keys; drop it otherwise so we don't loop picking a target.
  const usableModes = selectedModes.filter((m) => m !== 3 || selectedKeys.length >= 2);
  if (usableModes.length === 0) return null;

  const key = selectedKeys[Math.floor(Math.random() * selectedKeys.length)];
  const mode = usableModes[Math.floor(Math.random() * usableModes.length)];

  let selectionPool = [];
  if (generationMethod === 'random') {
    selectionPool = availableDegreeIndexes;
  } else {
    availableDegreeIndexes.forEach((index) => {
      for (let i = 0; i < majorWeights[index]; i++) selectionPool.push(index);
    });
  }
  if (selectionPool.length === 0) return null;

  const seed = { key, mode, degreeIndex: selectionPool[Math.floor(Math.random() * selectionPool.length)] };
  if (mode === 2 || mode === 3) {
    const basePatterns = COMMON_PATTERNS['Major'];
    seed.basePattern = basePatterns[Math.floor(Math.random() * basePatterns.length)];
  }
  if (mode === 3) {
    const otherKeys = selectedKeys.filter((k) => k !== key);
    seed.keyTo = otherKeys[Math.floor(Math.random() * otherKeys.length)];
  }
  return seed;
};

const isSeedValid = (seed, settings) => {
  if (!seed || !settings) return false;
  if (!settings.selectedKeys.includes(seed.key)) return false;
  if (!settings.selectedModes.includes(seed.mode)) return false;
  if (seed.mode === 3 && (!seed.keyTo || !settings.selectedKeys.includes(seed.keyTo))) return false;
  if (seed.mode === 1 || seed.mode === 4) {
    const degree = Object.keys(settings.degreeToggles)[seed.degreeIndex];
    if (!settings.degreeToggles[degree]) return false;
  }
  return true;
};
```

> Note the weighted pool: a degree with weight `0` is *eligible but never picked*
> (it contributes zero entries to `selectionPool`). In `random` mode every enabled
> degree is equally likely regardless of weight.

### Prompt object shape (drives rendering)

`buildQuestionFromSeed(seed, settings)` returns `{ prompt, answer, key, mode, reminder, seed }`
where `prompt` is:

```js
{
  text: "In {key}, what is the chord for:",   // template with placeholders
  keys: ['G'],                                // fills {key} occurrences in order
  chordType: 'triad' | 'tetrad',              // fills {chordType} (hideQuality only)
  content: 'V'                                 // the chord(s)/numeral(s), space-separated
}
```

The renderer splits `text` on `/(\{key\}|\{chordType\})/` and styles each token:
`{key}` → highlight/yellow + bold; `{chordType}` → indigo + bold (so "triad"/"tetrad"
stands out in hide-quality mode). `content` is split on spaces and each token rendered
through the jazz `ChordDisplay`. Mode templates:

- Mode 1: `"In {key}, what is the chord for:"` — or hideQuality:
  `"In {key}, what is the {chordType} chord for:"`
- Mode 4: `"In {key}, what is the numeral for:"` (hideQuality does **not** apply here)
- Mode 2: `"In {key}, what are the chords for:"` — or hideQuality:
  `"In {key}, what are the {chordType} chords for:"`
- Mode 3: `"Transpose from {key} to {key}:"` (two `{key}` tokens → `keys: [from, to]`)

---

## 11. Displaying numerals — `display7th()`

In 7-chord mode, the stored numerals (`'I'`, `'ii'`, …) display with their 7th quality:

| Stored | 7-mode display | After jazz substitution |
|---|---|---|
| I | `Imaj7` | `I△7` |
| ii | `iim7` | `ii-7` |
| iii | `iiim7` | `iii-7` |
| IV | `IVmaj7` | `IV△7` |
| V | `V7` | `V7` |
| vi | `vim7` | `vi-7` |
| vii° | `viiø7` | `viiø7` (already jazz) |

Rule: lowercase root → `m7`; uppercase root → `maj7` **except `V` → `7`**; `°` → `ø7`.
Exact functions from source:

```js
// Used when hideQuality is ON: strip quality, bare degree only (I, II, …, VII).
const neutralizeNumeral = (numeral) => numeral.toUpperCase().replace('°', '').replace('ø', '');

// Used when hideQuality is OFF in 7-chord mode: attach the proper 7th quality.
// (Triad mode returns the numeral unchanged.) The later progressionToJazz pass
// converts maj7→△7 and m7→-7 for display.
const display7th = (numeral) => {
  if (!use7thChords) return numeral;
  const base = numeral.replace('°', '');
  if (numeral.includes('°')) return base + 'ø7';                       // vii° → viiø7
  if (base === base.toUpperCase()) return base + (base === 'V' ? '7' : 'maj7'); // I→Imaj7, V→V7
  return base + 'm7';                                                  // ii→iim7
};
```

When **hideQuality** is on, drop the quality suffix entirely — show `I, II, III, IV,
V, VI, VII` (via `neutralizeNumeral`). The prompt then asks for the **"triad"** or
**"tetrad"** chord so the student knows the type, and `{chordType}` is highlighted in
the prompt text.

> Mode 4 (Name Numeral) does **not** apply hideQuality — its prompt is a chord name,
> not a numeral.

---

## 12. Displaying chords — jazz substitution

Data stores chords in standard form (`Cmaj7`, `Am7`, `Bm7b5`). Before display,
substitute the trailing suffix. The original uses **two near-identical maps** for
two call sites — keep both:

```js
// (1) Used by ChordDisplay (the visual prompt renderer). Includes the '7' no-op.
const JAZZ_SYMBOLS = { 'm': '-', 'maj7': '△7', 'm7': '-7', 'dim': '°', 'm7b5': 'ø7', '7': '7' };

// (2) Used to convert the stored canonical answer string to jazz so the
//     "Correct answer" line matches the prompt's notation.
const STANDARD_TO_JAZZ = { m7b5: 'ø7', maj7: '△7', m7: '-7', dim: '°', m: '-' };
const STANDARD_TO_JAZZ_KEYS = Object.keys(STANDARD_TO_JAZZ).sort((a, b) => b.length - a.length);

const chordToJazz = (chord) => {
  for (const suf of STANDARD_TO_JAZZ_KEYS) {
    if (chord.endsWith(suf)) return chord.slice(0, -suf.length) + STANDARD_TO_JAZZ[suf];
  }
  return chord;
};
const progressionToJazz = (progression) => progression.split(' ').map(chordToJazz).join(' ');
```

Both iterate suffixes **by length descending** so `m7b5` matches before `m7` before
`m`. Replace the matching trailing suffix only, then stop (one substitution per chord).

Apply this to:
- The **prompt content** (chord names in modes 3 & 4, numerals in modes 1 & 2),
  via `ChordDisplay`.
- The **stored canonical answer** (`answer = progressionToJazz(answer)` in the
  builder), so the "Correct answer" shown after a wrong submission matches the
  prompt's notation.

The substitution is **one-directional** (standard → jazz). Anything already jazz
(`viiø7` from `display7th`) passes through untouched.

---

## 13. Answer normalization — the parser (most important to get right)

Accepts a wide range of input forms and reduces them to a canonical string for
comparison. **Order matters.**

```js
export function normalize(str) {
  return str
    .toLowerCase()
    .replace(/\(([^)]*)\)/g, '$1')            // strip parens: m7(b5) → m7b5
    .replace(/♯/g, '#')                        // Unicode → ASCII
    .replace(/♭/g, 'b')
    .replace(/ø7?/g, 'm7b5')                   // ø or ø7 → m7b5
    .replace(/[△Δ]7?/g, 'maj7')                // △ or △7 → maj7
    .replace(/°/g, 'dim')                      // ° → dim
    .replace(/([a-g][#b]?)-/g, '$1m')          // A-7 → Am7, Bb- → Bbm
    .replace(/(i{1,3}|iv|vi{0,2}|v)-(?=\d|b)/g, '$1m')  // vi-7 → vim7, vii-7b5 → viim7b5
    .replace(/(i{1,3}|iv|vi{0,2}|v)7b5/g, '$1m7b5')     // vii7b5 → viim7b5 (b5 ⇒ half-dim)
    .replace(/min/g, 'm')                      // Amin7 → Am7, iimin7 → iim7
    .replace(/[,\s]+/g, ' ')                   // commas/whitespace → single separator
    .trim();
}
```

Compare answers as `normalize(userInput) === normalize(canonicalAnswer)`. For
multi-chord modes, normalize joins on single spaces so a space- or comma-separated
list compares cleanly.

**Don't include `-` in the separator regex** — it's meaningful inside chord names.

### Strictness (do NOT add forgiveness)
- 7-mode is **strict on the `7`**: `V` for a `V7` answer is **wrong**. The type of
  7th carries theory meaning.
- `vii°` is **never** accepted for a `viiø7` question — fully-diminished triad vs
  half-diminished 7th are different qualities.

### Accepted equivalences

| Canonical | Also accepted |
|---|---|
| `Am7` | `Am7`, `A-7`, `Amin7` |
| `Bm7b5` | `Bm7b5`, `B-7b5`, `Bm7(b5)`, `B-7(b5)`, `Bø7`, `Bø` |
| `Cmaj7` | `Cmaj7`, `C△7`, `CΔ7` |
| `Bdim` | `Bdim`, `B°` |
| `F#m7b5` | `F#m7b5`, `F♯m7b5`, `F#-7b5`, `F#ø7` |
| `iim7` | `iim7`, `ii-7`, `iimin7` |
| `viiø7` (= `viim7b5`) | `viiø7`, `viim7b5`, `viim7(b5)`, `vii-7b5`, `vii7b5` |
| `V7` | `V7` only (strict in 7-mode) |

---

## 14. Hints / reminder strings

Show a small italic hint under the prompt while answering (hide once feedback shows).
Depends on mode + `use7thChords`:

```
Mode 1 / 2 / 3, triad:    Triad mode. Forms: C • Am (or A-) • Bdim (or B°).
Mode 1 / 2 / 3, 7-chord:  7-chord mode. Forms: Cmaj7 (or C△7) • Am7 (or A-7) • Bm7b5 (or B-7b5 or Bø7).
Mode 4, triad:            Roman numeral with quality. Examples: I • ii • IV • vi • vii°. Case matters.
Mode 4, 7-chord:          Examples: Imaj7 (or I△7) • iim7 (or ii-7 or iimin7) • V7 • viiø7 (or viim7b5 or vii-7b5 or vii7b5).
```

Use `•` between examples and `(or X)` for alternates.

---

## 15. Review

After a few questions, the student can step backward through history. Each entry
shows:
- The original prompt (key, content, mode)
- The student's typed answer
- Right/wrong (✓ / ✗)
- The canonical correct answer **in jazz notation**, matching the prompt's display

Same-notation display on both sides is essential for self-teaching.

---

## 16. Behavior subtleties (bake in from the start)

- **Settings change ≠ new question.** A toggle rebuilds the *current* seed's display;
  it never rolls a fresh random question.
- **Clear stale feedback on any settings change.** If feedback like "Incorrect. The
  answer was: X" is showing and a setting is toggled, the prompt updates but the old
  feedback becomes misleading — clear it.
- **Don't reset `userAnswer` on settings change** — keep what they've typed. Only
  the *feedback* clears.
- **Case-sensitive numerals matter** (V ≠ v) for teaching. The parser lowercases for
  comparison because the data is major-keys-only (lowercase is unambiguous here). If
  minor keys are ever added, revisit this.

---

## 17. Answer input — chromatic tap-to-build (the mobile input model)

**This replaces the original free-text field + symbol palette entirely.** The OS
keyboard never opens during play. Instead the student *composes* the answer from a
small, fixed alphabet of buttons. This is **compositional, not enumerative**: there
are ~60 possible chord answers and ~28 numeral answers across the app, but you never
show a button per answer — every answer has the shape `[root|degree][accidental?][quality]`,
so ~13 controls spell all of them.

**The root row is always fully chromatic (all 7 letters + accidentals), never
narrowed to the in-key notes.** That is the whole pedagogical point: the student must
associate the *key* with its *chords/numerals* and produce the correct enharmonic
spelling from nothing. Narrowing roots to the diatonic set, or offering multiple
choice, collapses recall into recognition — explicitly **not wanted**.

### Validation stays unchanged
The builder assembles a plain string and compares with the existing parser:
`normalizeAnswer(built) === normalizeAnswer(currentQuestion.answer)`. Nothing in §13
changes — the builder is just a keyboard-free front-end to the same validator.

### Commit-on-quality
A chord/numeral is always *finished* by its quality, so **the quality tap doubles as
Submit** — there is no separate Submit button. Tap flow:
- **Name Chord (1):** root → (accidental) → quality = answered. 2–3 taps.
- **Name Numeral (4):** degree → quality = answered. 2 taps.
- **Progression / Transpose (2, 3):** same chord builder feeding an N-slot chip strip
  (N = `basePattern.length`, currently always 4); each quality tap commits the active
  slot and advances; auto-submit when the last slot fills.

### Button groups

Chord modes (1, 2, 3):
- **Root row:** `C D E F G A B` (always all seven).
- **Accidental row:** `♭` `♯` — modify the currently-selected root; tapping the active
  one again clears it (natural). Tap a different letter to replace the root. This is
  how the spelling-sensitive roots are produced: `E`+`♯` → `E#`, `C`+`♭` → `Cb`,
  `F`+`♯` → `F#`. (No double accidentals are ever needed; major-key diatonic chords
  top out at one sharp/flat.)
- **Quality row (triad):** `maj` (no suffix) · `-` (minor) · `°` (dim).
- **Quality row (7th):** `△7` (maj7) · `-7` (m7) · `7` (dom7) · `ø7` (m7b5).

Numeral mode (4):
- **Degree row:** `I II III IV V VI VII` — shown neutral (uppercase); the **quality
  button sets the case**, so the degree buttons themselves don't give away major/minor.
- **Quality row (triad):** `maj` → uppercase, no suffix · `min` → lowercase ·
  `dim` → lowercase + `°`.
- **Quality row (7th):** `maj7` → uppercase + `maj7` · `m7` → lowercase + `m7` ·
  `7` → uppercase + `7` · `ø7` → lowercase + `ø7`.

> Picking the "wrong" quality for a degree produces a wrong-but-gradable answer
> (e.g. degree V + `maj7` → `Vmaj7`, which fails against `V7`). That's correct — the
> student is meant to recall that V is dominant, not major-7.

### Token assembly (compare vs display)
Each quality carries two suffixes: an **ascii** form (for the compare string) and a
**glyph/display** form (jazz, for the live preview and committed chips). Roots compare
with ascii accidentals (`#`/`b`) and display with `♯`/`♭`.

| Mode | Taps | Builds (ascii → compare) | Shows (display) | Canonical answer |
|---|---|---|---|---|
| 1 triad ("V in G") | `D`,`maj` | `D` | `D` | `D` ✓ |
| 1 triad ("vii° in G") | `F`,`♯`,`°` | `F#dim` | `F#°` | `F#dim` ✓ |
| 1 7th ("V7 in G") | `D`,`7` | `D7` | `D7` | `D7` ✓ |
| 1 7th ("viiø7 in G") | `F`,`♯`,`ø7` | `F#m7b5` | `F#ø7` | `F#m7b5` ✓ |
| 4 triad ("A- in G") | `VI`,`min` | `vi` | `vi` | `vi` ✓ |
| 4 triad ("F#° in G") | `VII`,`dim` | `vii°` | `vii°` | `vii°` ✓ |
| 4 7th ("A-7 in G") | `II`,`m7` | `iim7` | `ii-7` | `iim7` ✓ |
| 4 7th ("F#ø7 in G") | `VII`,`ø7` | `viiø7` | `viiø7` | `viiø7` ✓ |

All compares pass through `normalizeAnswer` on both sides, so ascii (`F#m7b5`) and the
canonical answer match regardless of jazz vs standard form.

### Backspace / clear
- Single modes: a `⌫` clears the in-progress root/accidental (or degree). Once a
  quality is tapped the answer is committed and feedback shows.
- Progression: `⌫` removes the last committed chip and reactivates that slot.

### Advance flow (ties into §18)
With no keyboard, the existing autoAdvance / Enter-to-advance becomes
**tap-anywhere-to-advance**: correct + autoAdvance → next after ~1.5 s; otherwise the
✓/✗ line + a `next question →` affordance (or a tap on the prompt) rolls the next seed.
A streak counter and a per-question tap count reinforce the spam-drill loop.

> A working interactive mockup of this builder was produced during design — Claude
> Code should reproduce its behavior: chromatic root row, accidental toggle, quality
> commits, live jazz preview, chip strip for progressions.

---

## 18. Mobile-first UX (lessons from real testing)

1. **Big prompt text** — readable at arm's length while a hand is on the guitar.
2. **Top-half layout** — prompt + answer fit above where the keyboard would be.
   Don't pin Submit to the very bottom; it gets covered (and with tap-to-build the
   keyboard shouldn't appear at all).
3. **Settings = bottom sheet** that slides up, with a clear "Done" — not a side
   drawer.
4. **Promote `hideQuality` and `use7thChords`** to one-tap pills on the main screen.
5. **Don't auto-focus** the text input on load (it pops the keyboard prematurely).
   Auto-focus only after Next Question, and only in text mode.
6. **≥44 px tap targets**, well spaced, with safe-area-inset padding in standalone.
7. **Auto-advance** ~1.5 s after correct (configurable); consider an instant
   "Enter/tap to advance" for fast drilling.

### Answer + advance flow (exact behavior from source)
This loop is what makes spam-drilling feel good — replicate it precisely:

- **Submitting** runs `normalizeAnswer(userInput) === normalizeAnswer(currentQuestion.answer)`.
  Submitting is **locked once feedback is showing** (`if (feedback || ...) return;`) so
  a double-tap can't double-count.
- **Correct + `autoAdvance` on** → show "Correct!", then auto-roll the next question
  after **1500 ms**.
- **Incorrect, or `autoAdvance` off** → show feedback and a **Next Question** button;
  pressing **Enter** also advances (global keydown: `if (Enter && feedback && (!autoAdvance || !wasCorrect)) generateNewQuestion()`).
- **On any settings change:** clear the feedback string and the pending auto-advance
  timer, but **keep `userAnswer`** (don't wipe what they typed). The prompt rebuilds
  from the same seed via the derived `currentQuestion`.
- **Focus:** auto-focus the text input only when not showing feedback and not
  reviewing — i.e. after a new question loads. (For tap-to-build, skip focus so the
  keyboard never opens.)

> For maximum drill speed with the recommended tap-to-build input (§17): auto-submit
> the instant a complete answer is assembled, show ✓/✗, and on ✗ let a single tap
> anywhere advance. That collapses the loop to two taps per question with no keyboard.

---

## 19. Acceptance test checklist

Logic:
- [ ] V in F (triad) accepts `C`, rejects `C7`.
- [ ] V7 in F (7-chord) accepts `C7`; rejects `C`, `Cm7`, `Cmaj7`.
- [ ] vii in C (triad) shows `vii°`; accepts `Bdim`, `B°`.
- [ ] viiø7 in C (7-chord) shows `viiø7`; accepts `Bm7b5`, `B-7b5`, `Bm7(b5)`,
      `B-7(b5)`, `Bø7`; rejects `Bdim`, `B°`, `Bdim7`.
- [ ] Mode 4 with `Cmaj7` shown accepts `Imaj7`, `I△7`, `IΔ7`; rejects `I`, `I7`.
- [ ] Mode 4 with `F#m7b5` shown (key G, 7-chord) accepts `viiø7`, `viim7b5`,
      `vii-7b5`, `vii7b5`, `viim7(b5)`; rejects `vii°`, `vii`, `vii7`.

Behavior:
- [ ] Toggling `use7thChords` mid-question rebuilds the *same* question (same key,
      same degree) — does not roll a new random question.
- [ ] Toggling `hideQuality` mid-question hides quality and switches prompt wording
      to "triad"/"tetrad"; same seed.
- [ ] Disabling the current question's key auto-picks a fresh seed.
- [ ] Review shows previous prompt + typed answer + correct answer in jazz notation.
- [ ] After feedback, toggling any setting clears the feedback message but keeps the
      typed answer.

Input — chromatic tap-to-build (§17):
- [ ] Root row always shows all 7 letters `C D E F G A B`, never narrowed to the key.
- [ ] `E`+`♯` builds `E#`, `C`+`♭` builds `Cb`; spelling is graded (so `Gb` answer is
      not satisfied by building `F#`).
- [ ] Tapping the active accidental again clears it; tapping a new root replaces it.
- [ ] Quality tap commits and submits (no separate Submit button); single-chord answer
      reachable in 2–3 taps with the OS keyboard never opening.
- [ ] Numeral mode: degree buttons are neutral; `min`/`dim`/`m7`/`ø7` lowercase the
      result, `maj`/`maj7`/`7` keep it uppercase. `V`+`maj7` (= `Vmaj7`) is graded wrong
      vs `V7`.
- [ ] Progression mode fills a 4-slot chip strip, auto-submits when full; `⌫` removes
      the last committed chip.
- [ ] Built string is validated via `normalizeAnswer(built) === normalizeAnswer(answer)`
      (same parser as §13), e.g. built `F#m7b5` matches canonical `F#m7b5` and displays `F#ø7`.

PWA / offline:
- [ ] Installs to home screen on iOS and Android (icon, standalone, no browser chrome).
- [ ] After one online load, fully playable in airplane mode (no asset 404s).
- [ ] No network requests at runtime.
- [ ] Assets load correctly from the `/<repo>/` base path on GitHub Pages.

---

## 20. Out of scope (don't build)

- Presets (saving/loading named configurations).
- Practice-log / journal integration.
- Routines / externally-driven challenge sequences.
- Any `onProgressUpdate`/external score callback.
- Minor keys, modal interchange, secondary dominants (this version is major-only).

> **Kept (in scope):** the circle-of-fifths key picker from the original Setup screen
> stays — reuse a similar 12-position wheel with `Gb` offered separately as the
> enharmonic extra (see §6). It can live on a setup view or in the settings sheet; it
> does not need to be a heavy two-screen flow.
