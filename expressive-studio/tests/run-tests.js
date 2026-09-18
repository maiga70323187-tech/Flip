/*
 * Suite de tests d'expressive-studio.html (Playwright + Chromium).
 *   node tests/run-tests.js
 *
 * Couvre : démarrage, outils de dessin, sélection, déplacement, redimension,
 * rotation, lasso, historique, animation, mode enregistrement, groupes,
 * lecture, frise (clés, glissement, scrub), panneaux, enregistrement et
 * réouverture .eaf, exports MP4 / PNG / ZIP, relecture de la vidéo produite.
 */
const path = require('path');
const fs = require('fs');
const http = require('http');

function loadPlaywright() {
  for (const c of ['playwright', '/opt/node22/lib/node_modules/playwright']) {
    try { return require(c); } catch (e) { /* suivant */ }
  }
  throw new Error('Playwright introuvable. Installez-le : npm i -D playwright');
}
const { chromium } = loadPlaywright();

const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'sorties');
const PAGE = 'file://' + path.join(ROOT, 'expressive-studio.html');

let passed = 0, failed = 0;
const check = (label, ok, detail) => {
  if (ok) { passed++; console.log('  OK    ' + label + (detail ? ' — ' + detail : '')); }
  else { failed++; console.log('  ECHEC ' + label + (detail ? ' — ' + detail : '')); }
};

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1500, height: 940 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });

  console.log('\n1. Démarrage');
  await page.goto(PAGE);
  await page.waitForTimeout(700);
  const boot = await page.evaluate(() => ({
    api: !!window.ExpressiveStudio,
    els: window.ExpressiveStudio.app.doc.children.length,
    layers: document.querySelectorAll('#layer-list .layer').length,
    tools: document.querySelectorAll('#toolbar .tool').length,
    diamonds: document.querySelectorAll('#tl-rows .kfd').length
  }));
  check('application démarrée', boot.api);
  check('exemple chargé', boot.els === 5 && boot.layers === 5, boot.els + ' éléments');
  check('outils disponibles', boot.tools === 8, boot.tools + ' outils');
  check('frise peuplée', boot.diamonds > 10, boot.diamonds + ' clés affichées');
  await page.screenshot({ path: path.join(OUT, '01-exemple.png') });

  console.log('\n2. Outils de dessin');
  await page.evaluate(() => window.ExpressiveStudio.newDocument(1280, 720));
  await page.waitForTimeout(200);
  const box = await page.locator('#stage').boundingBox();
  const P = (x, y) => ({ x: box.x + x, y: box.y + y });
  const drawDrag = async (tool, x1, y1, x2, y2) => {
    await page.click('[data-tool="' + tool + '"]');
    await page.mouse.move(P(x1, y1).x, P(x1, y1).y);
    await page.mouse.down();
    await page.mouse.move(P(x2, y2).x, P(x2, y2).y, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(110);
  };
  await drawDrag('rect', 300, 300, 460, 420);
  const rectInfo = await page.evaluate(() => {
    const el = window.ExpressiveStudio.app.doc.children[0];
    return { type: el.type, w: Math.round(el.props.width), h: Math.round(el.props.height) };
  });
  check('rectangle dessiné à la souris', rectInfo.type === 'rect' && rectInfo.w > 150 && rectInfo.h > 100,
        rectInfo.w + '×' + rectInfo.h + ' px document');
  await drawDrag('star', 700, 250, 780, 330);
  await drawDrag('ellipse', 900, 300, 1000, 400);
  await page.click('[data-tool="text"]');
  await page.mouse.click(P(250, 550).x, P(250, 550).y);
  await page.waitForTimeout(150);
  const types = await page.evaluate(() => window.ExpressiveStudio.app.doc.children.map(e => e.type));
  check('étoile, ellipse et texte créés', JSON.stringify(types) === JSON.stringify(['rect', 'star', 'ellipse', 'text']),
        types.join(', '));
  await page.screenshot({ path: path.join(OUT, '02-dessin.png') });

  console.log('\n3. Manipulation');
  const id = await page.evaluate(() => window.ExpressiveStudio.app.doc.children[0].id);
  await page.click('[data-tool="select"]');
  const p0 = await page.evaluate(i => ({ ...window.ExpressiveStudio.findById(i).props.position }), id);
  await page.mouse.move(P(380, 360).x, P(380, 360).y);
  await page.mouse.down();
  await page.mouse.move(P(500, 420).x, P(500, 420).y, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(120);
  const p1 = await page.evaluate(i => ({ ...window.ExpressiveStudio.findById(i).props.position }), id);
  check('déplacement à la souris', Math.abs(p1.x - p0.x) > 100,
        Math.round(p0.x) + ',' + Math.round(p0.y) + ' → ' + Math.round(p1.x) + ',' + Math.round(p1.y));

  await page.keyboard.press('Control+z'); await page.waitForTimeout(120);
  const pu = await page.evaluate(i => ({ ...window.ExpressiveStudio.findById(i).props.position }), id);
  await page.keyboard.press('Control+y'); await page.waitForTimeout(120);
  const pr = await page.evaluate(i => ({ ...window.ExpressiveStudio.findById(i).props.position }), id);
  check('annuler', Math.abs(pu.x - p0.x) < 1);
  check('rétablir', Math.abs(pr.x - p1.x) < 1);

  const sizeBefore = await page.evaluate(i => {
    const el = window.ExpressiveStudio.findById(i);
    return { w: el.props.width, h: el.props.height };
  }, id);
  const handle = await page.evaluate(i => {
    const S = window.ExpressiveStudio, a = S.app, el = S.findById(i);
    S.select([el.id]);
    const b = S.localBounds(el, a.time);
    const x = el.props.position.x - el.props.anchor.x + b.x + b.w;
    const y = el.props.position.y - el.props.anchor.y + b.y + b.h;
    return { x: x * a.view.zoom + a.view.x, y: y * a.view.zoom + a.view.y };
  }, id);
  await page.mouse.move(box.x + handle.x, box.y + handle.y);
  await page.mouse.down();
  await page.mouse.move(box.x + handle.x + 60, box.y + handle.y + 40, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(120);
  const sizeAfter = await page.evaluate(i => {
    const el = window.ExpressiveStudio.findById(i);
    return { w: el.props.width, h: el.props.height };
  }, id);
  const expectedW = sizeBefore.w + 2 * 60 / (await page.evaluate(() => window.ExpressiveStudio.app.view.zoom));
  check('redimensionnement par la poignée', Math.abs(sizeAfter.w - expectedW) < 6,
        Math.round(sizeBefore.w) + ' → ' + Math.round(sizeAfter.w) + ' px (attendu ' + Math.round(expectedW) + ')');

  const rotHandle = await page.evaluate(i => {
    const S = window.ExpressiveStudio, a = S.app, el = S.findById(i);
    S.select([i]);
    const b = S.localBounds(el, a.time);
    const cx = el.props.position.x - el.props.anchor.x + b.x + b.w / 2;
    const top = el.props.position.y - el.props.anchor.y + b.y;
    return { x: cx * a.view.zoom + a.view.x, y: top * a.view.zoom + a.view.y - 26 };
  }, id);
  await page.mouse.move(box.x + rotHandle.x, box.y + rotHandle.y);
  await page.mouse.down();
  await page.mouse.move(box.x + rotHandle.x + 90, box.y + rotHandle.y + 90, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(120);
  const rot = await page.evaluate(i => window.ExpressiveStudio.findById(i).props.rotate, id);
  check('rotation par la poignée', Math.abs(rot) > 5, rot + '°');

  await page.mouse.move(P(100, 100).x, P(100, 100).y);
  await page.mouse.down();
  await page.mouse.move(P(1050, 620).x, P(1050, 620).y, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(120);
  const lasso = await page.evaluate(() => window.ExpressiveStudio.app.selection.length);
  check('sélection au lasso', lasso === 4, lasso + ' éléments');

  console.log('\n4. Animation');
  const anim = await page.evaluate(i => {
    const S = window.ExpressiveStudio, el = S.findById(i);
    S.select([i]); S.setTime(0);
    S.toggleAnimated(el, 'position');
    S.setTime(2000);
    S.setProperty(el, 'position', { x: 900, y: 500 });
    S.refreshAll();
    return { keys: el.animations.position.keyframes.length,
             mid: { ...S.stateAt(el, 1000).position },
             from: { ...el.animations.position.keyframes[0].value } };
  }, id);
  const expectedMid = { x: (anim.from.x + 900) / 2, y: (anim.from.y + 500) / 2 };
  check('deux clés posées', anim.keys === 2);
  check('interpolation à mi-parcours', Math.abs(anim.mid.x - expectedMid.x) < 1 && Math.abs(anim.mid.y - expectedMid.y) < 1,
        Math.round(anim.mid.x) + ',' + Math.round(anim.mid.y));

  const rec = await page.evaluate(i => {
    const S = window.ExpressiveStudio, el = S.findById(i);
    document.getElementById('t-rec').click();
    S.setTime(3000);
    S.setProperty(el, 'rotate', 45);
    S.refreshAll();
    const out = { on: S.app.recording, created: !!el.animations.rotate,
                  keys: el.animations.rotate ? el.animations.rotate.keyframes.length : 0 };
    document.getElementById('t-rec').click();
    return out;
  }, id);
  check('mode enregistrement : animation créée automatiquement', rec.on && rec.created && rec.keys === 2,
        rec.keys + ' clés');

  const kfBox = await page.locator('#tl-rows .kfd').last().boundingBox();
  await page.mouse.move(kfBox.x + 5, kfBox.y + 5);
  await page.mouse.down();
  await page.mouse.move(kfBox.x + 65, kfBox.y + 5, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(150);
  const offsets = await page.evaluate(i => {
    const el = window.ExpressiveStudio.findById(i);
    const a = el.animations.rotate || el.animations.position;
    return a.keyframes.map(k => Math.round(k.offset));
  }, id);
  check('clé déplacée dans la frise', offsets[offsets.length - 1] > 3100, 'décalages ' + offsets.join(', '));

  await page.mouse.click(kfBox.x + 150, kfBox.y - 34);
  await page.waitForTimeout(120);
  const scrubbed = await page.evaluate(() => Math.round(window.ExpressiveStudio.app.time));
  check('déplacement de la tête de lecture', scrubbed > 0, scrubbed + ' ms');

  await page.evaluate(() => { window.ExpressiveStudio.setTime(0); document.getElementById('t-play').click(); });
  await page.waitForTimeout(600);
  const played = await page.evaluate(() => {
    const t = window.ExpressiveStudio.app.time;
    document.getElementById('t-play').click();
    return t;
  });
  check('lecture', played > 300, 'avancée à ' + Math.round(played) + ' ms');
  await page.screenshot({ path: path.join(OUT, '03-animation.png') });

  console.log('\n5. Groupes et panneaux');
  const grp = await page.evaluate(() => {
    const S = window.ExpressiveStudio, a = S.app;
    S.select(a.doc.children.slice(0, 2).map(e => e.id));
    S.groupSelection();
    const grouped = { top: a.doc.children.length, isGroup: a.doc.children.some(e => e.type === 'group') };
    S.ungroupSelection();
    return { grouped: grouped, ungrouped: a.doc.children.length };
  });
  check('grouper', grp.grouped.isGroup && grp.grouped.top === 3, grp.grouped.top + ' éléments racine');
  check('dégrouper', grp.ungrouped === 4, grp.ungrouped + ' éléments racine');

  await page.evaluate(i => window.ExpressiveStudio.select([i]), id);
  await page.waitForTimeout(120);
  await page.fill('[data-prop-input="width"]', '333');
  await page.dispatchEvent('[data-prop-input="width"]', 'change');
  await page.waitForTimeout(120);
  const width = await page.evaluate(i => window.ExpressiveStudio.findById(i).props.width, id);
  check('champ du panneau propriétés', width === 333, width + ' px');

  await page.click('#tab-layers');
  await page.waitForTimeout(120);
  const layers = await page.evaluate(() => document.querySelectorAll('#layer-list .layer').length);
  check('onglet calques', layers === 4, layers + ' calques');

  console.log('\n6. Fichier .eaf');
  async function grab(runner) {
    const wait = page.waitForEvent('download', { timeout: 240000 });
    await runner();
    const d = await wait;
    const file = path.join(OUT, d.suggestedFilename());
    await d.saveAs(file);
    return { file: file, size: fs.statSync(file).size };
  }
  await page.evaluate(() => window.ExpressiveStudio.loadDemo());
  await page.waitForTimeout(300);
  const eaf = await grab(() => page.click('#m-save'));
  const magic = fs.readFileSync(eaf.file).subarray(0, 4);
  check('fichier .eaf écrit', magic.equals(Buffer.from([0x65, 0x37, 0x78, 0x65])),
        'signature ex7e, ' + eaf.size + ' octets');
  await page.evaluate(() => window.ExpressiveStudio.newDocument(400, 400));
  await page.setInputFiles('#file-input', eaf.file);
  await page.waitForTimeout(900);
  const reopened = await page.evaluate(() => {
    const a = window.ExpressiveStudio.app;
    return { title: a.doc.title, els: a.doc.children.length, fps: a.doc.fps, bg: a.doc.background,
             end: a.doc.endTime, anims: a.doc.children.reduce((n, e) => n + Object.keys(e.animations).length, 0) };
  });
  check('réouverture fidèle', reopened.els === 5 && reopened.anims === 10 && reopened.end === 6000 &&
        reopened.fps === 25 && reopened.bg === '#17102e',
        reopened.els + ' éléments, ' + reopened.anims + ' animations, ' + reopened.fps + ' i/s');

  console.log('\n7. Exports');
  await page.click('#m-export');
  await page.waitForSelector('#export-modal');
  await page.selectOption('#x-format', 'mp4');
  await page.fill('#x-fps', '25');
  await page.selectOption('#x-scale', '0.5');
  await page.fill('#x-to', '2');
  const video = await grab(() => page.click('#x-run'));
  const isMp4 = fs.readFileSync(video.file).subarray(4, 8).toString() === 'ftyp';
  check('vidéo exportée', video.size > 10000, path.basename(video.file) + ', ' + Math.round(video.size / 1024) + ' Ko');
  check('conteneur MP4 (boîte ftyp)', isMp4 || video.file.endsWith('.webm'), isMp4 ? 'ftyp présent' : 'repli WebM');

  await page.selectOption('#x-format', 'sequence');
  const zip = await grab(() => page.click('#x-run'));
  check('séquence PNG (ZIP)', fs.readFileSync(zip.file).subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])),
        Math.round(zip.size / 1024) + ' Ko');

  await page.selectOption('#x-format', 'png');
  const png = await grab(() => page.click('#x-run'));
  check('image PNG', fs.readFileSync(png.file).subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
        Math.round(png.size / 1024) + ' Ko');
  await page.click('#x-cancel');

  console.log('\n8. Relecture de la vidéo produite');
  const server = http.createServer((req, res) => {
    const f = path.join(OUT, decodeURIComponent(req.url.slice(1)));
    fs.readFile(f, (e, d) => {
      if (e) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': video.file.endsWith('.webm') ? 'video/webm' : 'video/mp4' });
      res.end(d);
    });
  });
  await new Promise(r => server.listen(8242, '127.0.0.1', r));
  const playback = await page.evaluate(async (src) => {
    const v = document.createElement('video'); v.src = src; v.muted = true;
    try {
      return await new Promise((res, rej) => {
        v.onloadedmetadata = () => res({ d: v.duration, w: v.videoWidth, h: v.videoHeight });
        v.onerror = () => rej(new Error('décodage impossible'));
        setTimeout(() => rej(new Error('délai dépassé')), 15000);
      });
    } catch (e) { return { error: e.message }; }
  }, 'http://127.0.0.1:8242/' + path.basename(video.file));
  server.close();
  check('vidéo relue par le navigateur', !playback.error && Math.abs(playback.d - 2) < 0.2,
        playback.error || (playback.w + '×' + playback.h + ', ' + playback.d + ' s'));

  check('aucune erreur JavaScript', errors.length === 0, errors.join(' | '));
  await page.screenshot({ path: path.join(OUT, '04-final.png') });
  await browser.close();

  console.log('\n' + passed + ' test(s) réussi(s), ' + failed + ' échec(s).');
  console.log('Sorties : ' + OUT);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('ECHEC GLOBAL :', e.message); process.exit(1); });
