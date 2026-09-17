// Miroir strict de frontend/src/lib/bezier.js pour que rendu serveur = preview.
function A(a, b) { return 1 - 3 * b + 3 * a; }
function B(a, b) { return 3 * b - 6 * a; }
function C(a)    { return 3 * a; }
function e1(t, a, b) { return ((A(a, b) * t + B(a, b)) * t + C(a)) * t; }
function e1d(t, a, b) { return 3 * A(a, b) * t * t + 2 * B(a, b) * t + C(a); }

export function cubicBezier(x1, y1, x2, y2) {
  return function(x) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const d = e1d(t, x1, x2);
      if (d === 0) break;
      t -= (e1(t, x1, x2) - x) / d;
    }
    return e1(t, y1, y2);
  };
}
