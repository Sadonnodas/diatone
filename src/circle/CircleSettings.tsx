import type { CircleSettings } from './circleData';
import { CircleOptions } from './CircleOptions';
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
          <CircleOptions settings={settings} onChange={onChange} />

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
