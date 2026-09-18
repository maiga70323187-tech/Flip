import test from 'node:test'; import assert from 'node:assert/strict'; import os from 'node:os'; import fs from 'node:fs/promises'; import path from 'node:path';
import { JsonStore } from '../src/lib/store.js';

test('store CRUD frame and element',async()=>{const dir=await fs.mkdtemp(path.join(os.tmpdir(),'flipaclip-'));const s=new JsonStore(dir);const p=await s.createProject({name:'Demo'});const f=await s.addFrame(p.id,{duration_ms:500});const e=await s.addElement(p.id,f.id,{type:'character',image_ref:'a.png',x:1,y:2});assert.equal(e.x,1);await s.updateElement(p.id,f.id,e.id,{x:99});const saved=await s.getProject(p.id);assert.equal(saved.frames[0].elements[0].x,99);});
