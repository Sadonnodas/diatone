import { FretboardWindow, type FretNote } from './FretboardWindow';
import { WARMUP_SHAPES, type WarmupShape } from './scaleData';

const STRINGS: Record<WarmupShape, number[]> = { rectangle: [3, 4], stack: [2, 3, 4] };

// A static, fully-labelled diagram of one block (root in accent).
function diagram(shape: WarmupShape, quality: 'major' | 'minor') {
  const strings = STRINGS[shape];
  const base = 1;
  const placed = WARMUP_SHAPES[shape][quality].map((m) => ({
    string: strings[m.s],
    fret: base + m.f,
    degree: m.degree,
    isRoot: !!m.root,
  }));
  const notes: FretNote[] = placed.map((n) => ({
    string: n.string,
    fret: n.fret,
    fill: n.isRoot ? 'var(--accent-dim)' : 'var(--surface-2)',
    stroke: n.isRoot ? 'var(--accent-line)' : 'var(--line-strong)',
    text: n.isRoot ? 'var(--accent)' : 'var(--text)',
    label: n.degree,
    tappable: false,
  }));
  const frets = placed.map((n) => n.fret);
  return {
    notes,
    strings,
    startFret: Math.max(0, Math.min(...frets) - 1),
    endFret: Math.max(...frets) + 1,
  };
}

const DIAGRAMS: { q: 'major' | 'minor'; s: WarmupShape; label: string }[] = [
  { q: 'minor', s: 'rectangle', label: 'Minor rectangle' },
  { q: 'major', s: 'rectangle', label: 'Major rectangle' },
  { q: 'minor', s: 'stack', label: 'Minor stack' },
  { q: 'major', s: 'stack', label: 'Major stack' },
];

export function WarmupInfo({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="info-modal" role="dialog" aria-label="How it works">
        <div className="sheet-head">
          <div className="sheet-title">How it works</div>
          <button className="done-btn" onClick={onClose}>
            Done
          </button>
        </div>

        <div className="info-body">
          <p>
            Every pentatonic shape is built from just two small blocks — the{' '}
            <b>rectangle</b> and the <b>stack</b>. Inside each block the scale degrees always
            sit in the same spots: one layout for <b>major</b>, one for <b>minor</b>. Learn these
            and you can find any degree anywhere on the neck.
          </p>
          <p>
            You're shown one block and told only whether it's a major or minor shape — the
            root is hidden. Tap every note of the degree you're asked for (finding the root
            counts too).
          </p>
          <p className="info-dim">
            The notes added for the full scales — 4 and 7 for major, 2 and ♭6 for minor — fall
            in these same blocks, so this carries straight over.
          </p>

          <div className="diagram-grid">
            {DIAGRAMS.map(({ q, s, label }) => {
              const d = diagram(s, q);
              return (
                <div className="diagram" key={label}>
                  <div className="diagram-label">{label}</div>
                  <FretboardWindow
                    notes={d.notes}
                    startFret={d.startFret}
                    endFret={d.endFret}
                    strings={d.strings}
                    onTap={() => {}}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
