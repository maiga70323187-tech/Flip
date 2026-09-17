import test from 'node:test';
import assert from 'node:assert/strict';
import { simplify, toBezierPath } from '../src/lib/pathTools.js';

test('simplify keeps endpoints and drops collinear midpoints', () => {
  const pts = [[0,0],[1,0.1],[2,0.05],[3,0],[10,0]];
  const out = simplify(pts, 0.5);
  assert.ok(out.length >= 2);
  assert.deepEqual(out[0], [0, 0]);
  assert.deepEqual(out[out.length - 1], [10, 0]);
  assert.ok(out.length < pts.length);
});

test('toBezierPath produces a valid M ... C ... string', () => {
  const d = toBezierPath([[0,0],[10,10],[20,0],[30,10]]);
  assert.match(d, /^M 0 0/);
  assert.match(d, / C /);
});

test('toBezierPath on a single point produces just M', () => {
  assert.equal(toBezierPath([[5, 7]]), 'M 5 7');
  assert.equal(toBezierPath([]), '');
});
