export function LayersPanel({ project, activeLayerId, onActivateLayer, onAddLayer, onDeleteLayer, onToggleVisible }) {
  if (!project) return null;
  return (
    <div className="layers">
      <header>
        <h3>Calques</h3>
        <div>
          <button onClick={() => onAddLayer('vector')}>+ vector</button>
          <button onClick={() => onAddLayer('raster')}>+ raster</button>
        </div>
      </header>
      <ul>
        {[...project.layers].reverse().map(l => (
          <li key={l.id} className={l.id === activeLayerId ? 'active' : ''}>
            <input type="checkbox" checked={l.visible} onChange={() => onToggleVisible(l)}/>
            <span className="lname" onClick={() => l.kind === 'vector' && onActivateLayer(l.id)}>
              {l.kind === 'raster' ? '🖌️' : '⬢'} {l.name}
            </span>
            <button onClick={() => onDeleteLayer(l)}>×</button>
          </li>
        ))}
      </ul>
      <p className="hint">Cliquez sur un calque vectoriel pour le rendre actif (dessin, décor).</p>
    </div>
  );
}
