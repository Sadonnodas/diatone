import React from 'react';
import type { Question } from '../lib/engine';
import { renderJazz } from './ChordDisplay';

const MODE_NAMES: Record<number, string> = {
  1: 'Name Chord',
  2: 'Progression',
  3: 'Transpose',
  4: 'Name Numeral',
};

// §10 — render the prompt template, styling {key} (accent) and {chordType} (accent).
function renderTemplate(text: string, keys: string[], chordType?: string): React.ReactNode[] {
  const parts = text.split(/(\{key\}|\{chordType\})/);
  let keyIdx = 0;
  return parts
    .filter((p) => p !== '')
    .map((p, i) => {
      if (p === '{key}') {
        const k = keys[keyIdx++] ?? '';
        return (
          <span className="k" key={i}>
            {k}
          </span>
        );
      }
      if (p === '{chordType}') {
        return (
          <span className="ct" key={i}>
            {chordType}
          </span>
        );
      }
      return <React.Fragment key={i}>{p}</React.Fragment>;
    });
}

export function Prompt({
  question,
  feedback,
}: {
  question: Question;
  feedback: 'correct' | 'wrong' | null;
}) {
  const { prompt, mode, reminder } = question;
  const tokens = prompt.content.split(' ');
  const multi = tokens.length > 1;
  const heroColor =
    feedback === 'correct' ? 'var(--accent)' : feedback === 'wrong' ? 'var(--text-2)' : undefined;

  return (
    <>
      <div className="eyebrow reveal" style={{ animationDelay: '.06s' }}>
        {MODE_NAMES[mode]}
      </div>
      <div className="sub reveal" style={{ animationDelay: '.1s' }}>
        {renderTemplate(prompt.text, prompt.keys, prompt.chordType)}
      </div>
      <div
        className={`hero reveal ${multi ? 'multi' : 'single'}`}
        style={{ animationDelay: '.14s', color: heroColor }}
      >
        {multi
          ? tokens.map((t, i) => <span key={i}>{renderJazz(t, `h${i}`)}</span>)
          : renderJazz(prompt.content, 'h')}
      </div>
      {!feedback && (
        <div className="hint reveal" style={{ animationDelay: '.18s' }}>
          {reminder}
        </div>
      )}
    </>
  );
}
