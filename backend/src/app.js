import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { JsonStore } from './lib/store.js';
import {
  assertProjectInput, assertLayerInput, assertShapeInput,
  assertKeyframeInput, assertRasterFrameInput, assertReorder,
} from './lib/validate.js';
import { renderFrameSvg, renderManifest } from './services/render.js';
import { generateDecor, DECOR_PRESETS } from './services/decor.js';
import { svgToPng, svgsToMp4 } from './services/rasterize.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const dataRoot = process.env.FLIP_DATA_DIR ?? path.resolve(here, '../data/projects');
const assetRoot = process.env.FLIP_ASSET_DIR ?? path.resolve(here, '../data/assets');

export const store = new JsonStore(dataRoot);
await store.init();
await fs.mkdir(assetRoot, { recursive: true });

const notFound = (res) => res.status(404).json({ error: 'not found' });
const ok = (res, v, code = 200) => v == null ? notFound(res) : res.status(code).json(v);
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '25mb' }));
  const upload = multer({ dest: assetRoot });

  // ---------- meta ----------
  app.get('/health', (req, res) => res.json({ ok: true, service: 'flip-animation-backend' }));
  app.get('/api/openapi.json', wrap(async (req, res) => {
    const spec = await fs.readFile(path.resolve(here, '../openapi.json'), 'utf8').catch(() => null);
    if (spec) res.type('application/json').send(spec);
    else res.status(404).json({ error: 'openapi spec missing' });
  }));

  // ---------- projects ----------
  app.get('/api/projects', wrap(async (req, res) => res.json(await store.listProjects())));
  app.post('/api/projects', wrap(async (req, res) => {
    assertProjectInput(req.body);
    ok(res, await store.createProject(req.body), 201);
  }));
  app.get('/api/projects/:id', wrap(async (req, res) => ok(res, await store.getProject(req.params.id))));
  app.patch('/api/projects/:id', wrap(async (req, res) => {
    assertProjectInput(req.body);
    ok(res, await store.mutate(req.params.id, p => Object.assign(p, req.body)));
  }));
  app.delete('/api/projects/:id', wrap(async (req, res) => res.status(await store.deleteProject(req.params.id) ? 204 : 404).end()));

  // ---------- layers ----------
  app.post('/api/projects/:id/layers', wrap(async (req, res) => {
    assertLayerInput(req.body);
    ok(res, await store.addLayer(req.params.id, req.body), 201);
  }));
  app.patch('/api/projects/:id/layers/:layerId', wrap(async (req, res) => {
    ok(res, await store.patchLayer(req.params.id, req.params.layerId, req.body));
  }));
  app.delete('/api/projects/:id/layers/:layerId', wrap(async (req, res) => {
    res.status(await store.deleteLayer(req.params.id, req.params.layerId) ? 204 : 404).end();
  }));
  app.put('/api/projects/:id/layers/reorder', wrap(async (req, res) => {
    const p = await store.getProject(req.params.id);
    if (!p) return notFound(res);
    assertReorder(req.body.layer_ids, p.layers);
    ok(res, await store.reorderLayers(req.params.id, req.body.layer_ids));
  }));

  // ---------- shapes ----------
  app.post('/api/projects/:id/layers/:layerId/shapes', wrap(async (req, res) => {
    assertShapeInput(req.body);
    ok(res, await store.addShape(req.params.id, req.params.layerId, req.body), 201);
  }));
  app.patch('/api/projects/:id/layers/:layerId/shapes/:shapeId', wrap(async (req, res) => {
    ok(res, await store.patchShape(req.params.id, req.params.layerId, req.params.shapeId, req.body));
  }));
  app.delete('/api/projects/:id/layers/:layerId/shapes/:shapeId', wrap(async (req, res) => {
    res.status(await store.deleteShape(req.params.id, req.params.layerId, req.params.shapeId) ? 204 : 404).end();
  }));

  // ---------- keyframes ----------
  app.post('/api/projects/:id/layers/:layerId/shapes/:shapeId/keyframes', wrap(async (req, res) => {
    assertKeyframeInput(req.body);
    ok(res, await store.addKeyframe(req.params.id, req.params.layerId, req.params.shapeId, req.body.property, req.body), 201);
  }));
  app.delete('/api/projects/:id/layers/:layerId/shapes/:shapeId/keyframes/:keyframeId', wrap(async (req, res) => {
    const { property } = req.query;
    if (!property) return res.status(400).json({ error: 'property query param required' });
    res.status(await store.deleteKeyframe(req.params.id, req.params.layerId, req.params.shapeId, property, req.params.keyframeId) ? 204 : 404).end();
  }));
  app.patch('/api/projects/:id/layers/:layerId/shapes/:shapeId/keyframes/:keyframeId', wrap(async (req, res) => {
    const { property } = req.query;
    if (!property) return res.status(400).json({ error: 'property query param required' });
    ok(res, await store.patchKeyframe(req.params.id, req.params.layerId, req.params.shapeId, property, req.params.keyframeId, req.body));
  }));

  app.patch('/api/projects/:id/layers/:layerId/bones/:boneId/keyframes/:keyframeId', wrap(async (req, res) => {
    const { property } = req.query;
    if (!property) return res.status(400).json({ error: 'property query param required' });
    ok(res, await store.patchBoneKeyframe(req.params.id, req.params.layerId, req.params.boneId, property, req.params.keyframeId, req.body));
  }));
  app.delete('/api/projects/:id/layers/:layerId/bones/:boneId/keyframes/:keyframeId', wrap(async (req, res) => {
    const { property } = req.query;
    if (!property) return res.status(400).json({ error: 'property query param required' });
    res.status(await store.deleteBoneKeyframe(req.params.id, req.params.layerId, req.params.boneId, property, req.params.keyframeId) ? 204 : 404).end();
  }));

  // ---------- bones ----------
  app.post('/api/projects/:id/layers/:layerId/bones', wrap(async (req, res) => {
    ok(res, await store.addBone(req.params.id, req.params.layerId, req.body), 201);
  }));
  app.patch('/api/projects/:id/layers/:layerId/bones/:boneId', wrap(async (req, res) => {
    ok(res, await store.patchBone(req.params.id, req.params.layerId, req.params.boneId, req.body));
  }));
  app.delete('/api/projects/:id/layers/:layerId/bones/:boneId', wrap(async (req, res) => {
    res.status(await store.deleteBone(req.params.id, req.params.layerId, req.params.boneId) ? 204 : 404).end();
  }));
  app.post('/api/projects/:id/layers/:layerId/bones/:boneId/keyframes', wrap(async (req, res) => {
    if (!['rotation', 'length', 'x', 'y'].includes(req.body.property)) return res.status(400).json({ error: 'property must be rotation/length/x/y' });
    ok(res, await store.addBoneKeyframe(req.params.id, req.params.layerId, req.params.boneId, req.body.property, req.body), 201);
  }));

  // ---------- IK ----------
  app.post('/api/projects/:id/ik/solve', wrap(async (req, res) => {
    const p = await store.getProject(req.params.id);
    if (!p) return notFound(res);
    const { layer_id, tip_bone_id, target_x, target_y, apply, chain_length } = req.body ?? {};
    const layer = p.layers.find(l => l.id === layer_id);
    if (!layer?.bones?.length) return res.status(400).json({ error: 'layer or bones not found' });
    const { computeBoneTransforms, ancestorChain, solveFABRIK } = await import('./services/rigging.js');
    const chain = ancestorChain(layer.bones, tip_bone_id, chain_length ?? Infinity);
    if (!chain.length) return res.status(400).json({ error: 'tip bone not found' });
    const world = computeBoneTransforms(layer.bones);
    const root = world[chain[0].id];
    const rotations = solveFABRIK(chain, root.x, root.y, target_x, target_y);
    if (apply) {
      await store.mutate(p.id, pr => {
        const l = pr.layers.find(x => x.id === layer_id);
        for (let i = 0; i < chain.length; i++) {
          const b = l.bones.find(x => x.id === chain[i].id);
          if (b) b.rotation = rotations[i];
        }
      });
    }
    res.json({ chain: chain.map(b => b.id), rotations });
  }));

  // ---------- raster frames ----------
  app.post('/api/projects/:id/layers/:layerId/frames', wrap(async (req, res) => {
    assertRasterFrameInput(req.body);
    ok(res, await store.addRasterFrame(req.params.id, req.params.layerId, req.body), 201);
  }));
  app.patch('/api/projects/:id/layers/:layerId/frames/:frameId', wrap(async (req, res) => {
    ok(res, await store.patchRasterFrame(req.params.id, req.params.layerId, req.params.frameId, req.body));
  }));
  app.delete('/api/projects/:id/layers/:layerId/frames/:frameId', wrap(async (req, res) => {
    res.status(await store.deleteRasterFrame(req.params.id, req.params.layerId, req.params.frameId) ? 204 : 404).end();
  }));

  // ---------- assets ----------
  app.post('/api/projects/:id/assets', upload.single('file'), wrap(async (req, res) => {
    const asset = {
      id: crypto.randomUUID(),
      kind: req.body.kind ?? 'bitmap',
      name: req.file?.originalname ?? req.body.name ?? 'asset',
      file: req.file?.path,
      mime: req.file?.mimetype,
    };
    const p = await store.mutate(req.params.id, pr => pr.assets.push(asset));
    ok(res, p && asset, 201);
  }));

  // ---------- symbols ----------
  app.post('/api/projects/:id/symbols', wrap(async (req, res) => {
    ok(res, await store.addSymbol(req.params.id, req.body), 201);
  }));

  // ---------- defs (gradients) ----------
  app.post('/api/projects/:id/defs', wrap(async (req, res) => {
    ok(res, await store.addDef(req.params.id, req.body), 201);
  }));
  app.delete('/api/projects/:id/defs/:defId', wrap(async (req, res) => {
    res.status(await store.deleteDef(req.params.id, req.params.defId) ? 204 : 404).end();
  }));

  // ---------- décor procédural ----------
  app.post('/api/projects/:id/decor', wrap(async (req, res) => {
    const p = await store.getProject(req.params.id);
    if (!p) return notFound(res);
    const preset = req.body.preset;
    if (!DECOR_PRESETS.includes(preset)) return res.status(400).json({ error: `preset must be one of ${DECOR_PRESETS.join(', ')}` });
    const { shapes, defs } = generateDecor({ preset, width: p.width, height: p.height, seed: Number(req.body.seed ?? Date.now() & 0xffff) });
    let layer = null;
    await store.mutate(p.id, pr => {
      if (!pr.defs) pr.defs = [];
      pr.defs.push(...defs);
      layer = { id: crypto.randomUUID(), kind: 'vector', name: `Décor: ${preset}`, visible: true, opacity: 1, locked: false, shapes, bones: [] };
      // décor sous les autres calques
      pr.layers.unshift(layer);
    });
    res.status(201).json({ layer_id: layer.id, defs_added: defs.length, shapes_added: shapes.length });
  }));

  // ---------- audio ----------
  app.post('/api/projects/:id/audio', upload.single('audio'), wrap(async (req, res) => {
    const track = {
      id: crypto.randomUUID(),
      name: req.file?.originalname ?? req.body.name ?? 'audio',
      file: req.file?.path ?? req.body.file,
      start_ms: Number(req.body.start_ms ?? 0),
    };
    const p = await store.mutate(req.params.id, pr => pr.audio_tracks.push(track));
    ok(res, p && track, 201);
  }));

  // ---------- render & export ----------
  app.get('/api/projects/:id/manifest', wrap(async (req, res) => {
    const p = await store.getProject(req.params.id);
    if (!p) return notFound(res);
    res.json(renderManifest(p));
  }));

  app.get('/api/projects/:id/render', wrap(async (req, res) => {
    const p = await store.getProject(req.params.id);
    if (!p) return notFound(res);
    const t = Number(req.query.t_ms ?? 0);
    const svg = renderFrameSvg(p, t);
    res.type('image/svg+xml').send(svg);
  }));

  app.get('/api/projects/:id/render.png', wrap(async (req, res) => {
    const p = await store.getProject(req.params.id);
    if (!p) return notFound(res);
    const t = Number(req.query.t_ms ?? 0);
    const w = req.query.width ? Number(req.query.width) : undefined;
    const svg = renderFrameSvg(p, t);
    const png = svgToPng(svg, { width: w });
    res.type('image/png').send(png);
  }));

  app.post('/api/projects/:id/export', wrap(async (req, res) => {
    const p = await store.getProject(req.params.id);
    if (!p) return notFound(res);
    const format = req.body.format ?? 'json';
    const exportDir = process.env.FLIP_EXPORT_DIR ?? path.resolve(here, '../../output/exports');
    await fs.mkdir(exportDir, { recursive: true });
    const stamp = Date.now();
    const ext = { svg: 'svg', png: 'png', mp4: 'mp4', json: 'json' }[format] ?? 'json';
    const file = path.join(exportDir, `${p.id}-${stamp}.${ext}`);
    if (format === 'svg') {
      await fs.writeFile(file, renderFrameSvg(p, Number(req.body.t_ms ?? 0)));
    } else if (format === 'png') {
      const svg = renderFrameSvg(p, Number(req.body.t_ms ?? 0));
      await fs.writeFile(file, svgToPng(svg, { width: req.body.width }));
    } else if (format === 'mp4') {
      const fps = Number(req.body.fps ?? p.fps ?? 24);
      const period = 1000 / fps;
      const frameCount = Math.max(1, Math.ceil(p.duration_ms / period));
      const svgs = [];
      for (let i = 0; i < frameCount; i++) svgs.push(renderFrameSvg(p, i * period));
      await svgsToMp4({ svgs, fps, width: p.width, height: p.height, outFile: file });
    } else {
      await fs.writeFile(file, JSON.stringify({ project: p, manifest: renderManifest(p) }, null, 2));
    }
    res.status(201).json({ status: 'exported', format, file });
  }));

  // ---------- errors ----------
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status ?? 500).json({ error: err.message });
  });
  return app;
}
