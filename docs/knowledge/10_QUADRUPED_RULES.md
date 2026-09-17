# 10 — Règles quadrupèdes et animaux

Les références de chat montrent qu'il faut un modèle non humanoïde.

## Rig quadrupède minimal
```text
root
└── pelvis
    ├── spine_mid
    │   └── chest
    │       └── neck
    │           └── head
    ├── frontLeg_L
    ├── frontLeg_R
    ├── hindLeg_L
    ├── hindLeg_R
    └── tail_01
        └── tail_02
            └── tail_03
```

## Parties visuelles
Selon le style :
- head
- ears
- muzzle
- torso
- chest
- forelegs
- hindlegs
- paws
- tail segments

## Styles possibles
- low-poly / angulaire : formes polygonales, arêtes visibles, structure segmentée;
- chibi : grande tête, grands yeux, corps compact, membres courts.

Le même squelette logique peut avoir des proportions très différentes.

## Marche quadrupède
Les paires de membres ont des déphasages différents d'un bipède.
Ne jamais recycler directement un cycle de marche humanoïde.
