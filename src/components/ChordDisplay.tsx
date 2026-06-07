import React from 'react';

// Renders a jazz-notation string. The quality glyphs △ (maj7), ø (m7b5), ° (dim)
// are wrapped in a neutral-font span so they render consistently regardless of
// the display serif's glyph coverage (§1.5 caveat — △ in particular is risky).
const GLYPHS = new Set(['△', 'ø', '°']);

export function renderJazz(text: string, keyPrefix = ''): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let buf = '';
  let i = 0;
  const flush = () => {
    if (buf) {
      out.push(<React.Fragment key={`${keyPrefix}t${i}`}>{buf}</React.Fragment>);
      buf = '';
    }
  };
  for (const ch of text) {
    if (GLYPHS.has(ch)) {
      flush();
      out.push(
        <span className="q-glyph" key={`${keyPrefix}g${i}`}>
          {ch}
        </span>,
      );
    } else {
      buf += ch;
    }
    i++;
  }
  flush();
  return out;
}

export function ChordDisplay({ text, className }: { text: string; className?: string }) {
  return <span className={className}>{renderJazz(text)}</span>;
}
