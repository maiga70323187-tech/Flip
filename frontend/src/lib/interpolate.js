// Mêmes règles d'interpolation que le backend (services/render.js)
// pour que la preview locale corresponde exactement au rendu serveur.

const easings = {
  linear:       t => t,
  'ease-in':    t => t * t,
  'ease-out':   t => 1 - (1 - t) * (1 - t),
  'ease-in-out':t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  step:         t => (t < 1 ? 0 : 1),
};

const lerp = (a, b, t) => (typeof a === 'number' && typeof b === 'number' ? a + (b - a) * t : (t < 1 ? a : b));

export function sample(track, t_ms) {
  if (!track || track.length === 0) return undefined;
  if (t_ms <= track[0].time_ms) return track[0].value;
  const last = track[track.length - 1];
  if (t_ms >= last.time_ms) return last.value;
  for (let i = 0; i < track.length - 1; i++) {
    const a = track[i], b = track[i + 1];
    if (t_ms >= a.time_ms && t_ms <= b.time_ms) {
      const local = (t_ms - a.time_ms) / Math.max(1, b.time_ms - a.time_ms);
      const eased = (easings[a.easing] ?? easings.linear)(local);
      return lerp(a.value, b.value, eased);
    }
  }
  return last.value;
}

export function resolveShape(shape, t_ms) {
  const transform = { ...shape.transform };
  const style = { ...shape.style };
  const props = { ...shape.props };
  for (const [prop, track] of Object.entries(shape.tracks || {})) {
    const v = sample(track, t_ms);
    if (v === undefined) continue;
    if (prop in transform) transform[prop] = v;
    else if (prop in style) style[prop] = v;
    else if (prop in props) props[prop] = v;
  }
  return { transform, style, props };
}
