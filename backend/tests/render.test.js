import test from 'node:test';
import assert from 'node:assert/strict';
import { newProject, newVectorLayer, newShape, newKeyframe } from '../src/lib/model.js';
import { sampleTrack, resolveShape, renderFrameSvg } from '../src/services/render.js';

test('sampleTrack interpolates linearly', () => {
  const track = [ newKeyframe({ time_ms: 0, value: 0 }), newKeyframe({ time_ms: 1000, value: 100 }) ];
  assert.equal(sampleTrack(track, 0), 0);
  assert.equal(sampleTrack(track, 1000), 100);
  assert.equal(Math.round(sampleTrack(track, 500)), 50);
});

test('sampleTrack respects easing', () => {
  const track = [ newKeyframe({ time_ms: 0, value: 0, easing: 'ease-in' }), newKeyframe({ time_ms: 1000, value: 100 }) ];
  const v = sampleTrack(track, 500);
  assert.ok(v < 50, `ease-in at 50% should be < 50 (was ${v})`);
});

test('resolveShape applies animated transform', () => {
  const s = newShape({ type: 'rect', transform: { x: 0 } });
  s.tracks.x = [ newKeyframe({ time_ms: 0, value: 0 }), newKeyframe({ time_ms: 1000, value: 200 }) ];
  const { transform } = resolveShape(s, 500);
  assert.equal(Math.round(transform.x), 100);
});

test('renderFrameSvg produces valid SVG', () => {
  const p = newProject({ width: 640, height: 360 });
  const l = newVectorLayer(); p.layers.push(l);
  l.shapes.push(newShape({ type: 'rect', props: { width: 100, height: 50 } }));
  const svg = renderFrameSvg(p, 0);
  assert.match(svg, /^<svg /);
  assert.match(svg, /viewBox="0 0 640 360"/);
  assert.match(svg, /<rect/);
});
