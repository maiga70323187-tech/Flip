import fs from 'node:fs/promises';
import path from 'node:path';
import { newProject, newFrame, newElement } from './model.js';

export class JsonStore {
  constructor(root) { this.root = root; }
  async init() { await fs.mkdir(this.root, { recursive: true }); }
  file(id) { return path.join(this.root, `${id}.json`); }
  async listProjects() {
    await this.init();
    const names = (await fs.readdir(this.root)).filter(n => n.endsWith('.json'));
    const projects = await Promise.all(names.map(async n => JSON.parse(await fs.readFile(path.join(this.root,n),'utf8'))));
    return projects.sort((a,b) => b.updated_at.localeCompare(a.updated_at));
  }
  async getProject(id) {
    try { return JSON.parse(await fs.readFile(this.file(id),'utf8')); }
    catch (e) { if (e.code === 'ENOENT') return null; throw e; }
  }
  async saveProject(project) {
    await this.init();
    project.updated_at = new Date().toISOString();
    const target = this.file(project.id), tmp = `${target}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(project,null,2));
    await fs.rename(tmp,target);
    return project;
  }
  async createProject(input) { return this.saveProject(newProject(input)); }
  async deleteProject(id) { try { await fs.unlink(this.file(id)); return true; } catch(e){ if(e.code==='ENOENT') return false; throw e; } }
  async mutate(id, fn) {
    const p = await this.getProject(id); if (!p) return null;
    await fn(p); return this.saveProject(p);
  }
  async addFrame(id, input) { let created; const p = await this.mutate(id, pr => { created = newFrame(input); pr.frames.push(created); }); return p && created; }
  async duplicateFrame(id, frameId) { let created; const p = await this.mutate(id, pr => { const src = pr.frames.find(f=>f.id===frameId); if(!src) throw new Error('frame not found'); created = newFrame({...structuredClone(src), id:undefined}); pr.frames.push(created); }); return p && created; }
  async deleteFrame(id, frameId) { let removed=false; const p=await this.mutate(id,pr=>{const before=pr.frames.length; pr.frames=pr.frames.filter(f=>f.id!==frameId); removed=pr.frames.length!==before;}); return p ? removed : null; }
  async reorderFrames(id, ids) { return this.mutate(id, pr => { const map=new Map(pr.frames.map(f=>[f.id,f])); pr.frames=ids.map(x=>map.get(x)); }); }
  async addElement(id, frameId, input) { let created; const p=await this.mutate(id,pr=>{const f=pr.frames.find(x=>x.id===frameId); if(!f) throw new Error('frame not found'); created=newElement(input); f.elements.push(created);}); return p && created; }
  async updateElement(id, frameId, elementId, patch) { let updated; const p=await this.mutate(id,pr=>{const f=pr.frames.find(x=>x.id===frameId); if(!f) throw new Error('frame not found'); const e=f.elements.find(x=>x.id===elementId); if(!e) throw new Error('element not found'); Object.assign(e,patch); updated=e;}); return p && updated; }
  async deleteElement(id, frameId, elementId) { let removed=false; const p=await this.mutate(id,pr=>{const f=pr.frames.find(x=>x.id===frameId); if(!f) throw new Error('frame not found'); const before=f.elements.length; f.elements=f.elements.filter(e=>e.id!==elementId); removed=before!==f.elements.length;}); return p ? removed : null; }
}
