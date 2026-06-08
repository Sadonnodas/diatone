import { FretboardWindow, type FretNote, type Region } from './FretboardWindow';
import { InfoModal } from '../components/InfoModal';
import {
  WARMUP_SHAPES,
  placeShape,
  SHAPE_ORDER,
  type WarmupShape,
  type ShapeKey,
  type ScaleType,
} from './scaleData';

const STRINGS: Record<WarmupShape, number[]> = { rectangle: [3, 4], stack: [2, 3, 4] };
const ALL_STRINGS = [1, 2, 3, 4, 5, 6];

const RECT_FILL = 'rgba(155,140,255,0.18)';
const RECT_STROKE = 'rgba(155,140,255,0.7)';
const STACK_FILL = 'rgba(94,200,255,0.15)';
const STACK_STROKE = 'rgba(94,200,255,0.65)';
const ADDED_FILL = '#e0b35c';
const ADDED_STROKE = '#e0b35c';

interface Placed {
  string: number;
  fret: number;
  degree: string;
  isRoot: boolean;
  added?: boolean;
}

function toNotes(placed: Placed[]): FretNote[] {
  return placed.map((n) =>
    n.added
      ? { string: n.string, fret: n.fret, fill: ADDED_FILL, stroke: ADDED_STROKE, text: '#0a0c10', label: n.degree, tappable: false }
      : {
          string: n.string,
          fret: n.fret,
          fill: n.isRoot ? 'var(--accent-dim)' : 'var(--surface-2)',
          stroke: n.isRoot ? 'var(--accent-line)' : 'var(--line-strong)',
          text: n.isRoot ? 'var(--accent)' : 'var(--text)',
          label: n.degree,
          tappable: false,
        },
  );
}

const win = (placed: Placed[]) => ({
  startFret: Math.max(0, Math.min(...placed.map((n) => n.fret)) - 1),
  endFret: Math.max(...placed.map((n) => n.fret)) + 1,
});

// ---- Pentatonic blocks (the warm-up's two shapes) ----
function block(shape: WarmupShape, quality: 'major' | 'minor', withAdded = false) {
  const strings = STRINGS[shape];
  const base = 2; // leaves room so an added note at f-1 isn't clipped by the edge fade
  const placed: Placed[] = WARMUP_SHAPES[shape][quality].map((m) => ({
    string: strings[m.s],
    fret: base + m.f,
    degree: m.degree,
    isRoot: !!m.root,
  }));
  if (withAdded) {
    for (const a of ADDED[shape]) {
      placed.push({ string: strings[a.s], fret: base + a.f, degree: quality === 'major' ? a.major : a.minor, isRoot: false, added: true });
    }
  }
  return { notes: toNotes(placed), strings, ...win(placed) };
}

// Where the full-scale notes get added inside each block. Same position for
// major and minor — only the degree name differs.
const ADDED: Record<WarmupShape, { s: number; f: number; major: string; minor: string }[]> = {
  rectangle: [
    { s: 0, f: 2, major: '7', minor: '2' },
    { s: 1, f: 1, major: '4', minor: 'b6' },
  ],
  stack: [
    { s: 0, f: -1, major: '7', minor: '2' },
    { s: 2, f: 3, major: '4', minor: 'b6' },
  ],
};

// ---- Block classification for the full-shape outlines ----
// Strings whose two notes spell a rectangle (major or minor); everything else is
// a stack. Maximal runs of the same type form blocks; a short run is "partial".
const RECT_SETS = [
  ['1', 'b3'],
  ['5', 'b7'],
  ['6', '1'],
  ['3', '5'],
];
const isRect = (a: string, b: string) =>
  RECT_SETS.some(([x, y]) => (a === x && b === y) || (a === y && b === x));

