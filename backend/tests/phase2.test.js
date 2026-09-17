import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { JsonStore } from '../src/lib/store.js';
import { buildHumanoidRig } from '../src/services/humanoid-rig.js';
import { characterToSvg } from '../src/services/character-render.js';
import { FlipError } from '../src/lib/model.js';

async function tmpStore() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'flip-p2-'));
  const store = new JsonStore(dir);
  await store.init();
  const p = await store.createProject({ name: 'p2' });
  return { store, projectId: p.id };
}

test('buildHumanoidRig produit un Character conforme, avec bones, slots, parts', () => {
  const c = buildHumanoidRig();
  assert.equal(c.schemaVersion, '1.0');
  assert.equal(c.rigProfile, 'humanoid');
  const boneIds = c.bones.map(b => b.id);
  for (const req of ['root', 'hips', 'spine', 'chest', 'neck', 'head', 'shoulder_L', 'elbow_L', 'wrist_L', 'shoulder_R', 'elbow_R', 'wrist_R', 'hip_L', 'knee_L', 'ankle_L', 'hip_R', 'knee_R', 'ankle_R']) {
    assert.ok(boneIds.includes(req), `bone ${req} manquant`);
  }
  assert.ok(c.slots.length > 0);
  assert.ok(c.parts.length > 0);
  assert.equal(c.capabilities.supportsIKArms, true);
});

test('setCharacterSlot renvoie MISSING_SLOT si l\'id est inconnu', async () => {
  const { store, projectId } = await tmpStore();
  const rig = await store.addCharacter(projectId, buildHumanoidRig());
  await assert.rejects(
    () => store.setCharacterSlot(projectId, rig.id, 'nonexistent', { part: 'foo' }),
    (e) => e instanceof FlipError && e.code === 'MISSING_SLOT'
  );
});

test('setCharacterSlot renvoie MISSING_ASSET si part inconnue', async () => {
  const { store, projectId } = await tmpStore();
  const rig = await store.addCharacter(projectId, buildHumanoidRig());
  await assert.rejects(
    () => store.setCharacterSlot(projectId, rig.id, 'hand_front', { part: 'hand_R_impossible' }),
    (e) => e instanceof FlipError && e.code === 'MISSING_ASSET'
  );
});

test('setCharacterSlot change effectivement la variante visible', async () => {
  const { store, projectId } = await tmpStore();
  const rig = await store.addCharacter(projectId, buildHumanoidRig());
  await store.setCharacterSlot(projectId, rig.id, 'hand_front', { part: 'hand_R_fist' });
  const updated = await store.getCharacter(projectId, rig.id);
  const slot = updated.slots.find(s => s.id === 'hand_front');
  assert.equal(slot.part, 'hand_R_fist');
});

test('characterToSvg filtre les parts non sélectionnées par leur slot', () => {
  const c = buildHumanoidRig();
  // Par défaut, hand_front → hand_R_open ; on doit trouver hand_R_open et pas les autres variantes.
  const svg = characterToSvg(c);
  // Chaque part sans asset produit un placeholder qui contient son id.
  assert.match(svg, />hand_R_open</);
  assert.doesNotMatch(svg, />hand_R_fist</);
  assert.doesNotMatch(svg, />hand_R_point</);
  // On change la sélection
  c.slots.find(s => s.id === 'hand_front').part = 'hand_R_fist';
  const svg2 = characterToSvg(c);
  assert.match(svg2, />hand_R_fist</);
  assert.doesNotMatch(svg2, />hand_R_open</);
});
