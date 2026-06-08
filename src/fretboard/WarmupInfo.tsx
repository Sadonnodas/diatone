import { FretboardWindow, type FretNote, type Region } from './FretboardWindow';
import { InfoModal } from '../components/InfoModal';
import { WARMUP_SHAPES, placeShape, type WarmupShape, type ShapeKey } from './scaleData';

const STRINGS: Record<WarmupShape, number[]> = { rectangle: [3, 4], stack: [2, 3, 4] };

const RECT_FILL = 'rgba(155,140,255,0.18)';
const RECT_STROKE = 'rgba(155,140,255,0.65)';
const STACK_FILL = 'rgba(94,200,255,0.15)';
const STACK_STROKE = 'rgba(94,200,255,0.6)';

interface Placed { string: number; fret: number; degree: string; isRoot: boolean }

// Map placed notes → drawable notes (root in accent, degree labels shown).
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

// A highlight box around the notes living on a given set of strings (its fret
// extent auto-expands to include a B-string-shifted note).
function regionFor(placed: Placed[], strings: number[], fill: string, stroke: string): Region {
  const frets = placed.filter((n) => strings.includes(n.string)).map((n) => n.fret);
  return {
    fromString: Math.min(...strings),
    toString: Math.max(...strings),
    fromFret: Math.min(...frets),
    toFret: Math.max(...frets),
    fill,
    stroke,
  };
}

// Full minor-pentatonic box with its rectangle + stack highlighted.
function fullShape(shape: ShapeKey, rectStrings: number[], stackStrings: number[]) {
  const base = 5;
  const placed = placeShape('minorPentatonic', shape, base)!;
  const frets = placed.map((n) => n.fret);
  return {
    notes: toNotes(placed),
    strings: [1, 2, 3, 4, 5, 6],
    startFret: Math.max(0, Math.min(...frets) - 1),
    endFret: Math.max(...frets) + 1,
    regions: [
      regionFor(placed, rectStrings, RECT_FILL, RECT_STROKE),
      regionFor(placed, stackStrings, STACK_FILL, STACK_STROKE),
    ],
  };
}

const BLOCKS: { q: 'major' | 'minor'; s: WarmupShape; label: string }[] = [
  { q: 'minor', s: 'rectangle', label: 'Minor rectangle' },
  { q: 'major', s: 'rectangle', label: 'Major rectangle' },
  { q: 'minor', s: 'stack', label: 'Minor stack' },
  { q: 'major', s: 'stack', label: 'Major stack' },
];

function Legend() {
  return (
    <div className="legend">
      <span className="legend-item">
        <span className="legend-swatch" style={{ background: RECT_FILL, borderColor: RECT_STROKE }} />
        rectangle
      </span>
      <span className="legend-item">
        <span className="legend-swatch" style={{ background: STACK_FILL, borderColor: STACK_STROKE }} />
        stack
      </span>
    </div>
  );
}

export function WarmupInfo({ onClose }: { onClose: () => void }) {
  const eShape = fullShape('E', [1, 2], [3, 4, 5]);
  const aShape = fullShape('A', [5, 6], [2, 3, 4]);

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

      <div className="group-label" style={{ marginTop: 12 }}>Inside a full shape</div>
      <p className="info-dim" style={{ marginTop: -4 }}>
        A whole box is just these blocks combined. Here the minor-pentatonic “E” shape is a{' '}
        <span style={{ color: RECT_STROKE }}>rectangle</span> (top two strings) on a{' '}
        <span style={{ color: STACK_STROKE }}>stack</span> (next three); the low string repeats
        the top.
      </p>
      <div className="diagram">
        <div className="diagram-label">Minor pentatonic · “E” shape</div>
        <FretboardWindow notes={eShape.notes} startFret={eShape.startFret} endFret={eShape.endFret} strings={eShape.strings} regions={eShape.regions} onTap={() => {}} />
        <Legend />
      </div>

      <p className="info-dim">
        The same two blocks make up every box. This is the “A” shape — notice the degree layout
        inside each block is identical to above, even though crossing the B string nudges the
        stack up a fret.
      </p>
      <div className="diagram">
        <div className="diagram-label">Minor pentatonic · “A” shape</div>
        <FretboardWindow notes={aShape.notes} startFret={aShape.startFret} endFret={aShape.endFret} strings={aShape.strings} regions={aShape.regions} onTap={() => {}} />
        <Legend />
      </div>
    </InfoModal>
  );
}
