# Démos Flip — vidéos, images et scripts de référence

Ce dossier archive les démos concrètes générées pendant le développement,
et surtout **le langage utilisé** pour les produire (scripts qui appellent
l'API/MCP). C'est la référence à comparer avec d'autres apps d'animation
pilotées par IA.

## Vidéo de référence

**`outputs/sunset.mp4`** — 2 s, 24 fps, 48 frames, 26 Ko, H.264.

Scène : coucher de soleil procédural (`sky_sunset`) + montagnes en 3 plans
+ un petit personnage humanoïde riggé dont le bras salue (rotation de l'os
`bras` de 30° à −70° puis retour, en `ease-in-out`, avec l'avant-bras qui
suit avec un décalage rythmique). Tout est généré 100 % localement :
formes SVG procédurales → rasterisation via `@resvg/resvg-js` → encodage
via `ffmpeg-static`. **Aucun modèle IA externe.**

Frames intermédiaires en SVG (`sunset-t0.svg`, `sunset-t500.svg`,
`sunset-t1000.svg`, `sunset-t1500.svg`) et une PNG (`sunset-t500.png`).

### Script qui a produit cette vidéo

**`scripts/demo-scene.mjs`** — ~150 lignes, 100 % API HTTP.

Voici ce que le script fait (= ce que ferait un agent IA via MCP en
équivalence 1-pour-1 sur les outils `create_project`, `apply_decor_preset`,
`add_bone`, `add_shape`, `attach_shape_to_bone`, `animate_bone_rotation`) :

1. `POST /api/projects` → crée un projet 800×500, 30 fps, 2000 ms.
2. `POST /api/projects/:id/decor` avec `preset: "sky_sunset", seed: 7` →
   ajoute un calque décor complet (ciel dégradé + soleil + montagnes).
3. `POST /api/projects/:id/layers/:l/bones` × 3 → chaîne d'os torse →
   bras → avant-bras avec parents et rotations initiales.
4. `POST /api/projects/:id/layers/:l/shapes` × 5 → tête (ellipse), corps
   (rect), bras/avant-bras/main. Chaque bras est ensuite rattaché à son
   os via `PATCH shapes/:sid` avec `parent_bone`.
5. `POST /api/projects/:id/layers/:l/bones/:b/keyframes` × 15 → keyframes
   sur `rotation` du bras et de l'avant-bras aux temps 0, 500, 1000,
   1500, 2000 ms avec courbe `ease-in-out`. Plus un léger rebond
   vertical du torse (keyframes sur `y`).

Puis le rendu MP4 est produit par un seul appel :

```
POST /api/projects/:id/export  { "format": "mp4", "fps": 24 }
```

Réponse : `{ status: "exported", format: "mp4", file: "…/output/exports/<id>.mp4" }`.
Encodage complet en 0,8 s dans le sandbox.

### À lancer chez vous

```bash
# Terminal 1
npm run dev:backend
# Terminal 2
node docs/demos/scripts/demo-scene.mjs
```

L'ID du projet s'affiche en dernière ligne. Ouvrez ensuite :
- `http://localhost:8787/api/projects/<ID>/render.png?t_ms=500`
- `http://localhost:8787/api/projects/<ID>/export` (POST) pour le MP4

## Trace du langage MCP

**`outputs/mcp-trace.txt`** — trace verbatim d'un agent qui exécute :

> « Crée une scène avec un humanoïde de la KB au centre, un décor coucher
> de soleil, expression `happy`. »

**`scripts/mcp-trace.mjs`** — le script qui simule l'agent, avec les tool
calls exacts qu'il produirait. Chaque étape affiche :
- Le **nom de l'outil** (`list_character_examples`, `create_project`,
  `apply_decor_preset`, `add_character`, `get_character_capabilities`,
  `set_character_state`).
- Les **arguments JSON** envoyés.
- La **réponse du moteur**.

L'étape 9 montre l'agent tentant une expression inexistante et recevant
une **erreur structurée** :

```json
{
  "error": "expression ecstatic-super not declared on character human_example_01",
  "code": "UNSUPPORTED_EXPRESSION",
  "details": {
    "available": ["neutral", "happy", "sad", "angry", "surprised", "eyesClosed"]
  }
}
```

L'agent lit `details.available` et se corrige — il ne substitue pas
silencieusement une autre expression.

**`outputs/mcp-demo.png`** est le PNG final produit par cette scène.

## Phase 2 — Swap de variantes par slot

**`outputs/phase2-hand-open.png`** et **`outputs/phase2-hand-fist.png`**
sont deux rendus du même rig humanoïde procédural
(`build_humanoid_rig`), avant et après un appel :

```
PATCH /api/projects/:id/characters/:cid/slots/hand_front
      { "part": "hand_R_fist" }
```

Le slot `hand_front` a 3 variantes déclarées (`hand_R_open`,
`hand_R_fist`, `hand_R_point`). Le changement n'affecte que la variante
visible — le reste du personnage reste identique.

## Résumé des chemins

| Démo | Vidéo/image | Script |
|---|---|---|
| Coucher de soleil + salut | `outputs/sunset.mp4` (+ 4 SVG, 1 PNG) | `scripts/demo-scene.mjs` |
| Trace langage MCP | `outputs/mcp-trace.txt`, `outputs/mcp-demo.png` | `scripts/mcp-trace.mjs` |
| Phase 2 — swap slot | `outputs/phase2-hand-*.png` | (via `curl` documenté ici) |

## Voir aussi

- `docs/MCP_LANGUAGE.md` — manuel complet du langage MCP.
- `docs/knowledge/12_AI_AGENT_CONTRACT.md` — contrat que l'agent doit respecter.
- `backend/openapi.json` — miroir HTTP des outils MCP.
