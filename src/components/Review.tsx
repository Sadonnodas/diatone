import React from 'react';
import type { HistoryEntry } from '../state/trainerReducer';
import { renderJazz } from './ChordDisplay';

const MODE_NAMES: Record<number, string> = {
  1: 'Name Chord',
  2: 'Progression',
  3: 'Transpose',
  4: 'Name Numeral',
};

function renderTemplate(text: string, keys: string[], chordType?: string): React.ReactNode[] {
  const parts = text.split(/(\{key\}|\{chordType\})/).filter((p) => p !== '');
  let keyIdx = 0;
  return parts.map((p, i) => {
    if (p === '{key}')
      return (
        <span className="k" key={i}>
          {renderJazz(keys[keyIdx++] ?? '', `rk${i}`)}
        </span>
      );
    if (p === '{chordType}') return <React.Fragment key={i}>{chordType}</React.Fragment>;
    return <React.Fragment key={i}>{p}</React.Fragment>;
  });
}

export function Review({
  entry,
  index,
  total,
  onPrev,
  onNext,
  onClose,
}: {
  entry: HistoryEntry | null;
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-label="Review">
        <div className="grab" />
        <div className="sheet-head">
          <div className="sheet-title">Review</div>
          <button className="done-btn" onClick={onClose}>
            Done
          </button>
        </div>

        <div className="sheet-body">
          {!entry ? (
            <div className="empty">No questions answered yet.</div>
          ) : (
            <>
              <div className="review-card">
                <div className="review-prompt">
                  {renderTemplate(entry.prompt.text, entry.prompt.keys, entry.prompt.chordType)}
                  <div className="review-content">{renderJazz(entry.prompt.content, 'rc')}</div>
                </div>
                <div className="review-line">
                  <span className="lab">Your answer</span>
                  <span className={`val ${entry.correct ? 'ok' : 'no'}`}>
                    {entry.correct ? '✓ ' : '✕ '}
                    {renderJazz(entry.userAnswer || '—', 'ua')}
                  </span>
                </div>
                {!entry.correct && (
                  <div className="review-line">
                    <span className="lab">Correct</span>
                    <span className="val ok">{renderJazz(entry.correctAnswer, 'ca')}</span>
                  </div>
                )}
                <div className="review-line">
                  <span className="lab">Mode</span>
                  <span className="val" style={{ fontFamily: 'var(--font-ui)', fontSize: 14 }}>
                    {MODE_NAMES[entry.mode]}
                  </span>
                </div>
              </div>

              <div className="review-nav">
                <button onClick={onPrev} disabled={index <= 0}>
                  ← Older
                </button>
                <button onClick={onNext}>{index >= total - 1 ? 'Back to play' : 'Newer →'}</button>
              </div>
              <div className="review-count">
                {index + 1} of {total}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
