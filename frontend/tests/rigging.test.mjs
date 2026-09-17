import test from 'node:test';
import assert from 'node:assert/strict';
import { computeBoneTransforms, solveFABRIK } from '../src/lib/rigging.js';

test('frontend rigging is a mirror of backend (basic FK)', () => {
  const bones = [
    { id: 'r', parent_id: null, x: 10, y: 20, length: 40, rotation: 45 },
  ];
  const t = computeBoneTransforms(bones);
  assert.equal(t.r.x, 10);
  assert.equal(t.r.y, 20);
  // 40 * cos(45) ~ 28.28, + 10 = 38.28
  assert.ok(Math.abs(t.r.tipX - 38.28) < 0.1);
});

test('frontend FABRIK matches basic reachability', () => {
  const bones = [{ id: 'a', parent_id: null, x: 0, y: 0, length: 50, rotation: 0 }, { id: 'b', parent_id: 'a', length: 50, rotation: 0 }];
  const rel = solveFABRIK(bones, 0, 0, 0, 100);
  const withNew = bones.map((b, i) => ({ ...b, rotation: rel[i] }));
  const t = computeBoneTransforms(withNew);
  assert.ok(Math.abs(t.b.tipX) < 1);
  assert.ok(Math.abs(t.b.tipY - 100) < 1);
});
