// Rendu SVG d'un Character conforme à docs/knowledge/01_CHARACTER_MODEL.md
// et docs/schemas/character.schema.json.
//
// Une Part positionne un asset (image ou data URL) selon :
//   1. la transform monde de son bone (calculée par computeBoneTransforms)
//   2. le pivot { x, y } normalisé (0..1) qui indique où DANS l'image se
//      trouve le point d'attache au bone
//   3. le zIndex de la part
//
// Chaque Character porte sa propre hiérarchie d'os (bone.parent en string
// pointant vers un autre bone id). On la normalise vers le format attendu
// par services/rigging.js (parent_id, limits -> limit_min/limit_max).

import { computeBoneTransforms } from './rigging.js';

function normalizeBones(characterBones = []) {
  return characterBones.map(b => ({
    id: b.id,
    parent_id: b.parent ?? null,
    x: b.x ?? 0,
    y: b.y ?? 0,
    length: b.length ?? 0,
    rotation: b.rotation ?? 0,
    limit_min: b.limits?.min ?? null,
    limit_max: b.limits?.max ?? null,
    tracks: b.tracks ?? {},
  }));
}

export function computeCharacterBoneTransforms(character, t_ms = 0) {
  return computeBoneTransforms(normalizeBones(character.bones ?? []), t_ms);
}

function resolvePartSource(character, part) {
  // 1. Redirection explicite via assetRoots (URL absolue, data URL, ou route interne).
  const url = character.assetRoots?.[part.source];
  if (url) return { kind: 'image', url };
  // 2. Source data URL directe.
  if (part.source?.startsWith?.('data:')) return { kind: 'image', url: part.source };
  // 3. Source http(s).
  if (/^https?:\/\//.test(part.source ?? '')) return { kind: 'image', url: part.source };
  // 4. Référence à une shape existante — géré en Phase 2.
  if (part.source?.startsWith?.('shape:')) return { kind: 'shape_ref', shape_id: part.source.slice(6) };
  // 5. Placeholder debug (SANS prétendre être final — cf. règle #10 de CLAUDE.md).
  return { kind: 'missing' };
}

function escXml(s) { return String(s).replace(/[<>&"']/g, c => ({ '<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;' }[c])); }

// options: { placeholders: true } -> dessine un carré rouge pour les parts sans asset
export function characterToSvg(character, options = {}) {
  const t_ms = options.t_ms ?? 0;
  const showPlaceholders = options.placeholders !== false; // par défaut on montre le debug
  const view = character.currentView ?? character.defaultView ?? 'front';
  const bt = computeCharacterBoneTransforms(character, t_ms);
  const tr = character.transform ?? { x: 0, y: 0, rotation: 0, scale: 1 };

  // Parts visibles pour la vue courante, triées par zIndex.
  const parts = (character.parts ?? [])
    .filter(p => !p.view || p.view === view)
    .filter(p => !p.variantGroup || matchesVariant(character, p))
    .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

  const inner = [];
  for (const p of parts) {
    const bone = p.bone ? bt[p.bone] : null;
    const boneTf = bone ? `translate(${bone.x} ${bone.y}) rotate(${bone.rotation}) ` : '';
    const src = resolvePartSource(character, p);
    const w = p.width ?? 100;
    const h = p.height ?? 100;
    const px = (p.pivot?.x ?? 0.5) * w;
    const py = (p.pivot?.y ?? 0.5) * h;
    const inner_tf = `translate(${-px} ${-py})`;
    if (src.kind === 'image') {
      inner.push(`<image href="${escXml(src.url)}" x="0" y="0" width="${w}" height="${h}" transform="${boneTf}${inner_tf}"/>`);
    } else if (src.kind === 'shape_ref') {
      // Phase 2 — pour l'instant on trace un rectangle discret pour signaler.
      if (showPlaceholders) inner.push(`<rect x="0" y="0" width="${w}" height="${h}" fill="none" stroke="#0af" stroke-dasharray="4 3" transform="${boneTf}${inner_tf}"><title>shape_ref ${escXml(src.shape_id)}</title></rect>`);
    } else if (src.kind === 'missing' && showPlaceholders) {
      inner.push(`<g transform="${boneTf}${inner_tf}"><rect x="0" y="0" width="${w}" height="${h}" fill="rgba(255,0,80,0.15)" stroke="#c00" stroke-dasharray="6 4"/><text x="4" y="14" font-size="10" fill="#c00">${escXml(p.id)}</text></g>`);
    }
  }

  return `<g id="char-${escXml(character.id)}" transform="translate(${tr.x} ${tr.y}) rotate(${tr.rotation ?? 0}) scale(${tr.scale ?? 1})">${inner.join('')}</g>`;
}

function matchesVariant(character, part) {
  // Ex: variantGroup="hand_R", slot hand_R.part = "hand_R_open" => on ne garde
  // que hand_R_open. Si le slot ne sélectionne pas cette variantGroup, on
  // garde la part (comportement "toutes visibles" par défaut, sûr).
  const slot = (character.slots ?? []).find(s => s.id === part.variantGroup || s.bone === part.bone);
  if (!slot?.part) return true;
  return slot.part === part.id;
}
