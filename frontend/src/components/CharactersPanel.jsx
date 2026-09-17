import { useEffect, useState } from 'react';

export function CharactersPanel({ project, api, onSelectCharacter, selectedCharId, onImport, onDelete, onPatchCharacter }) {
  const [examples, setExamples] = useState([]);
  const [pending, setPending] = useState(false);

  useEffect(() => { api.listKbExamples().then(setExamples).catch(() => setExamples([])); }, []);

  const importExample = async (key) => {
    setPending(true);
    try {
      const json = await api.loadKbExample(key);
      await onImport(json);
    } finally { setPending(false); }
  };

  const chars = project?.characters ?? [];
  return (
    <div className="characters-panel">
      <header><h3>Personnages</h3></header>
      {chars.length === 0 && <p className="hint">Aucun personnage. Importez un exemple pour démarrer.</p>}
      <ul>
        {chars.map(c => (
          <li key={c.id} className={c.id === selectedCharId ? 'active' : ''}>
            <span className="cname" onClick={() => onSelectCharacter(c)}>
              {c.kind === 'quadruped' ? '🐾' : c.kind === 'creature' ? '👾' : '🧍'} {c.name}
            </span>
            <div className="chip">{c.rigProfile}</div>
            <button className="del" onClick={() => onDelete(c.id)}>×</button>
            {c.id === selectedCharId && (
              <div className="char-details">
                <label>Vue
                  <select value={c.currentView ?? c.defaultView} onChange={e => onPatchCharacter(c.id, { currentView: e.target.value })}>
                    {Object.keys(c.views ?? {}).map(v => <option key={v}>{v}</option>)}
                  </select>
                </label>
                <label>Expression
                  <select value={c.currentExpression} onChange={e => onPatchCharacter(c.id, { currentExpression: e.target.value })}>
                    {Object.keys(c.expressions ?? {}).map(v => <option key={v}>{v}</option>)}
                  </select>
                </label>
                <label>x <input type="number" value={Math.round(c.transform?.x ?? 0)} onChange={e => onPatchCharacter(c.id, { transform: { x: Number(e.target.value) } })}/></label>
                <label>y <input type="number" value={Math.round(c.transform?.y ?? 0)} onChange={e => onPatchCharacter(c.id, { transform: { y: Number(e.target.value) } })}/></label>
                <label>scale <input type="number" step={0.05} value={c.transform?.scale ?? 1} onChange={e => onPatchCharacter(c.id, { transform: { scale: Number(e.target.value) } })}/></label>
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="kb-imports">
        <p className="hint">Importer depuis la knowledge base :</p>
        {examples.map(e => (
          <button key={e.key} disabled={pending} onClick={() => importExample(e.key)}>+ {e.key}</button>
        ))}
      </div>
    </div>
  );
}
