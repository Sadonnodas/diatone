import { useState } from 'react';
import Home, { type Screen } from './Home';
import NumeralsGame from './NumeralsGame';
import FretboardGame from './fretboard/FretboardGame';
import IntervalGame from './fretboard/IntervalGame';
import WarmupGame from './fretboard/WarmupGame';
import CircleGame from './circle/CircleGame';
import ModalGame from './modal/ModalGame';
import MixedGame from './MixedGame';
import { RANDOM_GAMES, pickGame } from './lib/mixed';
import { usePwa } from './pwa';

export default function App() {
  const pwa = usePwa();
  const [screen, setScreen] = useState<Screen>('home');
  // Set when a drill was opened by the Random button: straight in, no setup.
  const [skipSetup, setSkipSetup] = useState(false);
  const home = () => setScreen('home');
  const open = (s: Screen) => {
    setSkipSetup(false);
    setScreen(s);
  };
  const openRandom = () => {
    setSkipSetup(true);
    setScreen(pickGame(RANDOM_GAMES));
  };
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

      {screen === 'home' && <Home onPick={open} onRandom={openRandom} pwa={pwa} />}
      {screen === 'numerals' && <NumeralsGame onBack={home} skipSetup={skipSetup} />}
      {screen === 'fretboard' && <FretboardGame onBack={home} />}
      {screen === 'intervals' && <IntervalGame onBack={home} />}
      {screen === 'warmup' && <WarmupGame onBack={home} />}
      {screen === 'circle' && <CircleGame onBack={home} skipSetup={skipSetup} />}
      {screen === 'modes' && <ModalGame onBack={home} skipSetup={skipSetup} />}
      {screen === 'mixed' && <MixedGame onBack={home} />}
    </>
  );
}
