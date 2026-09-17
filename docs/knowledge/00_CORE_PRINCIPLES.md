# 00 — Principes fondamentaux

## A. Identité avant mouvement
Un personnage doit d'abord être défini comme une identité visuelle stable : silhouette, proportions, visage, coiffure, vêtements, palette, accessoires, style de contour et d'ombrage.

L'animation ne doit jamais altérer cette identité sans commande explicite.

## B. Deux familles d'animation à supporter
1. **Cut-out / skeletal** : corps découpé en pièces reliées par bones et pivots.
2. **Sprite / frame-by-frame** : séquence de dessins complets ou partiels.

Flip doit supporter les deux. Une action sémantique peut être implémentée par l'une ou l'autre.

## C. Le moteur est responsable de la mécanique
L'agent ne doit pas produire des dizaines d'angles arbitraires quand une action peut être résolue par :
- pose,
- IK,
- clip,
- interpolation,
- contrainte.

## D. Le personnage final ne doit pas être une approximation de debug
Un rendu avec tête ellipse + torse rectangle + bras ligne est un prototype mécanique, pas un personnage final.

## E. La référence visuelle doit être traduite en règles
Une planche de turnaround ou de sprites est interprétée en:
- vues,
- proportions,
- parties,
- pivots,
- poses,
- expressions,
- clips,
- style.
