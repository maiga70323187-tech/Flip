# 13 — Notes d'intégration spécifiques à Flip

Cette base est conçue pour l'architecture actuelle de Flip : layers, shapes, bones, keyframes, renderer SVG, frontend React et MCP.

## Ce qui peut être conservé
- `Project`
- vector/raster layers
- keyframes
- easing
- FK
- FABRIK
- SVG renderer
- PNG/MP4 export
- API/MCP
- paths Bézier

## Ce qui manque conceptuellement
Ajouter progressivement :
- `characters[]`
- `parts[]`
- `slots[]`
- `views{}`
- `poses{}`
- `clips{}`
- `expressions{}`
- `capabilities{}`
- `rigProfile`

## Pont avec les shapes
Une `Part` peut référencer une shape existante ou un asset image/SVG.
Le personnage orchestre ces shapes; il ne remplace pas forcément immédiatement le modèle existant.

## Rendu image
Le type `image` doit être réellement supporté par :
- frontend renderer,
- backend SVG renderer,
- asset resolver.

## Timeline
Afficher les tracks de bones en plus des tracks de shapes.

## MCP
Conserver les outils bas niveau en mode expert, mais ajouter une couche sémantique :
- `add_character`
- `get_character_capabilities`
- `set_pose`
- `play_action`
- `look_at`
- `reach`
- `pick_up`
- `set_expression`

## Stratégie de migration
Phase 1 : modèle Character + import assets + image rendering.
Phase 2 : slots/pivots + rig humanoïde.
Phase 3 : actions/poses/clips.
Phase 4 : sprite clips.
Phase 5 : quadrupèdes/custom rigs.
Phase 6 : outils MCP sémantiques.
