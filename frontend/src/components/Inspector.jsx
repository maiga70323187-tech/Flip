import { useState } from 'react';

export function Inspector({ project, selected, t_ms, onPatchShape, onAddKeyframe, onAddShape, onDeleteShape }) {
  const [shapeType, setShapeType] = useState('rect');
  const [pathD, setPathD] = useState('M 100 100 L 300 100 L 300 300 L 100 300 Z');

  const vectorLayers = project?.layers?.filter(l => l.kind === 'vector') ?? [];
  const [layerId, setLayerId] = useState('');
  const currentLayer = layerId || vectorLayers[0]?.id;

  const s = selected?.shape;

  return (
    <aside className="inspector">
      <section>
        <h3>Ajouter une forme</h3>
        <select value={currentLayer ?? ''} onChange={e => setLayerId(e.target.value)}>
          {vectorLayers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <select value={shapeType} onChange={e => setShapeType(e.target.value)}>
          {['rect','ellipse','path','polygon','line','text'].map(t => <option key={t}>{t}</option>)}
        </select>
        {shapeType === 'path' && (
          <textarea value={pathD} onChange={e => setPathD(e.target.value)} rows={3} placeholder="d = M ..."/>
        )}
        <button onClick={() => onAddShape(currentLayer, shapeType, shapeType === 'path' ? { d: pathD } : {})}>Ajouter</button>
      </section>

      {s && (
        <section>
          <h3>Forme sélectionnée</h3>
          <p><small>{s.type} · {s.id.slice(0, 8)}</small></p>
          <TransformFields shape={s} onPatch={(patch) => onPatchShape(selected.layer_id, s.id, patch)}/>
          <StyleFields shape={s} onPatch={(patch) => onPatchShape(selected.layer_id, s.id, patch)}/>
          <h4>Keyframes au temps {Math.round(t_ms)} ms</h4>
          <div className="kf-buttons">
            {['x','y','rotation','scale_x','scale_y','opacity'].map(prop => (
              <button key={prop} onClick={() => {
                const cur = prop in s.transform ? s.transform[prop] : (prop in s.style ? s.style[prop] : 0);
                onAddKeyframe(selected.layer_id, s.id, { property: prop, time_ms: Math.round(t_ms), value: cur, easing: 'ease-in-out' });
              }}>+ keyframe {prop}</button>
            ))}
          </div>
          <button className="danger" onClick={() => onDeleteShape(selected.layer_id, s.id)}>Supprimer la forme</button>
        </section>
      )}
    </aside>
  );
}

function TransformFields({ shape, onPatch }) {
  return (
    <>
      <h4>Transform</h4>
      {['x', 'y', 'rotation', 'scale_x', 'scale_y'].map(k => (
        <label key={k}>{k}
          <input type="number" step={k.startsWith('scale') ? 0.1 : 1} value={shape.transform[k] ?? 0}
            onChange={e => onPatch({ transform: { [k]: Number(e.target.value) } })}/>
        </label>
      ))}
    </>
  );
}
function StyleFields({ shape, onPatch }) {
  return (
    <>
      <h4>Style</h4>
      <label>fill <input type="color" value={shape.style.fill?.startsWith('#') ? shape.style.fill : '#222222'} onChange={e => onPatch({ style: { fill: e.target.value } })}/></label>
      <label>stroke <input type="color" value={shape.style.stroke?.startsWith('#') ? shape.style.stroke : '#000000'} onChange={e => onPatch({ style: { stroke: e.target.value } })}/></label>
      <label>stroke_width <input type="number" step={0.5} value={shape.style.stroke_width ?? 0} onChange={e => onPatch({ style: { stroke_width: Number(e.target.value) } })}/></label>
      <label>opacity <input type="range" min={0} max={1} step={0.05} value={shape.style.opacity ?? 1} onChange={e => onPatch({ style: { opacity: Number(e.target.value) } })}/></label>
    </>
  );
}
