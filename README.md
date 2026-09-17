# Flip — Studio d'animation 2D pilotable par IA

**Objectif** : une app d'animation 2D style FlipaClip, **pilotée par un agent IA** (Claude, ChatGPT, Manus, tout client MCP ou OpenAPI), **sans aucun modèle externe** pour la génération d'images ou de vidéos. L'agent **compose** la scène à partir de primitives locales — il ne « génère » rien de visuel.

## Principe

- **Timeline hybride** : couches vectorielles (SVG paths, formes, rigging à os) **+** couches raster frame-by-frame.
- **Aucune dépendance IA externe** : pas de Gemini, DALL-E, MiniMax ou équivalent. Toutes les images sortent d'ici : formes primitives, chemins, keyframes, dessins de l'utilisateur.
- **Deux surfaces d'accès pour agents** :
  - **Serveur MCP** (`mcp-server/`) : compatible Claude Desktop et tout client MCP.
  - **API HTTP** (`backend/`) documentée en **OpenAPI 3.1** (`backend/openapi.json`) : compatible ChatGPT Actions, Manus, requêtes HTTP classiques.

## Architecture des données

Une **frame n'est pas une image aplatie**. C'est une composition vivante :

```
Project
├── layers[]
│   ├── kind: "vector"
│   │   ├── shapes[]  (type, props, transform, style, tracks: {property: keyframes[]})
│   │   └── bones[]   (rigging squelettique)
│   └── kind: "raster"
│       └── frames[]  (image dessinée + strokes, dessin FBF)
├── symbols[]      (formes réutilisables)
├── assets[]       (uploads bitmap facultatifs)
└── audio_tracks[]
```

Chaque **shape** possède ses `tracks` — un tableau de keyframes par propriété animée (`x`, `y`, `rotation`, `scale_x`, `scale_y`, `opacity`, `fill`, `stroke`, `stroke_width`, `d`). Le rendu à un instant `t_ms` interpole ces valeurs avec la courbe d'easing choisie.

## Outils MCP exposés

| Catégorie | Outils |
|---|---|
| Projets | `list_projects`, `create_project`, `get_project`, `update_project` |
| Calques | `add_layer` (vector/raster), `update_layer`, `delete_layer`, `reorder_layers` |
| Formes  | `add_shape`, `draw_path`, `update_shape`, `delete_shape`, `move_shape`, `rotate_shape`, `scale_shape` |
| Animation | `add_keyframe`, `tween_property` |
| Rigging | `add_bone`, `update_bone` |
| Frame-by-frame | `add_raster_frame` |
| Rendu / export | `render_frame_svg`, `get_manifest`, `export_project` |

Un agent peut, sans aucun modèle externe, dessiner un personnage à partir de paths SVG, l'assembler avec un rig d'os, poser des tweens sur ses articulations, et exporter le rendu.

## Démarrage

Prérequis : Node.js 20+.

```bash
npm install
npm run validate       # vérifie la structure du projet
npm test               # lance les tests des trois modules
npm run dev:backend    # API HTTP sur http://localhost:8787
npm run dev:frontend   # UI React sur http://localhost:5173
npm run start:mcp      # serveur MCP (stdio) pour les clients MCP
```

Exemple procédural : `node scripts/seed-example.mjs` crée un projet « balle qui rebondit » via l'API HTTP.

## Connecter un agent IA

- **Claude Desktop / Manus (MCP)** : configurer un serveur MCP `flip-animation-agent` pointant sur `node mcp-server/src/index.js`. Variable d'environnement : `FLIP_API_URL` si le backend n'est pas sur `http://localhost:8787`.
- **ChatGPT (Actions)** : importer `backend/openapi.json` dans un GPT personnalisé. Aucune clé n'est requise pour l'usage local.
- **Autres clients** : appeler l'API HTTP directement, en suivant l'OpenAPI.

## Base de connaissances personnages 2D

`docs/knowledge/` — 14 documents qui définissent ce qu'est un personnage
2D professionnel (identité, parties, vues, pivots, rigs, expressions,
poses, clips, contrat agent IA). `docs/schemas/` fournit les schémas
JSON validables (character, animation-clip, semantic-command).
`docs/examples/` fournit un humanoïde et un quadrupède complets.

Toute modification du moteur de personnages, du rigging, de l'animation
ou du MCP doit d'abord lire `CLAUDE.md` à la racine puis
`docs/knowledge/`. Voir aussi `docs/README_KNOWLEDGE_BASE.md`.

## Provenance

Le dossier `recovered/` conserve la version précédente (archive originale « requin » et plan d'architecture) telle que sauvegardée. Le dossier `input/` contient le storyboard, l'audio et la transcription initiaux. Le socle actif (`backend/`, `frontend/`, `mcp-server/`) a été **refondu** pour retirer toute dépendance à un modèle IA externe et mettre en place le moteur vectoriel + frame-by-frame décrit ci-dessus.

## Roadmap immédiate

- Éditeur de path SVG dans le frontend (pinceau, points de contrôle Bézier).
- Rig visualisé (os cliquables, poids sur les formes).
- Export **WebM/MP4** local via `canvas` côté serveur (headless) + `ffmpeg`, sans service tiers.
- Exports **Lottie** et **SVG animé** natifs.
- Bibliothèque de symboles vectoriels livrée avec l'app (facultative), pour accélérer l'agent sur des cas typiques (personnage debout, ombre au sol, panneau, arbre…).
