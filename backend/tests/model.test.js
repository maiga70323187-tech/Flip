import test from 'node:test';
import assert from 'node:assert/strict';
import { newProject, newShape, newVectorLayer, newRasterLayer, newKeyframe, SHAPE_TYPES, EASINGS } from '../src/lib/model.js';

test('newProject exposes required fields', () => {
  const p = newProject({ name: 'x' });
  assert.equal(p.name, 'x');
  assert.ok(p.id && p.width && p.height && p.fps && p.duration_ms);
  assert.deepEqual(p.layers, []);
});

test('newShape validates type and applies defaults', () => {
  for (const t of SHAPE_TYPES) {
    const s = newShape({ type: t });
    assert.equal(s.type, t);
    assert.ok(s.transform);
    assert.ok(s.style);
  }
  assert.throws(() => newShape({ type: 'unknown' }));
});

test('layers have coherent kinds', () => {
  assert.equal(newVectorLayer().kind, 'vector');
  assert.equal(newRasterLayer().kind, 'raster');
});

test('newKeyframe validates easing', () => {
  for (const e of EASINGS) assert.doesNotThrow(() => newKeyframe({ time_ms: 0, value: 1, easing: e }));
  assert.throws(() => newKeyframe({ time_ms: 0, value: 1, easing: 'bogus' }));
});
