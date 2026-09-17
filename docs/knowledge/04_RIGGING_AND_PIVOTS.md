# 04 — Rigging, pivots et contraintes

## Humanoïde de base
```text
root
└── hips
    ├── spine
    │   └── chest
    │       ├── neck
    │       │   └── head
    │       ├── shoulder_L
    │       │   └── elbow_L
    │       │       └── wrist_L
    │       └── shoulder_R
    │           └── elbow_R
    │               └── wrist_R
    ├── hip_L
    │   └── knee_L
    │       └── ankle_L
    └── hip_R
        └── knee_R
            └── ankle_R
```

## Placement des pivots
- haut du bras : épaule
- avant-bras : coude
- main : poignet
- cuisse : hanche
- jambe : genou
- pied : cheville
- tête : base du cou

Le pivot ne doit pas être placé au centre arbitraire du bitmap.

## IK
Bras et jambes : chaîne 2-bones préférée pour les actions de cible.
Paramètres :
- root
- middle
- end effector
- target
- bend direction / pole
- joint limits

## Politique d'allongement
Par défaut : pas d'étirement des membres.
Si la cible est hors de portée, clamp au rayon maximal.

## Pieds
Pendant une phase d'appui d'une marche/course, le pied doit rester ancré au sol autant que possible.
