import crypto from 'node:crypto';

const uid = () => crypto.randomUUID();

export const SHAPE_TYPES = ['path', 'rect', 'ellipse', 'polygon', 'line', 'text', 'group', 'image'];
export const LAYER_KINDS = ['vector', 'raster'];
export const ANIMATABLE = ['x', 'y', 'rotation', 'scale_x', 'scale_y', 'opacity', 'fill', 'stroke', 'stroke_width', 'd'];
export const EASINGS = ['linear', 'ease-in', 'ease-out', 'ease-in-out', 'step', 'bezier'];

export function newProject({ name = 'Nouveau projet', width = 1920, height = 1080, fps = 24, duration_ms = 5000 } = {}) {
  return {
    id: uid(),
    name,
    width,
    height,
    fps,
    duration_ms,
    background: '#ffffff',
    assets: [],
    symbols: [],
    layers: [],
    defs: [],
    characters: [],
    audio_tracks: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// --- Character (voir docs/knowledge/01_CHARACTER_MODEL.md + docs/schemas/character.schema.json)
export const CHARACTER_KINDS = ['human', 'quadruped', 'creature', 'objectCharacter'];
export const RIG_PROFILES = ['humanoid', 'quadruped', 'custom', 'none'];

export function newCharacter(input = {}) {
  const id = input.id ?? `char_${uid().slice(0, 8)}`;
  return {
    schemaVersion: '1.0',
    id,
    name: input.name ?? 'Personnage',
    kind: input.kind ?? 'human',
    rigProfile: input.rigProfile ?? 'humanoid',
    defaultView: input.defaultView ?? 'front',
    styleProfile: input.styleProfile ?? {},
    views: input.views ?? { front: { available: true } },
    parts: input.parts ?? [],
    slots: input.slots ?? [],
    bones: input.bones ?? [],
    ikChains: input.ikChains ?? [],
    expressions: input.expressions ?? { neutral: {} },
    poses: input.poses ?? {},
    clips: input.clips ?? {},
    capabilities: input.capabilities ?? {},
    // Extensions Flip (non normatives) : placement du personnage dans la scène + vue/expression courantes.
    transform: input.transform ?? { x: 400, y: 400, rotation: 0, scale: 1 },
    currentView: input.currentView ?? input.defaultView ?? 'front',
    currentExpression: input.currentExpression ?? 'neutral',
    visible: input.visible !== false,
    zIndex: input.zIndex ?? 100,
    tracks: input.tracks ?? {},
    assetRoots: input.assetRoots ?? {}, // { "front/head.svg": "http://..." | "data:..." }
  };
}

// Erreurs structurées attendues par le contrat agent IA
// (voir docs/knowledge/12_AI_AGENT_CONTRACT.md).
export const FLIP_ERROR_CODES = {
  UNKNOWN_CHARACTER: 'UNKNOWN_CHARACTER',
  UNKNOWN_ACTION: 'UNKNOWN_ACTION',
  MISSING_VIEW: 'MISSING_VIEW',
  MISSING_ASSET: 'MISSING_ASSET',
  INVALID_TARGET: 'INVALID_TARGET',
  UNREACHABLE_TARGET: 'UNREACHABLE_TARGET',
  MISSING_SLOT: 'MISSING_SLOT',
  UNSUPPORTED_EXPRESSION: 'UNSUPPORTED_EXPRESSION',
  INVALID_CHARACTER_SCHEMA: 'INVALID_CHARACTER_SCHEMA',
};

export class FlipError extends Error {
  constructor(code, message, details = {}) {
    super(message ?? code);
    this.code = code;
    this.details = details;
    this.status = code === 'UNKNOWN_CHARACTER' || code === 'MISSING_VIEW' || code === 'MISSING_ASSET' ? 404 : 400;
  }
}

export function newVectorLayer({ name = 'Calque vectoriel' } = {}) {
  return { id: uid(), kind: 'vector', name, visible: true, opacity: 1, locked: false, shapes: [], bones: [] };
}

export function newRasterLayer({ name = 'Calque frame-by-frame', fps = 12 } = {}) {
  return { id: uid(), kind: 'raster', name, visible: true, opacity: 1, locked: false, fps, frames: [] };
}

export function newShape({ type = 'rect', props = {}, transform = {}, style = {} } = {}) {
  if (!SHAPE_TYPES.includes(type)) throw new Error(`unknown shape type: ${type}`);
  return {
    id: uid(),
    type,
    props: { ...defaultShapeProps(type), ...props },
    transform: { x: 0, y: 0, rotation: 0, scale_x: 1, scale_y: 1, anchor_x: 0.5, anchor_y: 0.5, ...transform },
    style: { fill: '#222222', stroke: 'none', stroke_width: 0, opacity: 1, ...style },
    tracks: {},
    parent_bone: null,
  };
}

function defaultShapeProps(type) {
  switch (type) {
    case 'rect':     return { width: 100, height: 100, rx: 0, ry: 0 };
    case 'ellipse':  return { rx: 50, ry: 50 };
    case 'path':     return { d: 'M 0 0 L 100 0 L 100 100 Z' };
    case 'polygon':  return { points: '0,0 100,0 100,100 0,100' };
    case 'line':     return { x1: 0, y1: 0, x2: 100, y2: 0 };
    case 'text':     return { text: 'Texte', font_family: 'sans-serif', font_size: 32, font_weight: 400 };
    case 'group':    return { children: [] };
    case 'image':    return { asset_id: null, width: 100, height: 100 };
    default:         return {};
  }
}

export function newBone({ name = 'os', parent_id = null, length = 60, rotation = 0, x = 0, y = 0, limit_min = null, limit_max = null } = {}) {
  return { id: uid(), name, parent_id, length, rotation, x, y, limit_min, limit_max, tracks: {} };
}

export function newKeyframe({ time_ms, value, easing = 'linear', bezier = null } = {}) {
  if (typeof time_ms !== 'number') throw new Error('time_ms is required');
  if (!EASINGS.includes(easing)) throw new Error(`unknown easing: ${easing}`);
  return { id: uid(), time_ms, value, easing, bezier };
}

export function newRasterFrame({ duration_ms = 83, image = null, strokes = [] } = {}) {
  return { id: uid(), duration_ms, image, strokes };
}

export function newLinearGradient({ name, x1 = 0, y1 = 0, x2 = 0, y2 = 1, stops = [{ offset: 0, color: '#fff' }, { offset: 1, color: '#000' }] } = {}) {
  return { id: `grad-${uid().slice(0, 8)}`, kind: 'linearGradient', name: name ?? 'Dégradé', x1, y1, x2, y2, stops };
}

export function newRadialGradient({ name, cx = 0.5, cy = 0.5, r = 0.5, stops = [{ offset: 0, color: '#fff' }, { offset: 1, color: '#000' }] } = {}) {
  return { id: `grad-${uid().slice(0, 8)}`, kind: 'radialGradient', name: name ?? 'Dégradé radial', cx, cy, r, stops };
}
