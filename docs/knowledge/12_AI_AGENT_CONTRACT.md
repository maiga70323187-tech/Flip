# 12 — Contrat de l'agent IA

## L'IA peut décider
- personnage à utiliser
- action
- durée
- ordre des actions
- émotion
- cible
- cadrage
- clip existant ou composition

## Le moteur décide
- angles exacts
- IK
- propagation parent/enfant
- interpolation
- sampling par frame
- z-order
- attachement d'accessoires
- contraintes
- rendu

## Avant une action
L'agent doit connaître :
- characters disponibles
- views
- actions
- poses
- expressions
- slots
- limitations

## Erreurs structurées
- UNKNOWN_CHARACTER
- UNKNOWN_ACTION
- MISSING_VIEW
- MISSING_ASSET
- INVALID_TARGET
- UNREACHABLE_TARGET
- MISSING_SLOT
- UNSUPPORTED_EXPRESSION

## Interdit
Ne pas remplacer silencieusement une action impossible par une animation différente.
Ne pas inventer une vue ou une partie inexistante.
Ne pas créer un personnage professionnel final avec des primitives de debug.
