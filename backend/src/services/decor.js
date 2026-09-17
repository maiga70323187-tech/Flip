// Décors procéduraux — 100 % locaux, déterministes via un seed.
// Sortie : une liste de shapes (+ éventuellement des defs) à ajouter à un calque.

import { newShape, newLinearGradient, newRadialGradient } from '../lib/model.js';

function mulberry32(seed) {
  return function() {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fmt(n) { return Math.round(n * 100) / 100; }

// --- silhouette de montagne : marche aléatoire douce sur y ---
function ridgePath(rand, width, baseY, amp, step, jitter) {
  const points = [];
  let y = baseY;
  for (let x = 0; x <= width; x += step) {
    y += (rand() - 0.5) * amp * jitter;
    y = Math.max(baseY - amp, Math.min(baseY + amp * 0.4, y));
    points.push([x, y]);
  }
  // conversion en path Bézier lissé (Catmull-Rom -> C)
  let d = `M 0 ${fmt(baseY + amp)} L ${fmt(points[0][0])} ${fmt(points[0][1])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${fmt(c1x)} ${fmt(c1y)}, ${fmt(c2x)} ${fmt(c2y)}, ${fmt(p2[0])} ${fmt(p2[1])}`;
  }
  d += ` L ${width} ${fmt(baseY + amp)} Z`;
  return d;
}

export function generateDecor({ preset, width, height, seed = 42 }) {
  const rand = mulberry32(seed);
  const shapes = [];
  const defs = [];

  if (preset === 'sky_sunset') {
    const g = newLinearGradient({ name: 'Ciel soleil couchant', x1: 0, y1: 0, x2: 0, y2: 1,
      stops: [
        { offset: 0,   color: '#1a1450' },
        { offset: 0.4, color: '#e04a1b' },
        { offset: 0.7, color: '#f6b352' },
        { offset: 1,   color: '#fce7c5' },
      ] });
    defs.push(g);
    shapes.push(newShape({ type: 'rect', props: { width, height }, transform: { anchor_x: 0, anchor_y: 0 }, style: { fill: `url(#${g.id})`, stroke: 'none' } }));
    const sun = newRadialGradient({ name: 'Soleil', cx: 0.5, cy: 0.5, r: 0.5, stops: [
      { offset: 0, color: '#fff6c8', opacity: 1 },
      { offset: 0.6, color: '#ffb35a', opacity: 0.6 },
      { offset: 1, color: '#ffb35a', opacity: 0 },
    ]});
    defs.push(sun);
    shapes.push(newShape({ type: 'ellipse', props: { rx: width * 0.18, ry: width * 0.18 }, transform: { x: width * 0.5, y: height * 0.55 }, style: { fill: `url(#${sun.id})`, stroke: 'none' } }));
  }

  if (preset === 'sky_day' || preset === 'sky_night') {
    const g = preset === 'sky_day'
      ? newLinearGradient({ name: 'Ciel jour', x1: 0, y1: 0, x2: 0, y2: 1, stops: [{ offset: 0, color: '#6cb6ff' }, { offset: 1, color: '#dff0ff' }] })
      : newLinearGradient({ name: 'Ciel nuit', x1: 0, y1: 0, x2: 0, y2: 1, stops: [{ offset: 0, color: '#050817' }, { offset: 1, color: '#1c2140' }] });
    defs.push(g);
    shapes.push(newShape({ type: 'rect', props: { width, height }, transform: { anchor_x: 0, anchor_y: 0 }, style: { fill: `url(#${g.id})`, stroke: 'none' } }));
    if (preset === 'sky_night') {
      for (let i = 0; i < 60; i++) {
        shapes.push(newShape({ type: 'ellipse', props: { rx: rand() * 1.6 + 0.3, ry: rand() * 1.6 + 0.3 }, transform: { x: rand() * width, y: rand() * height * 0.7 }, style: { fill: '#ffffff', opacity: rand() * 0.8 + 0.2, stroke: 'none' } }));
      }
    }
  }

  if (preset === 'mountains' || preset === 'sky_sunset' || preset === 'sky_day') {
    // 3 plans de montagnes
    const palettes = preset === 'sky_sunset'
      ? ['#3b2350', '#4d2d5c', '#7a3f66']
      : ['#5d7285', '#788ea1', '#9ab2c2'];
    for (let i = 0; i < 3; i++) {
      const baseY = height * (0.55 + i * 0.09);
      const amp = height * (0.18 - i * 0.03);
      const d = ridgePath(rand, width, baseY, amp, width / 40, 0.9 - i * 0.2);
      shapes.push(newShape({ type: 'path', props: { d }, style: { fill: palettes[i], stroke: 'none' } }));
    }
  }

  if (preset === 'grass_field' || preset === 'mountains' || preset === 'sky_sunset' || preset === 'sky_day') {
    // sol
    const g = newLinearGradient({ name: 'Sol', x1: 0, y1: 0, x2: 0, y2: 1, stops: [{ offset: 0, color: '#3e6b2a' }, { offset: 1, color: '#1e3714' }] });
    defs.push(g);
    shapes.push(newShape({ type: 'rect', props: { width, height: height * 0.2 }, transform: { x: 0, y: height * 0.8, anchor_x: 0, anchor_y: 0 }, style: { fill: `url(#${g.id})`, stroke: 'none' } }));
  }

  return { shapes, defs };
}

export const DECOR_PRESETS = ['sky_day', 'sky_sunset', 'sky_night', 'mountains', 'grass_field'];
