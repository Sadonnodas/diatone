import { useState } from 'react';
import Home, { type Screen } from './Home';
import NumeralsGame from './NumeralsGame';
import FretboardGame from './fretboard/FretboardGame';
import WarmupGame from './fretboard/WarmupGame';
import { usePwa } from './pwa';

export default function App() {
  const pwa = usePwa();
  const [screen, setScreen] = useState<Screen>('home');
  const [updateDismissed, setUpdateDismissed] = useState(false);
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <>
      {pwa.needRefresh && !updateDismissed && (
        <div className="update-banner" onClick={stop}>
          <span>{pwa.updating ? 'Updating…' : 'New version available'}</span>
          <button onClick={pwa.updateNow} disabled={pwa.updating}>
            {pwa.updating ? '…' : 'Update'}
          </button>
          {!pwa.updating && (
            <button className="banner-x" aria-label="Dismiss" onClick={() => setUpdateDismissed(true)}>
              ✕
            </button>
          )}
        </div>
      )}

      {screen === 'home' && <Home onPick={setScreen} pwa={pwa} />}
      {screen === 'numerals' && <NumeralsGame onBack={() => setScreen('home')} />}
      {screen === 'fretboard' && <FretboardGame onBack={() => setScreen('home')} />}
      {screen === 'warmup' && <WarmupGame onBack={() => setScreen('home')} />}
    </>
  );
}
