import {
  ALL_CLASSES,
  INTERVALS,
  LEVELS,
  ROOT_STRING_ORDER,
  STRING_NAMES,
  levelSettings,
  matchLevel,
  candidatesByClass,
  type IntervalSettings as Settings,
  type LevelKey,
} from './intervalData';
import { renderJazz } from '../components/ChordDisplay';
import { ThemeSettingRow } from '../components/ThemeSwitch';

const GAPS: { value: number; label: string }[] = [
  { value: 1, label: 'Adjacent' },
  { value: 2, label: 'Skip one' },
  { value: 5, label: 'Any' },
];
const SPANS: { value: number; label: string }[] = [
  { value: 3, label: '±3' },
  { value: 5, label: '±5' },
  { value: 7, label: '±7' },
];

function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return <button className={`switch${on ? ' on' : ''}`} onClick={onClick} aria-pressed={on} />;
}

export function IntervalSettings({
  settings,
  onChange,
  onClose,
}: {
  settings: Settings;
  onChange: (s: Settings) => void;
  onClose: () => void;
}) {
  const level = matchLevel(settings);
  // Grey out interval chips the current string/fret limits can never produce —
  // an octave is unreachable on adjacent strings, for instance.
  const reachable = candidatesByClass({ ...settings, intervals: Object.fromEntries(ALL_CLASSES.map((c) => [c, true])) });

  const applyLevel = (key: LevelKey) => onChange({ ...settings, ...levelSettings(key) });
  const activeLevel = LEVELS.find((l) => l.key === level);

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
          {/* Level presets */}
          <div>
            <div className="group-label">Level</div>
            <div className="seg">
              {LEVELS.map((lv) => (
                <button
                  key={lv.key}
                  className={level === lv.key ? 'on' : ''}
                  onClick={() => applyLevel(lv.key)}
                >
                  {lv.label}
                </button>
              ))}
            </div>
            <div className="desc" style={{ marginTop: 8 }}>
              {activeLevel ? activeLevel.desc : 'Custom — your own mix of the limits below.'}
            </div>
          </div>

          {/* Root string */}
          <div>
            <div className="group-label">Root string</div>
            <div className="chiprow">
              {ROOT_STRING_ORDER.map((s) => (
                <button
                  key={s}
                  className={`tog${settings.rootStrings[s] ? ' on' : ''}`}
                  onClick={() =>
                    onChange({
                      ...settings,
                      rootStrings: { ...settings.rootStrings, [s]: !settings.rootStrings[s] },
                    })
                  }
                >
                  {STRING_NAMES[s]}
                </button>
              ))}
            </div>
            <div className="desc" style={{ marginTop: 8 }}>
              The question note is always on a thinner string than the root.
            </div>
          </div>

          {/* String distance */}
          <div>
            <div className="group-label">String distance</div>
            <div className="seg">
              {GAPS.map((g) => (
                <button
                  key={g.value}
                  className={settings.stringGap === g.value ? 'on' : ''}
                  onClick={() => onChange({ ...settings, stringGap: g.value })}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fret span */}
          <div>
            <div className="group-label">Fret span</div>
            <div className="seg">
              {SPANS.map((sp) => (
                <button
                  key={sp.value}
                  className={settings.fretSpan === sp.value ? 'on' : ''}
                  onClick={() => onChange({ ...settings, fretSpan: sp.value })}
                >
                  {sp.label}
                </button>
              ))}
            </div>
            <div className="desc" style={{ marginTop: 8 }}>
              How far apart the two notes can sit — ±5 keeps both under one hand.
            </div>
          </div>

          {/* Intervals */}
          <div>
            <div className="group-label">Intervals asked</div>
            <div className="chiprow">
              {ALL_CLASSES.map((c) => {
                const possible = reachable.has(c);
                return (
                  <button
                    key={c}
                    className={`tog${settings.intervals[c] ? ' on' : ''}`}
                    style={{ minWidth: 52, opacity: possible ? 1 : 0.35 }}
                    title={possible ? INTERVALS[c].name : `${INTERVALS[c].name} — not reachable with these limits`}
                    onClick={() =>
                      onChange({
                        ...settings,
                        intervals: { ...settings.intervals, [c]: !settings.intervals[c] },
                      })
                    }
                  >
                    {renderJazz(INTERVALS[c].short, `iv${c}`)}
                  </button>
                );
              })}
            </div>
            <div className="desc" style={{ marginTop: 8 }}>
              Dimmed intervals can't occur within the string/fret limits above.
            </div>
          </div>

          <ThemeSettingRow />

          {/* Auto-advance */}
          <div className="setting-row">
            <div>
              <div className="label">Auto-advance</div>
              <div className="desc">Move on shortly after a correct answer.</div>
            </div>
            <Switch
              on={settings.autoAdvance}
              onClick={() => onChange({ ...settings, autoAdvance: !settings.autoAdvance })}
            />
          </div>
        </div>
      </div>
    </>
  );
}
