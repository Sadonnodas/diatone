import { FAMILIES, type ModalSettings } from './modalData';

function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return <button className={`switch${on ? ' on' : ''}`} onClick={onClick} aria-pressed={on} />;
}

/**
 * Which connections to be asked about. Shared by the setup screen and the
 * settings sheet, the way the other drills share theirs.
 */
export function ModalOptions({
  settings,
  onChange,
}: {
  settings: ModalSettings;
  onChange: (s: ModalSettings) => void;
}) {
  const toggle = (id: (typeof FAMILIES)[number]['id']) =>
    onChange({
      ...settings,
      families: { ...settings.families, [id]: !settings.families[id] },
    });

  return (
    <div>
      <div className="group-label">Ask me about</div>
      <div className="family-list">
        {FAMILIES.map((f) => (
          <button
            key={f.id}
            className={`family${settings.families[f.id] ? ' on' : ''}`}
            aria-pressed={settings.families[f.id]}
            onClick={() => toggle(f.id)}
          >
            <span className="family-name">{f.label}</span>
            <span className="family-blurb">{f.blurb}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ModalSettingsSheet({
  settings,
  onChange,
  onClose,
  children,
}: {
  settings: ModalSettings;
  onChange: (s: ModalSettings) => void;
  onClose: () => void;
  /** The theme row, passed in so the sheet doesn't reach for it itself. */
  children?: React.ReactNode;
}) {
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
          <ModalOptions settings={settings} onChange={onChange} />

          {children}

          <div className="setting-row">
            <div>
              <div className="label">Auto-advance</div>
              <div className="desc">Move on once you've answered.</div>
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
