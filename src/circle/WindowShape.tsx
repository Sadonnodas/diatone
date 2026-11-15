import { Fragment } from 'react';
import { jazzTspans } from '../components/ChordDisplay';
import type { Cell } from './tonality';

/**
 * The window: the wedge-shaped cut-out you slide over a printed chord wheel,
 * drawn on its own so the seven degrees can be read in place. Same way up as
 * the wheel — the hub below the box, majors nearest it, their relative minors
 * stacked outside them and the diminished on the rim — only here the window
 * sits further out and splays a little less, which flattens the cells enough
 * for a horizontal label like A♭△7 to fit inside one.
 */
const STEP = 22;
const SPAN = 1.5 * STEP;
const RADII: Record<Cell['ring'], [number, number]> = {
  major: [105, 134],
  minor: [134, 163],
  dim: [163, 192],
};
/** Where the two lines sit in a band: the numeral just under its outer edge,
    the chord just above its inner one. Measured from the edges rather than
    the middle, so the thinnest band can't push a label out of the shape. */
const NUMERAL_IN = 6.5;
const CHORD_OUT = 8.5;

const rad = (deg: number) => (deg * Math.PI) / 180;
const CX = RADII.dim[1] * Math.sin(rad(SPAN));
const BASE = RADII.dim[1]; // the hub's y: everything is drawn above it

// The wheel's own geometry, hub moved off the bottom of the box.
const pt = (r: number, deg: number): [number, number] => [
  CX + r * Math.sin(rad(deg)),
  BASE - r * Math.cos(rad(deg)),
];

function cellPath(ri: number, ro: number, a0: number, a1: number): string {
  const [x0o, y0o] = pt(ro, a0);
  const [x1o, y1o] = pt(ro, a1);
  const [x1i, y1i] = pt(ri, a1);
  const [x0i, y0i] = pt(ri, a0);
  return `M${x0o} ${y0o}A${ro} ${ro} 0 0 1 ${x1o} ${y1o}L${x1i} ${y1i}A${ri} ${ri} 0 0 0 ${x0i} ${y0i}Z`;
}

// A couple of units of air all round, so no stroke or descender is clipped.
const PAD = 3;
const BOTTOM = BASE - RADII.major[0] * Math.cos(rad(SPAN));
const VIEW = `${-PAD} ${-PAD} ${(CX * 2 + 2 * PAD).toFixed(1)} ${(BOTTOM + 2 * PAD).toFixed(1)}`;

export interface ShapeItem {
  cell: Cell;
  /** The chord that sits there, ready to display. */
  text: string;
}

export function WindowShape({
  items,
  sounding,
  onTap,
}: {
  /** The seven cells in reading order — the tonic first. */
  items: ShapeItem[];
  /** Which of the key's chords is ringing, as an index into its table. */
  sounding?: number | null;
  onTap?: (index: number) => void;
}) {
  const tonic = items[0]?.cell.index;

  return (
    <svg className="shape" viewBox={VIEW} role="group" aria-label="The key's seven chords">
      {items.map(({ cell, text }) => {
        const [ri, ro] = RADII[cell.ring];
        const mid = cell.offset * STEP;
        // Numeral above the chord — which out here means a touch further out.
        const [nx, ny] = pt(ro - NUMERAL_IN, mid);
        const [cx, cy] = pt(ri + CHORD_OUT, mid);
        const state = `${cell.index === tonic ? ' tonic' : ''}${
          sounding === cell.index ? ' sounding' : ''
        }`;

        return (
          <Fragment key={cell.numeral}>
            <path
              className={`shape-cell${state}`}
              d={cellPath(ri, ro, mid - STEP / 2, mid + STEP / 2)}
              role={onTap ? 'button' : undefined}
              aria-label={onTap ? `${cell.numeral} — ${text}` : undefined}
              onClick={onTap ? () => onTap(cell.index) : undefined}
            />
            <text
              className={`shape-num${state}`}
              x={nx}
              y={ny}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {cell.numeral}
            </text>
            <text
              className={`shape-chord${state}`}
              x={cx}
              y={cy}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {jazzTspans(text, `s${cell.index}`)}
            </text>
          </Fragment>
        );
      })}
    </svg>
  );
}
