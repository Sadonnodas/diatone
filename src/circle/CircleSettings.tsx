import { GAP_CHOICES, type CircleSettings } from './circleData';
import { ALL_KEYS } from '../lib/chordData';
import { KeyWheel } from '../components/KeyWheel';
import { ThemeSettingRow } from '../components/ThemeSwitch';
import { InstrumentRow } from '../components/InstrumentRow';

function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return <button className={`switch${on ? ' on' : ''}`} onClick={onClick} aria-pressed={on} />;
}

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
  const wedge = settings.drill === 'wedge';

  const toggleKey = (k: string) =>
    update({
      keys: settings.keys.includes(k)
        ? settings.keys.filter((x) => x !== k)
        : [...settings.keys, k],
    });

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
          <div>
            <div className="group-label">Drill</div>
            <div className="seg">
              <button className={!wedge ? 'on' : ''} onClick={() => update({ drill: 'layout' })}>
                Layout
              </button>
              <button className={wedge ? 'on' : ''} onClick={() => update({ drill: 'wedge' })}>
                Key wedge
              </button>
            </div>
            <div className="desc" style={{ marginTop: 8 }}>
              {wedge
                ? 'One key at a time, turned to the top — place its chords where they belong.'
                : 'Name the missing segments of the wheel.'}
            </div>
          </div>

          {!wedge && (
            <>
              <div>
                <div className="group-label">Rings</div>
                <div className="chiprow">
                  <button
                    className={`tog${settings.rings.major ? ' on' : ''}`}
                    onClick={() =>
                      update({ rings: { ...settings.rings, major: !settings.rings.major } })
                    }
                  >
                    Major
                  </button>
                  <button
                    className={`tog${settings.rings.minor ? ' on' : ''}`}
                    onClick={() =>
                      update({ rings: { ...settings.rings, minor: !settings.rings.minor } })
                    }
                  >
                    Minor
                  </button>
                </div>
                <div className="desc" style={{ marginTop: 8 }}>
                  Start with majors alone; add the relative minors once the outer names are
                  automatic.
                </div>
              </div>

              <div>
                <div className="group-label">Gaps at once</div>
                <div className="seg">
                  {GAP_CHOICES.map((g) => (
                    <button
                      key={g}
                      className={settings.gaps === g ? 'on' : ''}
                      onClick={() => update({ gaps: g })}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {wedge && (
            <>
              <div>
                <div className="group-label">Place</div>
                <div className="seg">
                  <button
                    className={settings.place === 'chords' ? 'on' : ''}
                    onClick={() => update({ place: 'chords' })}
                  >
                    Chords
                  </button>
                  <button
                    className={settings.place === 'numerals' ? 'on' : ''}
                    onClick={() => update({ place: 'numerals' })}
                  >
                    Numerals
                  </button>
                </div>
                <div className="desc" style={{ marginTop: 8 }}>
                  {settings.place === 'chords'
                    ? 'Chord buttons onto the wedge.'
                    : 'Numeral buttons onto a wedge that already shows the chords.'}
                </div>
              </div>

              {settings.place === 'chords' && (
                <div className="setting-row">
                  <div>
                    <div className="label">Show the numerals</div>
                    <div className="desc">
                      Prints each slot's numeral as a guide. Turn it off once the wedge is in your
                      head — the numerals never move, so it stops teaching you anything.
                    </div>
                  </div>
                  <Switch on={settings.guide} onClick={() => update({ guide: !settings.guide })} />
                </div>
              )}

              <div>
                <div className="group-label">Keys</div>
                <KeyWheel selected={settings.keys} onToggle={toggleKey} />
                <div className="chiprow" style={{ marginTop: 10, justifyContent: 'center' }}>
                  <button className="tog" onClick={() => update({ keys: [...ALL_KEYS] })}>
                    All 12
                  </button>
                  <button className="tog" onClick={() => update({ keys: ['C'] })}>
                    Just C
                  </button>
                </div>
                <div className="desc" style={{ marginTop: 8 }}>
                  Pick one to grind a single key, or all twelve once the shape transfers.
                </div>
              </div>
            </>
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
              <div className="desc">Move on once everything is filled in.</div>
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
