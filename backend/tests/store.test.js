import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { JsonStore } from '../src/lib/store.js';

test('JsonStore round-trips a project with layers, shapes and keyframes', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'flip-'));
  const store = new JsonStore(dir);
  await store.init();
  const p = await store.createProject({ name: 'demo', width: 320, height: 200 });
  assert.equal(p.name, 'demo');
  assert.equal(p.layers.length, 2);
  const layer = p.layers[0];
  const shape = await store.addShape(p.id, layer.id, { type: 'rect', props: { width: 50, height: 50 } });
  assert.ok(shape.id);
  const kf = await store.addKeyframe(p.id, layer.id, shape.id, 'x', { property: 'x', time_ms: 0, value: 0 });
  assert.ok(kf.id);
  const kf2 = await store.addKeyframe(p.id, layer.id, shape.id, 'x', { property: 'x', time_ms: 500, value: 100 });
  assert.ok(kf2.id);
  const reloaded = await store.getProject(p.id);
  assert.equal(reloaded.layers[0].shapes[0].tracks.x.length, 2);

  // patch d'une keyframe : change time et valeur, l'ordre est maintenu
  const patched = await store.patchKeyframe(p.id, layer.id, shape.id, 'x', kf.id, { time_ms: 800, value: 42, easing: 'bezier', bezier: [0.1, 0.9, 0.9, 0.1] });
  assert.equal(patched.time_ms, 800);
  assert.equal(patched.value, 42);
  assert.deepEqual(patched.bezier, [0.1, 0.9, 0.9, 0.1]);
  const reload2 = await store.getProject(p.id);
  const track = reload2.layers[0].shapes[0].tracks.x;
  // triée par time_ms croissant
  assert.ok(track[0].time_ms <= track[1].time_ms);
});
