# FlipaClip Animation MCP — archive complète

Cette archive regroupe **tout ce qui a été retrouvé** du projet ainsi qu'un **MVP de code reconstruit** à partir du cahier d'architecture sauvegardé.

## Important : provenance

Les éléments réellement retrouvés sont conservés dans `recovered/` et `docs/` :
- archive originale du projet requin ;
- `storyboard.json` ;
- `mcp_execution_plan.json` ;
- cahier `plan-app-animation-ia.md` ;
- audio MiniMax et transcription SRT ;
- images générées disponibles dans la conversation.

Aucun code frontend/backend n'était présent dans l'archive d'origine. Les dossiers `backend/`, `frontend/` et `mcp-server/` ont donc été **reconstruits** conformément au plan sauvegardé : React + Vite, Node.js/Express, stockage JSON, modèle Frame/Element, outils MCP et tests.

## Arborescence

```text
FlipaClip_Animation_MCP_COMPLETE/
├── backend/              API Express + stockage JSON
├── frontend/             Interface React/Vite
├── mcp-server/           Serveur MCP exposant les outils d'animation
├── input/                audio, transcription, storyboard et assets d'entrée
├── output/               images/storyboards générés et exports
├── tests/                tests répartis dans les trois modules
├── docs/                 architecture et documentation
├── scripts/              validation et lancement des tests
└── recovered/            fichiers originaux retrouvés, non modifiés
```

## Démarrage

Prérequis : Node.js 20+ et npm.

```bash
npm install
npm run validate
npm test
npm run dev:backend
npm run dev:frontend
```

Dans un autre terminal :

```bash
npm run start:mcp
```

Backend par défaut : `http://localhost:8787`  
Frontend Vite : `http://localhost:5173`

## Modèle de données

Une frame contient des éléments indépendants. Un élément possède :
`id`, `type`, `image_ref`, `x`, `y`, `rotation`, `scale`, `layer_order`, `visible`.

Le même `image_ref` peut être réutilisé d'une frame à l'autre, ce qui permet à l'agent MCP de déplacer, faire pivoter, redimensionner ou masquer un élément sans régénérer toute l'image.

## Outils MCP inclus

- génération : `generate_character`, `generate_object`, `generate_background`
- timeline : `create_frame`, `duplicate_frame`, `delete_frame`, `reorder_frames`
- mouvement : `move_element`, `rotate_element`, `scale_element`
- calques : `create_layer`, `set_layer_order`, `toggle_layer_visibility`
- édition : `inpaint_region`
- effets : `add_transition`, `apply_effect`
- audio : `add_audio_track`, `sync_to_audio`
- sortie : `preview_animation`, `export_animation`

Les générations IA sont prévues comme adaptateurs. Sans clé/provider configuré, le backend fonctionne en mode **mock déterministe** et produit un manifeste d'asset au lieu d'appeler un service externe.
