import type { ReactNode } from 'react';

// A centered, scrollable explanation dialog shared by the games' "?" buttons.
export function InfoModal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="info-modal" role="dialog" aria-label={title}>
        <div className="sheet-head">
          <div className="sheet-title">{title}</div>
          <button className="done-btn" onClick={onClose}>
            Done
          </button>
        </div>
        <div className="info-body">{children}</div>
      </div>
    </>
  );
}
