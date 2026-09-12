import {
  GAP_CHOICES,
  RING_LABEL,
  RING_ORDER,
  type CircleSettings,
  type Ring,
} from './circleData';
import { DEGREE_KEYS } from '../lib/engine';
import { renderJazz } from '../components/ChordDisplay';
import { ThemeSettingRow } from '../components/ThemeSwitch';
import { InstrumentRow } from '../components/InstrumentRow';

function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return <button className={`switch${on ? ' on' : ''}`} onClick={onClick} aria-pressed={on} />;
}

const GAP_LABEL: Record<number, string> = { 2: '2', 4: '4', 0: 'All' };

export function CircleSettingsSheet({
  settings,
  onChange,
  onClose,
}: {
  settings: CircleSettings;
  onChange: (s: CircleSettings) => void;
  onClose: () => void;
}) {
  const update = (patch: Partial<CircleSettings>) => onChange({ ...settings, ...patch });
  const byKey = settings.scope === 'key';

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
          {/* Scope */}
          <div>
            <div className="group-label">Ask about</div>
            <div className="seg">
              <button
                className={!byKey ? 'on' : ''}
                onClick={() => update({ scope: 'circle' })}
              >
                Whole circle
              </button>
              <button className={byKey ? 'on' : ''} onClick={() => update({ scope: 'key' })}>
                One key
              </button>
            </div>
            <div className="desc" style={{ marginTop: 8 }}>
              {byKey
                ? 'Gaps come from one key’s wedge — its seven chords, all next to each other.'
                : 'Gaps come from anywhere on the wheel.'}
            </div>
          </div>

          {/* What the prompt names — only meaningful inside a key */}
          {byKey && (
            <div>
              <div className="group-label">Prompt with</div>
              <div className="seg">
                <button
                  className={settings.label === 'chords' ? 'on' : ''}
                  onClick={() => update({ label: 'chords' })}
                >
                  Chords
                </button>
                <button
                  className={settings.label === 'numerals' ? 'on' : ''}
                  onClick={() => update({ label: 'numerals' })}
                >
                  Numerals
                </button>
              </div>
              <div className="desc" style={{ marginTop: 8 }}>
                {settings.label === 'numerals'
                  ? 'Shown a numeral, place it — this is the one that builds the reflex.'
                  : 'Shown a chord, place it.'}
              </div>
            </div>
          )}

          {/* Rings — whole-circle only */}
          {!byKey && (
            <div>
              <div className="group-label">Rings</div>
              <div className="chiprow">
                {RING_ORDER.map((r: Ring) => (
                  <button
                    key={r}
                    className={`tog${settings.rings[r] ? ' on' : ''}`}
                    onClick={() => update({ rings: { ...settings.rings, [r]: !settings.rings[r] } })}
                  >
                    {RING_LABEL[r]}
                  </button>
                ))}
              </div>
              <div className="desc" style={{ marginTop: 8 }}>
                Majors on the middle ring, relative minors inside, each key’s vii° outside.
              </div>
            </div>
          )}

          {/* Degrees — key scope only */}
          {byKey && (
            <div>
              <div className="group-label">Degrees asked</div>
              <div className="chiprow">
                {DEGREE_KEYS.map((d) => (
                  <button
                    key={d}
                    className={`tog${settings.degrees[d] ? ' on' : ''}`}
                    style={{ minWidth: 46 }}
                    onClick={() =>
                      update({ degrees: { ...settings.degrees, [d]: !settings.degrees[d] } })
                    }
                  >
                    {renderJazz(d, `cd${d}`)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Gaps */}
          <div>
            <div className="group-label">Gaps at once</div>
            <div className="seg">
              {GAP_CHOICES.map((g) => (
                <button
                  key={g}
                  className={settings.gaps === g ? 'on' : ''}
                  onClick={() => update({ gaps: g })}
                >
                  {GAP_LABEL[g]}
                </button>
              ))}
            </div>
            <div className="desc" style={{ marginTop: 8 }}>
              More gaps is harder — with only one there’d be nowhere else to tap, so two is the
              floor.
            </div>
          </div>

          {/* Rotation */}
          {byKey && (
            <div className="setting-row">
              <div>
                <div className="label">Turn the key to the top</div>
                <div className="desc">
                  Off, C stays at twelve o’clock and you learn the fixed picture. On, you learn
                  the move instead — IV is always one step left.
                </div>
              </div>
              <Switch
                on={settings.keyAtTop}
                onClick={() => update({ keyAtTop: !settings.keyAtTop })}
              />
            </div>
          )}

          <ThemeSettingRow />

          <div className="setting-row">
            <div>
              <div className="label">Hear the chord</div>
              <div className="desc">Sound each chord as it lands.</div>
            </div>
            <Switch on={settings.playback} onClick={() => update({ playback: !settings.playback })} />
          </div>

          {settings.playback && <InstrumentRow />}

          <div className="setting-row">
            <div>
              <div className="label">Auto-advance</div>
              <div className="desc">Move on once the wheel is filled.</div>
            </div>
            <Switch
              on={settings.autoAdvance}
              onClick={() => update({ autoAdvance: !settings.autoAdvance })}
            />
          </div>
        </div>
      </div>
    </>
  );
}
