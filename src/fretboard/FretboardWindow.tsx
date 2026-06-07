import { renderJazz } from '../components/ChordDisplay';
import { degreeGlyphs } from './scaleData';

// A note ready to draw: position + resolved colours/label.
export interface FretNote {
  string: number; // 1 (high E, top) .. 6 (low E, bottom)
  fret: number; // absolute
  fill: string;
  stroke: string;
  text: string; // label colour
  label: string; // '', 'R', a degree…
  tappable: boolean;
}

const FRET_W = 58;
const STRING_GAP = 46;
const PAD_X = 26;
const PAD_Y = 26;
const NOTE_R = 15;
const HIT_R = 21;
const MARKERS = new Set([3, 5, 7, 9, 15, 17, 19, 21]);

export function FretboardWindow({
  notes,
  startFret,
  endFret,
  onTap,
}: {
  notes: FretNote[];
  startFret: number;
  endFret: number;
  onTap: (string: number, fret: number) => void;
}) {
  const cols = endFret - startFret + 1;
  const W = PAD_X * 2 + cols * FRET_W;
  const H = PAD_Y * 2 + 5 * STRING_GAP;

  const cellX = (fret: number) => PAD_X + (fret - startFret) * FRET_W + FRET_W / 2;
  const boundaryX = (k: number) => PAD_X + k * FRET_W;
  const stringY = (s: number) => PAD_Y + (s - 1) * STRING_GAP;
  const midY = PAD_Y + 2.5 * STRING_GAP;

  const fade =
    'linear-gradient(to right, transparent 0, #000 11%, #000 89%, transparent 100%)';

  return (
    <div
      className="fretwrap"
      style={{
        WebkitMaskImage: fade,
        maskImage: fade,
      }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet">
        {/* inlay markers */}
        {Array.from({ length: cols }, (_, c) => startFret + c)
          .filter((f) => MARKERS.has(f))
          .map((f) => (
            <circle key={`m${f}`} cx={cellX(f)} cy={midY} r={5} fill="var(--line-strong)" />
          ))}
        {Array.from({ length: cols }, (_, c) => startFret + c)
          .filter((f) => f === 12 || f === 24)
          .flatMap((f) => [
            <circle key={`m${f}a`} cx={cellX(f)} cy={stringY(2)} r={5} fill="var(--line-strong)" />,
            <circle key={`m${f}b`} cx={cellX(f)} cy={stringY(5)} r={5} fill="var(--line-strong)" />,
          ])}

        {/* frets (vertical) — nut thicker when the window starts at fret 0 */}
        {Array.from({ length: cols + 1 }, (_, k) => (
          <line
            key={`f${k}`}
            x1={boundaryX(k)}
            y1={stringY(1)}
            x2={boundaryX(k)}
            y2={stringY(6)}
            stroke="var(--line-strong)"
            strokeWidth={startFret === 0 && k === 0 ? 4 : 1}
          />
        ))}

        {/* strings (horizontal), low E thickest, drawn full-width so they fade out */}
        {[1, 2, 3, 4, 5, 6].map((s) => (
          <line
            key={`s${s}`}
            x1={0}
            y1={stringY(s)}
            x2={W}
            y2={stringY(s)}
            stroke="var(--line-strong)"
            strokeWidth={1 + (s - 1) * 0.32}
          />
        ))}

        {/* notes */}
        {notes.map((n) => {
          const x = cellX(n.fret);
          const y = stringY(n.string);
          return (
            <g key={`${n.string}-${n.fret}`}>
              <circle cx={x} cy={y} r={NOTE_R} fill={n.fill} stroke={n.stroke} strokeWidth={1.5} />
              {n.label !== '' && (
                <text
                  x={x}
                  y={y}
                  fill={n.text}
                  fontSize={n.label.length > 2 ? 12 : 14}
                  fontWeight={600}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontFamily="var(--font-ui)"
                >
                  {renderJazz(degreeGlyphs(n.label), `${n.string}-${n.fret}`)}
                </text>
              )}
              {n.tappable && (
                <circle
                  cx={x}
                  cy={y}
                  r={HIT_R}
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onClick={() => onTap(n.string, n.fret)}
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
