import { Fragment } from 'react';
import { POSITIONS, type WedgeSlot } from './circleData';
import { prettyChord } from './CircleWheel';

/**
 * One key's wedge, zoomed. The wheel's centre sits below the board and the
 * three spokes fan upward, so you're looking at the same shape the printed
 * wheel shows through its window — rotated so the key is always on top, which
 * is what makes the positions *relative* (IV left, V right) rather than
 * something you memorise per key.
 *
 * The neighbouring spokes are drawn faintly and run off the edges: enough to
 * say "this is a slice of a circle", not enough to read.
 */
const W = 340;
// Cropped to the fan itself: its lowest points (the major ring's inner
// corners) sit at y≈213, so anything past this is empty circle centre.
const H = 222;
const CX = W / 2;
const CY = 258; // below the board, so the fan opens upward
const STEP = 360 / POSITIONS;

// Radii, in the printed wheel's order: majors nearest the centre. The vii°
// tab is as deep as the others: once a chord is placed a slot carries two
// lines (chord over numeral), and at 42px the top line was brushing the rim.
const RADII: Record<string, [number, number]> = {
  major: [64, 130],
  minor: [130, 190],
  dim: [190, 250],
};

const pt = (r: number, deg: number): [number, number] => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
};

function segmentPath(ri: number, ro: number, a0: number, a1: number): string {
  const [x0o, y0o] = pt(ro, a0);
  const [x1o, y1o] = pt(ro, a1);
  const [x1i, y1i] = pt(ri, a1);
  const [x0i, y0i] = pt(ri, a0);
  return `M${x0o} ${y0o}A${ro} ${ro} 0 0 1 ${x1o} ${y1o}L${x1i} ${y1i}A${ri} ${ri} 0 0 0 ${x0i} ${y0i}Z`;
}

/**
 * A chord name for SVG, with its accidental set small in the UI font — the
 * same treatment renderJazz gives the buttons. The display serif has no ♯/♭
 * of its own, so left to fallback they come out full height and loosely
 * spaced ("E ♯ °"). Numerals have no accidentals and pass straight through.
 */
function svgChord(name: string) {
  const pretty = prettyChord(name);
  const m = /^([A-G])([♯♭]+)(.*)$/.exec(pretty);
  if (!m) return pretty;
  const [, letter, acc, rest] = m;
  return (
    <>
      {letter}
      <tspan className="wedge-acc">{acc}</tspan>
      {rest}
    </>
  );
}

export type Mark = 'ok' | 'no';

export interface WedgeBoardProps {
  slots: WedgeSlot[];
  /** degree → the token dropped in it. */
  placed: Record<string, string>;
  /** How the slot itself went — the outline and fill. */
  marks: Record<string, Mark>;
  /** How the chord written in it went, when that's a separate question from
      the slot (a progression: find the field, then build its chord). Left out,
      the chord follows the slot's mark. */
  labelMarks?: Record<string, Mark>;
  /** degree → the label already printed in the slot. The numeral when it's a
      guide for placing chords; the chord itself when you're placing numerals
      onto it. */
  hints: Record<string, string>;
  /** The slot being answered. */
  picked: string | null;
  /** Let filled slots be tapped too — a progression can use a chord twice. */
  tapFilled?: boolean;
  onTapSlot: (degree: string) => void;
}

export function WedgeBoard({
  slots,
  placed,
  marks,
  labelMarks,
  hints,
  picked,
  tapFilled = false,
  onTapSlot,
}: WedgeBoardProps) {
  return (
    <svg
      className={`wedge${labelMarks ? ' split-marks' : ''}`}
      viewBox={`0 0 ${W} ${H}`}
      role="group"
      aria-label="Key wedge"
    >
      <defs>
        {/* Fade the neighbours out sideways rather than cutting them off. */}
        <linearGradient id="wedgeFade" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.22" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.75" />
          <stop offset="0.78" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id="wedgeMask">
          <rect x="0" y="0" width={W} height={H} fill="url(#wedgeFade)" />
        </mask>
      </defs>

      {/* The rest of the circle, tapering off the sides. */}
      <g className="wedge-rest" mask="url(#wedgeMask)">
        {[-3, -2, 2, 3].map((offset) =>
          (['major', 'minor', 'dim'] as const).map((ring) => {
            const [ri, ro] = RADII[ring];
            return (
              <path
                key={`${ring}${offset}`}
                className={`wedge-seg wedge-${ring} ghost`}
                d={segmentPath(ri, ro, offset * STEP - STEP / 2, offset * STEP + STEP / 2)}
              />
            );
          }),
        )}
      </g>

      {slots.map((w) => {
        const [ri, ro] = RADII[w.slot.ring];
        const a0 = w.offset * STEP - STEP / 2;
        const a1 = w.offset * STEP + STEP / 2;
        const mid = w.offset * STEP;
        const [lx, ly] = pt((ri + ro) / 2, mid);
        const token = placed[w.degree];
        const hint = hints[w.degree];
        const mark = marks[w.degree];
        // Two answers in one slot: the outline says whether this was the right
        // place, the chord says whether it was spelled right.
        const labelMark = labelMarks ? labelMarks[w.degree] : mark;

        return (
          <Fragment key={w.degree}>
            <path
              data-degree={w.degree}
              className={`wedge-seg wedge-${w.slot.ring}${token ? ' filled' : ' empty'}${
                mark ? ` ${mark}` : ''
              }${picked === w.degree ? ' picked' : ''}`}
              d={segmentPath(ri, ro, a0, a1)}
              onClick={token && !tapFilled ? undefined : () => onTapSlot(w.degree)}
              style={{ cursor: token && !tapFilled ? 'default' : 'pointer' }}
            />
            <text
              className={`wedge-label${labelMark ? ` ${labelMark}` : ''}`}
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              pointerEvents="none"
            >
              {/* Both, once it's placed: the pairing is the thing being
                  learned, so seeing "F" sitting on "IV" is the payoff. */}
              {token && (
                <tspan
                  x={lx}
                  dy={hint ? '-0.3em' : '0'}
                  className={`wedge-token${hint ? ' paired' : ''}`}
                >
                  {/* Tokens are stored as the key table spells them (E#dim);
                      print them the way the buttons do (E♯°). */}
                  {svgChord(token)}
                </tspan>
              )}
              {hint && (
                <tspan x={lx} dy={token ? '1.3em' : '0'} className="wedge-guide">
                  {svgChord(hint)}
                </tspan>
              )}
            </text>
          </Fragment>
        );
      })}
    </svg>
  );
}
