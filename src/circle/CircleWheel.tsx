import { Fragment } from 'react';
import {
  POSITIONS,
  RING_ORDER,
  segmentLabel,
  slotKey,
  type Ring,
  type Slot,
} from './circleData';

// Geometry, outside in. The dim ring is deliberately thin — it carries one
// chord per key and shouldn't compete with the majors for attention.
const SIZE = 340;
const C = SIZE / 2;
const RADII: Record<Ring, [number, number]> = {
  dim: [147, 168],
  major: [99, 147],
  minor: [56, 99],
};
const STEP = 360 / POSITIONS;

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
  /** Segments left empty for the player to fill. */
  blanks: Slot[];
  /** How each filled-in blank turned out. */
  marks: Record<string, Mark>;
  /** The gap being asked for right now — only used to nudge attention. */
  activeKeys: string[];
  /** The key's spoke, highlighted so you can see what you're working from. */
  keyPos: number | null;
  rotate: number;
  onTap: (slot: Slot) => void;
  disabled?: boolean;
}

export function CircleWheel({
  blanks,
  marks,
  activeKeys,
  keyPos,
  rotate,
  onTap,
  disabled,
}: WheelProps) {
  const blankKeys = new Set(blanks.map(slotKey));

  return (
    <svg
      className="cof"
      viewBox={`0 0 ${SIZE} ${SIZE}`}
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
          const lines = segmentLabel(slot).split('/');
          const [lx, ly] = pt((ri + ro) / 2, (pos + rotate) * STEP);
          const fontSize = ring === 'dim' ? 9.5 : lines.length > 1 ? 10 : 13;

          return (
            <Fragment key={key}>
              <path
                d={segmentPath(ri, ro, a0, a1)}
                data-slot={key}
                className={`cof-seg cof-${ring}${open ? ' open' : ''}${
                  mark ? ` ${mark}` : ''
                }${open && activeKeys.includes(key) ? ' live' : ''}`}
                onClick={open && !disabled ? () => onTap(slot) : undefined}
                style={{ cursor: open && !disabled ? 'pointer' : 'default' }}
              />
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
        // The key's wedge, outlined over the top. Drawn as a fill underneath it
        // was invisible — the segments are opaque — and tinting them would have
        // fought the major/minor colours. An outline says "these seven, and
        // they're adjacent" without touching anything else.
        <path
          className="cof-wedge"
          d={segmentPath(
            RADII.minor[0],
            RADII.dim[1],
            (keyPos + rotate - 1.5) * STEP,
            (keyPos + rotate + 1.5) * STEP,
          )}
        />
      )}
    </svg>
  );
}