function decompose(placed: Placed[]): Region[] {
  const byString = new Map<number, Placed[]>();
  for (const n of placed) {
    if (!byString.has(n.string)) byString.set(n.string, []);
    byString.get(n.string)!.push(n);
  }
  const ordered = [...byString.keys()].sort((a, b) => a - b);
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

// Full minor-pentatonic box (regions from its own notes).
function fullShape(shape: ShapeKey) {
  const placed = placeShape('minorPentatonic', shape, 6)!.map((n) => ({ ...n }));
  return { notes: toNotes(placed), regions: decompose(placed), ...win(placed) };
}

// Full scale box: notes from the scale, blocks from its pentatonic skeleton.
function fullScaleBox(penta: ScaleType, scale: ScaleType, extra: string[]) {
  const base = 6;
  const regions = decompose(placeShape(penta, 'E', base)!.map((n) => ({ ...n })));
  const placed: Placed[] = placeShape(scale, 'E', base)!.map((n) => ({ ...n, added: extra.includes(n.degree) }));
  return { notes: toNotes(placed), regions, ...win(placed) };
}

const BLOCKS: { q: 'major' | 'minor'; s: WarmupShape; label: string }[] = [
  { q: 'minor', s: 'rectangle', label: 'Minor rectangle' },
  { q: 'minor', s: 'stack', label: 'Minor stack' },
  { q: 'major', s: 'rectangle', label: 'Major rectangle' },
  { q: 'major', s: 'stack', label: 'Major stack' },
];

const SHAPE_NOTES: Partial<Record<ShapeKey, string>> = {
  A: 'Here you can clearly recognise the stack — it’s just shifted up a fret across the B string.',
};

function Swatch({ fill, stroke }: { fill: string; stroke: string }) {
  return <span className="legend-swatch" style={{ background: fill, borderColor: stroke }} />;
}

export function WarmupInfo({ onClose }: { onClose: () => void }) {
  return (
    <InfoModal title="How it works" subtitle="a Fret Science idea" onClose={onClose}>
      {/* The idea */}
      <p>
        Every pentatonic shape is built from two small blocks — the <b>rectangle</b> and the{' '}
        <b>stack</b>. The scale degrees sit in the same spot inside each block (one layout for
        major, one for minor), so once you know them you can read degrees anywhere.
      </p>
      <p>
        If you already know your pentatonic shapes all over the fretboard, this is how you'll know
        your scale degrees there too.
      </p>

      {/* How to play */}
      <div className="group-label" style={{ marginTop: 6 }}>How to play</div>
      <p className="info-dim" style={{ marginTop: -4 }}>
        You're shown one block and told only whether it's a major or minor shape — the root is
        hidden. Tap every note of the degree you're asked for (finding the root counts too).
      </p>

      {/* The two blocks */}
      <div className="group-label" style={{ marginTop: 6 }}>The two blocks</div>
      <p className="info-dim" style={{ marginTop: -4 }}>
        The degrees are in the same place in every rectangle, and in every stack — that never
        changes.
      </p>
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

      {/* The five shapes */}
      <div className="group-label" style={{ marginTop: 12 }}>The five shapes</div>
      <p className="info-dim" style={{ marginTop: -4 }}>
        Each full pentatonic box is just these blocks alternating up the neck. Where a block
        crosses the B string it nudges up a fret (the degrees stay put). A block that runs off the
        edge is <b>dashed</b> — it finishes in the next box, and since the low E and high E strings
        are the same notes, the pattern starts over top to bottom.
      </p>
      <div className="legend" style={{ marginBottom: 4 }}>
        <span className="legend-item"><Swatch fill={RECT_FILL} stroke={RECT_STROKE} /> rectangle</span>
        <span className="legend-item"><Swatch fill={STACK_FILL} stroke={STACK_STROKE} /> stack</span>
      </div>
      <div className="diagram-grid">
        {SHAPE_ORDER.map((shape) => {
          const d = fullShape(shape);
          return (
            <div className="diagram" key={shape}>
              <div className="diagram-label">Minor pentatonic · “{shape}” shape</div>
              <FretboardWindow notes={d.notes} startFret={d.startFret} endFret={d.endFret} strings={ALL_STRINGS} regions={d.regions} onTap={() => {}} />
              {SHAPE_NOTES[shape] && <div className="diagram-note">{SHAPE_NOTES[shape]}</div>}
            </div>
          );
        })}
      </div>

      {/* Full scales */}
      <div className="group-label" style={{ marginTop: 12 }}>From pentatonic to full scale</div>
      <p style={{ marginTop: -4 }}>
        The <b>major scale</b> is the major pentatonic plus two notes — the <b>4</b> and the{' '}
        <b>7</b>. The <b>natural minor</b> is the minor pentatonic plus the <b>2</b> and the{' '}
        <b>♭6</b>.
      </p>
      <p className="info-dim">
        They always land in the same spot: the <b>4</b> one fret above the 3rd, the <b>7</b> one
        fret below the root — and minor's <b>2</b> and <b>♭6</b> fall in those exact same places
        (just named differently). So inside a full scale the rectangle and stack are still right
        there.
      </p>
      <div className="legend" style={{ marginBottom: 4 }}>
        <span className="legend-item"><Swatch fill={ADDED_FILL} stroke={ADDED_STROKE} /> added scale note</span>
      </div>
      <div className="diagram-grid">
        {BLOCKS.map(({ q, s, label }) => {
          const d = block(s, q, true);
          return (
            <div className="diagram" key={`full-${label}`}>
              <div className="diagram-label">{label}</div>
              <FretboardWindow notes={d.notes} startFret={d.startFret} endFret={d.endFret} strings={d.strings} onTap={() => {}} />
            </div>
          );
        })}
      </div>
      <p className="info-dim">And the same blocks are still visible inside a full scale box:</p>
      {[
        { label: 'Major scale · “E” shape', d: fullScaleBox('majorPentatonic', 'majorScale', ['4', '7']) },
        { label: 'Natural minor · “E” shape', d: fullScaleBox('minorPentatonic', 'naturalMinor', ['2', 'b6']) },
      ].map(({ label, d }) => (
        <div className="diagram" key={label}>
          <div className="diagram-label">{label}</div>
          <FretboardWindow notes={d.notes} startFret={d.startFret} endFret={d.endFret} strings={ALL_STRINGS} regions={d.regions} onTap={() => {}} />
        </div>
      ))}
    </InfoModal>
  );
}
