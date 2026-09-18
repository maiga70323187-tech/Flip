import { randomUUID, createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function generateAsset({ kind, prompt, assetRoot }) {
  await fs.mkdir(assetRoot,{recursive:true});
  const id=randomUUID();
  const hash=createHash('sha256').update(`${kind}:${prompt}`).digest('hex').slice(0,16);
  const manifest={id,kind,prompt,provider:'mock',status:'manifest-only',content_hash:hash,created_at:new Date().toISOString()};
  const file=path.join(assetRoot,`${id}.json`);
  await fs.writeFile(file,JSON.stringify(manifest,null,2));
  return {...manifest,image_ref:file};
}

export async function inpaintAsset({ image_ref, prompt, mask }) {
  return { id: randomUUID(), provider:'mock', operation:'inpaint', source:image_ref, prompt, mask, status:'manifest-only' };
}
