import test from 'node:test';
import assert from 'node:assert/strict';
import { cubicBezier } from '../src/lib/bezier.js';

test('cubicBezier respects endpoints', () => {
  const f = cubicBezier(0.42, 0, 0.58, 1);
  assert.equal(f(0), 0);
  assert.equal(f(1), 1);
});

test('cubicBezier ease-in-out is symmetric-ish', () => {
  const f = cubicBezier(0.42, 0, 0.58, 1);
  assert.ok(Math.abs(f(0.5) - 0.5) < 0.05);
});
