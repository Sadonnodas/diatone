import { Fragment } from 'react';
import { jazzTspans } from '../components/ChordDisplay';
import type { Cell } from './tonality';

/**
 * The window: the wedge-shaped cut-out you slide over a printed chord wheel,
 * drawn on its own so the seven degrees can be read in place. Same geometry
 * as the wheel — majors nearest the hub, their relative minors outside them,
 * the diminished on the rim — only here the hub is off the top of the box and
 * the three spokes are splayed a little wider, so the labels have room.
 */
const CX = 82;
const STEP = 25;
const RADII: Record<Cell['ring'], [number, number]> = {
  major: [50, 78],
  minor: [78, 104],
  dim: [104, 130],
};
const SPAN = 1.5 * STEP;

// The wheel's own geometry with the y-axis flipped: the hub sits above the
// box at y = 0, and angles are measured from straight down.
const pt = (r: number, deg: number): [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [CX + r * Math.sin(a), r * Math.cos(a)];
};

function cellPath(ri: number, ro: number, a0: number, a1: number): string {
  const [x0o, y0o] = pt(ro, a0);
  const [x1o, y1o] = pt(ro, a1);
  const [x1i, y1i] = pt(ri, a1);
  const [x0i, y0i] = pt(ri, a0);
  return `M${x0o} ${y0o}A${ro} ${ro} 0 0 0 ${x1o} ${y1o}L${x1i} ${y1i}A${ri} ${ri} 0 0 1 ${x0i} ${y0i}Z`;
}

const TOP = RADII.major[0] * Math.cos((SPAN * Math.PI) / 180) - 2;
const VIEW = `0 ${TOP.toFixed(1)} ${CX * 2} ${(RADII.dim[1] + 2 - TOP).toFixed(1)}`;

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
        const [nx, ny] = pt((ri + ro) / 2 - 7, mid);
        const [cx, cy] = pt((ri + ro) / 2 + 6.5, mid);
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
