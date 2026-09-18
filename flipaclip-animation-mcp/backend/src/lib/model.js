import { randomUUID } from 'node:crypto';

export function newElement(input = {}) {
  return {
    id: input.id ?? randomUUID(),
    type: input.type ?? 'object',
    image_ref: input.image_ref ?? '',
    x: Number(input.x ?? 0),
    y: Number(input.y ?? 0),
    rotation: Number(input.rotation ?? 0),
    scale: Number(input.scale ?? 1),
    layer_order: Number(input.layer_order ?? 0),
    visible: input.visible ?? true,
    meta: input.meta ?? {}
  };
}

export function newFrame(input = {}) {
  return {
    id: input.id ?? randomUUID(),
    duration_ms: Number(input.duration_ms ?? 1000),
    elements: (input.elements ?? []).map(newElement),
    transitions: input.transitions ?? [],
    effects: input.effects ?? [],
    meta: input.meta ?? {}
  };
}

export function newProject(input = {}) {
  const now = new Date().toISOString();
  return {
    id: input.id ?? randomUUID(),
    name: input.name ?? 'Nouveau projet',
    width: Number(input.width ?? 1080),
    height: Number(input.height ?? 1920),
    fps: Number(input.fps ?? 12),
    created_at: input.created_at ?? now,
    updated_at: now,
    frames: (input.frames ?? []).map(newFrame),
    audio_tracks: input.audio_tracks ?? [],
    meta: input.meta ?? {}
  };
}
