import { useState } from 'react';
import { EasingEditor } from './EasingEditor.jsx';

export function Inspector({ project, selected, t_ms, onPatchShape, onAddKeyframe, onDeleteShape }) {
  const s = selected?.shape;
  const [ease, setEase] = useState({ easing: 'ease-in-out', bezier: undefined });

  if (!project) return <aside className="inspector"><p className="hint">Créez ou ouvrez un projet.</p></aside>;

  return (
    <aside className="inspector">
      {!s && <p className="hint">Sélectionnez une forme sur la scène pour l'éditer, ou dessinez avec les outils.</p>}
      {s && (
        <>
          <section>
            <h3>{s.type} · <small>{s.id.slice(0, 6)}</small></h3>
            <TransformFields shape={s} onPatch={(patch) => onPatchShape(selected.layer_id, s.id, patch)}/>
            <StyleFields project={project} shape={s} onPatch={(patch) => onPatchShape(selected.layer_id, s.id, patch)}/>
          </section>

          <section>
            <h3>Animation à {Math.round(t_ms)} ms</h3>
            <EasingEditor value={ease} onChange={setEase}/>
            <div className="kf-buttons">
              {['x','y','rotation','scale_x','scale_y','opacity'].map(prop => (
                <button key={prop} onClick={() => {
                  const cur = prop in s.transform ? s.transform[prop] : (prop in s.style ? s.style[prop] : 0);
                  onAddKeyframe(selected.layer_id, s.id, { property: prop, time_ms: Math.round(t_ms), value: cur, easing: ease.easing, bezier: ease.bezier });
                }}>+ kf {prop}</button>
              ))}
            </div>
          </section>

          <section>
            <button className="danger" onClick={() => onDeleteShape(selected.layer_id, s.id)}>Supprimer la forme</button>
          </section>
        </>
      )}
    </aside>
  );
}

function TransformFields({ shape, onPatch }) {
  return (
    <>
      <h4>Transform</h4>
      <div className="grid2">
        {['x', 'y', 'rotation', 'scale_x', 'scale_y'].map(k => (
          <label key={k}>{k}
            <input type="number" step={k.startsWith('scale') ? 0.05 : 1} value={round2(shape.transform[k] ?? 0)}
              onChange={e => onPatch({ transform: { [k]: Number(e.target.value) } })}/>
          </label>
        ))}
      </div>
    </>
  );
}

function StyleFields({ project, shape, onPatch }) {
  const isGrad = (v) => typeof v === 'string' && v.startsWith('url(');
  const fillIsColor = shape.style.fill?.startsWith('#');
  const strokeIsColor = shape.style.stroke?.startsWith('#');
  const grads = project?.defs ?? [];
  return (
    <>
      <h4>Style</h4>
      <div className="row">
        <label>fill</label>
        <input type="color" value={fillIsColor ? shape.style.fill : '#222222'} onChange={e => onPatch({ style: { fill: e.target.value } })}/>
        {grads.length > 0 && (
          <select value={isGrad(shape.style.fill) ? shape.style.fill : ''} onChange={e => e.target.value && onPatch({ style: { fill: e.target.value } })}>
            <option value="">— dégradé —</option>
            {grads.map(g => <option key={g.id} value={`url(#${g.id})`}>{g.name}</option>)}
          </select>
        )}
      </div>
      <div className="row">
        <label>stroke</label>
        <input type="color" value={strokeIsColor ? shape.style.stroke : '#000000'} onChange={e => onPatch({ style: { stroke: e.target.value } })}/>
        <input type="number" min={0} step={0.5} value={shape.style.stroke_width ?? 0} onChange={e => onPatch({ style: { stroke_width: Number(e.target.value) } })}/>
      </div>
      <div className="row">
        <label>dash</label>
        <input type="text" placeholder="ex: 6 4" value={shape.style.stroke_dasharray ?? ''} onChange={e => onPatch({ style: { stroke_dasharray: e.target.value } })}/>
      </div>
      <label>opacity <input type="range" min={0} max={1} step={0.05} value={shape.style.opacity ?? 1} onChange={e => onPatch({ style: { opacity: Number(e.target.value) } })}/></label>
    </>
  );
}

function round2(v) { return Math.round(v * 100) / 100; }
