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
});
