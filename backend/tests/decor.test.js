import test from 'node:test';
import assert from 'node:assert/strict';
import { generateDecor, DECOR_PRESETS } from '../src/services/decor.js';

test('each decor preset produces at least one shape', () => {
  for (const preset of DECOR_PRESETS) {
    const { shapes, defs } = generateDecor({ preset, width: 640, height: 360, seed: 1 });
    assert.ok(shapes.length > 0, `preset ${preset} produced no shape`);
    assert.ok(Array.isArray(defs));
  }
});

test('same seed => same shapes count (deterministic)', () => {
  const a = generateDecor({ preset: 'mountains', width: 800, height: 400, seed: 42 });
  const b = generateDecor({ preset: 'mountains', width: 800, height: 400, seed: 42 });
  assert.equal(a.shapes.length, b.shapes.length);
});
