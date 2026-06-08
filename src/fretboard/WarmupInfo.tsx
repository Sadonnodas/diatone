import { FretboardWindow, type FretNote, type Region } from './FretboardWindow';
import { InfoModal } from '../components/InfoModal';
import { WARMUP_SHAPES, placeShape, SHAPE_ORDER, type WarmupShape, type ShapeKey } from './scaleData';

const STRINGS: Record<WarmupShape, number[]> = { rectangle: [3, 4], stack: [2, 3, 4] };

const RECT_FILL = 'rgba(155,140,255,0.18)';
const RECT_STROKE = 'rgba(155,140,255,0.7)';
const STACK_FILL = 'rgba(94,200,255,0.15)';
const STACK_STROKE = 'rgba(94,200,255,0.65)';

interface Placed { string: number; fret: number; degree: string; isRoot: boolean }

function toNotes(placed: Placed[]): FretNote[] {
  return placed.map((n) => ({
    string: n.string,
    fret: n.fret,
    fill: n.isRoot ? 'var(--accent-dim)' : 'var(--surface-2)',
    stroke: n.isRoot ? 'var(--accent-line)' : 'var(--line-strong)',
    text: n.isRoot ? 'var(--accent)' : 'var(--text)',
    label: n.degree,
    tappable: false,
  }));
}

function block(shape: WarmupShape, quality: 'major' | 'minor') {
  const strings = STRINGS[shape];
  const base = 1;
  const placed = WARMUP_SHAPES[shape][quality].map((m) => ({
    string: strings[m.s],
    fret: base + m.f,
    degree: m.degree,
    isRoot: !!m.root,
  }));
  const frets = placed.map((n) => n.fret);
  return {
    notes: toNotes(placed),
    strings,
    startFret: Math.max(0, Math.min(...frets) - 1),
    endFret: Math.max(...frets) + 1,
  };
}

// A string is part of a rectangle if its two notes are 1+♭3 or 5+♭7; otherwise
// it belongs to a stack. Maximal runs of the same type form the blocks; a run
// shorter than the full block (rectangle = 2 strings, stack = 3) is "partial".
const isRect = (a: string, b: string) => {
  const s = new Set([a, b]);
  return (s.has('1') && s.has('b3')) || (s.has('5') && s.has('b7'));
};

function decompose(placed: Placed[]): Region[] {
  const byString = new Map<number, Placed[]>();
  for (const n of placed) {
    if (!byString.has(n.string)) byString.set(n.string, []);
    byString.get(n.string)!.push(n);
  }
  const ordered = [...byString.keys()].sort((a, b) => a - b); // s1 (top) → s6 (bottom)
  const groups: { type: 'R' | 'S'; strings: number[] }[] = [];
  for (const s of ordered) {
    const ds = byString.get(s)!.map((x) => x.degree);
    const type: 'R' | 'S' = isRect(ds[0], ds[1]) ? 'R' : 'S';
    const last = groups[groups.length - 1];
    if (last && last.type === type) last.strings.push(s);
    else groups.push({ type, strings: [s] });
  }
  return groups.map((g) => ({
    cells: g.strings.map((s) => {
      const fr = byString.get(s)!.map((x) => x.fret);
      return { string: s, fromFret: Math.min(...fr), toFret: Math.max(...fr) };
    }),
    fill: g.type === 'R' ? RECT_FILL : STACK_FILL,
    stroke: g.type === 'R' ? RECT_STROKE : STACK_STROKE,
    dashed: g.strings.length < (g.type === 'R' ? 2 : 3),
  }));
}

function fullShape(shape: ShapeKey) {
  const placed = placeShape('minorPentatonic', shape, 6)!;
  const frets = placed.map((n) => n.fret);
  return {
    notes: toNotes(placed),
    regions: decompose(placed),
    startFret: Math.max(0, Math.min(...frets) - 1),
    endFret: Math.max(...frets) + 1,
  };
}

const BLOCKS: { q: 'major' | 'minor'; s: WarmupShape; label: string }[] = [
  { q: 'minor', s: 'rectangle', label: 'Minor rectangle' },
  { q: 'major', s: 'rectangle', label: 'Major rectangle' },
  { q: 'minor', s: 'stack', label: 'Minor stack' },
  { q: 'major', s: 'stack', label: 'Major stack' },
];

const ALL_STRINGS = [1, 2, 3, 4, 5, 6];

export function WarmupInfo({ onClose }: { onClose: () => void }) {
  return (
    <InfoModal title="How it works" onClose={onClose}>
      <p>
        Every pentatonic shape is built from just two small blocks — the <b>rectangle</b> and
        the <b>stack</b>. Inside each block the scale degrees always sit in the same spots: one
        layout for <b>major</b>, one for <b>minor</b>. Learn these and you can find any degree
        anywhere on the neck.
      </p>
      <p>
        You're shown one block and told only whether it's a major or minor shape — the root is
        hidden. Tap every note of the degree you're asked for (finding the root counts too).
      </p>
      <p className="info-dim">
        The notes added for the full scales — 4 and 7 for major, 2 and ♭6 for minor — fall in
        these same blocks, so this carries straight over.
      </p>

      <div className="group-label" style={{ marginTop: 6 }}>The two blocks</div>
      <div className="diagram-grid">
        {BLOCKS.map(({ q, s, label }) => {
          const d = block(s, q);
          return (
            <div className="diagram" key={label}>
              <div className="diagram-label">{label}</div>
              <FretboardWindow notes={d.notes} startFret={d.startFret} endFret={d.endFret} strings={d.strings} onTap={() => {}} />
            </div>
          );
        })}
      </div>

      <div className="group-label" style={{ marginTop: 12 }}>The five boxes</div>
      <p className="info-dim" style={{ marginTop: -4 }}>
        Each minor-pentatonic box is the same{' '}
        <span style={{ color: RECT_STROKE }}>rectangle</span> /{' '}
        <span style={{ color: STACK_STROKE }}>stack</span> pattern, windowed differently. Where a
        block crosses the B string it nudges up a fret, but the degrees stay put. A block that
        runs off the edge is shown <b>dashed</b> — it finishes in the next box, and since the low
        E and high E strings are the same notes, the pattern just starts over top to bottom.
      </p>
      <div className="legend" style={{ marginBottom: 4 }}>
        <span className="legend-item">
          <span className="legend-swatch" style={{ background: RECT_FILL, borderColor: RECT_STROKE }} />
          rectangle
        </span>
        <span className="legend-item">
          <span className="legend-swatch" style={{ background: STACK_FILL, borderColor: STACK_STROKE }} />
          stack
        </span>
      </div>

      <div className="diagram-grid">
        {SHAPE_ORDER.map((shape) => {
          const d = fullShape(shape);
          return (
            <div className="diagram" key={shape}>
              <div className="diagram-label">Minor pentatonic · “{shape}” shape</div>
              <FretboardWindow
                notes={d.notes}
                startFret={d.startFret}
                endFret={d.endFret}
                strings={ALL_STRINGS}
                regions={d.regions}
                onTap={() => {}}
              />
            </div>
          );
        })}
      </div>
    </InfoModal>
  );
}
