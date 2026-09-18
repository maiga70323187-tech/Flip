// Loader de packs d'assets vectoriels pour personnages.
//
// Un pack est un dossier sous docs/asset-packs/ contenant :
//   manifest.json          — métadonnées (nom, licence, variantes)
//   <variant>/<part>.svg   — un SVG par slot (ex: default/head.svg,
//                            default/torso.svg, default/hand_R_open.svg…)
//
// L'utilisateur peut brancher n'importe quel pack CC0/MIT (Open Peeps,
// Humaaans, unDraw…) en le déposant dans le dossier avec le bon
// nommage. Voir docs/asset-packs/README.md.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlipError } from '../lib/model.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const PACKS_ROOT = process.env.FLIP_PACKS_DIR ?? path.resolve(here, '../../../docs/asset-packs');

async function safeReaddir(dir) {
  try { return await fs.readdir(dir, { withFileTypes: true }); }
  catch { return []; }
}

export async function listPacks() {
  const entries = await safeReaddir(PACKS_ROOT);
  const out = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const manifestPath = path.join(PACKS_ROOT, e.name, 'manifest.json');
    try {
      const raw = await fs.readFile(manifestPath, 'utf8');
      const manifest = JSON.parse(raw);
      out.push({ id: e.name, name: manifest.name ?? e.name, license: manifest.license, variants: Object.keys(manifest.variants ?? { default: {} }) });
    } catch { /* pack invalide, on ignore */ }
  }
  return out;
}

export async function loadPack(packName, variant = 'default') {
  const packDir = path.join(PACKS_ROOT, packName);
  const manifestPath = path.join(packDir, 'manifest.json');
  let manifest;
  try { manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8')); }
  catch { throw new FlipError('MISSING_ASSET', `pack ${packName} not found`, { root: PACKS_ROOT }); }
  const variants = manifest.variants ?? { default: {} };
  if (!variants[variant]) throw new FlipError('MISSING_ASSET', `variant ${variant} not in pack ${packName}`, { available: Object.keys(variants) });
  const variantDir = path.join(packDir, variant);
  const files = await safeReaddir(variantDir);
  const assets = {};
  for (const f of files) {
    if (!f.isFile() || !f.name.endsWith('.svg')) continue;
    const partId = f.name.replace(/\.svg$/, '');
    const svg = await fs.readFile(path.join(variantDir, f.name), 'utf8');
    assets[partId] = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }
  return { manifest, assets, packName, variant };
}

// Applique le pack aux parts d'un personnage. Pour chaque part du
// personnage dont l'id correspond à une clé du pack, on renseigne
// l'assetRoots. Renvoie la liste des parts attachées et manquantes,
// pour que l'agent sache quoi compléter manuellement.
export async function applyPackToCharacter(store, projectId, characterId, packName, variant = 'default') {
  const character = await store.getCharacter(projectId, characterId);
  if (!character) throw new FlipError('UNKNOWN_CHARACTER', characterId);
  const { manifest, assets } = await loadPack(packName, variant);

  const attached = [];
  const missing = [];
  const patch = { ...(character.assetRoots ?? {}) };
  for (const part of character.parts ?? []) {
    if (assets[part.id]) {
      patch[part.source] = assets[part.id];
      attached.push(part.id);
    } else {
      missing.push(part.id);
    }
  }
  await store.patchCharacter(projectId, characterId, { assetRoots: patch });
  return {
    pack: manifest.id ?? packName,
    pack_name: manifest.name ?? packName,
    license: manifest.license,
    variant,
    attached,
    missing,
  };
}
