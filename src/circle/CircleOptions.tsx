import { GAP_CHOICES, type CircleSettings } from './circleData';
import { ALL_KEYS } from '../lib/chordData';
import { KeyWheel } from '../components/KeyWheel';

function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return <button className={`switch${on ? ' on' : ''}`} onClick={onClick} aria-pressed={on} />;
}

/** Can a drill actually be generated from these settings? */
export const circleReady = (s: CircleSettings): boolean => {
  const layoutOk = s.rings.major || s.rings.minor;
  const wedgeOk = s.keys.length > 0;
  if (s.drill === 'wedge') return wedgeOk;
  if (s.drill === 'layout') return layoutOk;
  return layoutOk || wedgeOk; // a mix plays whichever it can
};

/**
 * Which drill, and how it's set up. Shared by the setup screen and the
 * settings sheet so the two can't drift apart — the same pattern Numerals uses
 * for its drill list.
 */
export function CircleOptions({
  settings,
  onChange,
}: {
  settings: CircleSettings;
  onChange: (s: CircleSettings) => void;
}) {
  const update = (patch: Partial<CircleSettings>) => onChange({ ...settings, ...patch });
  const drill = settings.drill;
  const showLayout = drill !== 'wedge';
  const showWedge = drill !== 'layout';

  const toggleKey = (k: string) =>
    update({
      keys: settings.keys.includes(k)
        ? settings.keys.filter((x) => x !== k)
        : [...settings.keys, k],
    });

  return (
    <>
      <div>
        <div className="group-label">Drill</div>
        <div className="seg">
          <button className={drill === 'layout' ? 'on' : ''} onClick={() => update({ drill: 'layout' })}>
            Layout
          </button>
          <button className={drill === 'wedge' ? 'on' : ''} onClick={() => update({ drill: 'wedge' })}>
            Key wedge
          </button>
          <button className={drill === 'mix' ? 'on' : ''} onClick={() => update({ drill: 'mix' })}>
            Mix
          </button>
        </div>
        <div className="desc" style={{ marginTop: 8 }}>
          {drill === 'wedge'
            ? 'One key at a time, turned to the top — fill in the chords that go there.'
            : drill === 'layout'
              ? 'Name the missing segments of the wheel.'
              : 'Layout and key-wedge questions, shuffled together. Both sets of options below apply.'}
        </div>
      </div>

      {showLayout && (
        <>
          <div>
            <div className="group-label">Rings</div>
            <div className="chiprow">
              <button
                className={`tog${settings.rings.major ? ' on' : ''}`}
                onClick={() => update({ rings: { ...settings.rings, major: !settings.rings.major } })}
              >
                Major
              </button>
              <button
                className={`tog${settings.rings.minor ? ' on' : ''}`}
                onClick={() => update({ rings: { ...settings.rings, minor: !settings.rings.minor } })}
              >
                Minor
              </button>
            </div>
            <div className="desc" style={{ marginTop: 8 }}>
              {!settings.rings.major && !settings.rings.minor
                ? 'Turn on at least one ring.'
                : 'Start with majors alone; add the relative minors once the names are automatic.'}
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

      {showWedge && (
        <>
          <div>
            <div className="group-label">Answer with</div>
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
                ? 'Build each slot’s chord — root, accidental, quality — spelled the way the key spells it.'
                : 'The wedge shows the chords; tap a slot and give its numeral.'}
            </div>
          </div>

          {settings.place === 'chords' && (
            <div>
              <div className="group-label">Style</div>
              <div className="seg">
                {(['build', 'pick', 'mix'] as const).map((st) => (
                  <button
                    key={st}
                    className={settings.style === st ? 'on' : ''}
                    onClick={() => update({ style: st })}
                  >
                    {st === 'build' ? 'Build' : st === 'pick' ? 'Pick' : 'Mix'}
                  </button>
                ))}
              </div>
              <div className="desc" style={{ marginTop: 8 }}>
                {settings.style === 'build'
                  ? 'Tap any slot and build its chord on the keypad — pure recall.'
                  : settings.style === 'pick'
                    ? 'Each slot is highlighted in turn; choose its chord from six. The wrong ones are near-misses: wrong quality, wrong spelling, the neighbouring key.'
                    : 'Build and pick questions, shuffled together.'}
              </div>
            </div>
          )}

          {settings.place === 'chords' && (
            <div className="setting-row">
              <div>
                <div className="label">Show the numerals</div>
                <div className="desc">
                  Prints each slot’s numeral, so you only need the chords. Off, you need to know
                  where each one sits as well.
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
              <button className="tog" onClick={() => update({ keys: [] })}>
                None
              </button>
            </div>
            <div className="desc" style={{ marginTop: 8 }}>
              {settings.keys.length === 0
                ? 'Pick at least one key.'
                : 'Pick one to grind a single key, or all twelve once the shape transfers.'}
            </div>
          </div>
        </>
      )}
    </>
  );
}
