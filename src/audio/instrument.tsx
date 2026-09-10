import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { prefetch } from './engine';
import { guitarMidi, pianoMidi, type SampleRef } from './samples';

// Which instrument every drill plays back through. App-wide rather than
// per-game — like the theme, it's a preference about the app's voice, not a
// parameter of any one drill, and hearing two different instruments across
// two screens just sounds like a bug.
export type Instrument = 'piano' | 'guitar';

const STORAGE_KEY = 'diatone.instrument';

/** Piano by default: chords are what most of the app is about, and it states
    them more plainly than a strummed guitar. */
function storedInstrument(): Instrument {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'guitar' ? 'guitar' : 'piano';
  } catch {
    return 'piano'; // private mode / storage disabled
  }
}

export interface InstrumentApi {
  instrument: Instrument;
  set: (i: Instrument) => void;
}

const InstrumentContext = createContext<InstrumentApi>({ instrument: 'piano', set: () => {} });

export function InstrumentProvider({ children }: { children: ReactNode }) {
  const [instrument, setInstrument] = useState<Instrument>(storedInstrument);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, instrument);
    } catch {
      // storage unavailable — the choice still holds for this session
    }
  }, [instrument]);

  const set = useCallback((i: Instrument) => setInstrument(i), []);

  return (
    <InstrumentContext.Provider value={{ instrument, set }}>{children}</InstrumentContext.Provider>
  );
}

export const useInstrument = (): InstrumentApi => useContext(InstrumentContext);

/** A pitch, on whichever instrument is chosen. */
export const sampleFor = (instrument: Instrument, midi: number): SampleRef =>
  instrument === 'guitar' ? guitarMidi(midi) : pianoMidi(midi);

export const prefetchNotes = (instrument: Instrument, midi: number[]): void =>
  prefetch(midi.map((m) => sampleFor(instrument, m)));
