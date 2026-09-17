// Miroir léger de backend/src/services/character-render.js pour la preview.
import { computeBoneTransforms } from './rigging.js';

export function normalizeCharacterBones(bones = []) {
  return bones.map(b => ({
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

export function resolvePartSource(character, part) {
  const url = character.assetRoots?.[part.source];
  if (url) return { kind: 'image', url };
  if (part.source?.startsWith?.('data:')) return { kind: 'image', url: part.source };
  if (/^https?:\/\//.test(part.source ?? '')) return { kind: 'image', url: part.source };
  if (part.source?.startsWith?.('shape:')) return { kind: 'shape_ref', shape_id: part.source.slice(6) };
  return { kind: 'missing' };
}

export function visibleParts(character) {
  const view = character.currentView ?? character.defaultView ?? 'front';
  return (character.parts ?? [])
    .filter(p => !p.view || p.view === view)
    .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
}
