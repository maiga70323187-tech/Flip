# Le langage MCP de Flip — manuel complet

Ce document décrit **précisément** le langage qu'utilise un agent IA
(Claude, ChatGPT, Manus, ou tout autre client MCP / OpenAPI) pour piloter
le moteur Flip. Il complète les documents `docs/knowledge/` en donnant les
noms d'outils, leurs schémas d'arguments et des scénarios traceables.

## 0. Vue d'ensemble

```
Utilisateur (langage naturel)
   │
   ▼
Agent IA
   │  reformule la demande en une SÉQUENCE d'appels
   │  d'outils du vocabulaire fixé ci-dessous
   ▼
Serveur MCP (mcp-server/src/index.js)          ← ou API HTTP miroir
   │  valide les arguments contre les schémas Zod
   │
   ▼
Moteur (backend/src/*)                          ← Character/Scene Engine
   │  applique la mécanique (bones, IK, keyframes, rendu)
   ▼
Renderer SVG / PNG / MP4
```

Deux surfaces d'accès **strictement équivalentes** :

- **MCP (stdio)** — clients : Claude Desktop, Manus, tout client MCP.
- **HTTP JSON (OpenAPI 3.1)** — clients : ChatGPT Actions, curl, tout SDK OpenAPI. Voir `backend/openapi.json`.

Chaque outil MCP est le miroir d'un endpoint HTTP.

## 1. Les 4 règles

1. **Vocabulaire fixé.** L'agent n'invente pas d'outil : il en connaît une liste finie exposée par le serveur.
2. **Arguments typés.** Chaque outil a un schéma Zod. Un argument hors schéma est refusé avant exécution.
3. **Vérifier avant d'agir.** Pour toute action sur un personnage, l'agent DOIT appeler `get_character_capabilities` d'abord.
4. **Erreurs typées.** Un échec renvoie `{ error, code, details }`. L'agent lit `code` et se corrige — il ne se tait pas et ne substitue pas une autre action silencieusement.

## 2. Table des codes d'erreur

| Code                          | Sens                                                                | Statut HTTP |
|-------------------------------|---------------------------------------------------------------------|-------------|
| `UNKNOWN_CHARACTER`           | `character_id` inconnu du projet                                    | 404         |
| `MISSING_VIEW`                | La vue demandée n'est pas déclarée sur ce personnage                | 404         |
| `MISSING_ASSET`               | Une part demandée n'existe pas sur ce personnage                    | 404         |
| `MISSING_SLOT`                | Slot inconnu                                                        | 400         |
| `UNSUPPORTED_EXPRESSION`      | Expression non déclarée                                             | 400         |
| `INVALID_TARGET`              | Cible d'action mal formée                                           | 400         |
| `UNREACHABLE_TARGET`          | Cible hors portée d'une IK contrainte                               | 400         |
| `INVALID_CHARACTER_SCHEMA`    | Character JSON refusé (violations de `character.schema.json`)       | 400         |
| `UNKNOWN_ACTION`              | Action non implémentée (Phase 3)                                    | 400         |

Chaque erreur porte `details.available` quand la remédiation est de choisir dans une liste.

## 3. Vocabulaire — outils MCP (arguments requis)

### 3.1 Projet et scène

| Outil                     | Arguments principaux                                                                                  |
|---------------------------|-------------------------------------------------------------------------------------------------------|
| `list_projects`           | —                                                                                                     |
| `create_project`          | `name?`, `width?`, `height?`, `fps?`, `duration_ms?`, `background?`                                   |
| `get_project`             | `project_id`                                                                                          |
| `update_project`          | `project_id`, mêmes champs qu'`create_project`                                                         |
| `apply_decor_preset`      | `project_id`, `preset ∈ {sky_day, sky_sunset, sky_night, mountains, grass_field}`, `seed?`             |
| `add_linear_gradient`     | `project_id`, `stops[]`, `x1?`, `y1?`, `x2?`, `y2?`                                                    |
| `add_radial_gradient`     | `project_id`, `stops[]`, `cx?`, `cy?`, `r?`                                                            |

