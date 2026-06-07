import React from 'react';

// Renders a jazz-notation string. Two kinds of glyph get wrapped in their own
// span so they render consistently regardless of the display serif's coverage:
//  - quality glyphs △ (maj7), ø (m7b5), ° (dim) — §1.5 caveat, △ is risky;
//  - accidentals ♯ / ♭ — ASCII '#'/'b' in the data are converted to the real
//    musical symbols and shown a touch smaller, the way an accidental is set.
const GLYPHS = new Set(['△', 'ø', '°']);
const isNote = (ch: string | undefined) => !!ch && /[A-Ga-g]/.test(ch);

export function renderJazz(text: string, keyPrefix = ''): React.ReactNode[] {
  const chars = Array.from(text);
  const out: React.ReactNode[] = [];
  let buf = '';
  const flush = (i: number) => {
    if (buf) {
      out.push(<React.Fragment key={`${keyPrefix}t${i}`}>{buf}</React.Fragment>);
      buf = '';
    }
  };
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    // A 'b' is a flat only when it follows a note letter (so e.g. the b5 in
    // m7b5 is left alone — though jazz display shows ø7 there anyway).
    const flat = ch === '♭' || (ch === 'b' && isNote(chars[i - 1]));
    const sharp = ch === '♯' || ch === '#';
    if (flat || sharp) {
      flush(i);
      out.push(
        <span className="acc" key={`${keyPrefix}a${i}`}>
          {flat ? '♭' : '♯'}
        </span>,
      );
    } else if (GLYPHS.has(ch)) {
      flush(i);
      out.push(
        <span className="q-glyph" key={`${keyPrefix}g${i}`}>
          {ch}
        </span>,
      );
    } else {
      buf += ch;
    }
  }
  flush(chars.length);
  return out;
}

export function ChordDisplay({ text, className }: { text: string; className?: string }) {
  return <span className={className}>{renderJazz(text)}</span>;
}
