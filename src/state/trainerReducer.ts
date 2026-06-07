// Trainer state: settings + seed + feedback + history. The visible question is
// always derived from seed + settings (§10). Settings changes rebuild the same
// seed's question, clear feedback, and keep the typed answer (§16/§18).

import {
  type Settings,
  type Seed,
  type Question,
  type PromptObj,
  pickSeed,
  isSeedValid,
  buildQuestionFromSeed,
} from '../lib/engine';
import { DEFAULT_KEYS } from '../lib/chordData';
import { answersMatch } from '../lib/normalize';

export interface Feedback {
  correct: boolean;
  correctAnswer: string; // jazz form
}

export interface HistoryEntry {
  prompt: PromptObj;
  key: string;
  mode: number;
  userAnswer: string;
  correctAnswer: string; // jazz form, matches prompt notation (§15)
  correct: boolean;
}

export interface TrainerState {
  settings: Settings;
  seed: Seed | null;
  userAnswer: string;
  feedback: Feedback | null;
  streak: number;
  tapCount: number;
  history: HistoryEntry[];
  reviewIndex: number | null; // null = live play; otherwise index into history
}

export const initialSettings: Settings = {
  selectedKeys: DEFAULT_KEYS,
  selectedModes: [1, 4],
  use7thChords: false,
  generationMethod: 'random',
  majorWeights: [10, 6, 4, 8, 10, 8, 2],
  degreeToggles: { I: true, ii: true, iii: true, IV: true, V: true, vi: true, 'vii°': true },
  autoAdvance: true,
  hideQuality: false,
};

export const initialState: TrainerState = {
  settings: initialSettings,
  seed: pickSeed(initialSettings),
  userAnswer: '',
  feedback: null,
  streak: 0,
  tapCount: 0,
  history: [],
  reviewIndex: null,
};

export type Action =
  | { type: 'SUBMIT'; answer: string; display: string }
  | { type: 'NEXT' }
  | { type: 'SET_ANSWER'; answer: string }
  | { type: 'TAP' }
  | { type: 'UPDATE_SETTINGS'; settings: Settings }
  | { type: 'REVIEW_PREV' }
  | { type: 'REVIEW_NEXT' }
  | { type: 'REVIEW_EXIT' };

// Derive the live question from the current seed + settings (null if unbuildable).
export const currentQuestion = (state: TrainerState): Question | null =>
  state.seed ? buildQuestionFromSeed(state.seed, state.settings) : null;

export function trainerReducer(state: TrainerState, action: Action): TrainerState {
  switch (action.type) {
    case 'SUBMIT': {
      // Locked once feedback is showing so a double-tap can't double-count (§18).
      if (state.feedback || state.reviewIndex !== null || !state.seed) return state;
      const q = buildQuestionFromSeed(state.seed, state.settings);
      const correct = answersMatch(action.answer, q.answer);
      const entry: HistoryEntry = {
        prompt: q.prompt,
        key: q.key,
        mode: q.mode,
        userAnswer: action.display, // jazz display form (§15)
        correctAnswer: q.answer,
        correct,
      };
      return {
        ...state,
        userAnswer: action.display,
        feedback: { correct, correctAnswer: q.answer },
        streak: correct ? state.streak + 1 : 0,
        history: [...state.history, entry],
      };
    }

    case 'NEXT': {
      return {
        ...state,
        seed: pickSeed(state.settings),
        userAnswer: '',
        feedback: null,
        tapCount: 0,
        reviewIndex: null,
      };
    }

    case 'SET_ANSWER':
      return { ...state, userAnswer: action.answer };

    case 'TAP':
      return { ...state, tapCount: state.tapCount + 1 };

    case 'UPDATE_SETTINGS': {
      const settings = action.settings;
      // Rebuild the same seed unless it's now invalid; then roll a fresh one (§10).
      const seed = isSeedValid(state.seed, settings) ? state.seed : pickSeed(settings);
      return {
        ...state,
        settings,
        seed,
        feedback: null, // clear stale feedback (§16); keep userAnswer
      };
    }

    case 'REVIEW_PREV': {
      if (state.history.length === 0) return state;
      const idx = state.reviewIndex === null ? state.history.length - 1 : state.reviewIndex - 1;
      return { ...state, reviewIndex: Math.max(0, idx) };
    }

    case 'REVIEW_NEXT': {
      if (state.reviewIndex === null) return state;
      const idx = state.reviewIndex + 1;
      return { ...state, reviewIndex: idx >= state.history.length ? null : idx };
    }

    case 'REVIEW_EXIT':
      return { ...state, reviewIndex: null };

    default:
      return state;
  }
}
