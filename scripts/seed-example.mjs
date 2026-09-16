// Exemple minimal : construit une scène "balle qui rebondit" 100 % procédurale.
// Aucun appel à un modèle IA externe.
const API = process.env.FLIP_API_URL ?? 'http://localhost:8787';

async function j(pathname, init) {
  const res = await fetch(`${API}${pathname}`, { ...init, headers: init?.body ? { 'content-type': 'application/json' } : undefined });
  if (!res.ok) throw new Error(`${init?.method ?? 'GET'} ${pathname}: ${res.status} ${await res.text()}`);
  return res.status === 204 ? true : res.json();
}

const project = await j('/api/projects', { method: 'POST', body: JSON.stringify({ name: 'Balle qui rebondit', width: 640, height: 360, fps: 30, duration_ms: 2000, background: '#eef' }) });
const layer = project.layers.find(l => l.kind === 'vector') ?? await j(`/api/projects/${project.id}/layers`, { method: 'POST', body: JSON.stringify({ kind: 'vector', name: 'Balle' }) });

const ball = await j(`/api/projects/${project.id}/layers/${layer.id}/shapes`, { method: 'POST', body: JSON.stringify({ type: 'ellipse', props: { rx: 30, ry: 30 }, transform: { x: 80, y: 100 }, style: { fill: '#c22' } }) });

// Rebond simple : x linéaire de 80 -> 560, y qui oscille via 5 keyframes.
const kf = (t, v, easing) => ({ property: undefined, time_ms: t, value: v, easing });
for (const k of [{ t: 0, v: 80 }, { t: 2000, v: 560 }]) await j(`/api/projects/${project.id}/layers/${layer.id}/shapes/${ball.id}/keyframes`, { method: 'POST', body: JSON.stringify({ ...kf(k.t, k.v, 'linear'), property: 'x' }) });
for (const k of [{ t: 0, v: 100 }, { t: 500, v: 260 }, { t: 1000, v: 100 }, { t: 1500, v: 260 }, { t: 2000, v: 100 }]) await j(`/api/projects/${project.id}/layers/${layer.id}/shapes/${ball.id}/keyframes`, { method: 'POST', body: JSON.stringify({ ...kf(k.t, k.v, 'ease-in-out'), property: 'y' }) });

console.log(`Projet créé: ${project.id}`);
console.log(`Ouvrir: ${API}/api/projects/${project.id}/render?t_ms=500`);
