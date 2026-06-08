import { degreeGlyphs } from './scaleData';

// A note ready to draw: position + resolved colours/label.
export interface FretNote {
  string: number;
  fret: number;
  fill: string;
  stroke: string;
  text: string;
  label: string;
  tappable: boolean;
}

// Translucent highlight box drawn behind notes (used by the explainer diagrams).
export interface Region {
  fromString: number;
  toString: number;
  fromFret: number;
  toFret: number;
  fill: string;
  stroke: string;
}

const FRET_W = 58;
const STRING_GAP = 46;
const PAD_X = 26;
const PAD_Y = 26;
const NOTE_R = 15;
const HIT_R = 21;
const MARKERS = new Set([3, 5, 7, 9, 15, 17, 19, 21]);

const DEFAULT_STRINGS = [1, 2, 3, 4, 5, 6];

export function FretboardWindow({
  notes,
  startFret,
  endFret,
  onTap,
  strings = DEFAULT_STRINGS,
  regions = [],
}: {
  notes: FretNote[];
  startFret: number;
  endFret: number;
  onTap: (string: number, fret: number) => void;
  strings?: number[];
  regions?: Region[];
}) {
  const cols = endFret - startFret + 1;
  const W = PAD_X * 2 + cols * FRET_W;
  const H = PAD_Y * 2 + (strings.length - 1) * STRING_GAP;
  const fullBoard = strings.length === 6;

  const cellX = (fret: number) => PAD_X + (fret - startFret) * FRET_W + FRET_W / 2;
  const boundaryX = (k: number) => PAD_X + k * FRET_W;
  const stringY = (s: number) => PAD_Y + Math.max(0, strings.indexOf(s)) * STRING_GAP;
  const topY = PAD_Y;
  const botY = PAD_Y + (strings.length - 1) * STRING_GAP;
  const midY = PAD_Y + ((strings.length - 1) / 2) * STRING_GAP;

  const markerFrets = Array.from({ length: cols }, (_, c) => startFret + c);
  const fade = 'linear-gradient(to right, transparent 0, #000 11%, #000 89%, transparent 100%)';

  return (
    <div className="fretwrap" style={{ WebkitMaskImage: fade, maskImage: fade }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet">
        {/* highlight regions (behind everything) */}
        {regions.map((rg, i) => {
          const pad = NOTE_R + 6;
          const xs = [cellX(rg.fromFret), cellX(rg.toFret)];
          const ys = [stringY(rg.fromString), stringY(rg.toString)];
          const x = Math.min(...xs) - pad;
          const y = Math.min(...ys) - pad;
          return (
            <rect
              key={`rg${i}`}
              x={x}
              y={y}
              width={Math.abs(xs[1] - xs[0]) + 2 * pad}
              height={Math.abs(ys[1] - ys[0]) + 2 * pad}
              rx={16}
              fill={rg.fill}
              stroke={rg.stroke}
              strokeWidth={1.5}
            />
          );
        })}

        {/* inlay markers */}
        {markerFrets
          .filter((f) => MARKERS.has(f))
          .map((f) => (
            <circle key={`m${f}`} cx={cellX(f)} cy={midY} r={5} fill="var(--line-strong)" />
          ))}
        {fullBoard &&
          markerFrets
            .filter((f) => f === 12 || f === 24)
            .flatMap((f) => [
              <circle key={`m${f}a`} cx={cellX(f)} cy={stringY(2)} r={5} fill="var(--line-strong)" />,
              <circle key={`m${f}b`} cx={cellX(f)} cy={stringY(5)} r={5} fill="var(--line-strong)" />,
            ])}

        {/* frets — nut thicker when the window starts at fret 0 */}
        {Array.from({ length: cols + 1 }, (_, k) => (
          <line
            key={`f${k}`}
            x1={boundaryX(k)}
            y1={topY}
            x2={boundaryX(k)}
            y2={botY}
            stroke="var(--line-strong)"
            strokeWidth={startFret === 0 && k === 0 ? 4 : 1}
          />
        ))}

        {/* strings (low E thickest), drawn full-width so they fade out */}
        {strings.map((s) => (
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
                  fontFamily="var(--font-ui), 'Apple Symbols', 'Segoe UI Symbol', sans-serif"
                >
                  {degreeGlyphs(n.label)}
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
