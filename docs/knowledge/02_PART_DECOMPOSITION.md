# 02 — Décomposition en parties

## Humanoïde minimal
```text
head
neck
torso
pelvis
upperArm_L
forearm_L
hand_L
upperArm_R
forearm_R
hand_R
thigh_L
shin_L
foot_L
thigh_R
shin_R
foot_R
```

## Visage recommandé
```text
face_base
eye_L
eye_R
pupil_L
pupil_R
eyebrow_L
eyebrow_R
nose
mouth
ear_L
ear_R
hair_back
hair_front
```

## Règle des articulations
Les pièces adjacentes doivent se chevaucher légèrement autour du joint. Cela évite les trous visuels pendant la rotation.

## Variantes de pièces
Certaines parties peuvent avoir plusieurs assets :
- `hand_R_open`
- `hand_R_fist`
- `hand_R_point`
- `hand_R_hold`
- `mouth_smile`
- `mouth_open`
- `eyes_closed`

## Ne pas confondre
- Une pose de bras n'est pas forcément une nouvelle partie.
- Une vue latérale peut exiger une variante graphique complète.
- Un personnage assis n'est pas un nouveau personnage.
