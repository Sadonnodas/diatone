import { describe, expect, it } from 'vitest';
import { ALL_KEYS, chordData } from '../lib/chordData';
import { rootPitchClass } from '../audio/harmony';
import {
  FLAT_ORDER,
  SHARP_ORDER,
  keySignature,
  neighbours,
  relativeMinor,
  signatureText,
} from './keySignature';

describe('key signatures', () => {
  it('counts accidentals by the step round the circle', () => {
    expect(keySignature('C')).toEqual({ count: 0, kind: 'none', accidentals: [] });
    expect(keySignature('G').count).toBe(1);
    expect(keySignature('D').count).toBe(2);
    expect(keySignature('F#').count).toBe(6);
    expect(keySignature('F')).toEqual({ count: 1, kind: 'flat', accidentals: ['B♭'] });
    expect(keySignature('Bb').count).toBe(2);
    expect(keySignature('Db').count).toBe(5);
    // The flat side of the same spoke as F#.
    expect(keySignature('Gb')).toEqual({ count: 6, kind: 'flat', accidentals: FLAT_ORDER.slice(0, 6) });
  });

  it('writes them in their traditional order', () => {
    expect(keySignature('A').accidentals).toEqual(['F♯', 'C♯', 'G♯']);
    expect(keySignature('Eb').accidentals).toEqual(['B♭', 'E♭', 'A♭']);
    for (const key of ALL_KEYS) {
      const s = keySignature(key);
      const order = s.kind === 'flat' ? FLAT_ORDER : SHARP_ORDER;
      expect(s.accidentals).toEqual(order.slice(0, s.count));
    }
  });

  it('matches the accidentals the key actually spells', () => {
    for (const key of ALL_KEYS) {
      const s = keySignature(key);
      // Every accidental in the signature turns up in the key's own chords,
      // and no accidental of the other kind does.
      const spelled = chordData[key].triads.chords.join(' ');
      const wrongKind = s.kind === 'flat' ? '#' : 'b';
      if (s.kind !== 'none') {
        expect(spelled.includes(wrongKind === '#' ? '#' : 'b')).toBe(false);
      }
    }
  });

  it('reads as words', () => {
    expect(signatureText('C')).toBe('no sharps or flats');
    expect(signatureText('G')).toBe('1 sharp');
    expect(signatureText('D')).toBe('2 sharps');
    expect(signatureText('F')).toBe('1 flat');
    expect(signatureText('Eb')).toBe('3 flats');
  });

  it('knows each key’s relative minor and its neighbours', () => {
    expect(relativeMinor('C')).toBe('Am');
    expect(relativeMinor('Eb')).toBe('Cm');
    expect(neighbours('C')).toEqual({ down: 'F', up: 'G' });
    expect(neighbours('F')).toEqual({ down: 'Bb', up: 'C' });
    // A neighbour is that key's IV and V — the wheel's whole point. Compared
    // by pitch, because the wheel closes on an enharmonic seam: F#'s V is
    // spelled C#, while the key sitting there is written Db.
    for (const key of ALL_KEYS) {
      const { down, up } = neighbours(key);
      const chords = chordData[key].triads.chords;
      expect(rootPitchClass(chords[3])).toBe(rootPitchClass(down));
      expect(rootPitchClass(chords[4])).toBe(rootPitchClass(up));
    }
  });

  it('closes on the enharmonic seam', () => {
    // Round the circle in fifths and you come back to where you started, but
    // spelled the other way: F# major's dominant is C#, written Db as a key.
    expect(neighbours('F#').up).toBe('Db');
    expect(chordData['F#'].triads.chords[4]).toBe('C#');
    expect(rootPitchClass('C#')).toBe(rootPitchClass('Db'));
  });
});
