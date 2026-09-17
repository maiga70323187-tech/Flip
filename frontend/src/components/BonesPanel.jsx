export function BonesPanel({ project, activeLayerId, selectedBone, onSelectBone, onPatchBone, onDeleteBone, ikChainLength, setIkChainLength }) {
  const layer = project?.layers?.find(l => l.id === activeLayerId);
  const bones = layer?.bones ?? [];
  return (
    <div className="bones-panel">
      <header>
        <h3>Os · {layer?.name ?? '—'}</h3>
        <label className="ik-len">
          IK
          <input type="number" min={1} max={12} value={ikChainLength} onChange={e => setIkChainLength(Math.max(1, Number(e.target.value)))} title="Nombre d'os remontés par le solveur IK"/>
        </label>
      </header>
      {bones.length === 0 && <p className="hint">Aucun os. Utilisez l'outil 🦴 sur ce calque.</p>}
      <ul>
        {bones.map(b => (
          <li key={b.id} className={selectedBone?.bone?.id === b.id ? 'active' : ''} onClick={() => onSelectBone({ layer_id: activeLayerId, bone: b })}>
            <input className="bname" value={b.name} onClick={e => e.stopPropagation()} onChange={e => onPatchBone(activeLayerId, b.id, { name: e.target.value })}/>
            <label>rot <input type="number" step={1} value={Math.round(b.rotation ?? 0)} onClick={e => e.stopPropagation()} onChange={e => onPatchBone(activeLayerId, b.id, { rotation: Number(e.target.value) })}/></label>
            <label>lg <input type="number" min={1} step={1} value={Math.round(b.length ?? 0)} onClick={e => e.stopPropagation()} onChange={e => onPatchBone(activeLayerId, b.id, { length: Number(e.target.value) })}/></label>
            <div className="limits">
              <label title="Limite d'angle min (° relatif au parent). Vide = pas de limite.">
                min<input type="number" step={5} value={b.limit_min ?? ''} placeholder="—" onClick={e => e.stopPropagation()} onChange={e => onPatchBone(activeLayerId, b.id, { limit_min: e.target.value === '' ? null : Number(e.target.value) })}/>
              </label>
              <label title="Limite d'angle max">
                max<input type="number" step={5} value={b.limit_max ?? ''} placeholder="—" onClick={e => e.stopPropagation()} onChange={e => onPatchBone(activeLayerId, b.id, { limit_max: e.target.value === '' ? null : Number(e.target.value) })}/>
              </label>
            </div>
            <button className="del" onClick={e => { e.stopPropagation(); onDeleteBone(activeLayerId, b.id); }}>×</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
