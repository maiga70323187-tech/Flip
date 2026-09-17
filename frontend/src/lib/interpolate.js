// Mêmes règles d'interpolation que le backend (services/render.js)
// pour que la preview locale corresponde exactement au rendu serveur.
import { cubicBezier, PRESETS } from './bezier.js';

function curve(easing, bezier) {
  if (easing === 'bezier' && Array.isArray(bezier) && bezier.length === 4) return cubicBezier(...bezier);
  if (easing === 'step') return t => (t < 1 ? 0 : 1);
  const p = PRESETS[easing] ?? PRESETS.linear;
  return cubicBezier(...p);
}

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
      const eased = curve(a.easing, a.bezier)(local);
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
