import { SHAPE_TYPES, LAYER_KINDS, ANIMATABLE, EASINGS, CHARACTER_KINDS, RIG_PROFILES, FlipError } from './model.js';

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isStr = (v) => typeof v === 'string' && v.length > 0;
const isBool = (v) => typeof v === 'boolean';

function fail(msg) { const e = new Error(msg); e.status = 400; throw e; }

export function assertProjectInput(body = {}) {
  if (body.name !== undefined && !isStr(body.name)) fail('name must be a non-empty string');
  for (const k of ['width', 'height', 'fps', 'duration_ms']) {
    if (body[k] !== undefined && (!isNum(body[k]) || body[k] <= 0)) fail(`${k} must be a positive number`);
  }
  if (body.background !== undefined && !isStr(body.background)) fail('background must be a color string');
}

export function assertLayerInput(body = {}) {
  if (!LAYER_KINDS.includes(body.kind)) fail(`kind must be one of ${LAYER_KINDS.join(', ')}`);
  if (body.name !== undefined && !isStr(body.name)) fail('name must be a string');
  if (body.visible !== undefined && !isBool(body.visible)) fail('visible must be boolean');
  if (body.opacity !== undefined && (!isNum(body.opacity) || body.opacity < 0 || body.opacity > 1)) fail('opacity must be in [0,1]');
}

export function assertShapeInput(body = {}) {
  if (!SHAPE_TYPES.includes(body.type)) fail(`shape type must be one of ${SHAPE_TYPES.join(', ')}`);
  if (body.transform) {
    for (const k of ['x', 'y', 'rotation', 'scale_x', 'scale_y', 'anchor_x', 'anchor_y']) {
      if (body.transform[k] !== undefined && !isNum(body.transform[k])) fail(`transform.${k} must be a number`);
    }
  }
  if (body.style) {
    if (body.style.opacity !== undefined && (!isNum(body.style.opacity) || body.style.opacity < 0 || body.style.opacity > 1)) fail('style.opacity must be in [0,1]');
    if (body.style.stroke_width !== undefined && (!isNum(body.style.stroke_width) || body.style.stroke_width < 0)) fail('style.stroke_width must be >= 0');
  }
}

export function assertKeyframeInput(body = {}) {
  if (!isStr(body.property) || !ANIMATABLE.includes(body.property)) fail(`property must be one of ${ANIMATABLE.join(', ')}`);
  if (!isNum(body.time_ms) || body.time_ms < 0) fail('time_ms must be a non-negative number');
  if (body.value === undefined || body.value === null) fail('value is required');
  if (body.easing !== undefined && !EASINGS.includes(body.easing)) fail(`easing must be one of ${EASINGS.join(', ')}`);
  if (body.easing === 'bezier') {
    if (!Array.isArray(body.bezier) || body.bezier.length !== 4 || body.bezier.some(v => !isNum(v))) fail('bezier must be [x1,y1,x2,y2] with 4 numbers');
  }
}

export function assertRasterFrameInput(body = {}) {
  if (!isNum(body.duration_ms) || body.duration_ms <= 0) fail('duration_ms must be > 0');
  if (body.image !== undefined && body.image !== null && !isStr(body.image)) fail('image must be a string (data URL or asset id)');
  if (body.strokes !== undefined && !Array.isArray(body.strokes)) fail('strokes must be an array');
}

export function assertReorder(ids, targets) {
  if (!Array.isArray(ids)) fail('ids must be an array');
  const src = new Set(targets.map(t => t.id));
  if (ids.length !== src.size) fail('ids length mismatch');
  for (const id of ids) if (!src.has(id)) fail(`unknown id ${id}`);
}

// Character — validation légère alignée sur docs/schemas/character.schema.json.
// (Validateur minimal, pas d'ajv, pour rester sans dépendance.)
export function assertCharacterInput(body = {}) {
  const errs = [];
  const req = (k) => body[k] === undefined && errs.push(`missing: ${k}`);
  req('schemaVersion'); req('id'); req('kind'); req('rigProfile');
  req('parts'); req('bones'); req('capabilities');
  if (body.schemaVersion && body.schemaVersion !== '1.0') errs.push('schemaVersion must be "1.0"');
  if (body.id && !/^[A-Za-z][A-Za-z0-9_-]*$/.test(body.id)) errs.push('id must match [A-Za-z][A-Za-z0-9_-]*');
  if (body.kind && !CHARACTER_KINDS.includes(body.kind)) errs.push(`kind must be one of ${CHARACTER_KINDS.join(', ')}`);
  if (body.rigProfile && !RIG_PROFILES.includes(body.rigProfile)) errs.push(`rigProfile must be one of ${RIG_PROFILES.join(', ')}`);
  if (body.parts && !Array.isArray(body.parts)) errs.push('parts must be an array');
  if (body.bones && !Array.isArray(body.bones)) errs.push('bones must be an array');
  if (body.capabilities && typeof body.capabilities !== 'object') errs.push('capabilities must be an object');
  // parts[]
  for (const [i, p] of Object.entries(body.parts ?? [])) {
    if (!p.id) errs.push(`parts[${i}].id required`);
    if (!p.source) errs.push(`parts[${i}].source required`);
    if (p.pivot && (typeof p.pivot.x !== 'number' || typeof p.pivot.y !== 'number')) errs.push(`parts[${i}].pivot invalid`);
  }
  // bones[]
  for (const [i, b] of Object.entries(body.bones ?? [])) {
    if (!b.id) errs.push(`bones[${i}].id required`);
    if (b.length !== undefined && typeof b.length !== 'number') errs.push(`bones[${i}].length must be number`);
  }
  if (errs.length) throw new FlipError('INVALID_CHARACTER_SCHEMA', errs.join('; '), { errors: errs });
}
