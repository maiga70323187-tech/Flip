const PRESETS = [
  { key: 'sky_day',    label: '☀️ Ciel jour + montagnes' },
  { key: 'sky_sunset', label: '🌅 Coucher de soleil'    },
  { key: 'sky_night',  label: '🌌 Ciel étoilé'          },
  { key: 'mountains',  label: '⛰️ Montagnes seules'     },
  { key: 'grass_field',label: '🌿 Champ vert'           },
];

export function DecorPresets({ onApply }) {
  return (
    <div className="decor-presets">
      <h3>Décor procédural</h3>
      <p className="hint">Dessine localement, sans modèle externe. Chaque application crée un nouveau calque « Décor » posé sous les autres.</p>
      <div className="grid">
        {PRESETS.map(p => (
          <button key={p.key} onClick={() => onApply(p.key)}>{p.label}</button>
        ))}
      </div>
    </div>
  );
}
