# App d'animation connectée à une IA (type FlipaClip + MCP)

## Objectif

Une app d'animation où un agent IA, via un serveur MCP, peut faire **tout ce qu'un animateur humain ferait** dans l'app : générer des personnages/objets/décors, créer et organiser des frames, animer des mouvements, éditer visuellement des zones précises (inpainting), gérer des calques, ajouter du son, des transitions, et exporter.

## Principe d'architecture clé : timeline par éléments (pas par images statiques)

Pour que l'IA puisse déplacer, faire pivoter ou animer des objets dans le temps, chaque frame ne doit **pas** être une simple image fixe, mais une **liste d'éléments positionnés** :

```
Frame {
  id,
  elements: [
    { id, type: "character" | "object" | "background", image_ref, x, y, rotation, scale, layer }
  ]
}
```

Ça permet :
- de dupliquer une frame et ne modifier que la position d'un élément (mouvement)
- d'éditer un élément (inpainting) sans regénérer toute la frame
- d'ajouter/retirer des calques facilement

Si on part sur une simple séquence d'images plates, il faudra tout refaire dès qu'on voudra du mouvement — donc c'est la fondation à poser dès la Phase 1, même en MVP.

## Boîte à outils MCP visée (vue d'ensemble, pas tout en Phase 1)

- **Génération** : `generate_character`, `generate_object`, `generate_background`
- **Timeline** : `create_frame`, `duplicate_frame`, `delete_frame`, `reorder_frames`
- **Mouvement** : `move_element`, `rotate_element`, `scale_element`
- **Calques** : `create_layer`, `set_layer_order`, `toggle_layer_visibility`
- **Édition ciblée** : `inpaint_region` (généraliste : bouche, yeux, objet en main, etc.)
- **Effets** : `add_transition`, `apply_effect`
- **Son** : `add_audio_track`, `sync_to_audio`
- **Sortie** : `preview_animation`, `export_animation`

## Plan en 4 phases

**Phase 1 — Squelette technique avec architecture par éléments**
- App web (React + Vite), canvas de rendu qui affiche les éléments d'une frame (position/rotation/scale)
- Backend Node.js/Express, stockage simple (fichiers + JSON) avec le modèle Frame/Element ci-dessus
- Routes CRUD pour projets, frames, et éléments
- Lecture de la timeline (play à fps réglable)
- Pas d'IA encore : ajout d'éléments manuel (upload image + position)

**Phase 2 — Génération de contenu**
- Intégration API Gemini 2.5 Flash Image (gratuite, 500 img/jour)
- Endpoints `generate_character`, `generate_object`, `generate_background`
- Chaque génération devient un élément réutilisable sur plusieurs frames

**Phase 3 — Mouvement et édition ciblée**
- Endpoints `move_element` / `rotate_element` / `scale_element` (avec interpolation simple entre frames si besoin)
- `inpaint_region` généraliste (masque + prompt) pour modifier une zone d'un élément sans le regénérer entièrement
- Calques : ordre d'affichage, visibilité

**Phase 4 — Serveur MCP et orchestration IA**
- Envelopper tous les endpoints des Phases 1-3 comme outils MCP
- Connecter un agent IA qui reçoit une consigne ("anime un personnage qui marche et salue"), planifie une séquence d'appels d'outils, et produit l'animation complète
- Ajout son + export final (GIF/mp4)

## Prompt à utiliser pour démarrer le code (Phase 1)

```
Je construis le MVP d'une app d'animation frame-by-frame conçue pour être pilotée
par un agent IA via MCP (dans une phase ultérieure). L'agent devra pouvoir générer
des personnages/objets, les positionner, les animer (déplacement/rotation/échelle),
gérer des calques, et éditer des zones précises par inpainting.

Pour que ça soit possible plus tard, l'architecture des données doit être :
- Une Frame contient une liste d'Elements
- Un Element a : id, type (character/object/background), image_ref, x, y,
  rotation, scale, layer_order
- Les éléments peuvent être réutilisés (même image_ref) sur plusieurs frames
  avec des positions différentes

Construis uniquement la Phase 1 :
1. Frontend React + Vite :
   - Canvas qui rend les éléments d'une frame selon leur position/rotation/scale
   - Timeline en bas avec liste des frames, bouton "Play" (fps réglable)
   - Formulaire pour ajouter manuellement un élément (upload image + position x/y)
2. Backend Node.js/Express :
   - Modèle de données Frame/Element tel que décrit ci-dessus
   - Stockage simple en fichiers JSON (pas de DB pour le MVP)
   - Routes CRUD : projets, frames, elements

Ne code pas encore d'intégration IA ni MCP. Structure en /frontend et /backend,
avec instructions claires pour lancer les deux.
```

## Notes pour la suite

- Une fois la Phase 1 validée, on enchaîne sur la Phase 2 (génération Gemini)
- Le modèle Frame/Element est la décision d'architecture la plus importante du projet — c'est ce qui rend "tout ce qu'un animateur ferait" possible pour l'IA plus tard
