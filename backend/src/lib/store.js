import fs from 'node:fs/promises';
import path from 'node:path';
import { newProject, newVectorLayer, newRasterLayer, newShape, newKeyframe, newRasterFrame, newBone } from './model.js';

export class JsonStore {
  constructor(root) { this.root = root; }

  async init() { await fs.mkdir(this.root, { recursive: true }); }

  file(id) { return path.join(this.root, `${id}.json`); }

  async listProjects() {
    const entries = await fs.readdir(this.root);
    const out = [];
    for (const f of entries) {
      if (!f.endsWith('.json')) continue;
      try {
        const p = JSON.parse(await fs.readFile(path.join(this.root, f), 'utf8'));
        out.push({ id: p.id, name: p.name, width: p.width, height: p.height, fps: p.fps, duration_ms: p.duration_ms, updated_at: p.updated_at });
      } catch { /* skip */ }
    }
    out.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
    return out;
  }

  async getProject(id) {
    try { return JSON.parse(await fs.readFile(this.file(id), 'utf8')); }
    catch (e) { if (e.code === 'ENOENT') return null; throw e; }
  }

  async writeProject(p) {
    p.updated_at = new Date().toISOString();
    const tmp = this.file(p.id) + '.tmp';
    await fs.writeFile(tmp, JSON.stringify(p, null, 2));
    await fs.rename(tmp, this.file(p.id));
    return p;
  }

  async createProject(input) {
    const p = newProject(input);
    p.layers.push(newVectorLayer({ name: 'Décor' }));
    p.layers.push(newVectorLayer({ name: 'Personnage' }));
    return this.writeProject(p);
  }

  async deleteProject(id) {
    try { await fs.unlink(this.file(id)); return true; }
    catch (e) { if (e.code === 'ENOENT') return false; throw e; }
  }

  async mutate(id, fn) {
    const p = await this.getProject(id);
    if (!p) return null;
    await fn(p);
    return this.writeProject(p);
  }

  // ---------- layers ----------
  async addLayer(projectId, input) {
    let created = null;
    await this.mutate(projectId, p => {
      created = input.kind === 'raster' ? newRasterLayer(input) : newVectorLayer(input);
      p.layers.push(created);
    });
    return created;
  }

  async patchLayer(projectId, layerId, patch) {
    let out = null;
    await this.mutate(projectId, p => {
      const l = p.layers.find(x => x.id === layerId);
      if (!l) return;
      Object.assign(l, patch);
      out = l;
    });
    return out;
  }

  async deleteLayer(projectId, layerId) {
    let ok = false;
    await this.mutate(projectId, p => {
      const i = p.layers.findIndex(x => x.id === layerId);
      if (i >= 0) { p.layers.splice(i, 1); ok = true; }
    });
    return ok;
  }

  async reorderLayers(projectId, ids) {
    return this.mutate(projectId, p => {
      const map = Object.fromEntries(p.layers.map(l => [l.id, l]));
      p.layers = ids.map(id => map[id]);
    });
  }

  // ---------- shapes (vector layers) ----------
  async addShape(projectId, layerId, input) {
    let out = null;
    await this.mutate(projectId, p => {
      const l = p.layers.find(x => x.id === layerId && x.kind === 'vector');
      if (!l) return;
      out = newShape(input);
      l.shapes.push(out);
    });
    return out;
  }

  async patchShape(projectId, layerId, shapeId, patch) {
    let out = null;
    await this.mutate(projectId, p => {
      const l = p.layers.find(x => x.id === layerId);
      if (!l) return;
      const s = l.shapes?.find(x => x.id === shapeId);
      if (!s) return;
      if (patch.transform) s.transform = { ...s.transform, ...patch.transform };
      if (patch.style)     s.style     = { ...s.style, ...patch.style };
      if (patch.props)     s.props     = { ...s.props, ...patch.props };
      if (patch.parent_bone !== undefined) s.parent_bone = patch.parent_bone;
      out = s;
    });
    return out;
  }

  async deleteShape(projectId, layerId, shapeId) {
    let ok = false;
    await this.mutate(projectId, p => {
      const l = p.layers.find(x => x.id === layerId);
      if (!l?.shapes) return;
      const i = l.shapes.findIndex(x => x.id === shapeId);
      if (i >= 0) { l.shapes.splice(i, 1); ok = true; }
    });
    return ok;
  }

  // ---------- keyframes ----------
  async addKeyframe(projectId, layerId, shapeId, property, kf) {
    let out = null;
    await this.mutate(projectId, p => {
      const l = p.layers.find(x => x.id === layerId);
      const s = l?.shapes?.find(x => x.id === shapeId);
      if (!s) return;
      s.tracks[property] = s.tracks[property] || [];
      const existing = s.tracks[property].findIndex(k => k.time_ms === kf.time_ms);
      const nk = newKeyframe(kf);
      if (existing >= 0) s.tracks[property][existing] = nk;
      else s.tracks[property].push(nk);
      s.tracks[property].sort((a, b) => a.time_ms - b.time_ms);
      out = nk;
    });
    return out;
  }

  async deleteKeyframe(projectId, layerId, shapeId, property, keyframeId) {
    let ok = false;
    await this.mutate(projectId, p => {
      const s = p.layers.find(x => x.id === layerId)?.shapes?.find(x => x.id === shapeId);
      if (!s?.tracks?.[property]) return;
      const i = s.tracks[property].findIndex(k => k.id === keyframeId);
      if (i >= 0) { s.tracks[property].splice(i, 1); ok = true; }
    });
    return ok;
  }

  // ---------- bones (rigging) ----------
  async addBone(projectId, layerId, input) {
    let out = null;
    await this.mutate(projectId, p => {
      const l = p.layers.find(x => x.id === layerId && x.kind === 'vector');
      if (!l) return;
      out = newBone(input);
      l.bones.push(out);
    });
    return out;
  }

  async patchBone(projectId, layerId, boneId, patch) {
    let out = null;
    await this.mutate(projectId, p => {
      const b = p.layers.find(x => x.id === layerId)?.bones?.find(x => x.id === boneId);
      if (!b) return;
      Object.assign(b, patch);
      out = b;
    });
    return out;
  }

  // ---------- raster frames ----------
  async addRasterFrame(projectId, layerId, input) {
    let out = null;
    await this.mutate(projectId, p => {
      const l = p.layers.find(x => x.id === layerId && x.kind === 'raster');
      if (!l) return;
      out = newRasterFrame(input);
      l.frames.push(out);
    });
    return out;
  }

  async patchRasterFrame(projectId, layerId, frameId, patch) {
    let out = null;
    await this.mutate(projectId, p => {
      const f = p.layers.find(x => x.id === layerId)?.frames?.find(x => x.id === frameId);
      if (!f) return;
      Object.assign(f, patch);
      out = f;
    });
    return out;
  }

  async deleteRasterFrame(projectId, layerId, frameId) {
    let ok = false;
    await this.mutate(projectId, p => {
      const l = p.layers.find(x => x.id === layerId);
      if (!l?.frames) return;
      const i = l.frames.findIndex(f => f.id === frameId);
      if (i >= 0) { l.frames.splice(i, 1); ok = true; }
    });
    return ok;
  }

  // ---------- symbols (réutilisables) ----------
  async addSymbol(projectId, symbol) {
    let out = null;
    await this.mutate(projectId, p => {
      out = { id: crypto.randomUUID(), ...symbol };
      p.symbols.push(out);
    });
    return out;
  }
}
