// Miroir de backend/src/services/rigging.js
import { cubicBezier, PRESETS } from './bezier.js';

const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;

function curveFor(k) {
  if (k.easing === 'bezier' && Array.isArray(k.bezier) && k.bezier.length === 4) return cubicBezier(...k.bezier);
  if (k.easing === 'step') return (t) => (t < 1 ? 0 : 1);
  const p = PRESETS[k.easing] ?? PRESETS.linear;
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
      return a.value + (b.value - a.value) * curveFor(a)(u);
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
  const t = bone.tracks || {};
  const raw = sampleTrack(t.rotation, t_ms) ?? bone.rotation ?? 0;
  return {
    rotation: clampRotation(raw, bone.limit_min, bone.limit_max),
    length:   sampleTrack(t.length, t_ms)   ?? bone.length ?? 0,
    x:        sampleTrack(t.x, t_ms)        ?? bone.x ?? 0,
    y:        sampleTrack(t.y, t_ms)        ?? bone.y ?? 0,
  };
}

export function computeBoneTransforms(bones, t_ms = 0) {
  const byId = Object.fromEntries(bones.map(b => [b.id, b]));
  const out = {};
  const visit = (b) => {
    if (out[b.id]) return out[b.id];
    const r = resolveBone(b, t_ms);
    let bx, by, br;
    if (b.parent_id && byId[b.parent_id]) {
      const pt = visit(byId[b.parent_id]);
      bx = pt.tipX; by = pt.tipY; br = pt.rotation;
    } else { bx = r.x; by = r.y; br = 0; }
    const rotation = br + r.rotation;
    const rr = rad(rotation);
    out[b.id] = { x: bx, y: by, rotation, tipX: bx + Math.cos(rr) * r.length, tipY: by + Math.sin(rr) * r.length, length: r.length };
    return out[b.id];
  };
  for (const b of bones) visit(b);
  return out;
}

export function solveFABRIK(bones, rootX, rootY, targetX, targetY, iterations = 12) {
  if (!bones.length) return [];
  const lengths = bones.map(b => Math.max(1e-3, b.length || 0));
  const totalLen = lengths.reduce((a, b) => a + b, 0);
  const positions = [[rootX, rootY]];
  let accRot = 0;
  for (let i = 0; i < bones.length; i++) {
    accRot += bones[i].rotation || 0;
    const r = rad(accRot);
    const last = positions[positions.length - 1];
    positions.push([last[0] + Math.cos(r) * lengths[i], last[1] + Math.sin(r) * lengths[i]]);
  }
  const dist = Math.hypot(targetX - rootX, targetY - rootY);
  if (dist >= totalLen) {
    for (let i = 0; i < bones.length; i++) {
      const dx = targetX - positions[i][0], dy = targetY - positions[i][1];
      const dl = Math.max(1e-6, Math.hypot(dx, dy));
      positions[i + 1] = [positions[i][0] + dx / dl * lengths[i], positions[i][1] + dy / dl * lengths[i]];
    }
  } else {
    for (let it = 0; it < iterations; it++) {
      positions[positions.length - 1] = [targetX, targetY];
      for (let i = positions.length - 2; i >= 0; i--) {
        const dx = positions[i][0] - positions[i + 1][0], dy = positions[i][1] - positions[i + 1][1];
        const dl = Math.max(1e-6, Math.hypot(dx, dy));
        positions[i] = [positions[i + 1][0] + dx / dl * lengths[i], positions[i + 1][1] + dy / dl * lengths[i]];
      }
      positions[0] = [rootX, rootY];
      for (let i = 0; i < positions.length - 1; i++) {
        const dx = positions[i + 1][0] - positions[i][0], dy = positions[i + 1][1] - positions[i][1];
        const dl = Math.max(1e-6, Math.hypot(dx, dy));
        positions[i + 1] = [positions[i][0] + dx / dl * lengths[i], positions[i][1] + dy / dl * lengths[i]];
      }
    }
  }
  const worldRots = [];
  for (let i = 0; i < bones.length; i++) {
    worldRots.push(deg(Math.atan2(positions[i + 1][1] - positions[i][1], positions[i + 1][0] - positions[i][0])));
  }
  const rel = [];
  for (let i = 0; i < worldRots.length; i++) {
    let r = worldRots[i] - (i === 0 ? 0 : worldRots[i - 1]);
    r = clampRotation(r, bones[i].limit_min, bones[i].limit_max);
    rel.push(r);
  }
  return rel;
}

export function ancestorChain(bones, boneId, maxDepth = Infinity) {
  const byId = Object.fromEntries(bones.map(b => [b.id, b]));
  const chain = [];
  let cur = byId[boneId];
  while (cur && chain.length < maxDepth) { chain.unshift(cur); cur = cur.parent_id ? byId[cur.parent_id] : null; }
  return chain;
}
