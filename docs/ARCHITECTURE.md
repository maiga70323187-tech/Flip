# Architecture

## 1. Principe central
Chaque frame est un conteneur d'éléments, pas une image aplatie. Les transformations sont stockées en données et peuvent être modifiées par l'interface ou par MCP.

## 2. Composants
- **frontend** : React/Vite, canvas DOM 2D, timeline et formulaire d'éléments.
- **backend** : Express, routes CRUD, stockage JSON, assets locaux, preview/export de manifestes.
- **mcp-server** : pont entre un agent IA et l'API HTTP du backend.
- **input/output** : exemple complet "requin" avec audio, transcription, storyboard et rendus disponibles.

## 3. Flux
1. création/chargement d'un projet ;
2. création ou duplication de frames ;
3. ajout d'éléments réutilisables ;
4. transformations x/y/rotation/scale ;
5. gestion des calques ;
6. synchronisation audio ;
7. preview ;
8. export.

## 4. Persistance
Un fichier JSON par projet sous `backend/data/projects/`. Les écritures utilisent un fichier temporaire suivi d'un rename afin de réduire le risque de corruption.
