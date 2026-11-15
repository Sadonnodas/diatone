import { describe, expect, it } from 'vitest';
import { ALL_KEYS, chordData } from '../lib/chordData';
import { chordToMidi } from '../audio/harmony';
import { cells, tonicChord, type Tonality } from './tonality';

const BOTH: Tonality[] = ['major', 'minor'];

/** A chord's root as a pitch class — rootPitchClass only takes bare roots,
    and half of these chords are minor. */
const pc = (chord: string): number => chordToMidi(chord)![0] % 12;

describe('reading the window twice', () => {
  it('counts a major key straight off the table', () => {
    expect(cells('major').map((c) => c.numeral)).toEqual([
      'I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°',
    ]);
    expect(cells('major').map((c) => c.index)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('counts a minor key from the sixth', () => {
    expect(cells('minor').map((c) => c.numeral)).toEqual([
      'i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII',
    ]);
    // A minor's chords, in order: Am B° C Dm Em F G.
    expect(cells('minor').map((c) => chordData['C'].triads.chords[c.index])).toEqual([
      'Am', 'Bdim', 'C', 'Dm', 'Em', 'F', 'G',
    ]);
  });

  it('puts both readings in the same seven cells', () => {
    const at = (t: Tonality) => cells(t).map((c) => `${c.ring}:${c.offset}`).sort();
    expect(at('minor')).toEqual(at('major'));
    // The tonic is on the key's own spoke either way — only the ring changes.
    expect(cells('major')[0]).toMatchObject({ ring: 'major', offset: 0 });
    expect(cells('minor')[0]).toMatchObject({ ring: 'minor', offset: 0 });
  });

  it('takes its fourth and fifth from the neighbouring spokes', () => {
    for (const t of BOTH) {
      expect(cells(t)[3].offset).toBe(-1);
      expect(cells(t)[4].offset).toBe(1);
      // And they really are a fourth up and a fifth up from home.
      for (const key of ALL_KEYS) {
        const table = chordData[key].triads.chords;
        const home = pc(tonicChord(t, key));
        const sub = pc(table[cells(t)[3].index]);
        const dom = pc(table[cells(t)[4].index]);
        expect((sub - home + 12) % 12).toBe(5);
        expect((dom - home + 12) % 12).toBe(7);
      }
    }
  });

  it('names the relative key each way round', () => {
    expect(tonicChord('major', 'C')).toBe('C');
    expect(tonicChord('minor', 'C')).toBe('Am');
    expect(tonicChord('minor', 'Eb')).toBe('Cm');
    // Each reading names the other's tonic: the relative key is just the
    // same window, counted from the other end.
    for (const key of ALL_KEYS) {
      expect(tonicChord('minor', key)).toBe(chordData[key].triads.chords[5]);
      expect(tonicChord('major', key)).toBe(chordData[key].triads.chords[0]);
    }
  });
});
