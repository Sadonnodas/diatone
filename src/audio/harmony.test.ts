import { describe, it, expect } from 'vitest';
import { chordToMidi, progressionToMidi, rootPitchClass, tonicTriad, ROOT_LOW } from './harmony';
import { chordData } from '../lib/chordData';
import { progressionToJazz } from '../lib/jazz';

describe('rootPitchClass', () => {
  it('reads naturals, sharps and flats', () => {
    expect(rootPitchClass('C')).toBe(0);
    expect(rootPitchClass('F#')).toBe(6);
    expect(rootPitchClass('Bb')).toBe(10);
  });

  it('keeps the odd spellings the key table depends on', () => {
    expect(rootPitchClass('E#')).toBe(5); // = F, in F# major
    expect(rootPitchClass('Cb')).toBe(11); // = B, in Gb major
  });

  it('accepts the Unicode accidentals the UI renders', () => {
    expect(rootPitchClass('B♭')).toBe(10);
    expect(rootPitchClass('F♯')).toBe(6);
  });

  it('rejects anything that isn’t a bare root', () => {
    expect(rootPitchClass('H')).toBeNull();
    expect(rootPitchClass('Cm7')).toBeNull();
  });
});

describe('chordToMidi', () => {
  it('builds each quality in root position', () => {
    expect(chordToMidi('C')).toEqual([48, 52, 55]);
    expect(chordToMidi('Cm')).toEqual([48, 51, 55]);
    expect(chordToMidi('Cdim')).toEqual([48, 51, 54]);
    expect(chordToMidi('Cmaj7')).toEqual([48, 52, 55, 59]);
    expect(chordToMidi('Cm7')).toEqual([48, 51, 55, 58]);
    expect(chordToMidi('C7')).toEqual([48, 52, 55, 58]);
    expect(chordToMidi('Cm7b5')).toEqual([48, 51, 54, 58]);
  });

  it('takes jazz notation as readily as textbook', () => {
    expect(chordToMidi('A-7')).toEqual(chordToMidi('Am7'));
    expect(chordToMidi('C△7')).toEqual(chordToMidi('Cmaj7'));
    expect(chordToMidi('Bø7')).toEqual(chordToMidi('Bm7b5'));
    expect(chordToMidi('B°')).toEqual(chordToMidi('Bdim'));
  });

  it('keeps every root inside one octave band', () => {
    for (const key of Object.keys(chordData)) {
      for (const chord of chordData[key].sevenths.chords) {
        const notes = chordToMidi(chord);
        expect(notes, chord).not.toBeNull();
        expect(notes![0], `${chord} root`).toBeGreaterThanOrEqual(ROOT_LOW);
        expect(notes![0], `${chord} root`).toBeLessThan(ROOT_LOW + 12);
      }
    }
  });

  it('sounds every chord in the key table, in both forms', () => {
    for (const key of Object.keys(chordData)) {
      const { triads, sevenths } = chordData[key];
      for (const chord of [...triads.chords, ...sevenths.chords]) {
        expect(chordToMidi(chord), `${key}: ${chord}`).not.toBeNull();
        // The stored answer is converted to jazz for display; playback reads
        // that same string, so it has to parse too.
        expect(chordToMidi(progressionToJazz(chord)), `${key}: ${chord} (jazz)`).not.toBeNull();
      }
    }
  });

  it('puts the root lowest and the rest above it', () => {
    const notes = chordToMidi('B7')!;
    expect(notes[0]).toBe(Math.min(...notes));
    expect([...notes].sort((a, b) => a - b)).toEqual(notes);
  });

  it('rejects what it cannot sound', () => {
    expect(chordToMidi('')).toBeNull();
    expect(chordToMidi('Csus4')).toBeNull();
    expect(chordToMidi('wat')).toBeNull();
  });
});

describe('progressionToMidi', () => {
  it('reads a whole answer string', () => {
    const chords = progressionToMidi('C G A- F')!;
    expect(chords).toHaveLength(4);
    expect(chords[2]).toEqual(chordToMidi('Am'));
  });

  it('fails the whole progression if one chord is unplayable', () => {
    expect(progressionToMidi('C G nonsense F')).toBeNull();
    expect(progressionToMidi('   ')).toBeNull();
  });
});

describe('tonicTriad', () => {
  it('is the major triad on the key root', () => {
    expect(tonicTriad('G')).toEqual([55, 59, 62]);
    expect(tonicTriad('Gb')).toEqual(chordToMidi('Gb'));
  });
});
