/*
 * Tests navigateur d'expressive-export.html (Playwright + Chromium).
 *
 *   node tests/run-tests.js
 *
 * Vérifie : chargement sans erreur, rendu des deux démos, import d'un .eaf
 * synthétique, export PNG, export séquence ZIP, export MP4 puis relecture
 * du MP4 par le navigateur.
 */
const path = require('path');
const fs = require('fs');
const http = require('http');

function loadPlaywright() {
  const candidates = ['playwright', '/opt/node22/lib/node_modules/playwright'];
  for (const c of candidates) {
    try { return require(c); } catch (e) { /* suivant */ }
  }
  throw new Error("Playwright introuvable. Installez-le : npm i -D playwright");
}
const { chromium } = loadPlaywright();

const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'sorties');
const PAGE = 'file://' + path.join(ROOT, 'expressive-export.html');
const EAF = path.join(__dirname, 'test-projet.eaf');

let passed = 0, failed = 0;
function check(label, ok, detail) {
  if (ok) { passed++; console.log('  OK   ' + label + (detail ? ' — ' + detail : '')); }
  else { failed++; console.log('  ECHEC ' + label + (detail ? ' — ' + detail : '')); }
}

function serve(dir, port) {
  const types = { '.mp4': 'video/mp4', '.webm': 'video/webm', '.png': 'image/png', '.html': 'text/html' };
  const server = http.createServer((req, res) => {
    const file = path.join(dir, decodeURIComponent(req.url.split('?')[0]));
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve(server)));
}

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  if (!fs.existsSync(EAF)) {
    console.log('Génération du fichier .eaf de test…');
    require('child_process').execSync('node ' + path.join(__dirname, 'make-eaf.js'));
  }

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  console.log('\n1. Chargement de la page');
  await page.goto(PAGE);
  await page.waitForTimeout(700);
  const api = await page.evaluate(() => !!window.ExpressiveExport);
  check('page chargée, API exposée', api);
  check('aucune erreur JavaScript', errors.length === 0, errors.join(' | '));

  console.log('\n2. Rendu des démos');
  for (const demo of ['showcase', 'doc1']) {
    await page.selectOption('#demo', demo);
    await page.evaluate(() => window.ExpressiveExport.setTime(3000));
    await page.locator('#preview').screenshot({ path: path.join(OUT, demo + '_3000ms.png') });
    const painted = await page.evaluate(() => {
      const c = document.getElementById('preview');
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      const seen = new Set();
      for (let i = 0; i < d.length; i += 4000) seen.add(d[i] + ',' + d[i + 1] + ',' + d[i + 2]);
      return seen.size;
    });
    check('démo ' + demo + ' rendue', painted > 2, painted + ' teintes');
  }

  console.log('\n3. Import .eaf');
  await page.setInputFiles('#file', EAF);
  await page.waitForTimeout(900);
  const eaf = await page.evaluate(() => {
    const s = window.ExpressiveExport.state.scene;
    return {
      name: s.name, w: s.width, h: s.height, end: s.endTime,
      count: s.elements.length,
      pos: s.elements[0].animations.position.getValueAtOffset(2000),
      rot: s.elements[0].animations.rotate.getValueAtOffset(2000),
      fill: s.elements[1].animations.fill.getValueAtOffset(2000).color
    };
  });
  check('conteneur .eaf décodé', eaf.name === 'Document test' && eaf.w === 800 && eaf.end === 4000);
  check('éléments reconstruits', eaf.count === 2, eaf.count + ' éléments');
  check('interpolation position', eaf.pos.x === 270 && eaf.pos.y === 170, JSON.stringify(eaf.pos));
  check('interpolation rotation', eaf.rot === 90, String(eaf.rot));
  check('interpolation couleur (ARGB)', eaf.fill.r === 183 && eaf.fill.g === 67 && eaf.fill.b === 224,
        JSON.stringify(eaf.fill));
  await page.evaluate(() => window.ExpressiveExport.setTime(2000));
  await page.locator('#preview').screenshot({ path: path.join(OUT, 'eaf_2000ms.png') });

  console.log('\n4. Exports');
  await page.selectOption('#demo', 'showcase');
  await page.waitForTimeout(200);
  await page.selectOption('#fps', '25');
  await page.selectOption('#scale', '0.5');
  await page.fill('#range-to', '2');
  await page.dispatchEvent('#range-to', 'change');

  async function grab(selector) {
    const wait = page.waitForEvent('download', { timeout: 180000 });
    await page.click(selector);
    const d = await wait;
    const file = path.join(OUT, d.suggestedFilename());
    await d.saveAs(file);
    return { file: file, size: fs.statSync(file).size };
  }

  const png = await grab('#btn-png');
  const head = fs.readFileSync(png.file).subarray(0, 8);
  check('PNG exporté', head.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
        Math.round(png.size / 1024) + ' Ko');

  const video = await grab('#btn-mp4');
  const isMp4 = fs.readFileSync(video.file).subarray(4, 8).toString() === 'ftyp';
  check('vidéo exportée', video.size > 1000, path.basename(video.file) + ', ' + Math.round(video.size / 1024) + ' Ko');
  check('conteneur MP4 (boîte ftyp)', isMp4 || video.file.endsWith('.webm'),
        isMp4 ? 'ftyp présent' : 'repli WebM');

  const zip = await grab('#btn-seq');
  const zhead = fs.readFileSync(zip.file).subarray(0, 4);
  check('séquence ZIP exportée', zhead.equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])),
        Math.round(zip.size / 1024) + ' Ko');

  console.log('\n5. Relecture de la vidéo produite');
  const server = await serve(OUT, 8231);
  const played = await page.evaluate(async (src) => {
    const v = document.createElement('video');
    v.src = src; v.muted = true;
    try {
      return await new Promise((resolve, reject) => {
        v.onloadedmetadata = () => resolve({ d: v.duration, w: v.videoWidth, h: v.videoHeight });
        v.onerror = () => reject(new Error('décodage impossible'));
        setTimeout(() => reject(new Error('délai dépassé')), 15000);
      });
    } catch (e) { return { error: e.message }; }
  }, 'http://127.0.0.1:8231/' + path.basename(video.file));
  server.close();
  check('vidéo relue par le navigateur', !played.error && Math.abs(played.d - 2) < 0.2,
        played.error || (played.w + '×' + played.h + ', ' + played.d + ' s'));

  const finalErrors = errors.filter(e => !/favicon/i.test(e));
  check('aucune erreur JavaScript au total', finalErrors.length === 0, finalErrors.join(' | '));

  await browser.close();
  console.log('\n' + passed + ' test(s) réussi(s), ' + failed + ' échec(s).');
  console.log('Sorties : ' + OUT);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('ECHEC GLOBAL :', e.message); process.exit(1); });
