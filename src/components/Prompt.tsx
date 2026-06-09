import type { Question } from '../lib/engine';
import type { Feedback } from '../state/trainerReducer';
import { renderJazz } from './ChordDisplay';
import { Preview, type BuilderApi } from './AnswerInput';

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

// The key/transpose context — the only words on the play screen.
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

// Stable skeleton: a constant context, the prompt held in a fixed hero slot, and
// a fixed-height sub-area that shows the answer as you build it, then your
// answer + the verdict — so nothing reflows on submit.
export function Prompt({
  question,
  feedback,
  userAnswer,
  builder,
  autoAdvance,
}: {
  question: Question;
  feedback: Feedback | null;
  userAnswer: string;
  builder: BuilderApi;
  autoAdvance: boolean;
}) {
  const { prompt } = question;

  return (
    <>
      <Context keys={prompt.keys} />
      <Glyphs text={prompt.content} className="hero" />

      <div className="subarea">
        {!feedback ? (
          <Preview builder={builder} />
        ) : (
          <>
            <Glyphs
              text={userAnswer || '—'}
              className={`answer-line ${feedback.correct ? 'ok' : 'no'}`}
            />
            {feedback.correct ? (
              <div className="tick">✓</div>
            ) : (
              <div className="correct-line">
                answer <span className="g">{renderJazz(feedback.correctAnswer, 'ca')}</span>
              </div>
            )}
          </>
        )}
      </div>

      {feedback && !(feedback.correct && autoAdvance) && (
        <div className="next-hint">tap to continue →</div>
      )}
    </>
  );
}
