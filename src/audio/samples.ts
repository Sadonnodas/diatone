// Sample banks. Two instruments, chosen to match what each drill is about:
// guitar (recorded per string+fret, so a fretboard question sounds like the
// exact voicing you're looking at) and piano (chromatic, for harmony).
//
// The mp3s are re-encodes of the Guided Ear Training library — mono VBR
// instead of 320 kbps stereo, which is all a dry single note needs and keeps
// the precached shell around 1.7 MB.

const BASE = import.meta.env.BASE_URL;

/** MIDI pitch of each open string. 1 = high E … 6 = low E (matches scaleData). */
export const OPEN_MIDI: Record<number, number> = { 1: 64, 2: 59, 3: 55, 4: 50, 5: 45, 6: 40 };

// Recorded ranges. Anything outside is reached by shifting the nearest sample;
// we only ever do that by a semitone or two, which is inaudible.
const GUITAR_MAX_FRET = 12;
// Wide enough to cover the chord band, its root doubled an octave down (from
// MIDI 36), and every fretted note the interval drill can produce — so
// choosing piano never means a shifted sample.
const PIANO_LOW = 36;
const PIANO_HIGH = 79;
// Only the octave that sits under the chord band — a bass note is always
// root − 12, so 36..47 covers every key.
const BASS_LOW = 34;
const BASS_HIGH = 48;

/** A sample plus the playback rate that lands it on the wanted pitch. */
export interface SampleRef {
  url: string;
  rate: number;
}

const rateFor = (semitones: number): number => (semitones === 0 ? 1 : Math.pow(2, semitones / 12));

/**
 * The exact recording for a fretted note. Frets past the recorded 12th shift
 * that string's 12th-fret sample up — same string, same character.
 */
export function guitarAt(string: number, fret: number): SampleRef {
  const f = Math.min(Math.max(fret, 0), GUITAR_MAX_FRET);
  return { url: `${BASE}samples/guitar/${string}-${f}.mp3`, rate: rateFor(fret - f) };
}

/**
 * A pitch, played on guitar. Prefers the thickest string that can reach it in
 * the recorded range, so it sounds fretted rather than shifted. Used for notes
 * that aren't on the board — the "what you answered" side of a comparison.
 */
export function guitarMidi(midi: number): SampleRef {
  for (let string = 6; string >= 1; string--) {
    const fret = midi - OPEN_MIDI[string];
    if (fret >= 0 && fret <= GUITAR_MAX_FRET) return guitarAt(string, fret);
  }
  // Below the low E or above the recorded top — shift from the nearest edge.
  if (midi < OPEN_MIDI[6]) return { url: `${BASE}samples/guitar/6-0.mp3`, rate: rateFor(midi - OPEN_MIDI[6]) };
  const top = OPEN_MIDI[1] + GUITAR_MAX_FRET;
  return { url: `${BASE}samples/guitar/1-12.mp3`, rate: rateFor(midi - top) };
}

/** A pitch, played on piano. */
export function pianoMidi(midi: number): SampleRef {
  const nearest = Math.min(Math.max(Math.round(midi), PIANO_LOW), PIANO_HIGH);
  return { url: `${BASE}samples/piano/P_${nearest}.mp3`, rate: rateFor(midi - nearest) };
}

/**
 * A pitch, on bass. Its own instrument rather than a low piano note: the
 * chord band starts at C3 and a triad on its own reads as thin and high, so
 * the bottom octave is a real bass doubling the root.
 */
export function bassMidi(midi: number): SampleRef {
  const nearest = Math.min(Math.max(Math.round(midi), BASS_LOW), BASS_HIGH);
  return { url: `${BASE}samples/bass/B_${nearest}.mp3`, rate: rateFor(midi - nearest) };
}
