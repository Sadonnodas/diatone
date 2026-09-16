import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CircleWheel, prettyChord, type Mark } from './CircleWheel';
import { WedgeBoard } from './WedgeBoard';
import { NameKeypad } from './NameKeypad';
import { OptionPad } from './OptionPad';
import { ProgressionStrip, type ProgressionCell } from './ProgressionPad';
import { Keypad, useAnswerBuilder } from '../components/AnswerInput';
import { CircleSettingsSheet } from './CircleSettings';
import { CircleOptions, circleReady } from './CircleOptions';
import { InfoModal } from '../components/InfoModal';
import { renderJazz } from '../components/ChordDisplay';
import { ThemeIconButton } from '../components/ThemeSwitch';
import {
  defaultCircleSettings,
  generateLayout,
  generateWedge,
  chooseDrill,
  generateProgression,
  layoutAnswerMatches,
  ringChord,
  segmentRoot,
  slotKey,
  wedgeAnswerMatches,
  wedgeToken,
  type CircleSettings,
  type LayoutQuestion,
  type ProgressionQuestion,
  type QuestionDrill,
  type WedgePlace,
  type WedgeQuestion,
  type WedgeSlot,
} from './circleData';
import { haptic, TAP, CORRECT, WRONG } from '../lib/haptics';
import { armUnlock, stopAll } from '../audio/engine';
import { useInstrument } from '../audio/instrument';
import { playChord, playProgression, prefetchChords } from '../audio/phrases';
import { chordToMidi } from '../audio/harmony';
import { answersMatch } from '../lib/normalize';
import type { MixedHooks } from '../lib/mixed';

const STORAGE_KEY = 'diatone.circle.v2';

/**
 * A question as it stood after its latest answer. Everything needed to redraw
 * it is stored on the entry — including the wedge's answer mode and guide —
 * so changing settings later doesn't change what an old question looked like.
 */
type HistoryEntry =
  | {
      drill: 'layout';
      run: number;
      layout: LayoutQuestion;
      marks: Record<string, Mark>;
      revealed: Record<string, string>;
      misses: { want: string; typed: string }[];
      answered: number;
    }
  | {
      drill: 'progression';
      run: number;
      prog: ProgressionQuestion;
      guide: boolean;
      cells: ProgressionCell[];
      placed: Record<string, string>;
      marks: Record<string, Mark>;
      misses: { degree: string; tapped: string }[];
      answered: number;
    }
  | {
      drill: 'wedge';
      run: number;
      wedge: WedgeQuestion;
      place: WedgePlace;
      guide: boolean;
      placed: Record<string, string>;
      marks: Record<string, Mark>;
      misses: { degree: string; typed: string }[];
      answered: number;
    };

/** What each wedge slot prints before it's answered: the numeral guide when
    you're building chords (if it's on), the chord when you're giving
    numerals. */
function hintsFor(slots: WedgeSlot[], place: WedgePlace, guide: boolean): Record<string, string> {
  const out: Record<string, string> = {};
  for (const w of slots) {
    if (place === 'numerals') out[w.degree] = w.chord;
    else if (guide) out[w.degree] = w.degree;
  }
  return out;
}
const ADVANCE_MS = 850;

function loadSettings(): CircleSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<CircleSettings>;
      return {
        ...defaultCircleSettings,
        ...saved,
        rings: { ...defaultCircleSettings.rings, ...(saved.rings ?? {}) },
        keys: saved.keys?.length ? saved.keys : defaultCircleSettings.keys,
      };
    }
  } catch {
    /* ignore */
  }
  return defaultCircleSettings;
}

/** One line under a reviewed question: how it went, and what you said when
    you missed — the question itself already shows the right answers. */
function ReviewSummary({ answered, total, misses }: { answered: number; total: number; misses: string[] }) {
  const partial = answered < total ? `${answered} of ${total} answered` : null;
  if (misses.length === 0) {
    return <span className="lead">{partial ? `${partial} · all right` : `all ${total} right`}</span>;
  }
  return (
    <span className="miss">
      {partial ? `${partial} · ` : ''}you said {misses.join(' · ')}
    </span>
  );
}

