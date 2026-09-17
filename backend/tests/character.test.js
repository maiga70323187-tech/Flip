import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { JsonStore } from '../src/lib/store.js';
import { newCharacter, FlipError } from '../src/lib/model.js';
import { assertCharacterInput } from '../src/lib/validate.js';
import { characterToSvg, computeCharacterBoneTransforms } from '../src/services/character-render.js';

test('newCharacter produit un Character conforme minimal (Phase 1)', () => {
  const c = newCharacter({ id: 'test_char' });
  assert.equal(c.schemaVersion, '1.0');
  assert.equal(c.id, 'test_char');
  assert.equal(c.kind, 'human');
  assert.equal(c.rigProfile, 'humanoid');
  assert.ok(c.transform);
  assert.ok(c.expressions.neutral !== undefined);
});

test('assertCharacterInput rejette les Characters invalides (règle 12 CLAUDE.md)', () => {
  assert.throws(() => assertCharacterInput({}), FlipError);
  assert.throws(() => assertCharacterInput({ schemaVersion: '2.0', id: 'x', kind: 'human', rigProfile: 'humanoid', parts: [], bones: [], capabilities: {} }), /schemaVersion/);
  assert.throws(() => assertCharacterInput({ schemaVersion: '1.0', id: '9bad', kind: 'human', rigProfile: 'humanoid', parts: [], bones: [], capabilities: {} }), /pattern|match/);
  assert.throws(() => assertCharacterInput({ schemaVersion: '1.0', id: 'ok', kind: 'alien', rigProfile: 'humanoid', parts: [], bones: [], capabilities: {} }), /kind/);
  // valide
  assert.doesNotThrow(() => assertCharacterInput({ schemaVersion: '1.0', id: 'ok', kind: 'human', rigProfile: 'humanoid', parts: [], bones: [], capabilities: {} }));
});

test('assertCharacterInput accepte l\'exemple humanoïde de la KB', async () => {
  const raw = await fs.readFile(new URL('../../docs/examples/characters/humanoid.example.json', import.meta.url), 'utf8');
  assert.doesNotThrow(() => assertCharacterInput(JSON.parse(raw)));
});

test('store.addCharacter / getCharacter / patchCharacter round-trip', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'flip-char-'));
  const store = new JsonStore(dir);
  await store.init();
  const p = await store.createProject({ name: 'x' });
  const raw = await fs.readFile(new URL('../../docs/examples/characters/humanoid.example.json', import.meta.url), 'utf8');
  const c = await store.addCharacter(p.id, JSON.parse(raw));
  assert.ok(c.id);
  const got = await store.getCharacter(p.id, c.id);
  assert.equal(got.id, c.id);
  const patched = await store.patchCharacter(p.id, c.id, { currentView: 'sideLeft' });
  assert.equal(patched.currentView, 'sideLeft');
});

test('addCharacter refuse un id en double', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'flip-char2-'));
  const store = new JsonStore(dir);
  await store.init();
  const p = await store.createProject({ name: 'x' });
  await store.addCharacter(p.id, newCharacter({ id: 'dup' }));
  await assert.rejects(() => store.addCharacter(p.id, newCharacter({ id: 'dup' })), /already exists/);
});

test('computeCharacterBoneTransforms normalise parent/limits et calcule la FK', () => {
  const c = newCharacter({
    bones: [
      { id: 'r', parent: null, x: 0, y: 0, length: 100, rotation: 0 },
      { id: 'c', parent: 'r', length: 50, rotation: 90 },
    ],
  });
  const bt = computeCharacterBoneTransforms(c);
  assert.equal(Math.round(bt.r.tipX), 100);
  assert.equal(Math.round(bt.c.tipX), 100);
  assert.equal(Math.round(bt.c.tipY), 50);
});

test('characterToSvg renvoie du SVG et signale les assets manquants', () => {
  const c = newCharacter({
    parts: [{ id: 'head', source: 'front/head.svg', bone: 'head', pivot: { x: 0.5, y: 0.9 } }],
    bones: [{ id: 'head', parent: null, x: 100, y: 100, length: 60, rotation: -90 }],
  });
  const svg = characterToSvg(c);
  assert.match(svg, /^<g id="char-/);
  // Sans assetRoots, la part est signalée comme "missing" (règle #10 CLAUDE.md).
  assert.match(svg, /rgba\(255,0,80/);

  // Avec un assetRoot, on obtient une image.
  const c2 = { ...c, assetRoots: { 'front/head.svg': 'data:image/svg+xml,<svg/>' } };
  const svg2 = characterToSvg(c2);
  assert.match(svg2, /<image/);
});
