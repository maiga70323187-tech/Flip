# Vérification d'exécution — 18 septembre 2026

Le fichier `TEST_RESULTS.txt` livré avec l'archive signalait trois points
**jamais exécutés**, faute d'avoir pu terminer `npm install` dans son
environnement d'origine. Ils ont tous été levés ici.

## Installation

```
npm install  →  168 paquets, 13 s
```

C'était le seul vrai blocage : l'installation aboutit sans erreur.

## Ce qui était déjà validé — reconfirmé

| Test | Résultat |
|---|---|
| `backend/tests/model.test.js` | 3 tests ✅ |
| `backend/tests/store.test.js` | 1 test ✅ |
| `frontend/tests/time.test.mjs` | 3 tests ✅ |
| `mcp-server/tests/tools.test.js` | 1 test ✅ |

## Ce qui n'avait jamais pu tourner — désormais vérifié

**1. `backend/tests/api.test.js`** (nécessitait Express/CORS/Multer) : passe.
Total : **9 tests, 0 échec**.

**2. Build Vite** : `vite v7.3.6`, 34 modules, `dist/assets/index.js` 227 Ko
(71 Ko gzip), construit en 963 ms.

**3. Démarrage réel du serveur MCP** (SDK `@modelcontextprotocol/sdk`),
poignée de main complète sur stdio :

```
initialize  → flipaclip-animation-agent v1.0.0, protocole 2024-11-05
tools/list  → 20 outils, conformes à la liste annoncée dans le README
tools/call  → preview_animation : 2 plans, 166 ms, 1080x1920
tools/call  → create_frame : frame créée via le pont MCP → API HTTP
```

## Scénario complet sur l'API

Backend démarré sur le port 8787, enchaînement réel :

| Appel | Résultat |
|---|---|
| `POST /api/projects` | 201 — 1080×1920, 12 i/s (le format 9:16 est bien le défaut) |
| `POST /api/generate/character` | 201 — manifeste d'asset (mode mock) |
| `POST .../frames` puis `.../elements` | 201, 201 |
| `PATCH .../elements/:id` | 200 — x=540, rotation=15, scale=1.4 |
| `POST .../duplicate` | 201 — les éléments sont repris dans la copie |
| `GET .../preview` | 200 — timeline correcte, durées cumulées justes |
| `POST .../export` | 201 — manifeste écrit dans `output/exports/` |
| `PATCH` avec `scale: -3` | **400 — « scale must be > 0 »** : la validation fonctionne |
| `PUT .../frames/reorder` | 200 |

## Interface React

Servie à partir du build, testée dans Chromium : le projet est listé et
chargé, le plan de travail 9:16 s'affiche, le formulaire d'élément et la
frise (3 frames, bouton Dupliquer) répondent. **Aucune erreur JavaScript.**
Capture : `docs/capture-interface.png`.

## Deux manques structurels

Ils ne sont pas des défauts du code, mais des fonctions absentes du projet.
Ils empêchent aujourd'hui d'obtenir une vidéo.

**1. Aucune image n'est réellement produite.** `generateAsset()` est en mode
mock : il écrit un manifeste JSON et renseigne `image_ref` avec le chemin de
ce `.json`. Le canvas tente donc d'afficher un fichier JSON comme image — d'où
l'icône d'image cassée sur la capture. Il faut brancher un fournisseur
d'images pour que quoi que ce soit devienne visible.

**2. `export_animation` n'exporte pas de vidéo.** La route écrit un
manifeste JSON contenant `requested_format: "mp4"` ; aucun encodage n'a lieu.
Le projet s'arrête donc exactement là où s'arrêtait Expressive Animator :
au descriptif de l'animation, sans fichier diffusable.

La chaîne d'encodage manquante existe déjà dans ce dépôt, testée et
fonctionnelle : `expressive-export/` et `expressive-studio/` produisent du
MP4 (WebCodecs), du PNG et des séquences PNG. Les raccorder à
`previewManifest()` est la suite logique.

## Pour relancer ces vérifications

```bash
cd flipaclip-animation-mcp
npm install
npm run validate
npm test
npm run dev:backend      # port 8787
npm run dev:frontend     # port 5173
npm run start:mcp        # serveur MCP sur stdio
```
