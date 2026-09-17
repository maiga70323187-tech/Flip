// Cubic-bezier easing (mêmes règles que CSS cubic-bezier).
// Résout t pour un x donné via Newton, puis renvoie y.

function A(a, b) { return 1 - 3 * b + 3 * a; }
function B(a, b) { return 3 * b - 6 * a; }
function C(a)    { return 3 * a; }
function eval1(t, a, b) { return ((A(a, b) * t + B(a, b)) * t + C(a)) * t; }
function eval1Deriv(t, a, b) { return 3 * A(a, b) * t * t + 2 * B(a, b) * t + C(a); }

export function cubicBezier(x1, y1, x2, y2) {
  return function(x) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const d = eval1Deriv(t, x1, x2);
      if (d === 0) break;
      const cx = eval1(t, x1, x2) - x;
      t -= cx / d;
    }
    return eval1(t, y1, y2);
  };
}

export const PRESETS = {
  linear:        [0, 0, 1, 1],
  'ease-in':     [0.42, 0, 1, 1],
  'ease-out':    [0, 0, 0.58, 1],
  'ease-in-out': [0.42, 0, 0.58, 1],
};
