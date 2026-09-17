import test from 'node:test';
import assert from 'node:assert/strict';
import { cubicBezier, PRESETS } from '../src/lib/bezier.js';

test('linear cubic-bezier passes through 0 and 1', () => {
  const f = cubicBezier(...PRESETS.linear);
  assert.equal(f(0), 0);
  assert.equal(f(1), 1);
  assert.ok(Math.abs(f(0.5) - 0.5) < 1e-6);
});

test('ease-in is below linear at midpoint', () => {
  const f = cubicBezier(...PRESETS['ease-in']);
  assert.ok(f(0.5) < 0.5);
});

test('ease-out is above linear at midpoint', () => {
  const f = cubicBezier(...PRESETS['ease-out']);
  assert.ok(f(0.5) > 0.5);
});
