import React from 'react';

// Renders a jazz-notation string. Two kinds of glyph get wrapped in their own
// span so they render consistently regardless of the display serif's coverage:
//  - quality glyphs △ (maj7), ø (m7b5), ° (dim) — §1.5 caveat, △ is risky;
//  - accidentals ♯ / ♭ — ASCII '#'/'b' in the data are converted to the real
//    musical symbols and shown a touch smaller, the way an accidental is set.
const GLYPHS = new Set(['△', 'ø', '°']);
const isNote = (ch: string | undefined) => !!ch && /[A-Ga-g]/.test(ch);

type Piece = { kind: 'text' | 'acc' | 'glyph'; text: string };

/** The string cut into runs of plain text and the glyphs that need their own
    element. Shared so HTML and SVG renderings can't drift apart. */
function pieces(text: string): Piece[] {
  const chars = Array.from(text);
  const out: Piece[] = [];
  let buf = '';
  const flush = () => {
    if (buf) out.push({ kind: 'text', text: buf });
    buf = '';
  };
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    // A 'b' is a flat only when it follows a note letter (so e.g. the b5 in
    // m7b5 is left alone — though jazz display shows ø7 there anyway).
    const flat = ch === '♭' || (ch === 'b' && isNote(chars[i - 1]));
    const sharp = ch === '♯' || ch === '#';
    if (flat || sharp) {
      flush();
      out.push({ kind: 'acc', text: flat ? '♭' : '♯' });
    } else if (GLYPHS.has(ch)) {
      flush();
      out.push({ kind: 'glyph', text: ch });
    } else {
      buf += ch;
    }
  }
  flush();
  return out;
}

export function renderJazz(text: string, keyPrefix = ''): React.ReactNode[] {
  return pieces(text).map((piece, i) => {
    const key = `${keyPrefix}${piece.kind}${i}`;
    if (piece.kind === 'text') return <React.Fragment key={key}>{piece.text}</React.Fragment>;
    return (
      <span className={piece.kind === 'acc' ? 'acc' : 'q-glyph'} key={key}>
        {piece.text}
      </span>
    );
  });
}

/** The same, inside an SVG <text>, where a <span> would draw nothing. */
export function jazzTspans(text: string, keyPrefix = ''): React.ReactNode[] {
  return pieces(text).map((piece, i) => (
    <tspan
      className={piece.kind === 'text' ? undefined : piece.kind === 'acc' ? 'acc' : 'q-glyph'}
      key={`${keyPrefix}${piece.kind}${i}`}
    >
      {piece.text}
    </tspan>
  ));
}

export function ChordDisplay({ text, className }: { text: string; className?: string }) {
  return <span className={className}>{renderJazz(text)}</span>;
}
