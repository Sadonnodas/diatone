import { MODES, symbols, type Category } from './modalData';

/**
 * The cheat sheet itself, for the drill's "?" — read it here instead of
 * digging the PDF out of a phone. It's rendered from the same table the
 * questions come from, so what you revise is exactly what you're asked.
 */
function ModeBlock({ name }: { name: string }) {
  const m = MODES.find((x) => x.name === name)!;
  return (
    <div className="mode-ref">
      <div className="mode-ref-head">
        <span className="mode-ref-name">{m.name}</span>
        {m.signature ? (
          <span className="mode-ref-sig">{symbols(m.signature.degree)}</span>
        ) : (
          <span className="mode-ref-sig plain">the reference</span>
        )}
      </div>
      <div className="mode-ref-line">{symbols(m.harmonization.join('  '))}</div>
      <div className="mode-ref-row">
        <span className="lab">states it</span>
        <span>{symbols(m.modalChords)}</span>
      </div>
      <div className="mode-ref-row">
        <span className="lab">vamps</span>
        <span>{m.vamps.map((v) => `‖: ${symbols(v)} :‖`).join('   ')}</span>
      </div>
    </div>
  );
}

export function ModalInfo() {
  const group = (c: Category) => MODES.filter((m) => m.category === c);

  return (
    <>
      <p>
        A mode is the major scale started on a different degree — so the parent
        scale's harmonization hands each degree its own seventh chord, and the
        notes left over become the extensions you can stack on it.
      </p>

      <table className="mode-table">
        <thead>
          <tr>
            <th>Deg</th>
            <th>Tetrad</th>
            <th>Extensions</th>
            <th>Mode</th>
          </tr>
        </thead>
        <tbody>
          {MODES.map((m) => (
            <tr key={m.name}>
              <td className="deg">{m.degree}</td>
              <td>{symbols(m.tetrad)}</td>
              <td className="tens">{symbols(m.extensions.join(' '))}</td>
              <td className={`mode ${m.category}`}>{m.name}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p>
        A mode is <b>major</b> or <b>minor</b> by the third in its own tonic
        chord: Imaj7 or I7 against I-7. Each one is then the plain scale of its
        family with a single degree moved — that degree is its colour, and where
        its characteristic extension comes from.
      </p>

      <ul>
        {MODES.filter((m) => m.signature).map((m) => (
          <li key={m.name}>
            <b>
              {m.name} {symbols(m.signature!.degree)}
            </b>{' '}
            — {symbols(m.signature!.why)}
          </li>
        ))}
      </ul>

      <p className="info-dim">
        Ionian and Aeolian have no such degree: they are the plain major and
        minor scales the others are measured against. Locrian is left out —
        its tonic is half-diminished, so it belongs to neither family.
      </p>

      <div className="mode-group-label">Major modes</div>
      {group('major').map((m) => (
        <ModeBlock key={m.name} name={m.name} />
      ))}

      <div className="mode-group-label">Minor modes</div>
      {group('minor').map((m) => (
        <ModeBlock key={m.name} name={m.name} />
      ))}

      <p className="info-dim">
        Each harmonization is written from the mode's own root. Two chords are
        usually enough to hold a mode in the ear: the vamps are the shortest
        pairs that pin its colour without slipping back to the parent key.
      </p>
    </>
  );
}
