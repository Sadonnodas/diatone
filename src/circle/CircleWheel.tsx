import { Fragment } from 'react';
import {
  POSITIONS,
  RING_ORDER,
  segmentLabel,
  slotKey,
  type Ring,
  type Slot,
} from './circleData';

// Geometry, matching the printed wheel: majors innermost, their relative
// minors immediately outside, and the vii° tabs thin on the rim.
const SIZE = 340;
const C = SIZE / 2;
const RADII: Record<Ring, [number, number]> = {
  dim: [152, 172],
  minor: [107, 152],
  major: [58, 107],
};
const STEP = 360 / POSITIONS;
/* The rim reaches 172 of a 170 half-width, and the window's outline is drawn
   on top of it with a stroke of its own — so the box is a little wider than
   the circle, or both get shaved flat at the four compass points. */
const PAD = 6;
const VIEW = `${-PAD} ${-PAD} ${SIZE + 2 * PAD} ${SIZE + 2 * PAD}`;

const pt = (r: number, deg: number): [number, number] => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
};

function segmentPath(ri: number, ro: number, a0: number, a1: number): string {
  const [x0o, y0o] = pt(ro, a0);
  const [x1o, y1o] = pt(ro, a1);
  const [x1i, y1i] = pt(ri, a1);
  const [x0i, y0i] = pt(ri, a0);
  return `M${x0o} ${y0o}A${ro} ${ro} 0 0 1 ${x1o} ${y1o}L${x1i} ${y1i}A${ri} ${ri} 0 0 0 ${x0i} ${y0i}Z`;
}

/**
 * The window over the key: three spokes wide across the majors and their
 * relative minors, but only one spoke deep into the rim — a key has three
 * majors, three minors and a single diminished, and the dim tabs either side
 * belong to the neighbouring keys. Stepped rather than square, exactly like
 * the cut-out in the printed wheel.
 */
function windowPath(center: number): string {
  const ri = RADII.major[0];
  const rm = RADII.minor[1];
  const ro = RADII.dim[1];
  const [a0, a1, a2, a3] = [-1.5, -0.5, 0.5, 1.5].map((n) => (center + n) * STEP);
  const p = (r: number, a: number) => pt(r, a).join(' ');
  return (
    `M${p(ri, a0)}L${p(rm, a0)}` +
    `A${rm} ${rm} 0 0 1 ${p(rm, a1)}L${p(ro, a1)}` +
    `A${ro} ${ro} 0 0 1 ${p(ro, a2)}L${p(rm, a2)}` +
    `A${rm} ${rm} 0 0 1 ${p(rm, a3)}L${p(ri, a3)}` +
    `A${ri} ${ri} 0 0 0 ${p(ri, a0)}Z`
  );
}

/** ASCII chord name → the way it should be read. Bdim → B°, Bbm → B♭m. */
export function prettyChord(name: string): string {
  const m = /^([A-G])([#b]*)(.*)$/.exec(name);
  if (!m) return name;
  const [, letter, acc, rest] = m;
  const accidentals = acc.replace(/#/g, '♯').replace(/b/g, '♭');
  return letter + accidentals + rest.replace('dim', '°');
}

export type Mark = 'ok' | 'no';

export interface WheelProps {
  /** Segments left empty for the player to name. */
  blanks: Slot[];
  /** How each filled-in blank turned out. */
  marks: Record<string, Mark>;
  /** The blank being asked for. Safe to show: naming it is the question. */
  highlight?: string | null;
  /** Names revealed on the blanks once they're answered. */
  revealed?: Record<string, string>;
  keyPos?: number | null;
  rotate?: number;
  /** Makes the wheel a picker: every spoke answers taps with its position.
      Left out, the wheel is display-only, as the drills want it. */
  onTapPos?: (pos: number) => void;
  /** The one segment to call home — the major of the spoke in a major key,
      the minor outside it in a minor one. */
  tonic?: Slot | null;
}

export function CircleWheel({
  blanks,
  marks,
  highlight,
  revealed,
  keyPos = null,
  rotate = 0,
  onTapPos,
  tonic = null,
}: WheelProps) {
  const blankKeys = new Set(blanks.map(slotKey));

  return (
    <svg
      className="cof"
      viewBox={VIEW}
      role="group"
      aria-label="Circle of fifths"
    >
      {RING_ORDER.map((ring) =>
        Array.from({ length: POSITIONS }, (_, pos) => {
          const slot: Slot = { ring, pos };
          const key = slotKey(slot);
          const [ri, ro] = RADII[ring];
          const a0 = (pos + rotate) * STEP - STEP / 2;
          const a1 = (pos + rotate) * STEP + STEP / 2;
          const blank = blankKeys.has(key);
          const mark = marks[key];
          const open = blank && !mark;
          const shown = mark && revealed?.[key] ? revealed[key] : segmentLabel(slot);
          const lines = shown.split('/');
          const [lx, ly] = pt((ri + ro) / 2, (pos + rotate) * STEP);
          const fontSize = ring === 'dim' ? 9.5 : lines.length > 1 ? 10 : 13;

          return (
            <Fragment key={key}>
              <path
                d={segmentPath(ri, ro, a0, a1)}
                data-slot={key}
                className={`cof-seg cof-${ring}${open ? ' open' : ''}${mark ? ` ${mark}` : ''}${
                  open && highlight === key ? ' asked' : ''
                }${onTapPos ? ' tappable' : ''}${
                  onTapPos && keyPos === pos ? ' in-key' : ''
                }`}
                onClick={onTapPos ? () => onTapPos(pos) : undefined}
              />
              {open && highlight === key && (
                <text
                  className="cof-ask-mark"
                  x={lx}
                  y={ly}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  ?
                </text>
              )}
              {!open && (
                <text
                  className={`cof-label${mark ? ` ${mark}` : ''}`}
                  x={lx}
                  y={ly}
                  fontSize={fontSize}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {lines.map((line, i) => (
                    <tspan
                      key={line}
                      x={lx}
                      dy={i === 0 ? (lines.length > 1 ? '-0.55em' : '0') : '1.1em'}
                    >
                      {prettyChord(line)}
                    </tspan>
                  ))}
                </text>
              )}
            </Fragment>
          );
        }),
      )}

      {keyPos !== null && (
        // The key's window, outlined over the top. Drawn as a fill underneath
        // it was invisible — the segments are opaque — and tinting them would
        // have fought the major/minor colours. An outline says "these seven,
        // and they're adjacent" without touching anything else.
        <path className="cof-wedge" d={windowPath(keyPos + rotate)} />
      )}

      {tonic && (
        // Home, in a wedge that reads two ways: the window doesn't move
        // between C major and A minor, only the chord you count from.
        <path
          className="cof-tonic"
          d={segmentPath(
            RADII[tonic.ring][0],
            RADII[tonic.ring][1],
            (tonic.pos + rotate) * STEP - STEP / 2,
            (tonic.pos + rotate) * STEP + STEP / 2,
          )}
        />
      )}
    </svg>
  );
}
