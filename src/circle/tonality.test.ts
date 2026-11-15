import { describe, expect, it } from 'vitest';
import { ALL_KEYS, chordData } from '../lib/chordData';
import { chordToMidi } from '../audio/harmony';
import { cadence, cells, facts, tonicChord, type Tonality } from './tonality';

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

  it('cadences home either way', () => {
    const chords = (t: Tonality) => cadence(t).map((i) => chordData['C'].triads.chords[i]);
    expect(chords('major')).toEqual(['C', 'F', 'G', 'C']);
    expect(chords('minor')).toEqual(['Am', 'Dm', 'Em', 'Am']);
  });

  it('names the relative key each way round', () => {
    expect(tonicChord('major', 'C')).toBe('C');
    expect(tonicChord('minor', 'C')).toBe('Am');
    expect(tonicChord('minor', 'Eb')).toBe('Cm');
    for (const key of ALL_KEYS) {
      expect(facts('major', key)[0]).toEqual({
        label: 'relative minor',
        chord: tonicChord('minor', key),
      });
      expect(facts('minor', key)[0]).toEqual({
        label: 'relative major',
        chord: tonicChord('major', key),
      });
    }
  });

  it('labels the fifths with the numerals of the reading', () => {
    expect(facts('major', 'C').map((f) => `${f.label} ${f.chord}`)).toEqual([
      'relative minor Am',
      'IV · a fifth down F',
      'V · a fifth up G',
    ]);
    expect(facts('minor', 'C').map((f) => `${f.label} ${f.chord}`)).toEqual([
      'relative major C',
      'iv · a fifth down Dm',
      'v · a fifth up Em',
    ]);
  });
});
