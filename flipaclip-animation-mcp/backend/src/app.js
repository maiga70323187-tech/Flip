import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { JsonStore } from './lib/store.js';
import { assertProjectInput, assertElementInput, assertReorder } from './lib/validate.js';
import { generateAsset, inpaintAsset } from './services/generator.js';
import { previewManifest } from './services/timeline.js';

const here=path.dirname(fileURLToPath(import.meta.url));
const dataRoot=process.env.FLIPACLIP_DATA_DIR ?? path.resolve(here,'../data/projects');
const assetRoot=process.env.FLIPACLIP_ASSET_DIR ?? path.resolve(here,'../data/assets');
export const store=new JsonStore(dataRoot);
await store.init(); await fs.mkdir(assetRoot,{recursive:true});

export function createApp(){
 const app=express(); app.use(cors()); app.use(express.json({limit:'10mb'}));
 const upload=multer({dest:assetRoot});
 app.get('/health',(req,res)=>res.json({ok:true,service:'flipaclip-animation-backend'}));
 app.get('/api/projects',async(req,res)=>res.json(await store.listProjects()));
 app.post('/api/projects',async(req,res,next)=>{try{assertProjectInput(req.body);res.status(201).json(await store.createProject(req.body));}catch(e){next(e)}});
 app.get('/api/projects/:id',async(req,res)=>{const p=await store.getProject(req.params.id); p?res.json(p):res.status(404).json({error:'project not found'});});
 app.delete('/api/projects/:id',async(req,res)=>res.status((await store.deleteProject(req.params.id))?204:404).end());
 app.post('/api/projects/:id/frames',async(req,res,next)=>{try{const f=await store.addFrame(req.params.id,req.body);f?res.status(201).json(f):res.status(404).json({error:'project not found'});}catch(e){next(e)}});
 app.post('/api/projects/:id/frames/:frameId/duplicate',async(req,res,next)=>{try{const f=await store.duplicateFrame(req.params.id,req.params.frameId);f?res.status(201).json(f):res.status(404).json({error:'project not found'});}catch(e){next(e)}});
 app.delete('/api/projects/:id/frames/:frameId',async(req,res,next)=>{try{const r=await store.deleteFrame(req.params.id,req.params.frameId);r===null?res.status(404).json({error:'project not found'}):res.status(r?204:404).end();}catch(e){next(e)}});
 app.put('/api/projects/:id/frames/reorder',async(req,res,next)=>{try{const p=await store.getProject(req.params.id);if(!p)return res.status(404).json({error:'project not found'});assertReorder(req.body.frame_ids,p.frames);res.json(await store.reorderFrames(req.params.id,req.body.frame_ids));}catch(e){next(e)}});
 app.post('/api/projects/:id/frames/:frameId/elements',async(req,res,next)=>{try{assertElementInput(req.body);const e=await store.addElement(req.params.id,req.params.frameId,req.body);e?res.status(201).json(e):res.status(404).json({error:'project not found'});}catch(e){next(e)}});
 app.patch('/api/projects/:id/frames/:frameId/elements/:elementId',async(req,res,next)=>{try{assertElementInput(req.body);const e=await store.updateElement(req.params.id,req.params.frameId,req.params.elementId,req.body);e?res.json(e):res.status(404).json({error:'project not found'});}catch(e){next(e)}});
 app.delete('/api/projects/:id/frames/:frameId/elements/:elementId',async(req,res,next)=>{try{const r=await store.deleteElement(req.params.id,req.params.frameId,req.params.elementId);r===null?res.status(404).json({error:'project not found'}):res.status(r?204:404).end();}catch(e){next(e)}});
 app.post('/api/projects/:id/audio',upload.single('audio'),async(req,res,next)=>{try{const track={id:crypto.randomUUID(),name:req.file?.originalname??req.body.name??'audio',file:req.file?.path??req.body.file,start_ms:Number(req.body.start_ms??0)};const p=await store.mutate(req.params.id,pr=>pr.audio_tracks.push(track));p?res.status(201).json(track):res.status(404).json({error:'project not found'});}catch(e){next(e)}});
 app.post('/api/generate/:kind',async(req,res,next)=>{try{const allowed=['character','object','background'];if(!allowed.includes(req.params.kind))return res.status(400).json({error:'unsupported kind'});res.status(201).json(await generateAsset({kind:req.params.kind,prompt:req.body.prompt??'',assetRoot}));}catch(e){next(e)}});
 app.post('/api/inpaint',async(req,res,next)=>{try{res.json(await inpaintAsset(req.body));}catch(e){next(e)}});
 app.get('/api/projects/:id/preview',async(req,res)=>{const p=await store.getProject(req.params.id);p?res.json(previewManifest(p)):res.status(404).json({error:'project not found'});});
 app.post('/api/projects/:id/export',async(req,res,next)=>{try{const p=await store.getProject(req.params.id);if(!p)return res.status(404).json({error:'project not found'});const manifest=previewManifest(p);const exportDir=process.env.FLIPACLIP_EXPORT_DIR ?? path.resolve(here,'../../output/exports');await fs.mkdir(exportDir,{recursive:true});const file=path.join(exportDir,`${p.id}-${Date.now()}.json`);await fs.writeFile(file,JSON.stringify({...manifest,requested_format:req.body.format??'mp4'},null,2));res.status(201).json({status:'manifest-exported',file});}catch(e){next(e)}});
 app.use((err,req,res,next)=>{console.error(err);res.status(400).json({error:err.message});});
 return app;
}
