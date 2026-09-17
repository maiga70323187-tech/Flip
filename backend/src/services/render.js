// Rendu SVG local — aucun modèle externe.
// Interpolation des keyframes -> valeurs -> SVG à un instant t.

import { EASINGS } from '../lib/model.js';
import { cubicBezier } from '../lib/bezier.js';

function easingCurve(name, bezier) {
  if (name === 'bezier' && Array.isArray(bezier) && bezier.length === 4) return cubicBezier(...bezier);
  switch (name) {
    case 'ease-in':     return cubicBezier(0.42, 0, 1, 1);
    case 'ease-out':    return cubicBezier(0, 0, 0.58, 1);
    case 'ease-in-out': return cubicBezier(0.42, 0, 0.58, 1);
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
      const eased = easingCurve(a.easing, a.bezier)(local);
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
  const linecap = style.stroke_linecap ?? 'round';
  const linejoin = style.stroke_linejoin ?? 'round';
  const dash = style.stroke_dasharray ? ` stroke-dasharray="${style.stroke_dasharray}"` : '';
  const attrs = `fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="${linecap}" stroke-linejoin="${linejoin}"${dash} opacity="${opacity}" transform="${tf}"`;
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

function defsToSvg(project) {
  if (!project.defs?.length) return '';
  const parts = ['<defs>'];
  for (const d of project.defs) {
    if (d.kind === 'linearGradient') {
      const attrs = `x1="${d.x1 ?? 0}" y1="${d.y1 ?? 0}" x2="${d.x2 ?? 1}" y2="${d.y2 ?? 0}"`;
      parts.push(`<linearGradient id="${d.id}" ${attrs}>`);
      for (const s of d.stops) parts.push(`<stop offset="${s.offset}" stop-color="${s.color}" stop-opacity="${s.opacity ?? 1}"/>`);
      parts.push('</linearGradient>');
    } else if (d.kind === 'radialGradient') {
      const attrs = `cx="${d.cx ?? 0.5}" cy="${d.cy ?? 0.5}" r="${d.r ?? 0.5}"`;
      parts.push(`<radialGradient id="${d.id}" ${attrs}>`);
      for (const s of d.stops) parts.push(`<stop offset="${s.offset}" stop-color="${s.color}" stop-opacity="${s.opacity ?? 1}"/>`);
      parts.push('</radialGradient>');
    }
  }
  parts.push('</defs>');
  return parts.join('');
}

export function renderFrameSvg(project, t_ms) {
  const parts = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${project.width} ${project.height}" width="${project.width}" height="${project.height}" shape-rendering="geometricPrecision" text-rendering="optimizeLegibility">`];
  parts.push(defsToSvg(project));
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
