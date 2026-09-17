// Lissage de tracé libre : simplification (Ramer-Douglas-Peucker)
// puis conversion en chemin SVG Bézier via Catmull-Rom.

function distToSegment2(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) { const px = p[0] - a[0], py = p[1] - a[1]; return px * px + py * py; }
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
  const cx = a[0] + t * dx, cy = a[1] + t * dy;
  const ex = p[0] - cx, ey = p[1] - cy;
  return ex * ex + ey * ey;
}

export function simplify(points, tolerance = 2) {
  if (points.length < 3) return points.slice();
  const tol2 = tolerance * tolerance;
  const stack = [[0, points.length - 1]];
  const keep = new Array(points.length).fill(false);
  keep[0] = keep[points.length - 1] = true;
  while (stack.length) {
    const [i, j] = stack.pop();
    let maxD = 0, idx = -1;
    for (let k = i + 1; k < j; k++) {
      const d = distToSegment2(points[k], points[i], points[j]);
      if (d > maxD) { maxD = d; idx = k; }
    }
    if (idx !== -1 && maxD > tol2) {
      keep[idx] = true;
      stack.push([i, idx], [idx, j]);
    }
  }
  return points.filter((_, k) => keep[k]);
}

// Catmull-Rom -> chemin Bézier cubique
export function toBezierPath(points) {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${fmt(points[0][0])} ${fmt(points[0][1])}`;
  let d = `M ${fmt(points[0][0])} ${fmt(points[0][1])}`;
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
  return d;
}

function fmt(n) { return Math.round(n * 100) / 100; }

// ---------- Stylo à points d'ancrage ----------
// Une ancre : { x, y, hIn: [dx, dy] | null, hOut: [dx, dy] | null }
// hIn / hOut sont des offsets relatifs à (x, y). null = coin anguleux (pas de poignée).

export function anchorsToD(anchors, closed = false) {
  if (!Array.isArray(anchors) || anchors.length === 0) return '';
  const a0 = anchors[0];
  let d = `M ${fmt(a0.x)} ${fmt(a0.y)}`;
  const end = closed ? anchors.length : anchors.length - 1;
  for (let i = 0; i < end; i++) {
    const cur = anchors[i];
    const next = anchors[(i + 1) % anchors.length];
    const out = cur.hOut;
    const inp = next.hIn;
    if (!out && !inp) {
      d += ` L ${fmt(next.x)} ${fmt(next.y)}`;
    } else {
      const c1x = cur.x + (out ? out[0] : 0);
      const c1y = cur.y + (out ? out[1] : 0);
      const c2x = next.x + (inp ? inp[0] : 0);
      const c2y = next.y + (inp ? inp[1] : 0);
      d += ` C ${fmt(c1x)} ${fmt(c1y)}, ${fmt(c2x)} ${fmt(c2y)}, ${fmt(next.x)} ${fmt(next.y)}`;
    }
  }
  if (closed) d += ' Z';
  return d;
}

// Ancre symétrique lisse : hOut = (dx, dy), hIn = (-dx, -dy).
export function makeSmoothAnchor(x, y, dx, dy) {
  return { x, y, hIn: [-dx, -dy], hOut: [dx, dy] };
}

export function makeCornerAnchor(x, y) {
  return { x, y, hIn: null, hOut: null };
}

// Divise une courbe de Bézier cubique au paramètre t (de Casteljau).
// Renvoie les 2 nouvelles poignées et le point milieu, à insérer entre les deux ancres.
export function splitCubic(a, b, t) {
  const p0 = [a.x, a.y];
  const p1 = [a.x + (a.hOut?.[0] ?? 0), a.y + (a.hOut?.[1] ?? 0)];
  const p2 = [b.x + (b.hIn?.[0] ?? 0), b.y + (b.hIn?.[1] ?? 0)];
  const p3 = [b.x, b.y];
  const lerp = (p, q, u) => [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u];
  const q0 = lerp(p0, p1, t);
  const q1 = lerp(p1, p2, t);
  const q2 = lerp(p2, p3, t);
  const r0 = lerp(q0, q1, t);
  const r1 = lerp(q1, q2, t);
  const s  = lerp(r0, r1, t);
  return {
    aHOut: [q0[0] - a.x, q0[1] - a.y],
    newAnchor: { x: s[0], y: s[1], hIn: [r0[0] - s[0], r0[1] - s[1]], hOut: [r1[0] - s[0], r1[1] - s[1]] },
    bHIn: [q2[0] - b.x, q2[1] - b.y],
  };
}

// Trouve le point le plus proche d'une position (px, py) sur un tracé formé d'ancres,
// en échantillonnant chaque segment. Renvoie { segmentIndex, t, distance } ou null.
export function nearestOnPath(anchors, closed, px, py, samples = 24) {
  if (!anchors || anchors.length < 2) return null;
  const end = closed ? anchors.length : anchors.length - 1;
  let best = null;
  for (let i = 0; i < end; i++) {
    const a = anchors[i];
    const b = anchors[(i + 1) % anchors.length];
    for (let k = 1; k < samples; k++) {
      const t = k / samples;
      const p = sampleCubic(a, b, t);
      const dx = p[0] - px, dy = p[1] - py;
      const d = dx * dx + dy * dy;
      if (!best || d < best.distance) best = { segmentIndex: i, t, distance: d, x: p[0], y: p[1] };
    }
  }
  return best;
}

function sampleCubic(a, b, t) {
  const p0 = [a.x, a.y];
  const p1 = [a.x + (a.hOut?.[0] ?? 0), a.y + (a.hOut?.[1] ?? 0)];
  const p2 = [b.x + (b.hIn?.[0] ?? 0), b.y + (b.hIn?.[1] ?? 0)];
  const p3 = [b.x, b.y];
  const u = 1 - t;
  return [
    u*u*u*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t*t*t*p3[0],
    u*u*u*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t*t*t*p3[1],
  ];
}
