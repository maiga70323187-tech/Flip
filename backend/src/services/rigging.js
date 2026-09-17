// Moteur de rigging 2D : cinématique directe (FK) + inverse (FABRIK).
// Un os a : { id, name, parent_id, length, rotation (deg, relative à son parent),
// x, y (seulement lu pour le root), tracks (keyframes) }.

import { cubicBezier } from '../lib/bezier.js';

const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;

function curveFor(k) {
  if (k.easing === 'bezier' && Array.isArray(k.bezier) && k.bezier.length === 4) return cubicBezier(...k.bezier);
  if (k.easing === 'step') return (t) => (t < 1 ? 0 : 1);
  const map = { linear: [0,0,1,1], 'ease-in': [0.42,0,1,1], 'ease-out': [0,0,0.58,1], 'ease-in-out': [0.42,0,0.58,1] };
  const p = map[k.easing] ?? map.linear;
  return cubicBezier(...p);
}

function sampleTrack(track, t_ms) {
  if (!track || track.length === 0) return undefined;
  if (t_ms <= track[0].time_ms) return track[0].value;
  const last = track[track.length - 1];
  if (t_ms >= last.time_ms) return last.value;
  for (let i = 0; i < track.length - 1; i++) {
    const a = track[i], b = track[i + 1];
    if (t_ms >= a.time_ms && t_ms <= b.time_ms) {
      const u = (t_ms - a.time_ms) / Math.max(1, b.time_ms - a.time_ms);
      const eased = curveFor(a)(u);
      return a.value + (b.value - a.value) * eased;
    }
  }
  return last.value;
}

function clampRotation(v, min, max) {
  if (typeof min === 'number' && v < min) v = min;
  if (typeof max === 'number' && v > max) v = max;
  return v;
}

export function resolveBone(bone, t_ms) {
  const tracks = bone.tracks || {};
  const raw = sampleTrack(tracks.rotation, t_ms) ?? bone.rotation ?? 0;
  return {
    rotation: clampRotation(raw, bone.limit_min, bone.limit_max),
    length:   sampleTrack(tracks.length, t_ms)   ?? bone.length ?? 0,
    x:        sampleTrack(tracks.x, t_ms)        ?? bone.x ?? 0,
    y:        sampleTrack(tracks.y, t_ms)        ?? bone.y ?? 0,
  };
}

// Renvoie { [boneId]: { x, y, rotation, tipX, tipY, length } } — tout en degrés.
export function computeBoneTransforms(bones, t_ms = 0) {
  const byId = Object.fromEntries(bones.map(b => [b.id, b]));
  const out = {};
  const visit = (b) => {
    if (out[b.id]) return out[b.id];
    const r = resolveBone(b, t_ms);
    let baseX, baseY, baseRot;
    if (b.parent_id && byId[b.parent_id]) {
      const pt = visit(byId[b.parent_id]);
      baseX = pt.tipX; baseY = pt.tipY; baseRot = pt.rotation;
    } else {
      baseX = r.x; baseY = r.y; baseRot = 0;
    }
    const rotation = baseRot + r.rotation;
    const rr = rad(rotation);
    out[b.id] = {
      x: baseX, y: baseY, rotation,
      tipX: baseX + Math.cos(rr) * r.length,
      tipY: baseY + Math.sin(rr) * r.length,
      length: r.length,
    };
    return out[b.id];
  };
  for (const b of bones) visit(b);
  return out;
}

// FABRIK — Inverse Kinematics
// Reçoit une chaîne d'os (dans l'ordre parent -> enfant), la position monde
// de la base (racine), et une cible. Renvoie la liste des nouvelles rotations
// RELATIVES à appliquer sur chaque os pour que la pointe atteigne la cible.
export function solveFABRIK(bones, rootX, rootY, targetX, targetY, iterations = 12) {
  if (!bones.length) return [];
  const lengths = bones.map(b => Math.max(1e-3, b.length || 0));
  const totalLen = lengths.reduce((a, b) => a + b, 0);
  // positions initiales à partir des rotations courantes (approximation en repère monde)
  const positions = [[rootX, rootY]];
  let accRot = 0;
  for (let i = 0; i < bones.length; i++) {
    accRot += bones[i].rotation || 0;
    const r = rad(accRot);
    const last = positions[positions.length - 1];
    positions.push([last[0] + Math.cos(r) * lengths[i], last[1] + Math.sin(r) * lengths[i]]);
  }
  const distToTarget = Math.hypot(targetX - rootX, targetY - rootY);
  if (distToTarget >= totalLen) {
    // cible hors de portée → étirer la chaîne dans la direction de la cible
    for (let i = 0; i < bones.length; i++) {
      const dx = targetX - positions[i][0], dy = targetY - positions[i][1];
      const dl = Math.max(1e-6, Math.hypot(dx, dy));
      positions[i + 1] = [positions[i][0] + (dx / dl) * lengths[i], positions[i][1] + (dy / dl) * lengths[i]];
    }
  } else {
    for (let it = 0; it < iterations; it++) {
      // backward reach : pointe vers cible, puis remonte
      positions[positions.length - 1] = [targetX, targetY];
      for (let i = positions.length - 2; i >= 0; i--) {
        const dx = positions[i][0] - positions[i + 1][0];
        const dy = positions[i][1] - positions[i + 1][1];
        const dl = Math.max(1e-6, Math.hypot(dx, dy));
        positions[i] = [positions[i + 1][0] + (dx / dl) * lengths[i], positions[i + 1][1] + (dy / dl) * lengths[i]];
      }
      // forward reach : racine fixée, redescente
      positions[0] = [rootX, rootY];
      for (let i = 0; i < positions.length - 1; i++) {
        const dx = positions[i + 1][0] - positions[i][0];
        const dy = positions[i + 1][1] - positions[i][1];
        const dl = Math.max(1e-6, Math.hypot(dx, dy));
        positions[i + 1] = [positions[i][0] + (dx / dl) * lengths[i], positions[i][1] + (dy / dl) * lengths[i]];
      }
    }
  }
  // On dérive les nouvelles rotations MONDE et on les convertit en relatives.
  const worldRots = [];
  for (let i = 0; i < bones.length; i++) {
    const dx = positions[i + 1][0] - positions[i][0];
    const dy = positions[i + 1][1] - positions[i][1];
    worldRots.push(deg(Math.atan2(dy, dx)));
  }
  const rel = [];
  for (let i = 0; i < worldRots.length; i++) {
    let r = worldRots[i] - (i === 0 ? 0 : worldRots[i - 1]);
    // contraintes d'angle par os
    const b = bones[i];
    r = clampRotation(r, b.limit_min, b.limit_max);
    rel.push(r);
  }
  return rel;
}

// Chaîne des ancêtres d'un os (racine -> os), utile pour l'IK.
export function ancestorChain(bones, boneId, maxDepth = Infinity) {
  const byId = Object.fromEntries(bones.map(b => [b.id, b]));
  const chain = [];
  let cur = byId[boneId];
  while (cur && chain.length < maxDepth) {
    chain.unshift(cur);
    cur = cur.parent_id ? byId[cur.parent_id] : null;
  }
  return chain;
}
