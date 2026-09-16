import { SHAPE_TYPES, LAYER_KINDS, ANIMATABLE, EASINGS } from './model.js';

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
