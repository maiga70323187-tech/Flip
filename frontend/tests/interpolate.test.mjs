import test from 'node:test';
import assert from 'node:assert/strict';
import { sample, resolveShape } from '../src/lib/interpolate.js';

test('sample interpolates linearly', () => {
  const track = [{ time_ms: 0, value: 0, easing: 'linear' }, { time_ms: 1000, value: 100, easing: 'linear' }];
  assert.equal(sample(track, 0), 0);
  assert.equal(Math.round(sample(track, 500)), 50);
  assert.equal(sample(track, 1000), 100);
});

test('resolveShape merges tracks into transform/style/props', () => {
  const shape = {
    type: 'rect',
    transform: { x: 0, y: 0, rotation: 0, scale_x: 1, scale_y: 1, anchor_x: 0.5, anchor_y: 0.5 },
    style: { fill: '#000', stroke: 'none', stroke_width: 0, opacity: 1 },
    props: { width: 10, height: 10 },
    tracks: { rotation: [{ time_ms: 0, value: 0, easing: 'linear' }, { time_ms: 1000, value: 90, easing: 'linear' }] },
  };
  const r = resolveShape(shape, 500);
  assert.equal(Math.round(r.transform.rotation), 45);
});
