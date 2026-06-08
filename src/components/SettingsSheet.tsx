import type { Settings } from '../lib/engine';
import { ALL_KEYS, ENHARMONIC_KEYS } from '../lib/chordData';
import { DEGREE_KEYS } from '../lib/engine';
import { renderJazz } from './ChordDisplay';

const MODES: { id: number; label: string }[] = [
  { id: 1, label: 'Name Chord' },
  { id: 4, label: 'Name Numeral' },
  { id: 2, label: 'Progression' },
  { id: 3, label: 'Transpose' },
];

// §9 — degree labels relabel in 7-chord mode.
const scaleDegreeNames = {
  triads: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'],
  sevenths: ['Imaj7', 'iim7', 'iiim7', 'IVmaj7', 'V7', 'vim7', 'viiø7'],
};

function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return <button className={`switch${on ? ' on' : ''}`} onClick={onClick} aria-pressed={on} />;
}

export function SettingsSheet({
  settings,
  onChange,
  onClose,
}: {
  settings: Settings;
  onChange: (s: Settings) => void;
  onClose: () => void;
}) {
  const update = (partial: Partial<Settings>) => onChange({ ...settings, ...partial });

  const toggleKey = (k: string) => {
    const has = settings.selectedKeys.includes(k);
    update({
      selectedKeys: has
        ? settings.selectedKeys.filter((x) => x !== k)
        : [...settings.selectedKeys, k],
    });
  };

  const toggleMode = (m: number) => {
    const has = settings.selectedModes.includes(m);
    update({
      selectedModes: has
        ? settings.selectedModes.filter((x) => x !== m)
        : [...settings.selectedModes, m].sort((a, b) => a - b),
    });
  };

  const toggleDegree = (deg: string) => {
    update({ degreeToggles: { ...settings.degreeToggles, [deg]: !settings.degreeToggles[deg] } });
  };

  const setWeight = (i: number, v: number) => {
    const majorWeights = [...settings.majorWeights];
    majorWeights[i] = v;
    update({ majorWeights });
  };

  const degLabels = settings.use7thChords ? scaleDegreeNames.sevenths : scaleDegreeNames.triads;

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-label="Settings">
        <div className="grab" />
        <div className="sheet-head">
          <div className="sheet-title">Settings</div>
          <button className="done-btn" onClick={onClose}>
            Done
          </button>
        </div>

        <div className="sheet-body">
          {/* Keys — circle of fifths */}
          <div>
            <div className="group-label">Keys — circle of fifths</div>
            <div className="wheel-wrap">
              <div className="wheel">
                {ALL_KEYS.map((k, i) => {
                  const angle = (-90 + i * 30) * (Math.PI / 180);
                  const r = 105;
                  const x = 128 + r * Math.cos(angle);
                  const y = 128 + r * Math.sin(angle);
                  const on = settings.selectedKeys.includes(k);
                  return (
                    <button
                      key={k}
                      className={`kbtn${on ? ' on' : ''}`}
                      style={{ left: `${x}px`, top: `${y}px` }}
                      onClick={() => toggleKey(k)}
                    >
                      {renderJazz(k, `w${k}`)}
                    </button>
                  );
                })}
                <div className="wheel-center">
                  {settings.selectedKeys.length} key{settings.selectedKeys.length === 1 ? '' : 's'}{' '}
                  selected
                </div>
              </div>
              <div className="enh-row">
                <span>Enharmonic:</span>
                {ENHARMONIC_KEYS.map((k) => (
                  <button
                    key={k}
                    className={`tog${settings.selectedKeys.includes(k) ? ' on' : ''}`}
                    onClick={() => toggleKey(k)}
                  >
                    {renderJazz(k, `e${k}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Modes */}
          <div>
            <div className="group-label">Modes</div>
            <div className="chiprow">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  className={`tog${settings.selectedModes.includes(m.id) ? ' on' : ''}`}
                  onClick={() => toggleMode(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {settings.selectedModes.includes(3) && settings.selectedKeys.length < 2 && (
              <div className="desc" style={{ marginTop: 8 }}>
                Transpose needs at least 2 keys — it's skipped until you add another.
              </div>
            )}
          </div>

          {/* Chord type + hide quality */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="setting-row">
              <div>
                <div className="label">7th chords</div>
                <div className="desc">Tetrads (Cmaj7, Am7…) instead of triads.</div>
              </div>
              <Switch
                on={settings.use7thChords}
                onClick={() => update({ use7thChords: !settings.use7thChords })}
              />
            </div>
            <div className="setting-row">
              <div>
                <div className="label">Hide quality</div>
                <div className="desc">Show bare degrees (I, II…); prompt asks triad/tetrad.</div>
              </div>
              <Switch
                on={settings.hideQuality}
                onClick={() => update({ hideQuality: !settings.hideQuality })}
              />
            </div>
            <div className="setting-row">
              <div>
                <div className="label">Auto-advance</div>
                <div className="desc">Move on ~1.5s after a correct answer.</div>
              </div>
              <Switch
                on={settings.autoAdvance}
                onClick={() => update({ autoAdvance: !settings.autoAdvance })}
              />
            </div>
          </div>

          {/* Generation method */}
          <div>
            <div className="group-label">Degree selection</div>
            <div className="seg">
              <button
                className={settings.generationMethod === 'weighted' ? 'on' : ''}
                onClick={() => update({ generationMethod: 'weighted' })}
              >
                Weighted
              </button>
              <button
                className={settings.generationMethod === 'random' ? 'on' : ''}
                onClick={() => update({ generationMethod: 'random' })}
              >
                Equal
              </button>
            </div>
          </div>

          {/* Degree toggles */}
          <div>
            <div className="group-label">Scale degrees</div>
            <div className="chiprow">
              {DEGREE_KEYS.map((deg, i) => (
                <button
                  key={deg}
                  className={`tog${settings.degreeToggles[deg] ? ' on' : ''}`}
                  onClick={() => toggleDegree(deg)}
                >
                  {degLabels[i]}
                </button>
              ))}
            </div>
          </div>

          {/* Weights (weighted mode only) */}
          {settings.generationMethod === 'weighted' && (
            <div>
              <div className="group-label">Frequency weights (0–10)</div>
              {DEGREE_KEYS.map((deg, i) => (
                <div className="slider-row" key={deg}>
                  <span className="deg">{degLabels[i]}</span>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={1}
                    value={settings.majorWeights[i]}
                    disabled={!settings.degreeToggles[deg]}
                    onChange={(e) => setWeight(i, Number(e.target.value))}
                  />
                  <span className="val">{settings.majorWeights[i]}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
