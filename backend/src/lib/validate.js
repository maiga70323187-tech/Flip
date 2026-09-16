const TYPES = new Set(['character','object','background','text','effect']);

export function assertProjectInput(input = {}) {
  if (input.name != null && (typeof input.name !== 'string' || !input.name.trim())) throw new Error('name must be a non-empty string');
  if (input.fps != null && (!Number.isFinite(Number(input.fps)) || Number(input.fps) <= 0)) throw new Error('fps must be > 0');
  return true;
}

export function assertElementInput(input = {}) {
  if (input.type != null && !TYPES.has(input.type)) throw new Error(`unsupported element type: ${input.type}`);
  for (const key of ['x','y','rotation','scale','layer_order']) {
    if (input[key] != null && !Number.isFinite(Number(input[key]))) throw new Error(`${key} must be numeric`);
  }
  if (input.scale != null && Number(input.scale) <= 0) throw new Error('scale must be > 0');
  return true;
}

export function assertReorder(frameIds, frames) {
  if (!Array.isArray(frameIds)) throw new Error('frame_ids must be an array');
  const current = new Set(frames.map(f => f.id));
  if (frameIds.length !== current.size || frameIds.some(id => !current.has(id)) || new Set(frameIds).size !== frameIds.length) {
    throw new Error('frame_ids must contain each current frame exactly once');
  }
  return true;
}
