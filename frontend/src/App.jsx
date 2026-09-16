import { useEffect, useState } from 'react';
import { api } from './api.js';
import { Stage } from './components/Stage.jsx';
import { Timeline } from './components/Timeline.jsx';
import { LayersPanel } from './components/LayersPanel.jsx';
import { Inspector } from './components/Inspector.jsx';

export default function App() {
  const [projects, setProjects] = useState([]);
  const [project, setProject] = useState(null);
  const [t_ms, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');

  const refresh = () => api.listProjects().then(setProjects).catch(e => setError(e.message));
  const load = async (id) => { const p = await api.getProject(id); setProject(p); setT(0); setSelected(null); };
  const reload = async () => project && load(project.id);
  const guarded = fn => (...args) => fn(...args).catch(e => setError(e.message)).then(reload);

  useEffect(() => { refresh(); }, []);

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
        <a href={`${api.base}/api/openapi.json`} target="_blank" rel="noreferrer">OpenAPI</a>
      </section>

      {project && (
        <>
          <section className="workspace">
            <LayersPanel
              project={project}
              onAddLayer={kind => guarded(() => api.addLayer(project.id, { kind, name: kind === 'raster' ? 'Nouveau FBF' : 'Nouveau vecteur' }))()}
              onDeleteLayer={l => guarded(() => api.deleteLayer(project.id, l.id))()}
              onToggleVisible={l => guarded(() => api.patchLayer(project.id, l.id, { visible: !l.visible }))()}
            />
            <Stage project={project} t_ms={t_ms} onSelectShape={setSelected} selectedId={selected?.shape?.id}/>
            <Inspector
              project={project}
              selected={selected}
              t_ms={t_ms}
              onAddShape={(layerId, type, props) => guarded(() => api.addShape(project.id, layerId, { type, props }))()}
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
