export const TOOLS = ['select', 'freehand', 'rect', 'ellipse', 'line'];
const LABELS = { select: '⇱ Sélection', freehand: '✎ Pinceau', rect: '▭ Rectangle', ellipse: '◯ Ellipse', line: '╱ Ligne' };

export function Toolbox({ tool, setTool, drawColor, setDrawColor, strokeWidth, setStrokeWidth, filled, setFilled, onionSkin, setOnionSkin }) {
  return (
    <div className="toolbox">
      <div className="tools">
        {TOOLS.map(t => (
          <button key={t} className={tool === t ? 'active' : ''} onClick={() => setTool(t)}>{LABELS[t]}</button>
        ))}
      </div>
      <div className="draw-props">
        <label>Couleur <input type="color" value={drawColor} onChange={e => setDrawColor(e.target.value)}/></label>
        <label>Épais.
          <input type="number" min={0} max={40} step={0.5} value={strokeWidth} onChange={e => setStrokeWidth(Number(e.target.value))}/>
        </label>
        <label className="check"><input type="checkbox" checked={filled} onChange={e => setFilled(e.target.checked)}/> Rempli</label>
        <label className="check"><input type="checkbox" checked={onionSkin} onChange={e => setOnionSkin(e.target.checked)}/> Onion skin</label>
      </div>
    </div>
  );
}
