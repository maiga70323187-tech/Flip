// Scène de démo : coucher de soleil + petit personnage avec bras riggé qui salue.
// Utilise UNIQUEMENT l'API HTTP (comme le ferait un agent IA).
const API = 'http://localhost:8787';

async function j(path, opts = {}) {
  const r = await fetch(`${API}${path}`, {
    method: opts.method ?? 'GET',
    headers: opts.body ? { 'content-type': 'application/json' } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!r.ok) throw new Error(`${opts.method ?? 'GET'} ${path}: ${r.status} ${await r.text()}`);
  return r.status === 204 ? true : r.json();
}

// 1) projet
const p = await j('/api/projects', { method: 'POST', body: { name: 'Démo Flip', width: 800, height: 500, fps: 30, duration_ms: 2000 } });
console.log(`Projet ${p.id}`);

// 2) décor coucher de soleil (procédural, aucun modèle externe)
await j(`/api/projects/${p.id}/decor`, { method: 'POST', body: { preset: 'sky_sunset', seed: 7 } });

// 3) calque personnage (créé automatiquement par le projet, on récupère)
const p2 = await j(`/api/projects/${p.id}`);
const charLayer = p2.layers.find(l => l.name === 'Personnage');
const L = charLayer.id;

// 4) squelette : torse -> épaule -> avant-bras -> main
const torso = await j(`/api/projects/${p.id}/layers/${L}/bones`, { method: 'POST', body: { name: 'torse', x: 400, y: 380, length: 90, rotation: -90 } });
const arm   = await j(`/api/projects/${p.id}/layers/${L}/bones`, { method: 'POST', body: { name: 'bras',   parent_id: torso.id, length: 55, rotation: 30 } });
const fore  = await j(`/api/projects/${p.id}/layers/${L}/bones`, { method: 'POST', body: { name: 'avant-bras', parent_id: arm.id, length: 45, rotation: 45 } });

// 5) formes du personnage
// tête (ellipse au sommet du torse)
const head = await j(`/api/projects/${p.id}/layers/${L}/shapes`, { method: 'POST', body: {
  type: 'ellipse', props: { rx: 28, ry: 32 },
  transform: { x: 400, y: 240 },
  style: { fill: '#f4c9a0', stroke: '#5b3a1e', stroke_width: 2 }
} });

// corps (rect arrondi)
const body = await j(`/api/projects/${p.id}/layers/${L}/shapes`, { method: 'POST', body: {
  type: 'rect', props: { width: 60, height: 90, rx: 12, ry: 12 },
  transform: { x: 400, y: 320 },
  style: { fill: '#2a4d80', stroke: '#0e223d', stroke_width: 2 }
} });

// bras supérieur (attaché à l'os "bras")
const armShape = await j(`/api/projects/${p.id}/layers/${L}/shapes`, { method: 'POST', body: {
  type: 'rect', props: { width: 55, height: 14, rx: 7, ry: 7 },
  transform: { x: 28, y: 0, anchor_x: 0, anchor_y: 0.5 },
  style: { fill: '#3a68a5', stroke: '#0e223d', stroke_width: 1.5 }
} });
await j(`/api/projects/${p.id}/layers/${L}/shapes/${armShape.id}`, { method: 'PATCH', body: { parent_bone: arm.id } });

// avant-bras (attaché à l'os "avant-bras")
const foreShape = await j(`/api/projects/${p.id}/layers/${L}/shapes`, { method: 'POST', body: {
  type: 'rect', props: { width: 45, height: 12, rx: 6, ry: 6 },
  transform: { x: 22, y: 0, anchor_x: 0, anchor_y: 0.5 },
  style: { fill: '#f4c9a0', stroke: '#5b3a1e', stroke_width: 1.5 }
} });
await j(`/api/projects/${p.id}/layers/${L}/shapes/${foreShape.id}`, { method: 'PATCH', body: { parent_bone: fore.id } });

// main (petit cercle)
const hand = await j(`/api/projects/${p.id}/layers/${L}/shapes`, { method: 'POST', body: {
  type: 'ellipse', props: { rx: 10, ry: 10 },
  transform: { x: 45, y: 0 },
  style: { fill: '#f4c9a0', stroke: '#5b3a1e', stroke_width: 1.5 }
} });
await j(`/api/projects/${p.id}/layers/${L}/shapes/${hand.id}`, { method: 'PATCH', body: { parent_bone: fore.id } });

// 6) animation : le bras salue (rotation de l'os "bras")
// à 0ms rotation=30, à 500ms rotation=-70, à 1000ms rotation=30, à 1500ms rotation=-70, à 2000ms rotation=30
for (const [t, v] of [[0, 30], [500, -70], [1000, 30], [1500, -70], [2000, 30]]) {
  await j(`/api/projects/${p.id}/layers/${L}/bones/${arm.id}/keyframes`, { method: 'POST', body: { property: 'rotation', time_ms: t, value: v, easing: 'ease-in-out' } });
}
// l'avant-bras suit un peu, mais avec un retard rythmique
for (const [t, v] of [[0, 45], [500, -20], [1000, 45], [1500, -20], [2000, 45]]) {
  await j(`/api/projects/${p.id}/layers/${L}/bones/${fore.id}/keyframes`, { method: 'POST', body: { property: 'rotation', time_ms: t, value: v, easing: 'ease-in-out' } });
}

// 7) petit rebond vertical du personnage (torse) — pour montrer le graph editor
for (const [t, v] of [[0, 380], [500, 370], [1000, 380], [1500, 370], [2000, 380]]) {
  await j(`/api/projects/${p.id}/layers/${L}/bones/${torso.id}/keyframes`, { method: 'POST', body: { property: 'y', time_ms: t, value: v, easing: 'ease-in-out' } });
}

console.log(`OK  ->  ${p.id}`);
console.log(`Head=${head.id}  Body=${body.id}  Arm=${arm.id}`);
