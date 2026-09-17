// TRACE : ce que l'agent IA produit quand il interprète la demande utilisateur.
//
// Utilisateur : "Crée une scène avec un humanoïde de la KB au centre,
//                un décor coucher de soleil, expression 'happy'."
//
// L'agent (Claude, ChatGPT, Manus...) planifie une SÉQUENCE de tool calls.
// Chaque tool call = un objet JSON strict qui respecte le schéma Zod du
// serveur MCP. On imprime ici la trace en JSON pour être clair.
//
// Notes :
// - Côté MCP réel, les tool calls sont enveloppés dans du JSON-RPC 2.0.
// - Côté HTTP (ce script), on tape directement l'API — le schéma est
//   identique, on retire juste la couche transport MCP.

const API = 'http://localhost:8787';
async function j(method, path, body) {
  const r = await fetch(`${API}${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const status = r.status;
  const text = await r.text();
  let parsed; try { parsed = JSON.parse(text); } catch { parsed = text; }
  return { status, body: parsed };
}
function log(step, tool, args, result) {
  console.log('\n─── étape ' + step + ' ─────────────────────────────');
  console.log('AGENT dit    →', tool);
  console.log('ARGS         →', JSON.stringify(args, null, 2));
  console.log('MOTEUR répond →', typeof result === 'string' ? result : JSON.stringify(result, null, 2).slice(0, 400));
}

// 1. L'agent découvre les personnages disponibles dans la KB.
let r = await j('GET', '/api/knowledge/characters');
log(1, 'list_character_examples', {}, r.body);

// 2. Il charge le humanoïde. C'est le JSON qu'il obtient sur son fil de sortie.
r = await j('GET', '/api/knowledge/characters/humanoid');
const humanoid = r.body;
log(2, 'load_character_example', { key: 'humanoid' }, `<Character JSON, ${JSON.stringify(humanoid).length} octets, ${humanoid.parts.length} parts, ${humanoid.bones.length} bones>`);

// 3. Il crée un projet (dimensions, fps, durée).
r = await j('POST', '/api/projects', { name: 'Démo langage MCP', width: 800, height: 600, fps: 24, duration_ms: 3000 });
const projectId = r.body.id;
log(3, 'create_project', { name: 'Démo langage MCP', width: 800, height: 600, fps: 24, duration_ms: 3000 }, r.body);

// 4. Il pose un décor coucher de soleil (procédural, sans modèle externe).
r = await j('POST', `/api/projects/${projectId}/decor`, { preset: 'sky_sunset', seed: 7 });
log(4, 'apply_decor_preset', { project_id: projectId, preset: 'sky_sunset', seed: 7 }, r.body);

// 5. Il importe le humanoïde dans le projet.
r = await j('POST', `/api/projects/${projectId}/characters`, humanoid);
const charId = r.body.id;
log(5, 'add_character', { project_id: projectId, character: '<Character JSON>' }, r.body.id ? { id: r.body.id, name: r.body.name } : r.body);

// 6. Il interroge ses capacités AVANT d'agir (règle du contrat agent).
r = await j('GET', `/api/projects/${projectId}/characters/${charId}/capabilities`);
log(6, 'get_character_capabilities', { project_id: projectId, character_id: charId },
    { expressions: r.body.expressions, capabilities: r.body.capabilities });

// 7. L'expression 'happy' est bien listée => il la sélectionne.
r = await j('PATCH', `/api/projects/${projectId}/characters/${charId}`, { currentExpression: 'happy', transform: { x: 400, y: 500, scale: 1.4 } });
log(7, 'set_character_state', { project_id: projectId, character_id: charId, currentExpression: 'happy', transform: { x: 400, y: 500, scale: 1.4 } },
    { id: r.body.id, currentExpression: r.body.currentExpression, transform: r.body.transform });

// 8. Il demande le rendu à t=0.
console.log('\n─── étape 8 : rendu ────────────────────────────');
console.log('MOTEUR expose /api/projects/' + projectId + '/render?t_ms=0  et  /render.png');
console.log('PROJECT_ID=' + projectId);

// Rappel : DEMANDE DE L'ERREUR STRUCTURÉE
// L'agent essaie une expression INEXISTANTE => moteur renvoie une erreur
// TYPÉE, il ne "fait pas semblant" (règle #9 du contrat).
r = await j('PATCH', `/api/projects/${projectId}/characters/${charId}`, { currentExpression: 'ecstatic-super' });
console.log('\n─── étape 9 : cas d\'erreur ─────────────────────');
console.log('AGENT dit    → set_character_state (expression: ecstatic-super)');
console.log('MOTEUR      → HTTP ' + r.status);
console.log('             ', JSON.stringify(r.body).slice(0, 200));