### 3.2 Calques et formes vectorielles

| Outil                       | Arguments principaux                                                                                       |
|-----------------------------|------------------------------------------------------------------------------------------------------------|
| `add_layer`                 | `project_id`, `kind ∈ {vector, raster}`, `name?`, `opacity?`, `fps?`                                        |
| `update_layer`              | `project_id`, `layer_id`, `name?`, `visible?`, `locked?`, `opacity?`                                       |
| `delete_layer`              | `project_id`, `layer_id`                                                                                   |
| `reorder_layers`            | `project_id`, `layer_ids[]`                                                                                |
| `add_shape`                 | `project_id`, `layer_id`, `type ∈ {path, rect, ellipse, polygon, line, text, group, image}`, `props?`, `transform?`, `style?` |
| `draw_path`                 | `project_id`, `layer_id`, `d`, `fill?`, `stroke?`, `stroke_width?`                                         |
| `draw_path_anchors`         | `project_id`, `layer_id`, `anchors[]`, `closed?`, `fill?`, `stroke?`, `stroke_width?`                      |
| `update_shape`              | `project_id`, `layer_id`, `shape_id`, `transform?`, `style?`, `props?`, `parent_bone?`                     |
| `delete_shape`              | `project_id`, `layer_id`, `shape_id`                                                                       |
| `move_shape`                | `+ x?`, `y?`                                                                                               |
| `rotate_shape`              | `+ rotation?`                                                                                              |
| `scale_shape`               | `+ scale_x?`, `scale_y?`                                                                                    |

### 3.3 Animation (keyframes)

| Outil               | Arguments principaux                                                                                  |
|---------------------|-------------------------------------------------------------------------------------------------------|
| `add_keyframe`      | `project_id`, `layer_id`, `shape_id`, `property ∈ {x, y, rotation, scale_x, scale_y, opacity, fill, stroke, stroke_width, d}`, `time_ms`, `value`, `easing?`, `bezier?` |
| `tween_property`    | `project_id`, `layer_id`, `shape_id`, `property`, `from`, `to`, `start_ms`, `end_ms`, `easing?`         |
| `patch_keyframe`    | `project_id`, `layer_id`, `shape_id`, `property`, `keyframe_id`, `time_ms?`, `value?`, `easing?`, `bezier?` |
| `delete_keyframe`   | `project_id`, `layer_id`, `shape_id`, `property`, `keyframe_id`                                        |

### 3.4 Rigging (os)

| Outil                       | Arguments principaux                                                                                 |
|-----------------------------|------------------------------------------------------------------------------------------------------|
| `add_bone`                  | `project_id`, `layer_id`, `name?`, `parent_id?`, `length?`, `rotation?`, `x?`, `y?`                  |
| `update_bone`               | `project_id`, `layer_id`, `bone_id`, `rotation?`, `length?`, `parent_id?`                             |
| `delete_bone`               | `project_id`, `layer_id`, `bone_id`                                                                   |
| `add_bone_chain`            | `project_id`, `layer_id`, `root_x`, `root_y`, `segments: [{ length, rotation?, name? }]`             |
| `attach_shape_to_bone`      | `project_id`, `layer_id`, `shape_id`, `bone_id`                                                       |
| `animate_bone_rotation`     | `project_id`, `layer_id`, `bone_id`, `time_ms`, `value`, `easing?`, `bezier?`                         |
| `solve_ik`                  | `project_id`, `layer_id`, `tip_bone_id`, `target_x`, `target_y`, `apply?`, `chain_length?`            |

### 3.5 Personnages (Phase 1 + Phase 2)

