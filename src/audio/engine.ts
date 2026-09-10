// One-shot sample playback. Deliberately not Tone.js: nothing here needs a
// transport or a scheduler — a drill plays a handful of notes and stops. Web
// Audio on its own is about eighty lines, and Diatone stays dependency-free.

import type { SampleRef } from './samples';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

type Ctor = typeof AudioContext;

function ensureCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Impl: Ctor | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext;
    if (!Impl) return null;
    ctx = new Impl();
    master = ctx.createGain();
    master.gain.value = 0.85;
    master.connect(ctx.destination);
  }
  return ctx;
}

/**
 * Bring the context up. Safari/iOS start it suspended unless it's created or
 * resumed inside a user gesture, so this hangs off the first tap and off
 * every play call (which is always tap-driven anyway).
 *
 * Note the ringer switch still wins on iOS: with the phone on silent, a Web
 * Audio context plays nothing. That's an OS decision, not something the page
 * can override.
 */
export function unlockAudio(): void {
  const c = ensureCtx();
  if (c && c.state !== 'running') void c.resume();
}

/**
 * Bring the context up on the next tap anywhere. Screens call this on mount so
 * the context is alive well before the first note is due — creating it inside
 * the gesture that also wants to play tends to lose the first few milliseconds.
 * Returns a cleanup for the effect.
 */
export function armUnlock(): () => void {
  const handler = () => unlockAudio();
  window.addEventListener('pointerdown', handler, { once: true, passive: true });
  return () => window.removeEventListener('pointerdown', handler);
}

// Decoded samples, kept for the life of the page — the whole bank is ~1.7 MB
// on disk and a drill replays the same handful of notes constantly.
const buffers = new Map<string, AudioBuffer>();
const inflight = new Map<string, Promise<AudioBuffer | null>>();

function loadBuffer(url: string): Promise<AudioBuffer | null> {
  const hit = buffers.get(url);
  if (hit) return Promise.resolve(hit);
  const pending = inflight.get(url);
  if (pending) return pending;

  const c = ensureCtx();
  if (!c) return Promise.resolve(null);

  const job = (async (): Promise<AudioBuffer | null> => {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const buf = await c.decodeAudioData(await res.arrayBuffer());
      buffers.set(url, buf);
      return buf;
    } catch {
      return null; // offline before the SW cached it, or a decode failure
    } finally {
      inflight.delete(url);
    }
  })();

  inflight.set(url, job);
  return job;
}

/** Warm the cache so the first tap doesn't wait on a fetch + decode. */
export function prefetch(refs: SampleRef[]): void {
  if (!ensureCtx()) return;
  for (const r of refs) void loadBuffer(r.url);
}

/** One note in a phrase: which sample, when to start, how long to hold. */
export interface Voice {
  ref: SampleRef;
  /** Seconds from the start of the phrase. */
  at: number;
  /** Seconds to hold before releasing. The sample's own decay may be shorter. */
  dur: number;
  gain?: number;
}

const RELEASE = 0.12;

let live: AudioBufferSourceNode[] = [];

/** Cut everything off — used when a question changes under a playing phrase. */
export function stopAll(): void {
  for (const src of live) {
    try {
      src.stop();
    } catch {
      /* already ended */
    }
  }
  live = [];
}

/**
 * Play a phrase. Resolves when the last note has been released, so callers can
 * hold an auto-advance until the sound is actually finished.
 *
 * Returns immediately (resolving to 0) when there's no audio context or the
 * samples are missing — playback is a garnish, never a gate on the drill.
 */
export async function playPhrase(voices: Voice[]): Promise<number> {
  if (voices.length === 0) return 0;
  const c = ensureCtx();
  if (!c) return 0;
  unlockAudio();

  const loaded = await Promise.all(voices.map((v) => loadBuffer(v.ref.url)));

  stopAll();
  const start = c.currentTime + 0.03; // a beat of headroom for scheduling
  let end = 0;

  loaded.forEach((buf, i) => {
    if (!buf) return;
    const v = voices[i];
    const src = c.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = v.ref.rate;

    const g = c.createGain();
    g.gain.value = v.gain ?? 1;
    const at = start + v.at;
    const off = at + v.dur;
    g.gain.setValueAtTime(v.gain ?? 1, off);
    g.gain.linearRampToValueAtTime(0.0001, off + RELEASE);

    src.connect(g);
    g.connect(master!);
    src.start(at);
    src.stop(off + RELEASE);
    src.onended = () => {
      live = live.filter((s) => s !== src);
    };
    live.push(src);
    end = Math.max(end, v.at + v.dur + RELEASE);
  });

  if (end === 0) return 0; // nothing decoded — don't make the caller wait
  await new Promise((r) => setTimeout(r, end * 1000));
  return end;
}
