import fs from 'node:fs';
import path from 'node:path';

const required = [
  'README.md',
  'backend/src/app.js',
  'backend/src/lib/model.js',
  'backend/src/lib/store.js',
  'backend/src/services/render.js',
  'backend/openapi.json',
  'frontend/src/App.jsx',
  'frontend/src/components/Stage.jsx',
  'frontend/src/lib/interpolate.js',
  'mcp-server/src/index.js',
];

let bad = 0;
for (const f of required) {
  const ok = fs.existsSync(path.resolve(f));
  console.log(`${ok ? 'OK    ' : 'MISS  '} ${f}`);
  if (!ok) bad++;
}
process.exitCode = bad ? 1 : 0;
