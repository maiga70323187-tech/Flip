export function LayersPanel({ project, onAddLayer, onDeleteLayer, onToggleVisible }) {
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
          <li key={l.id}>
            <input type="checkbox" checked={l.visible} onChange={() => onToggleVisible(l)}/>
            <span>{l.kind === 'raster' ? '🖌️' : '⬢'} {l.name}</span>
            <button onClick={() => onDeleteLayer(l)}>×</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
