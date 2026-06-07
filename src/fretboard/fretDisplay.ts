import type { FretNote } from './FretboardWindow';

export interface DisplayInputNote {
  string: number;
  fret: number;
  degree: string;
  isRoot: boolean;
}

export type RootMark = 'low' | 'all' | 'none';

// Resolve every note's colours/label for the current state — shared by the full
// fretboard game and the warm-up. `rootMark` decides which roots get an 'R'
// marker pre-answer: 'low' = roots on strings 4/5/6 (root-given full board),
// 'all' = the shape's root (warm-up), 'none' = none (quality-given).
export function buildFretNotes(
  notes: DisplayInputNote[],
  target: string,
  selected: Set<string>,
  answered: boolean,
  rootMark: RootMark,
): FretNote[] {
  return notes.map((n) => {
    const key = `${n.string}-${n.fret}`;
    const sel = selected.has(key);
    const isTarget = n.degree === target;
    const pos = { string: n.string, fret: n.fret };

    if (answered) {
      if (isTarget && sel)
        return { ...pos, fill: 'var(--correct)', stroke: 'var(--correct)', text: '#0a0c10', label: n.degree, tappable: false };
      if (isTarget && !sel)
        return { ...pos, fill: 'transparent', stroke: 'var(--correct)', text: 'var(--correct)', label: n.degree, tappable: false };
      if (!isTarget && sel)
        return { ...pos, fill: 'var(--wrong)', stroke: 'var(--wrong)', text: '#fff', label: n.degree, tappable: false };
      return { ...pos, fill: 'var(--surface-1)', stroke: 'var(--line)', text: 'var(--text-3)', label: n.degree, tappable: false };
    }

    if (sel)
      return { ...pos, fill: 'var(--accent-deep)', stroke: 'var(--accent)', text: '#fff', label: '', tappable: true };

    const markRoot =
      rootMark === 'all' ? n.isRoot : rootMark === 'low' ? n.isRoot && n.string >= 4 : false;
    if (markRoot)
      return { ...pos, fill: 'var(--accent-dim)', stroke: 'var(--accent-line)', text: 'var(--accent)', label: 'R', tappable: true };

    return { ...pos, fill: 'var(--surface-2)', stroke: 'var(--line-strong)', text: 'var(--text)', label: '', tappable: true };
  });
}
