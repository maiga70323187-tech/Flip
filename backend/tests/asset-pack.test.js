import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { JsonStore } from '../src/lib/store.js';
import { buildHumanoidRig } from '../src/services/humanoid-rig.js';
import { listPacks, loadPack, applyPackToCharacter } from '../src/services/asset-pack-loader.js';
import { FlipError } from '../src/lib/model.js';

test('listPacks trouve le pack sample-labels', async () => {
  const packs = await listPacks();
  const sample = packs.find(p => p.id === 'sample-labels');
  assert.ok(sample, 'sample-labels manquant');
  assert.equal(sample.license, 'CC0');
  assert.ok(sample.variants.includes('default'));
});

test('loadPack renvoie le manifest et un dictionnaire d\'assets', async () => {
  const { manifest, assets } = await loadPack('sample-labels', 'default');
  assert.equal(manifest.id, 'sample-labels');
  assert.ok(assets.head);
  assert.ok(assets.torso);
  // data URL SVG
  assert.match(assets.head, /^data:image\/svg\+xml/);
});

test('loadPack rejette un pack inconnu avec MISSING_ASSET', async () => {
  await assert.rejects(
    () => loadPack('does-not-exist'),
    (e) => e instanceof FlipError && e.code === 'MISSING_ASSET'
  );
});

test('applyPackToCharacter branche les parts et rapporte les manquantes', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'flip-pack-'));
  const store = new JsonStore(dir);
  await store.init();
  const p = await store.createProject({ name: 'x' });
  const rig = await store.addCharacter(p.id, buildHumanoidRig());

  const result = await applyPackToCharacter(store, p.id, rig.id, 'sample-labels', 'default');
  assert.ok(result.attached.length > 15, `attached devrait être conséquent, got ${result.attached.length}`);
  assert.equal(result.pack, 'sample-labels');

  const updated = await store.getCharacter(p.id, rig.id);
  const headPart = updated.parts.find(x => x.id === 'head');
  assert.match(updated.assetRoots[headPart.source], /^data:image\/svg\+xml/);
});
