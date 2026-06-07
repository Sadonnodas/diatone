import type { FretSettings, ContextMode } from './useFretboardGame';
import { SCALE_TYPE_INFO, SHAPE_ORDER, type ScaleType, type ShapeKey } from './scaleData';

const CONTEXT_INFO: Record<ContextMode, { label: string; desc: string }> = {
  rootGiven: { label: 'Root given', desc: 'The root is marked on a low string' },
  qualityGiven: { label: 'Quality given', desc: 'Only major/minor — find the root yourself' },
};

function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return <button className={`switch${on ? ' on' : ''}`} onClick={onClick} aria-pressed={on} />;
}

export function FretboardSettings({
  settings,
  onChange,
  onClose,
}: {
  settings: FretSettings;
  onChange: (s: FretSettings) => void;
  onClose: () => void;
}) {
  const scaleTypes = Object.keys(SCALE_TYPE_INFO) as ScaleType[];

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
          {/* Context modes */}
          <div>
            <div className="group-label">Mode</div>
            <div className="chiprow">
              {(Object.keys(CONTEXT_INFO) as ContextMode[]).map((key) => (
                <button
                  key={key}
                  className={`tog${settings.contextModes[key] ? ' on' : ''}`}
                  onClick={() =>
                    onChange({
                      ...settings,
                      contextModes: { ...settings.contextModes, [key]: !settings.contextModes[key] },
                    })
                  }
                >
                  {CONTEXT_INFO[key].label}
                </button>
              ))}
            </div>
          </div>

          {/* Scale types */}
          <div>
            <div className="group-label">Scale types</div>
            <div className="chiprow">
              {scaleTypes.map((st) => (
                <button
                  key={st}
                  className={`tog${settings.scaleTypes[st] ? ' on' : ''}`}
                  onClick={() =>
                    onChange({
                      ...settings,
                      scaleTypes: { ...settings.scaleTypes, [st]: !settings.scaleTypes[st] },
                    })
                  }
                >
                  {SCALE_TYPE_INFO[st].short}
                </button>
              ))}
            </div>
          </div>

          {/* CAGED shapes */}
          <div>
            <div className="group-label">CAGED shapes</div>
            <div className="chiprow">
              {SHAPE_ORDER.map((sh: ShapeKey) => (
                <button
                  key={sh}
                  className={`tog${settings.shapes[sh] ? ' on' : ''}`}
                  style={{ minWidth: 46, fontFamily: 'var(--font-display)', fontSize: 18 }}
                  onClick={() =>
                    onChange({ ...settings, shapes: { ...settings.shapes, [sh]: !settings.shapes[sh] } })
                  }
                >
                  {sh}
                </button>
              ))}
            </div>
          </div>

          {/* Reveal scale type */}
          <div className="setting-row">
            <div>
              <div className="label">Always show scale type</div>
              <div className="desc">Root-given: show it instead of a Hint button.</div>
            </div>
            <Switch
              on={settings.revealScaleType}
              onClick={() => onChange({ ...settings, revealScaleType: !settings.revealScaleType })}
            />
          </div>

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
