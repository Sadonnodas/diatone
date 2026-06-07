import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  SCALE_SHAPES,
  SCALE_TYPE_INFO,
  SHAPE_ORDER,
  placeShape,
  noteKey,
  type ScaleType,
  type ShapeKey,
  type PlacedNote,
} from './scaleData';

export type ContextMode = 'rootGiven' | 'qualityGiven';

export interface FretSettings {
  scaleTypes: Record<ScaleType, boolean>;
  shapes: Record<ShapeKey, boolean>;
  contextModes: Record<ContextMode, boolean>;
  revealScaleType: boolean; // root-given: show the scale type instead of a hint button
  autoAdvance: boolean;
}

export const defaultFretSettings: FretSettings = {
  scaleTypes: {
    majorPentatonic: true,
    minorPentatonic: true,
    majorScale: false,
    naturalMinor: false,
  },
  shapes: { E: true, A: true, G: true, C: true, D: true },
  contextModes: { rootGiven: true, qualityGiven: false },
  revealScaleType: false,
  autoAdvance: true,
};

export interface FretQuestion {
  scaleType: ScaleType;
  shape: ShapeKey;
  contextMode: ContextMode;
  quality: 'major' | 'minor';
  target: string; // degree to find
  notes: PlacedNote[];
  startFret: number;
  endFret: number;
  correctKeys: string[];
  error?: string;
}

const SCALE_TYPES = Object.keys(SCALE_TYPE_INFO) as ScaleType[];

export function useFretboardGame(settings: FretSettings) {
  const [question, setQuestion] = useState<FretQuestion | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [answered, setAnswered] = useState(false);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [streak, setStreak] = useState(0);
  const [totalAsked, setTotalAsked] = useState(0);
  const timer = useRef<number | null>(null);

  const pool = useMemo(() => {
    const out: { scaleType: ScaleType; shape: ShapeKey }[] = [];
    for (const st of SCALE_TYPES) {
      if (!settings.scaleTypes[st]) continue;
      for (const sh of SHAPE_ORDER) {
        if (!settings.shapes[sh]) continue;
        if (SCALE_SHAPES[st]?.[sh]) out.push({ scaleType: st, shape: sh });
      }
    }
    return out;
  }, [settings.scaleTypes, settings.shapes]);

  const modes = useMemo(
    () => (Object.keys(settings.contextModes) as ContextMode[]).filter((m) => settings.contextModes[m]),
    [settings.contextModes],
  );

  const generate = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setSelected(new Set());
    setAnswered(false);
    setCorrect(null);

    if (pool.length === 0 || modes.length === 0) {
      setQuestion({ error: 'Pick at least one scale type, shape, and mode.' } as FretQuestion);
      return;
    }

    for (let attempt = 0; attempt < 200; attempt++) {
      const { scaleType, shape } = pool[Math.floor(Math.random() * pool.length)];
      const contextMode = modes[Math.floor(Math.random() * modes.length)];
      const rootFret = Math.floor(Math.random() * 12) + 1;
      const notes = placeShape(scaleType, shape, rootFret);
      if (!notes) continue;

      const degrees = Array.from(new Set(notes.map((n) => n.degree)));
      // In root-given mode the roots are marked, so '1' is trivial — exclude it.
      const candidates = contextMode === 'rootGiven' ? degrees.filter((d) => d !== '1') : degrees;
      if (candidates.length === 0) continue;

      const target = candidates[Math.floor(Math.random() * candidates.length)];
      const correctKeys = notes.filter((n) => n.degree === target).map(noteKey);

      const frets = notes.map((n) => n.fret);
      const startFret = Math.max(0, Math.min(...frets) - 1);
      const endFret = Math.max(...frets) + 1;

      setQuestion({
        scaleType,
        shape,
        contextMode,
        quality: SCALE_TYPE_INFO[scaleType].quality,
        target,
        notes,
        startFret,
        endFret,
        correctKeys,
      });
      return;
    }
    setQuestion({ error: 'Could not place a shape — try more shapes.' } as FretQuestion);
  }, [pool, modes]);

  // Regenerate when the pool/modes change (and on mount).
  useEffect(() => {
    generate();
  }, [generate]);

  const toggle = useCallback(
    (string: number, fret: number) => {
      if (answered) return;
      const key = `${string}-${fret}`;
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    },
    [answered],
  );

  const check = useCallback(() => {
    if (answered || !question || question.error) return;
    const target = new Set(question.correctKeys);
    const isCorrect = target.size === selected.size && [...target].every((k) => selected.has(k));
    setCorrect(isCorrect);
    setAnswered(true);
    setStreak((s) => (isCorrect ? s + 1 : 0));
    setTotalAsked((t) => t + 1);
    return isCorrect;
  }, [answered, question, selected]);

  const scheduleAdvance = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = window.setTimeout(generate, 900);
  }, [generate]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return {
    question,
    selected,
    answered,
    correct,
    streak,
    totalAsked,
    toggle,
    check,
    generate,
    scheduleAdvance,
  };
}
