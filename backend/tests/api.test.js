import test from 'node:test'; import assert from 'node:assert/strict'; import os from 'node:os'; import fs from 'node:fs/promises'; import path from 'node:path';
process.env.FLIPACLIP_DATA_DIR=await fs.mkdtemp(path.join(os.tmpdir(),'flip-api-'));
process.env.FLIPACLIP_ASSET_DIR=await fs.mkdtemp(path.join(os.tmpdir(),'flip-assets-'));
const { createApp }=await import('../src/app.js');

test('HTTP create project and preview',async()=>{const server=createApp().listen(0);const port=server.address().port;try{let r=await fetch(`http://127.0.0.1:${port}/api/projects`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'API'})});assert.equal(r.status,201);const p=await r.json();r=await fetch(`http://127.0.0.1:${port}/api/projects/${p.id}/preview`);assert.equal(r.status,200);const prev=await r.json();assert.equal(prev.name,'API');}finally{server.close();}});
