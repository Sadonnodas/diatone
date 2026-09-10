// The shapes a drill plays back. Kept in one place so every game sounds like
// the same app, and so the timings are tunable from a single file.

import { playPhrase, prefetch, type Voice } from './engine';
import { bassMidi, guitarAt, pianoMidi, OPEN_MIDI, type SampleRef } from './samples';
import { sampleFor, type Instrument } from './instrument';

// A chord isn't struck dead flat — a few milliseconds of spread reads as
// played rather than triggered.
const ROLL = 0.016;
// The bass doubles the root an octave down — the same rule Guided Ear
// Training uses, and it keeps the bass clear of the voicing above it.
const BASS_DROP = 12;
const BASS_GAIN = 0.9;
const BASS_LEAD = 0.012; // a hair early, so the bottom arrives first
const BASS_EXTRA_HOLD = 0.2; // rings just past the chord
const CHORD_HOLD = 1.5;
const ANCHOR_HOLD = 0.65;
const ANCHOR_GAIN = 0.45; // clearly context, not the answer
const ANCHOR_GAP = 0.85;
const BEAT = 0.85;

const chordVoices = (
  inst: Instrument,
  notes: number[],
  at: number,
  dur: number,
  gain = 1,
): Voice[] => [
  {
    ref: bassMidi(notes[0] - BASS_DROP),
    at: Math.max(0, at - BASS_LEAD),
    dur: dur + BASS_EXTRA_HOLD,
    gain: gain * BASS_GAIN,
  },
  ...notes.map((midi, i) => ({ ref: sampleFor(inst, midi), at: at + i * ROLL, dur, gain })),
];

/** One chord. With `tonic`, the key's home chord sounds first, underneath. */
export function playChord(
  inst: Instrument,
  notes: number[],
  tonic?: number[] | null,
): Promise<number> {
  if (!tonic) return playPhrase(chordVoices(inst, notes, 0, CHORD_HOLD));
  return playPhrase([
    ...chordVoices(inst, tonic, 0, ANCHOR_HOLD, ANCHOR_GAIN),
    ...chordVoices(inst, notes, ANCHOR_GAP, CHORD_HOLD),
  ]);
}

/** A progression, in time. The last chord rings on. */
export function playProgression(inst: Instrument, chords: number[][]): Promise<number> {
  const voices = chords.flatMap((notes, i) =>
    chordVoices(inst, notes, i * BEAT, i === chords.length - 1 ? CHORD_HOLD : BEAT - 0.05),
  );
  return playPhrase(voices);
}

const NOTE_HOLD = 0.5;
const TOGETHER_AT = 1.25;

/**
 * Two notes: low then high, then both together. Melodic first because that's
 * how you'd check an interval by ear; harmonic after because that's the colour
 * you're meant to remember.
 */
function playPair(low: SampleRef, high: SampleRef): Promise<number> {
  return playPhrase([
    { ref: low, at: 0, dur: NOTE_HOLD },
    { ref: high, at: 0.6, dur: NOTE_HOLD },
    { ref: low, at: TOGETHER_AT, dur: 1.2 },
    { ref: high, at: TOGETHER_AT, dur: 1.2 },
  ]);
}

/**
 * The pair drawn on the board. On guitar these are the exact fretted
 * recordings — the sample *is* the voicing you're looking at. On piano they
 * become the same two pitches.
 */
export function playFrettedInterval(
  inst: Instrument,
  rootString: number,
  rootFret: number,
  noteString: number,
  noteFret: number,
): Promise<number> {
  if (inst === 'guitar') {
    return playPair(guitarAt(rootString, rootFret), guitarAt(noteString, noteFret));
  }
  return playPair(
    pianoMidi(OPEN_MIDI[rootString] + rootFret),
    pianoMidi(OPEN_MIDI[noteString] + noteFret),
  );
}

/**
 * An interval named as a class, sounded from the question's root. Used to
 * A/B what you answered against what it was: both sides start from the same
 * note and stay inside one octave, so the only difference you hear is the
 * interval itself.
 */
export function playIntervalClass(
  inst: Instrument,
  rootString: number,
  rootFret: number,
  semitones: number,
): Promise<number> {
  const rootMidi = OPEN_MIDI[rootString] + rootFret;
  // An answered "octave" means twelve semitones, not zero.
  const step = semitones === 0 ? 12 : semitones;
  const low = inst === 'guitar' ? guitarAt(rootString, rootFret) : pianoMidi(rootMidi);
  return playPair(low, sampleFor(inst, rootMidi + step));
}

/** Warm the samples a question will need, so the first tap is instant. */
export function prefetchChords(inst: Instrument, chords: number[][]): void {
  prefetch([
    ...chords.flat().map((m) => sampleFor(inst, m)),
    ...chords.map((notes) => bassMidi(notes[0] - BASS_DROP)),
  ]);
}

export function prefetchFretted(inst: Instrument, pairs: [number, number][]): void {
  prefetch(
    pairs.map(([s, f]) =>
      inst === 'guitar' ? guitarAt(s, f) : pianoMidi(OPEN_MIDI[s] + f),
    ),
  );
}