| Outil                          | Arguments principaux                                                                              |
|--------------------------------|---------------------------------------------------------------------------------------------------|
| `list_characters`              | `project_id`                                                                                      |
| `add_character`                | `project_id`, `character` (JSON conforme `character.schema.json`)                                 |
| `list_character_examples`      | —                                                                                                 |
| `load_character_example`       | `key ∈ {humanoid, quadruped-cat, ...}`                                                             |
| `build_humanoid_rig`           | `project_id`, `name?`, `origin_x?`, `origin_y?`, `style_profile?`                                 |
| `get_character_capabilities`   | `project_id`, `character_id` — **À appeler avant toute autre action**                              |
| `set_character_state`          | `project_id`, `character_id`, `currentView?`, `currentExpression?`, `transform?`, `visible?`      |
| `set_character_variant`        | `project_id`, `character_id`, `slot_id`, `part_id \| null`                                        |
| `set_character_part_asset`     | `project_id`, `character_id`, `part_source`, `asset_url`                                          |

### 3.6 Sortie

| Outil                | Arguments principaux                                                              |
|----------------------|-----------------------------------------------------------------------------------|
| `render_frame_svg`   | `project_id`, `t_ms?`                                                              |
| `get_manifest`       | `project_id`                                                                       |
| `export_project`     | `project_id`, `format ∈ {json, svg, png, mp4}`, `t_ms?`, `fps?`, `width?`         |

## 4. Anatomie d'un appel MCP

Ce que l'agent envoie (JSON-RPC 2.0 sur stdio) :

```json
{
  "jsonrpc": "2.0",
  "id": 42,
  "method": "tools/call",
  "params": {
    "name": "apply_decor_preset",
    "arguments": { "project_id": "abc-…", "preset": "sky_sunset", "seed": 7 }
  }
}
```

Ce que le serveur MCP renvoie :

```json
{
  "jsonrpc": "2.0",
  "id": 42,
  "result": {
    "content": [
      { "type": "text", "text": "{\"layer_id\":\"…\",\"defs_added\":3,\"shapes_added\":6}" }
    ]
  }
}
```

Le miroir HTTP est un `POST /api/projects/abc-…/decor` avec `{ preset, seed }`. Le résultat est le même JSON, sans l'enveloppe MCP.

## 5. Scénarios agents complets

### Scénario A — Personnage humanoïde qui salue

**Demande utilisateur** : « Crée un humanoïde de la KB, mets-le à droite, expression happy, main droite en poing. »

```
1. list_character_examples()
2. load_character_example(key: "humanoid")
3. create_project(name: "Salut", width: 800, height: 600, fps: 24, duration_ms: 3000)
4. apply_decor_preset(project_id: P, preset: "sky_sunset", seed: 7)
5. add_character(project_id: P, character: <JSON de l'étape 2>)
6. get_character_capabilities(project_id: P, character_id: C)
   → expressions: [neutral, happy, sad, angry, surprised, eyesClosed]
7. set_character_state(project_id: P, character_id: C,
                      currentExpression: "happy",
                      transform: { x: 600, y: 500, scale: 1.2 })
8. set_character_variant(project_id: P, character_id: C,
                         slot_id: "hand_front", part_id: "hand_R_fist")
9. render_frame_svg(project_id: P, t_ms: 0)
```

### Scénario B — Personnage riggé procéduralement, animation « lever le bras »

```
1. create_project(width: 640, height: 480, fps: 24, duration_ms: 1500)
2. build_humanoid_rig(project_id: P, origin_x: 320, origin_y: 100)
   → renvoie un Character prêt : 22 bones, 19 slots, 22 parts.
3. animate_bone_rotation(project_id: P, layer_id: null, bone_id: "shoulder_R",
                        time_ms: 0,    value: 80, easing: "ease-in-out")
4. animate_bone_rotation(project_id: P, layer_id: null, bone_id: "shoulder_R",
                        time_ms: 800,  value: -30, easing: "ease-in-out")
5. animate_bone_rotation(project_id: P, layer_id: null, bone_id: "elbow_R",
                        time_ms: 400,  value: 20)
6. export_project(project_id: P, format: "mp4", fps: 24)
```

### Scénario C — Correction d'une erreur structurée

L'agent tente une expression qui n'existe pas :

```
set_character_state(project_id: P, character_id: C, currentExpression: "ecstatic-super")
→ 400 { "error": "expression ecstatic-super not declared on character human_example_01",
        "code": "UNSUPPORTED_EXPRESSION",
        "details": { "available": ["neutral","happy","sad","angry","surprised","eyesClosed"] } }
```

