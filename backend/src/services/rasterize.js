// SVG -> PNG (via @resvg/resvg-js, pur WASM/natif, aucun modèle externe)
// et séquence de PNG -> MP4 (via ffmpeg-static).

import { Resvg } from '@resvg/resvg-js';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import ffmpegPath from 'ffmpeg-static';

export function svgToPng(svg, { width, height } = {}) {
  const resvg = new Resvg(svg, {
    fitTo: width ? { mode: 'width', value: width } : (height ? { mode: 'height', value: height } : { mode: 'original' }),
    font: { loadSystemFonts: false, defaultFontFamily: 'sans-serif' },
    background: '#fff',
  });
  return resvg.render().asPng();
}

export async function svgsToMp4({ svgs, fps = 24, width, height, outFile }) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'flip-mp4-'));
  try {
    // écriture des frames PNG
    for (let i = 0; i < svgs.length; i++) {
      const png = svgToPng(svgs[i], { width, height });
      await fs.writeFile(path.join(dir, `f${String(i).padStart(6, '0')}.png`), png);
    }
    await new Promise((resolve, reject) => {
      const args = [
        '-y',
        '-framerate', String(fps),
        '-i', path.join(dir, 'f%06d.png'),
        '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-preset', 'veryfast',
        '-movflags', '+faststart',
        outFile,
      ];
      const p = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
      let stderr = '';
      p.stderr.on('data', (b) => { stderr += b.toString(); });
      p.on('close', (code) => code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}: ${stderr.slice(-500)}`)));
      p.on('error', reject);
    });
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
  return outFile;
}
