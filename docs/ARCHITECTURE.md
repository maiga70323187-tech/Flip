# Architecture Flip

## 1. Principe central

Une scène n'est pas une image aplatie : c'est un arbre de **calques** contenant des **formes** vectorielles ou des **frames** rasterisées. Chaque forme porte des **tracks** (une liste de keyframes par propriété animée). Le rendu à un instant `t` interpole ces tracks avec l'easing demandé, sans jamais faire appel à un modèle externe.

## 2. Composants

- **backend/** — API HTTP (Express), stockage JSON par projet, service de rendu SVG (`services/render.js`), spec OpenAPI 3.1 (`openapi.json`).
- **frontend/** — React + Vite, canvas SVG en direct, timeline avec keyframes, panneau d'inspection.
- **mcp-server/** — Traduction stdio ↔ HTTP : expose tous les endpoints comme outils MCP typés (Zod).

## 3. Modèle de données

```
Project { id, name, width, height, fps, duration_ms, background, layers[], symbols[], assets[], audio_tracks[] }
Layer   { id, kind: "vector"|"raster", visible, opacity, ... }
  VectorLayer { shapes[], bones[] }
  RasterLayer { fps, frames[] }
Shape   { id, type, props, transform, style, tracks, parent_bone }
Bone    { id, name, parent_id, length, rotation, x, y }
Keyframe{ id, time_ms, value, easing }
```

## 4. Flux d'usage

1. l'agent (ou l'humain) crée un projet ;
2. il ajoute un ou plusieurs calques (vectoriel pour la composition, raster pour du dessin main) ;
3. il ajoute des formes ou des frames dessinées ;
4. il pose des keyframes sur les propriétés animables ;
5. il rend une frame à `t_ms` (SVG) ou obtient un manifeste complet ;
6. il exporte le projet en JSON ou en SVG à un instant donné.

## 5. Persistance

Un fichier JSON par projet dans `backend/data/projects/`. Les écritures passent par un fichier temporaire renommé (limite le risque de corruption). Les assets bitmap facultatifs sont stockés dans `backend/data/assets/` (uploads multipart).

## 6. Interopérabilité IA

- **MCP** (serveur `flip-animation-agent`, transport stdio) : Claude Desktop, Manus, tout client MCP compatible.
- **OpenAPI 3.1** (`backend/openapi.json`) : ChatGPT Actions, Manus HTTP, curl, tout SDK OpenAPI.

Les deux surfaces adressent les **mêmes** capacités : ce qu'un agent peut faire via MCP, il peut le faire via HTTP.
