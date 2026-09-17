import { useEffect, useMemo, useState } from 'react';
import { api } from './api.js';
import { Stage } from './components/Stage.jsx';
import { Timeline } from './components/Timeline.jsx';
import { LayersPanel } from './components/LayersPanel.jsx';
import { Inspector } from './components/Inspector.jsx';
import { Toolbox } from './components/Toolbox.jsx';
import { DecorPresets } from './components/DecorPresets.jsx';

export default function App() {
  const [projects, setProjects] = useState([]);
  const [project, setProject] = useState(null);
  const [t_ms, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [tool, setTool] = useState('select');
  const [drawColor, setDrawColor] = useState('#e04a1b');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [filled, setFilled] = useState(true);
  const [onionSkin, setOnionSkin] = useState(false);
  const [activeLayerId, setActiveLayerId] = useState(null);

  const refresh = () => api.listProjects().then(setProjects).catch(e => setError(e.message));
  const load = async (id) => { const p = await api.getProject(id); setProject(p); setT(0); setSelected(null); setActiveLayerId(p.layers.find(l => l.kind === 'vector')?.id ?? null); };
  const reload = async () => project && load(project.id);
  const guarded = fn => (...args) => fn(...args).catch(e => setError(e.message)).then(reload);

  useEffect(() => { refresh(); }, []);

  const activeVectorLayerId = useMemo(() => {
    if (!project) return null;
    if (activeLayerId && project.layers.some(l => l.id === activeLayerId && l.kind === 'vector')) return activeLayerId;
    return project.layers.find(l => l.kind === 'vector')?.id ?? null;
  }, [project, activeLayerId]);

  // Drag interactif : poser une keyframe si t>0, sinon patcher la forme.
  const onDragTransform = async ({ shape, layer_id, start_ms, x, y, phase }) => {
    try {
      if (start_ms > 0) {
        // auto-keyframe : on met à jour la valeur courante en direct pour la preview,
        // et à la fin du drag on persiste les keyframes.
        if (phase === 'end') {
          await api.addKeyframe(project.id, layer_id, shape.id, { property: 'x', time_ms: Math.round(start_ms), value: x, easing: 'ease-in-out' });
          await api.addKeyframe(project.id, layer_id, shape.id, { property: 'y', time_ms: Math.round(start_ms), value: y, easing: 'ease-in-out' });
          reload();
        }
      } else {
        if (phase === 'end') {
          await api.patchShape(project.id, layer_id, shape.id, { transform: { x, y } });
          reload();
        }
      }
    } catch (e) { setError(e.message); }
  };

  const onDraw = async (layer_id, shapeInput) => {
    try { await api.addShape(project.id, layer_id, shapeInput); reload(); }
    catch (e) { setError(e.message); }
  };

  const onApplyDecor = async (preset) => {
    try { await api.addDecor(project.id, { preset }); reload(); }
    catch (e) { setError(e.message); }
  };

  const exportSvg = async () => {
    const url = `${api.base}/api/projects/${project.id}/render?t_ms=${Math.round(t_ms)}`;
    window.open(url, '_blank');
  };

  return (
    <main>
      <header>
        <h1>Flip — Studio d'animation 2D pilotable par IA</h1>
        <p>Vectoriel + frame-by-frame · aucun modèle externe · MCP + HTTP</p>
      </header>

      {error && <div className="error" onClick={() => setError('')}>{error}</div>}

      <section className="toolbar">
        <select value={project?.id ?? ''} onChange={e => e.target.value && load(e.target.value)}>
          <option value="">— Choisir un projet —</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button onClick={async () => { const p = await api.createProject({ name: `Projet ${projects.length + 1}` }); await refresh(); load(p.id); }}>Nouveau projet</button>
        {project && <button onClick={exportSvg}>Voir SVG</button>}
        <a href={`${api.base}/api/openapi.json`} target="_blank" rel="noreferrer">OpenAPI</a>
      </section>

      {project && (
        <>
          <Toolbox
            tool={tool} setTool={setTool}
            drawColor={drawColor} setDrawColor={setDrawColor}
            strokeWidth={strokeWidth} setStrokeWidth={setStrokeWidth}
            filled={filled} setFilled={setFilled}
            onionSkin={onionSkin} setOnionSkin={setOnionSkin}
          />
          <section className="workspace">
            <div className="left-col">
              <LayersPanel
                project={project}
                activeLayerId={activeVectorLayerId}
                onActivateLayer={setActiveLayerId}
                onAddLayer={kind => guarded(() => api.addLayer(project.id, { kind, name: kind === 'raster' ? 'FBF' : 'Vecteur' }))()}
                onDeleteLayer={l => guarded(() => api.deleteLayer(project.id, l.id))()}
                onToggleVisible={l => guarded(() => api.patchLayer(project.id, l.id, { visible: !l.visible }))()}
              />
              <DecorPresets onApply={onApplyDecor}/>
            </div>
            <Stage
              project={project}
              t_ms={t_ms}
              onSelectShape={setSelected}
              selectedId={selected?.shape?.id}
              tool={tool}
              drawColor={drawColor}
              strokeWidth={strokeWidth}
              filled={filled}
              onionSkin={onionSkin}
              activeVectorLayerId={activeVectorLayerId}
              onDraw={onDraw}
              onDragTransform={onDragTransform}
            />
            <Inspector
              project={project}
              selected={selected}
              t_ms={t_ms}
              onPatchShape={(layerId, shapeId, patch) => guarded(() => api.patchShape(project.id, layerId, shapeId, patch))()}
              onAddKeyframe={(layerId, shapeId, body) => guarded(() => api.addKeyframe(project.id, layerId, shapeId, body))()}
              onDeleteShape={(layerId, shapeId) => guarded(() => api.deleteShape(project.id, layerId, shapeId))()}
            />
          </section>
          <Timeline project={project} t_ms={t_ms} setT={setT} playing={playing} setPlaying={setPlaying}/>
        </>
      )}
    </main>
  );
}
