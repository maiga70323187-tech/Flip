import test from 'node:test';
import assert from 'node:assert/strict';
import { computeBoneTransforms, solveFABRIK, ancestorChain } from '../src/services/rigging.js';

test('root bone kinematics use its own x/y/rotation', () => {
  const bones = [{ id: 'r', parent_id: null, x: 100, y: 50, length: 40, rotation: 0 }];
  const t = computeBoneTransforms(bones);
  assert.equal(t.r.x, 100);
  assert.equal(t.r.y, 50);
  assert.equal(Math.round(t.r.tipX), 140);
  assert.equal(Math.round(t.r.tipY), 50);
});

test('child bone inherits from parent tip and accumulates rotation', () => {
  const bones = [
    { id: 'r', parent_id: null, x: 0, y: 0, length: 100, rotation: 0 },
    { id: 'c', parent_id: 'r', length: 100, rotation: 90 },
  ];
  const t = computeBoneTransforms(bones);
  assert.equal(Math.round(t.c.x), 100);
  assert.equal(Math.round(t.c.y), 0);
  assert.equal(Math.round(t.c.tipX), 100);
  assert.equal(Math.round(t.c.tipY), 100);
});

test('FABRIK reaches an in-range target with small error', () => {
  const bones = [
    { id: 'r', parent_id: null, x: 0, y: 0, length: 100, rotation: 0 },
    { id: 'c', parent_id: 'r', length: 100, rotation: 0 },
  ];
  const rel = solveFABRIK(bones, 0, 0, 100, 100);
  // Applique les rotations calculées et vérifie que le tip est bien proche
  const withNewRot = bones.map((b, i) => ({ ...b, rotation: rel[i] }));
  const t = computeBoneTransforms(withNewRot);
  const dx = t.c.tipX - 100, dy = t.c.tipY - 100;
  assert.ok(Math.hypot(dx, dy) < 1, `err = ${Math.hypot(dx, dy)}`);
});

test('FABRIK on unreachable target stretches the chain', () => {
  const bones = [
    { id: 'r', parent_id: null, x: 0, y: 0, length: 50, rotation: 0 },
    { id: 'c', parent_id: 'r', length: 50, rotation: 0 },
  ];
  const rel = solveFABRIK(bones, 0, 0, 1000, 0);
  const withNewRot = bones.map((b, i) => ({ ...b, rotation: rel[i] }));
  const t = computeBoneTransforms(withNewRot);
  assert.ok(Math.abs(t.c.tipY) < 1, `y should be ~0, got ${t.c.tipY}`);
  assert.ok(t.c.tipX >= 99, `stretched tip x = ${t.c.tipX}`);
});

test('ancestorChain returns root -> target order', () => {
  const bones = [
    { id: 'a', parent_id: null, length: 10, rotation: 0 },
    { id: 'b', parent_id: 'a', length: 10, rotation: 0 },
    { id: 'c', parent_id: 'b', length: 10, rotation: 0 },
  ];
  const chain = ancestorChain(bones, 'c');
  assert.deepEqual(chain.map(b => b.id), ['a', 'b', 'c']);
});
