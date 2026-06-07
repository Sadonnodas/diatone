import type { Question } from '../lib/engine';
import type { Feedback } from '../state/trainerReducer';
import { renderJazz } from './ChordDisplay';

// Render a content string (one or more space-separated jazz tokens).
function Glyphs({ text, className }: { text: string; className: string }) {
  const tokens = text.split(' ');
  const multi = tokens.length > 1;
  return (
    <div className={`${className} ${multi ? 'multi' : 'single'}`}>
      {multi ? tokens.map((t, i) => <span key={i}>{renderJazz(t, `g${i}`)}</span>) : renderJazz(text, 'g')}
    </div>
  );
}

// The key/transpose context — the only words on the play screen. Everything
// else about the task (chord vs numeral, triad vs 7th) is implied by the keypad.
function Context({ keys }: { keys: string[] }) {
  if (keys.length === 2) {
    return (
      <div className="ctx reveal" style={{ animationDelay: '.04s' }}>
        <span className="lead">from</span>
        <span className="k">{renderJazz(keys[0], 'kf')}</span>
        <span className="lead">to</span>
        <span className="k">{renderJazz(keys[1], 'kt')}</span>
      </div>
    );
  }
  return (
    <div className="ctx reveal" style={{ animationDelay: '.04s' }}>
      <span className="lead">in the key of</span>
      <span className="k">{renderJazz(keys[0], 'k')}</span>
    </div>
  );
}

export function Prompt({
  question,
  feedback,
  userAnswer,
}: {
  question: Question;
  feedback: Feedback | null;
  userAnswer: string;
}) {
  const { prompt } = question;

  // Miss: show the correct answer big; recall the question quietly above it.
  if (feedback && !feedback.correct) {
    return (
      <>
        <Context keys={prompt.keys} />
        <Glyphs text={prompt.content} className="ask-recall" />
        <Glyphs text={feedback.correctAnswer} className="hero wrong" />
        <div className="guess">
          you played <span className="g">{renderJazz(userAnswer || '—', 'ua')}</span>
        </div>
      </>
    );
  }

  // Answering, or a correct answer (glyph pulses to the accent).
  return (
    <>
      <Context keys={prompt.keys} />
      <Glyphs
        text={prompt.content}
        className={`hero${feedback?.correct ? ' correct' : ''}`}
      />
      {feedback?.correct && <div className="tick">✓</div>}
    </>
  );
}
