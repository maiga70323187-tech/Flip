# 08 — Règles d'animation

## Interpolation
Support minimal :
- linear
- easeIn
- easeOut
- easeInOut
- cubicBezier
- hold/step

Les mouvements organiques ne doivent pas utiliser `linear` par défaut.

## Principes
Selon le style :
- anticipation
- arcs
- ease in/out
- overlap
- follow-through
- secondary motion
- overshoot mesuré
- squash/stretch uniquement si cohérent avec le style

## Marche
Phases structurantes :
1. contact
2. down
3. passing
4. up

## Course
Ne pas transformer une marche en course en augmentant seulement la vitesse.
Ajouter :
- inclinaison,
- amplitude,
- phase aérienne,
- cadence propre.

## Wave
- lever le bras
- stabiliser épaule/coude
- osciller avant-bras/main
- 2 à 4 cycles
- ease-in/ease-out

## Reach
Utiliser IK vers une cible.

## PickUp
`reach → contact → attach prop → retract/lift`

## Blink
Fermeture rapide, très court maintien, ouverture légèrement plus lente.
