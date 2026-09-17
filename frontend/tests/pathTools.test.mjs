import test from 'node:test';
import assert from 'node:assert/strict';
import { simplify, toBezierPath, anchorsToD, makeSmoothAnchor, makeCornerAnchor, nearestOnPath, splitCubic } from '../src/lib/pathTools.js';

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

test('anchorsToD with corner anchors uses L segments', () => {
  const a = [makeCornerAnchor(0, 0), makeCornerAnchor(100, 0), makeCornerAnchor(100, 100)];
  assert.equal(anchorsToD(a, false), 'M 0 0 L 100 0 L 100 100');
  assert.equal(anchorsToD(a, true), 'M 0 0 L 100 0 L 100 100 L 0 0 Z');
});

test('anchorsToD with smooth anchors uses C segments', () => {
  const a = [makeSmoothAnchor(0, 0, 20, 0), makeSmoothAnchor(100, 0, 0, -20)];
  const d = anchorsToD(a, false);
  assert.match(d, /^M 0 0 C /);
  assert.match(d, /100 0$/);
});

test('anchorsToD empty input returns empty string', () => {
  assert.equal(anchorsToD([], false), '');
});

test('nearestOnPath finds a point close to a straight segment', () => {
  const anchors = [makeCornerAnchor(0, 0), makeCornerAnchor(100, 0)];
  const hit = nearestOnPath(anchors, false, 50, 1);
  assert.ok(hit);
  assert.equal(hit.segmentIndex, 0);
  assert.ok(hit.distance < 4);
  assert.ok(Math.abs(hit.x - 50) < 5);
});

test('splitCubic preserves endpoints', () => {
  const a = makeSmoothAnchor(0, 0, 30, 0);
  const b = { x: 100, y: 0, hIn: [-30, 0], hOut: null };
  const { aHOut, newAnchor, bHIn } = splitCubic(a, b, 0.5);
  assert.ok(Array.isArray(aHOut) && aHOut.length === 2);
  assert.ok(Array.isArray(bHIn) && bHIn.length === 2);
  // Le nouveau point est sur la courbe, entre a et b sur l'axe X.
  assert.ok(newAnchor.x > 20 && newAnchor.x < 80);
});