L'agent lit `details.available`, choisit « happy », et réessaye. Il ne substitue **pas** silencieusement une autre expression.

### Scénario D — Solveur IK pour attraper un objet

```
1. build_humanoid_rig(project_id: P)
2. solve_ik(project_id: P,
            layer_id: <layer contenant les bones>,
            tip_bone_id: "wrist_R",
            target_x: 500,
            target_y: 300,
            chain_length: 3,     # shoulder + elbow + wrist
            apply: true)
   → renvoie { chain: ["shoulder_R","elbow_R","wrist_R"], rotations: [.., .., ..] }
```

Les contraintes d'angle définies dans `build_humanoid_rig` (elbow ∈ [0, 155]) empêchent le coude de plier à l'envers.

### Scénario E — Export final

```
export_project(project_id: P, format: "mp4", fps: 30)
→ { status: "exported", format: "mp4", file: "/…/output/exports/<id>-<ts>.mp4" }
```

Le moteur rend toute la timeline en local (resvg + ffmpeg-static), aucun modèle externe.

## 6. Utiliser le langage sans MCP

L'API HTTP est un miroir **1-pour-1**. Voici les mêmes appels de A en HTTP :

```bash
BASE=http://localhost:8787
# Étape 4 :
curl -X POST "$BASE/api/projects/$P/decor" \
  -H 'content-type: application/json' \
  -d '{"preset":"sky_sunset","seed":7}'

# Étape 7 :
curl -X PATCH "$BASE/api/projects/$P/characters/$C" \
  -H 'content-type: application/json' \
  -d '{"currentExpression":"happy","transform":{"x":600,"y":500,"scale":1.2}}'

# Étape 8 :
curl -X PATCH "$BASE/api/projects/$P/characters/$C/slots/hand_front" \
  -H 'content-type: application/json' \
  -d '{"part":"hand_R_fist"}'
```

## 7. Conventions de nommage

- **snake_case** pour les noms d'outils MCP (`add_character`, `set_character_state`).
- **camelCase** pour les champs des Characters (respect strict de `character.schema.json` : `currentView`, `currentExpression`, `styleProfile`, `rigProfile`, `defaultView`, `variantGroup`, `zIndex`, `assetRoots`).
- **snake_case** pour les paramètres de calques/shapes/bones (héritage historique : `layer_id`, `shape_id`, `bone_id`, `t_ms`).

## 8. Ce que fait le moteur, pas l'agent

- Calcul des chaînes parent → enfant (FK).
- Cinématique inverse FABRIK (avec contraintes d'angle).
- Interpolation des keyframes avec courbe Bézier.
- Résolution des slots (choix de la variante visible).
- Rendu SVG puis PNG (resvg) puis MP4 (ffmpeg).
- Rejet des états incohérents.

L'agent **choisit l'intention**. Le moteur **calcule la mécanique** (règle #6 CLAUDE.md).

## 9. Où trouver la source de vérité

- Schémas : `docs/schemas/character.schema.json`, `docs/schemas/animation-clip.schema.json`, `docs/schemas/semantic-command.schema.json`.
- Exemples : `docs/examples/characters/*.json`.
- Règles conceptuelles : `docs/knowledge/*.md`.
- OpenAPI : `backend/openapi.json` (aussi servi à `/api/openapi.json`).
- Outils MCP source : `mcp-server/src/index.js`.
- Contrat de développement : `CLAUDE.md` à la racine.

## 10. Ce qui reste à venir (Phases 3–6)

- **Phase 3** : actions sémantiques haut niveau (`playAction("walk")`, `setPose("idle")`, `lookAt({x,y})`, `reach(target)`, `pickUp(objectId)`) — l'agent décrit l'intention, le moteur compose les keyframes.
- **Phase 4** : sprite clips (frame-by-frame déclenchés par action).
- **Phase 5** : rigs quadrupèdes et custom (via `rigProfile`).
- **Phase 6** : outils MCP de composition de scène complète (`compose_scene({ actors, decor, camera })`).