export default function CircleGame({
  onBack,
  skipSetup = false,
  mixed,
}: {
  onBack: () => void;
  /** Go straight into the drill with the saved settings, if they can make a
      question. */
  skipSetup?: boolean;
  mixed?: MixedHooks;
}) {
  const [settings, setSettings] = useState<CircleSettings>(loadSettings);
  const [phase, setPhase] = useState<'setup' | 'play'>(() =>
    (skipSetup || mixed) && circleReady(settings) ? 'play' : 'setup',
  );
  const mixedRef = useRef(mixed);
  mixedRef.current = mixed;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [streak, setStreak] = useState(0);
  const [flash, setFlash] = useState<'' | 'flash-ok' | 'flash-no'>('');

  // Layout drill
  const [layout, setLayout] = useState<LayoutQuestion | null>(null);
  const [step, setStep] = useState(0);
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [letter, setLetter] = useState<string | null>(null);
  const [acc, setAcc] = useState<'' | 'b' | '#'>('');

  // Wedge drill
  const [wedge, setWedge] = useState<WedgeQuestion | null>(null);
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [wedgeMarks, setWedgeMarks] = useState<Record<string, Mark>>({});
  // The slot being answered. Nothing is offered to pick from: you tap a slot
  // and build its chord on the Numerals keypad, so it's recall, not
  // recognition.
  const [pickedSlot, setPickedSlot] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ typed: string; right: boolean } | null>(null);
  const [layoutMisses, setLayoutMisses] = useState<{ want: string; typed: string }[]>([]);
  const [wedgeMisses, setWedgeMisses] = useState<{ degree: string; typed: string }[]>([]);

  // Progression drill
  const [prog, setProg] = useState<ProgressionQuestion | null>(null);
  const [cells, setCells] = useState<ProgressionCell[]>([]);
  const [progPlaced, setProgPlaced] = useState<Record<string, string>>({});
  const [progMarks, setProgMarks] = useState<Record<string, Mark>>({});
  const [progMisses, setProgMisses] = useState<{ degree: string; tapped: string }[]>([]);
  const [lastTap, setLastTap] = useState<{ chord: string; right: boolean } | null>(null);
  // The slot tapped for this step. Tapping is only half the answer: the chord
  // that goes there still has to be built.
  const [progTapped, setProgTapped] = useState<string | null>(null);

  // Past questions, newest last. reviewIndex null means playing live.
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);

  const timer = useRef<number | null>(null);
  const runId = useRef(0);
  // What kind of question is on screen. In a layout/wedge mix this changes from
  // question to question, so everything below keys off it, not the setting.
  const [qDrill, setQDrill] = useState<QuestionDrill>(settings.drill === 'wedge' ? 'wedge' : 'layout');
  const recentDrills = useRef<QuestionDrill[]>([]);
  // What the current question was made for, so a settings change can tell
  // whether it still fits.
  const questionDrill = useRef<QuestionDrill | null>(null);
  const questionPlace = useRef<WedgePlace>(settings.place);
  const lastKey = useRef<string | undefined>(undefined);
  const { instrument } = useInstrument();

  useEffect(armUnlock, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings]);

  const isWedge = qDrill === 'wedge';
  const isProg = qDrill === 'progression';

  const generate = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    stopAll();
    runId.current += 1;
    setFlash('');
    setReviewIndex(null);
    const kind = chooseDrill(settings, recentDrills.current);
    recentDrills.current = [...recentDrills.current.slice(-1), kind];
    questionDrill.current = kind;
    questionPlace.current = settings.place;
    setQDrill(kind);
    if (kind === 'progression') {
      const q = generateProgression(settings, Math.random, lastKey.current);
      lastKey.current = q.key || undefined;
      setProg(q);
      setCells(q.degrees.map((degree) => ({ degree })));
      setProgPlaced({});
      setProgMarks({});
      setProgMisses([]);
      setLastTap(null);
      setProgTapped(null);
    } else if (kind === 'wedge') {
      const q = generateWedge(settings, Math.random, lastKey.current);
      lastKey.current = q.key || undefined;
      setWedge(q);
      setPlaced({});
      setWedgeMarks({});
      setPickedSlot(null);
      setLastResult(null);
      setWedgeMisses([]);
    } else {
      setLayout(generateLayout(settings));
      setStep(0);
      setMarks({});
      setRevealed({});
      setLayoutMisses([]);
      setLetter(null);
      setAcc('');
    }
  }, [settings]);

  // Does the question on screen still fit the settings? Playback, auto-advance,
  // the numeral guide and the palette never change a question, so closing the
  // settings sheet after touching only those keeps your place — including a
  // half-answered wheel or wedge. Anything that changes what's being asked
  // (drill, rings, gap count, keys, answer mode) starts a fresh one.
  const fits = (): boolean => {
    const kind = questionDrill.current;
    if (!kind || (settings.drill !== 'mix' && settings.drill !== kind)) return false;
    if (kind === 'progression') {
      return !!prog && !prog.error && settings.keys.includes(prog.key);
    }
    if (kind === 'wedge') {
      return (
        !!wedge &&
        !wedge.error &&
        settings.keys.includes(wedge.key) &&
        questionPlace.current === settings.place &&
        (settings.style === 'mix' || settings.place === 'numerals' || wedge.style === settings.style)
      );
    }
    return (
      !!layout &&
      !layout.error &&
      layout.blanks.length === Math.max(1, settings.gaps) &&
      layout.blanks.every((b) => b.ring !== 'dim' && settings.rings[b.ring])
    );
  };
  const fitsRef = useRef(fits);
  fitsRef.current = fits;

  // Nothing is generated on the setup screen — the drill starts on Start.
  useEffect(() => {
    if (phase !== 'play' || fitsRef.current()) return;
    generate();
  }, [generate, phase]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      stopAll();
    },
    [],
  );

  // Warm whatever this question can sound.
  useEffect(() => {
    if (!settings.playback) return;
    const names = isProg
      ? (prog?.slots ?? []).map((w) => w.chord)
      : isWedge
        ? (wedge?.slots ?? []).map((w) => w.chord)
        : (layout?.blanks ?? []).map((s) => ringChord(s.ring, s.pos));
    const chords = names.map(chordToMidi).filter((c): c is number[] => c !== null);
    if (chords.length) prefetchChords(instrument, chords);
  }, [wedge, layout, prog, isWedge, isProg, instrument, settings.playback]);

  const sound = (chord: string) => {
    if (!settings.playback) return;
    const notes = chordToMidi(chord);
    if (notes) void playChord(instrument, notes);
  };

  // Move past the question: prepare the next one, and in a mixed session let
  // the session hand over.
  const next = () => {
    generate();
    mixedRef.current?.onDone();
  };

  const finish = (allDone: boolean) => {
    if (!allDone || !settings.autoAdvance) return;
    const mine = runId.current;
    timer.current = window.setTimeout(() => {
      if (runId.current === mine) next();
    }, ADVANCE_MS);
  };

  // Keep the history entry for the current question in step with it: added on
  // its first answer, replaced on each one after. A question you walk away from
  // halfway is still there to look back at.
  const record = (entry: HistoryEntry) =>
    setHistory((h) => {
      const i = h.findIndex((e) => e.run === entry.run);
      if (i < 0) return [...h, entry];
      const next = [...h];
      next[i] = entry;
      return next;
    });

  // ── Layout drill ──────────────────────────────────────────────────────────
  const layoutDone = layout ? step >= layout.blanks.length : false;
  const asked = layout && !layoutDone ? layout.blanks[step] : null;

  const answerName = () => {
    if (!asked || !letter || !layout) return;
    const typed = letter + (acc === 'b' ? 'b' : acc === '#' ? '#' : '');
    const right = layoutAnswerMatches(typed, asked);
    mixedRef.current?.onResult(right);
    haptic(right ? CORRECT : WRONG);
    setStreak((s) => (right ? s + 1 : 0));
    setFlash(right ? 'flash-ok' : 'flash-no');
    window.setTimeout(() => setFlash(''), 460);

    const key = slotKey(asked);
    const nextMarks: Record<string, Mark> = { ...marks, [key]: right ? 'ok' : 'no' };
    // A miss fills the segment in with its real name, so the correction lands
    // in the place you got wrong rather than in a message.
    const nextRevealed = { ...revealed, [key]: right ? typed : segmentRoot(asked) };
    const nextMisses = right ? layoutMisses : [...layoutMisses, { want: segmentRoot(asked), typed }];
    setMarks(nextMarks);
    setRevealed(nextRevealed);
    setLayoutMisses(nextMisses);
    setLetter(null);
    setAcc('');
    sound(ringChord(asked.ring, asked.pos));
    const next = step + 1;
    setStep(next);
    record({
      drill: 'layout',
      run: runId.current,
      layout,
      marks: nextMarks,
      revealed: nextRevealed,
      misses: nextMisses,
      answered: next,
    });
    finish(next >= layout.blanks.length);
  };

  // ── Wedge drill ───────────────────────────────────────────────────────────
  const wedgeDone = wedge ? Object.keys(placed).length >= wedge.slots.length : false;

  const numeralsMode = settings.place === 'numerals';
  const picking = wedge?.style === 'pick';
  // Build: the slot you tapped. Pick: the next unanswered slot in the
  // question's order, highlighted for you.
  const activeDegree = picking
    ? (wedge!.order.find((d) => !placed[d]) ?? null)
    : pickedSlot;
  const pickedWedgeSlot =
    wedge && activeDegree ? (wedge.slots.find((w) => w.degree === activeDegree) ?? null) : null;

  const answerWedge = (typed: string) => {
    if (!wedge || !pickedWedgeSlot) return;
    const w = pickedWedgeSlot;
    const right = wedgeAnswerMatches(typed, w, settings.place);
    mixedRef.current?.onResult(right);
    haptic(right ? CORRECT : WRONG);
    setStreak((st) => (right ? st + 1 : 0));
    setFlash(right ? 'flash-ok' : 'flash-no');
    window.setTimeout(() => setFlash(''), 460);

    // The slot always ends up showing the right answer — green if you had it,
    // red if you didn't — and what you typed goes in the line above.
    const nextPlaced = { ...placed, [w.degree]: wedgeToken(w, settings.place) };
    const nextMarks: Record<string, Mark> = { ...wedgeMarks, [w.degree]: right ? 'ok' : 'no' };
    const nextMisses = right ? wedgeMisses : [...wedgeMisses, { degree: w.degree, typed }];
    setPlaced(nextPlaced);
    setWedgeMarks(nextMarks);
    setWedgeMisses(nextMisses);
    setLastResult({ typed, right });
    setPickedSlot(null);
    sound(w.chord);
    const answered = Object.keys(nextPlaced).length;
    record({
      drill: 'wedge',
      run: runId.current,
      wedge,
      place: settings.place,
      guide: settings.guide,
      placed: nextPlaced,
      marks: nextMarks,
      misses: nextMisses,
      answered,
    });
    finish(answered >= wedge.slots.length);
  };

  // The Numerals keypad, driven by the picked slot: root → accidental →
  // quality to answer a chord, or a single degree tap in the numerals drill.
  // It's always given a target in the right mode, even with nothing picked,
  // so the keypad doesn't swap layouts the moment a slot is tapped.

  const tapSlot = (degree: string) => {
    if (!wedge || picking || placed[degree] || wedgeDone) return;
    haptic(TAP);
    setPickedSlot((cur) => (cur === degree ? null : degree));
  };

  // What each slot already shows. Placing chords, that's the numeral guide (if
  // it's on); placing numerals, it's always the chord — which is the whole
  // point of the reverse drill.
  const hints = useMemo(
    () => (wedge ? hintsFor(wedge.slots, settings.place, settings.guide) : {}),
    [wedge, settings.place, settings.guide],
  );

  // ── Progression drill ─────────────────────────────────────────────────────
  const progStep = cells.findIndex((c) => !c.chord);
  const progDone = !!prog && cells.length > 0 && progStep === -1;
  const progChord = (degree: string) => prog?.slots.find((w) => w.degree === degree)?.chord ?? '';
  const progWant = prog && !progDone ? prog.degrees[progStep] : null;
  // Tapped the right slot, now owes the chord.
  const progNeedsChord = !!progWant && progTapped !== null;

  const playWholeProgression = (): Promise<number> => {
    if (!prog) return Promise.resolve(0);
    const chords = prog.degrees.map(progChord).map(chordToMidi).filter((c): c is number[] => c !== null);
    return playProgression(instrument, chords);
  };

  /** One step's verdict: the strip takes the right chord either way, the slot
      is marked, and the progression plays once it's spelled out. */
  const settleProgStep = (right: boolean, missNote?: string) => {
    if (!prog || !progWant) return;
    mixedRef.current?.onResult(right);
    haptic(right ? CORRECT : WRONG);
    setStreak((st) => (right ? st + 1 : 0));
    setFlash(right ? 'flash-ok' : 'flash-no');
    window.setTimeout(() => setFlash(''), 460);

    const chord = progChord(progWant);
    const nextCells = cells.map((c, i) => (i === progStep ? { ...c, chord, right } : c));
    const nextPlaced = { ...progPlaced, [progWant]: chord };
    const nextMarks: Record<string, Mark> = { ...progMarks, [progWant]: right ? 'ok' : 'no' };
    const nextMisses = right
      ? progMisses
      : [...progMisses, { degree: progWant, tapped: missNote ?? '' }];
    setCells(nextCells);
    setProgPlaced(nextPlaced);
    setProgMarks(nextMarks);
    setProgMisses(nextMisses);
    setProgTapped(null);

    const answered = progStep + 1;
    record({
      drill: 'progression',
      run: runId.current,
      prog,
      guide: false,
      cells: nextCells,
      placed: nextPlaced,
      marks: nextMarks,
      misses: nextMisses,
      answered,
    });

    if (answered < prog.degrees.length) {
      sound(chord);
      return;
    }
    if (!settings.playback) {
      finish(true);
      return;
    }
    const mine = runId.current;
    void playWholeProgression().then(() => {
      if (settings.autoAdvance && runId.current === mine) next();
    });
  };

  const tapProgSlot = (degree: string) => {
    if (!prog || progDone || progNeedsChord || reviewIndex !== null) return;
    if (degree !== progWant) {
      // Wrong slot: the step is missed, and the right one is filled in.
      setLastTap({ chord: progChord(degree), right: false });
      settleProgStep(false, progChord(degree));
      return;
    }
    haptic(TAP);
    setLastTap(null);
    setProgTapped(degree);
  };

  const answerProgChord = (typed: string) => {
    if (!prog || !progWant || !progNeedsChord) return;
    const right = answersMatch(typed, progChord(progWant));
    setLastTap({ chord: typed, right });
    settleProgStep(right, typed);
  };

  // One keypad, shared: the wedge drill's picked slot, or the progression's
  // tapped slot. Always given a target in the right mode so it doesn't swap
  // layouts when a slot is chosen.
  const builder = useAnswerBuilder({
    question: {
      mode: !isProg && numeralsMode ? 4 : 1,
      answer: isProg
        ? progNeedsChord && progWant
          ? progChord(progWant)
          : ''
        : pickedWedgeSlot
          ? wedgeToken(pickedWedgeSlot, settings.place)
          : '',
      seed: isProg
        ? `${runId.current}:p${progStep}:${progTapped ?? '-'}`
        : `${runId.current}:${pickedSlot ?? '-'}`,
    },
    use7thChords: false,
    disabled: isProg ? !progNeedsChord : !pickedWedgeSlot || wedgeDone,
    onSubmit: (ascii) => (isProg ? answerProgChord(ascii) : answerWedge(ascii)),
    onTap: () => haptic(TAP),
  });

  // ── Review ────────────────────────────────────────────────────────────────
  const reviewing = reviewIndex !== null;
  const entry = reviewing ? (history[reviewIndex] ?? null) : null;

  const enterReview = () => {
    if (history.length === 0) return;
    if (timer.current) clearTimeout(timer.current);
    stopAll();
    setReviewIndex(history.length - 1);
  };
  const reviewNav = (dir: number) =>
    setReviewIndex((i) => (i === null ? null : Math.max(0, Math.min(history.length - 1, i + dir))));
  const exitReview = () => setReviewIndex(null);

  const done = isProg ? progDone : isWedge ? wedgeDone : layoutDone;
  const advance = () => {
    if (done && !reviewing) next();
  };
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  const waitingToAdvance = done && !settings.autoAdvance && !reviewing;
  const error = isProg ? prog?.error : isWedge ? wedge?.error : layout?.error;

  // Set the drill up before it starts, rather than dropping straight into
  // whichever one was used last.
  if (phase === 'setup') {
    const ready = circleReady(settings);
    return (
      <div className="app">
        <div className="top reveal" style={{ animationDelay: '.02s' }}>
          <div className="top-left">
            <button className="icon-btn" aria-label="Home" onClick={onBack}>
              ←
            </button>
          </div>
          <div className="top-right">
            <ThemeIconButton />
          </div>
        </div>
        <div className="stage circle-setup">
          <div className="setup-head reveal" style={{ animationDelay: '.04s' }}>
            <div className="setup-title">Circle of fifths</div>
          </div>
          <div className="circle-setup-body reveal" style={{ animationDelay: '.08s' }}>
            <CircleOptions settings={settings} onChange={setSettings} />
          </div>
        </div>
        <div className="fret-actions">
          <button className="bigbtn" onClick={() => setPhase('play')} disabled={!ready}>
            Start
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`app ${flash}`} onClick={advance}>
      <div className="top reveal" style={{ animationDelay: '.02s' }} onClick={stop}>
        <div className="top-left">
          <button className="icon-btn" aria-label="Home" onClick={onBack}>
            ←
          </button>
          <div className="streak" aria-label={`Streak ${mixed ? mixed.streak : streak}`}>
            <span className="dot" />
            <span className="n">{mixed ? mixed.streak : streak}</span>
            <span className="streak-word">streak</span>
          </div>
        </div>
        <div className="top-right">
          <button className="icon-btn" aria-label="How it works" onClick={() => setInfoOpen(true)}>
            ?
          </button>
          <button
            className="icon-btn"
            aria-label="Review"
            onClick={enterReview}
            disabled={history.length === 0}
          >
            ↺
          </button>
          <ThemeIconButton />
          <button className="icon-btn" aria-label="Settings" onClick={() => setSettingsOpen(true)}>
            ⚙
          </button>
        </div>
      </div>

      {entry ? (
        <div className={`stage ${entry.drill === 'layout' ? 'cof-stage' : 'wedge-stage'}`}>
          {entry.drill === 'progression' ? (
            <>
              <div className="ctx">
                <span className="lead">in the key of</span>
                <span className="k">{renderJazz(entry.prog.key, 'rpk')}</span>
              </div>
              <div className="review-prog">
                {entry.cells.map((c, i) => (
                  <span key={i} className={c.chord ? (c.right ? 'ok' : 'no') : ''}>
                    <small>{c.degree}</small>
                    {c.chord ? renderJazz(prettyChord(c.chord), `rpc${i}`) : '·'}
                  </span>
                ))}
              </div>
              <div className="wedge-status">
                <ReviewSummary
                  answered={entry.answered}
                  total={entry.prog.degrees.length}
                  misses={entry.misses.map((m) => `${prettyChord(m.tapped)} for ${m.degree}`)}
                />
              </div>
              <div className="wedge-wrap" onClick={stop}>
                <WedgeBoard
                  slots={entry.prog.slots}
                  placed={entry.placed}
                  marks={entry.marks}
                  hints={{}}
                  picked={null}
                  onTapSlot={() => {}}
                />
              </div>
            </>
          ) : entry.drill === 'wedge' ? (
            <>
              <div className="ctx">
                <span className="lead">in the key of</span>
                <span className="k">{renderJazz(entry.wedge.key, 'rk')}</span>
              </div>
              <div className="wedge-status">
                <ReviewSummary
                  answered={entry.answered}
                  total={entry.wedge.slots.length}
                  misses={entry.misses.map((m) => `${m.degree}: ${prettyChord(m.typed)}`)}
                />
              </div>
              <div className="wedge-wrap" onClick={stop}>
                <WedgeBoard
                  slots={entry.wedge.slots}
                  placed={entry.placed}
                  marks={entry.marks}
                  hints={hintsFor(entry.wedge.slots, entry.place, entry.guide)}
                  picked={null}
                  onTapSlot={() => {}}
                />
              </div>
            </>
          ) : (
            <>
              <div className="ctx">
                <span className="lead">review</span>
              </div>
              <div className="cof-wheel">
                <CircleWheel
                  blanks={entry.layout.blanks}
                  marks={entry.marks}
                  highlight={null}
                  revealed={entry.revealed}
                />
              </div>
              <div className="wedge-status">
                <ReviewSummary
                  answered={entry.answered}
                  total={entry.layout.blanks.length}
                  misses={entry.misses.map((m) => `${prettyChord(m.typed)} for ${prettyChord(m.want)}`)}
                />
              </div>
            </>
          )}
        </div>
      ) : (
      <div className={`stage ${isWedge || isProg ? 'wedge-stage' : 'cof-stage'}`}>
        {error ? (
          <div className="empty">
            {error}
            <div style={{ marginTop: 16 }}>
              <button className="pill on" onClick={() => setSettingsOpen(true)}>
                Open settings
              </button>
            </div>
          </div>
        ) : isProg && prog ? (
          <>
            <div className="ctx reveal" style={{ animationDelay: '.04s' }}>
              <span className="lead">in the key of</span>
              <span className="k">{renderJazz(prog.key, 'pk')}</span>
            </div>

            <div className="wedge-status" aria-live="polite">
              {progDone ? (
                settings.playback ? (
                  <button
                    className="hear"
                    onClick={() => {
                      if (timer.current) clearTimeout(timer.current);
                      void playWholeProgression();
                    }}
                  >
                    ▶ hear it again
                  </button>
                ) : (
                  <span className="lead">spelled out</span>
                )
              ) : progNeedsChord ? (
                <span className="lead">
                  now build <b className="numeral">{progWant}</b>
                </span>
              ) : lastTap && !lastTap.right ? (
                <span className="miss">you said {prettyChord(lastTap.chord)}</span>
              ) : (
                <span className="lead">
                  tap <b className="numeral">{progWant}</b> on the wedge
                </span>
              )}
            </div>

            <div className="prog-slot">
              <ProgressionStrip cells={cells} step={progStep} />
            </div>

            <div className="wedge-wrap reveal" onClick={stop} style={{ animationDelay: '.08s' }}>
              {/* No numerals printed on the slots: finding them is the question. */}
              <WedgeBoard
                slots={prog.slots}
                placed={progPlaced}
                marks={progMarks}
                hints={{}}
                picked={progTapped}
                tapFilled
                onTapSlot={tapProgSlot}
              />
            </div>
            {waitingToAdvance && <div className="next-hint">tap to continue →</div>}
          </>
        ) : isWedge && wedge ? (
          <>
            <div className="ctx reveal" style={{ animationDelay: '.04s' }}>
              <span className="lead">in the key of</span>
              <span className="k">{renderJazz(wedge.key, 'wk')}</span>
            </div>

            <div className="wedge-status" aria-live="polite">
              {wedgeDone ? (
                <span className="lead">filled in</span>
              ) : lastResult && !lastResult.right && picking ? (
                <span className="miss">you said {prettyChord(lastResult.typed)}</span>
              ) : picking ? (
                <span className="lead">which chord goes there?</span>
              ) : pickedWedgeSlot ? (
                <span className="lead">{numeralsMode ? 'tap its numeral' : 'build its chord'}</span>
              ) : lastResult && !lastResult.right ? (
                <span className="miss">you said {prettyChord(lastResult.typed)}</span>
              ) : (
                <span className="lead">tap a slot</span>
              )}
            </div>

            <div className="prog-slot" />

            <div className="wedge-wrap reveal" onClick={stop} style={{ animationDelay: '.08s' }}>
              <WedgeBoard
                slots={wedge.slots}
                placed={placed}
                marks={wedgeMarks}
                hints={hints}
                picked={activeDegree}
                onTapSlot={tapSlot}
              />
            </div>
            {waitingToAdvance && <div className="next-hint">tap to continue →</div>}
          </>
        ) : layout ? (
          <>
            <div className="ctx reveal" style={{ animationDelay: '.04s' }}>
              <span className="lead">{layoutDone ? 'filled in' : 'name the gap'}</span>
            </div>
            <div className="cof-wheel reveal" style={{ animationDelay: '.08s' }}>
              <CircleWheel
                blanks={layout.blanks}
                marks={marks}
                highlight={asked ? slotKey(asked) : null}
                revealed={revealed}
              />
            </div>
            <div className="cof-progress">
              {layout.blanks.map((b, i) => {
                const k = slotKey(b);
                return (
                  <span
                    key={k}
                    className={`dotp${i < step ? (marks[k] === 'ok' ? ' ok' : ' no') : ''}${
                      i === step ? ' live' : ''
                    }`}
                  />
                );
              })}
            </div>
            {waitingToAdvance && <div className="next-hint">tap to continue →</div>}
          </>
        ) : null}
      </div>
      )}

      {reviewing && (
        <div className="fret-actions" onClick={stop}>
          <div className="review-nav" style={{ width: '100%', maxWidth: 360 }}>
            <button onClick={() => reviewNav(-1)} disabled={reviewIndex === 0}>
              ← Older
            </button>
            <button onClick={exitReview}>Return</button>
            <button onClick={() => reviewNav(1)} disabled={reviewIndex === history.length - 1}>
              Newer →
            </button>
          </div>
          <div className="review-count">
            {(reviewIndex ?? 0) + 1} of {history.length}
          </div>
        </div>
      )}

      {!reviewing && isProg && !error && prog && (
        <div onClick={stop}>
          <Keypad builder={builder} disabled={!progNeedsChord} />
        </div>
      )}

      {!reviewing && isWedge && !error && wedge && (
        <div onClick={stop}>
          {picking ? (
            <OptionPad
              options={pickedWedgeSlot ? wedge.options[pickedWedgeSlot.degree] : []}
              disabled={!pickedWedgeSlot || wedgeDone}
              onPick={(chord) => {
                haptic(TAP);
                answerWedge(chord);
              }}
            />
          ) : (
            <Keypad builder={builder} disabled={!pickedWedgeSlot || wedgeDone} />
          )}
        </div>
      )}

      {!reviewing && !isWedge && !isProg && !error && (
        <div onClick={stop}>
          <NameKeypad
            letter={letter}
            acc={acc}
            onLetter={(l) => {
              haptic(TAP);
              setLetter(l);
              setAcc('');
            }}
            onAcc={(a) => {
              haptic(TAP);
              setAcc((cur) => (cur === a ? '' : a));
            }}
            onClear={() => {
              setLetter(null);
              setAcc('');
            }}
            onAnswer={answerName}
            disabled={layoutDone}
          />
        </div>
      )}

      {settingsOpen && (
        <div onClick={stop}>
          <CircleSettingsSheet
            settings={settings}
            onChange={setSettings}
            onClose={() => setSettingsOpen(false)}
          />
        </div>
      )}

      {infoOpen && (
        <div onClick={stop}>
          <InfoModal title="Circle of fifths" onClose={() => setInfoOpen(false)}>
            <p>
              Two drills, or a mix of both. <b>Layout</b> blanks segments of the wheel and you
              name them. <b>Key wedge</b> zooms in on one key: tap a slot and build its chord —
              or, in the pick style, choose it from six for each highlighted slot in turn.
            </p>
            <p>
              The wheel is laid out like the printed one: majors nearest the centre, each
              relative minor immediately outside its major, and the <b>vii°</b> tabs on the rim.
            </p>
            <p>
              A key's seven chords are always the same shape — <b>IV</b> one step anticlockwise,{' '}
              <b>V</b> one step clockwise, the minors directly outside. The wedge drill turns
              that shape to the top every time, so what you learn is the shape rather than twelve
              separate pictures.
            </p>
            <p className="info-dim">
              Either spelling of a seam segment is accepted — F♯ and G♭ are the same place.
            </p>
          </InfoModal>
        </div>
      )}
    </div>
  );
}
