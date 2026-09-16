// Rendu SVG local — aucun modèle externe.
// Interpolation des keyframes -> valeurs -> SVG à un instant t.

import { EASINGS } from '../lib/model.js';

function easingCurve(name) {
  switch (name) {
    case 'ease-in':     return (t) => t * t;
    case 'ease-out':    return (t) => 1 - (1 - t) * (1 - t);
    case 'ease-in-out': return (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    case 'step':        return (t) => (t < 1 ? 0 : 1);
    case 'linear':
    default:            return (t) => t;
  }
}

function lerp(a, b, t) {
  if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * t;
  return t < 1 ? a : b;
}

export function sampleTrack(track, t_ms) {
  if (!track || track.length === 0) return undefined;
  if (t_ms <= track[0].time_ms) return track[0].value;
  if (t_ms >= track[track.length - 1].time_ms) return track[track.length - 1].value;
  for (let i = 0; i < track.length - 1; i++) {
    const a = track[i], b = track[i + 1];
    if (t_ms >= a.time_ms && t_ms <= b.time_ms) {
      const local = (t_ms - a.time_ms) / Math.max(1, b.time_ms - a.time_ms);
      const eased = easingCurve(a.easing)(local);
      return lerp(a.value, b.value, eased);
    }
  }
  return track[track.length - 1].value;
}

export function resolveShape(shape, t_ms) {
  const transform = { ...shape.transform };
  const style = { ...shape.style };
  const props = { ...shape.props };
  for (const [prop, track] of Object.entries(shape.tracks || {})) {
    const v = sampleTrack(track, t_ms);
    if (v === undefined) continue;
    if (prop in transform) transform[prop] = v;
    else if (prop in style) style[prop] = v;
    else if (prop in props) props[prop] = v;
  }
  return { transform, style, props };
}

function shapeToSvg(shape, t_ms) {
  const { transform, style, props } = resolveShape(shape, t_ms);
  const tf = `translate(${transform.x} ${transform.y}) rotate(${transform.rotation}) scale(${transform.scale_x} ${transform.scale_y})`;
  const fill = style.fill ?? 'none';
  const stroke = style.stroke ?? 'none';
  const strokeWidth = style.stroke_width ?? 0;
  const opacity = style.opacity ?? 1;
  const attrs = `fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" transform="${tf}"`;
  switch (shape.type) {
    case 'rect':    return `<rect x="${-((props.width ?? 0) * transform.anchor_x)}" y="${-((props.height ?? 0) * transform.anchor_y)}" width="${props.width}" height="${props.height}" rx="${props.rx ?? 0}" ry="${props.ry ?? 0}" ${attrs}/>`;
    case 'ellipse': return `<ellipse cx="0" cy="0" rx="${props.rx}" ry="${props.ry}" ${attrs}/>`;
    case 'path':    return `<path d="${props.d}" ${attrs}/>`;
    case 'polygon': return `<polygon points="${props.points}" ${attrs}/>`;
    case 'line':    return `<line x1="${props.x1}" y1="${props.y1}" x2="${props.x2}" y2="${props.y2}" ${attrs}/>`;
    case 'text':    return `<text x="0" y="0" font-family="${props.font_family}" font-size="${props.font_size}" font-weight="${props.font_weight}" ${attrs}>${escapeXml(props.text)}</text>`;
    default:        return '';
  }
}

function escapeXml(s) { return String(s).replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c])); }

export function renderFrameSvg(project, t_ms) {
  const parts = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${project.width} ${project.height}" width="${project.width}" height="${project.height}">`];
  parts.push(`<rect width="100%" height="100%" fill="${project.background}"/>`);
  for (const l of project.layers) {
    if (!l.visible) continue;
    if (l.kind === 'vector') {
      parts.push(`<g opacity="${l.opacity}">`);
      for (const s of l.shapes) parts.push(shapeToSvg(s, t_ms));
      parts.push('</g>');
    } else if (l.kind === 'raster') {
      const framePeriod = 1000 / (l.fps || 12);
      const idx = Math.min(l.frames.length - 1, Math.floor(t_ms / framePeriod));
      const f = l.frames[idx];
      if (f?.image) parts.push(`<image href="${f.image}" width="${project.width}" height="${project.height}" opacity="${l.opacity}"/>`);
    }
  }
  parts.push('</svg>');
  return parts.join('');
}

export function renderManifest(project) {
  const period = 1000 / project.fps;
  const count = Math.ceil(project.duration_ms / period);
  return {
    project_id: project.id,
    fps: project.fps,
    width: project.width,
    height: project.height,
    duration_ms: project.duration_ms,
    frame_count: count,
    layers: project.layers.map(l => ({ id: l.id, kind: l.kind, name: l.name, visible: l.visible })),
    audio_tracks: project.audio_tracks,
    hint: 'Utiliser /api/projects/:id/render?t_ms=N pour obtenir un SVG à un instant donné.',
  };
}
