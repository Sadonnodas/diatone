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
    // A safety limiter, not a sound: it sits well above normal levels and
    // only acts on the peaks a root-heavy chord can stack up, so emphasising
    // the root never tips into clipping on a phone.
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -3;
    limiter.knee.value = 2;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.12;
    master.connect(limiter);
    limiter.connect(ctx.destination);
  }
  return ctx;
}

/**
 * iOS mutes Web Audio when the ringer switch is off — but only because a page
 * counts as *ambient* sound by default. Declaring the session as `playback`
 * (the same category a video or a music app uses) means the switch no longer
 * applies. Safari 16.4+ exposes this directly; older iOS needs the silent-media
 * element trick below.
 *
 * The trade-off is the one every media app makes: `playback` also means we
 * interrupt whatever else the phone is playing. So the session is only claimed
 * by a drill that actually sounds: with playback off, Diatone never touches it
 * and your music plays on.
 */
let claimed = false;

function claimPlaybackSession(): void {
  if (claimed) return;
  claimed = true;
  const nav = navigator as Navigator & { audioSession?: { type: string } };
  if (nav.audioSession) {
    try {
      nav.audioSession.type = 'playback';
      return;
    } catch {
      // fall through to the element trick
    }
  }
  primeSilentTrack();
}

/** Hand the phone's audio back to whatever else wants it. */
function releasePlaybackSession(): void {
  if (!claimed) return;
  claimed = false;
  const nav = navigator as Navigator & { audioSession?: { type: string } };
  if (nav.audioSession) {
    try {
      // 'auto' is the default: ambient until something plays, which is what a
      // page that isn't sounding should be.
      nav.audioSession.type = 'auto';
    } catch {
      /* ignore */
    }
  }
  if (silentTrack) silentTrack.pause();
}

// Pre-16.4 fallback: an <audio> element that is actually playing flips the
// session category to playback for the whole page, Web Audio included. It has
// to be real, looping, unmuted media — silence qualifies. Only iOS needs this,
// and only iOS pays for it: everywhere else a permanently looping element
// would be waste for no benefit.
let silentTrack: HTMLAudioElement | null = null;

const isIOS = (): boolean =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  // iPadOS 13+ reports itself as a Mac; touch points give it away.
  (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

function silentWavUrl(): string {
  const rate = 8000;
  const frames = 800; // 100ms, looped
  const buf = new ArrayBuffer(44 + frames);
  const view = new DataView(buf);
  const tag = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };
  tag(0, 'RIFF');
  view.setUint32(4, 36 + frames, true);
  tag(8, 'WAVE');
  tag(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, rate, true);
  view.setUint32(28, rate, true); // byte rate
  view.setUint16(32, 1, true); // block align
  view.setUint16(34, 8, true); // bits per sample
  tag(36, 'data');
  view.setUint32(40, frames, true);
  new Uint8Array(buf, 44).fill(128); // 0x80 is silence for unsigned 8-bit
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

function primeSilentTrack(): void {
  if (!isIOS()) return;
  if (silentTrack) {
    if (silentTrack.paused) void silentTrack.play().catch(() => {});
    return;
  }
  try {
    const el = document.createElement('audio');
    el.src = silentWavUrl();
    el.loop = true;
    el.setAttribute('playsinline', ''); // not typed on HTMLAudioElement
    el.setAttribute('aria-hidden', 'true');
    silentTrack = el;
    void el.play().catch(() => {});
  } catch {
    silentTrack = null;
  }
}

/**
 * Bring the context up. Safari/iOS start it suspended unless it's created or
 * resumed inside a user gesture, so this hangs off the first tap and off
 * every play call (which is always tap-driven anyway).
 */
export function unlockAudio(): void {
  const c = ensureCtx();
  claimPlaybackSession();
  if (c && c.state !== 'running') void c.resume();
}

/**
 * Step out of the phone's audio session and drop anything holding it open.
 * Called when a drill's playback is off or when it leaves the screen.
 */
export function releaseAudio(): void {
  releasePlaybackSession();
}

/**
 * Bring the context up on the next tap anywhere. Screens call this on mount so
 * the context is alive well before the first note is due — creating it inside
 * the gesture that also wants to play tends to lose the first few milliseconds.
 * Returns a cleanup for the effect.
 *
 * `playback` is the drill's own setting: with it off nothing is created and the
 * audio session is left alone (and given back, if an earlier drill held it), so
 * a silent drill can't interrupt music from another app.
 */
export function armUnlock(playback: boolean): () => void {
  if (!playback) {
    releaseAudio();
    return () => {};
  }
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
