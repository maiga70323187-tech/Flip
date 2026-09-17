# 01 — Modèle conceptuel d'un personnage

```text
Character
├── identity
├── styleProfile
├── rigProfile
├── views
├── parts
├── slots
├── bones
├── constraints
├── expressions
├── poses
├── clips
└── capabilities
```

## identity
- id stable
- nom
- espèce/type : `human`, `quadruped`, `creature`, `objectCharacter`
- sexe/âge/style uniquement si nécessaires à la conception
- asymétries visibles
- accessoires permanents

## styleProfile
- ratio tête/corps
- épaisseur de contour
- palette
- degré de simplification
- type d'ombrage
- niveau de détail
- géométrie dominante : ronde, angulaire, low-poly, chibi, flat, semi-réaliste

## rigProfile
- `humanoid`
- `quadruped`
- `custom`
- `none` pour sprite pur

## capabilities
Exemples :
- `canWave`
- `canWalk`
- `canRun`
- `canSit`
- `canLookAt`
- `canBlink`
- `hasMouthShapes`
- `hasSideView`
- `supportsIKArms`
