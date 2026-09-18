# Expressive Studio

Éditeur d'animation vectorielle 2D complet, dans **un seul fichier HTML autonome**.
Aucune installation, aucune dépendance réseau : ouvrir `expressive-studio.html`
dans Chrome ou Edge, dessiner, animer, exporter.

C'est la reconstruction en HTML d'[Expressive Animator](https://github.com/gqshell/ExpressiveAnimator),
dont le dépôt public n'est pas exécutable — son moteur de rendu
(`@zindex/canvas-engine`, `@zindex/skia-js`) n'est pas distribué — et ne
comporte aucune fonction d'export.

## Fonctionnalités

**Dessin**
- Outils : sélection, main, rectangle, ellipse, étoile, polygone régulier, texte, zoom
- Déplacement, redimensionnement par 8 poignées, rotation par poignée dédiée
- Sélection multiple au clic, au Maj+clic et au lasso
- Grille et magnétisme, zoom à la molette, ajustement à la fenêtre

**Organisation**
- Arbre des calques : renommer, masquer, verrouiller, réordonner
- Groupes : grouper, dégrouper (la transformation du groupe est reportée sur les enfants)
- Dupliquer, supprimer, annuler et rétablir (60 niveaux)

**Propriétés**
- Transformation : position, ancrage, échelle, rotation, inclinaison, opacité
- Apparence : fond, contour, épaisseur, opacité de couleur
- Formes : dimensions, arrondi des coins, nombre de côtés, rayons interne et externe
- Texte : contenu, police, corps, graisse, alignement

**Animation**
- Un losange à droite de chaque propriété la rend animable
- **Mode enregistrement** : toute modification pose automatiquement une clé,
  exactement comme `AnimationMiddleware.setElementProperty` du dépôt d'origine
- Frise chronologique : clés déplaçables, sélection multiple, suppression,
  cinq courbes d'accélération, zoom, tête de lecture
- Lecture, boucle, déplacement image par image (touches `,` et `.`)

**Fichiers et export**
- Enregistrement et ouverture au format **`.eaf`** du projet d'origine
- **MP4** (WebCodecs, H.264 prioritaire), **PNG**, **séquence PNG en ZIP**
- Repli automatique en WebM si aucun encodeur MP4 n'est disponible

## Raccourcis

| Touche | Action | Touche | Action |
|---|---|---|---|
| `V` `H` `R` `E` `S` `P` `T` `Z` | Outils | `Ctrl+Z` / `Ctrl+Y` | Annuler / Rétablir |
| `Espace` | Lecture / Pause | `Ctrl+S` | Enregistrer en .eaf |
| `Suppr` | Supprimer (clés ou éléments) | `Ctrl+D` | Dupliquer |
| `,` / `.` | Image précédente / suivante | `Ctrl+G` / `Ctrl+Maj+G` | Grouper / Dégrouper |
| Flèches | Déplacer (Maj = 10 px) | `Ctrl+0` / `Maj+0` | Zoom 100 % / Ajuster |

## Ce qui est repris du dépôt d'origine

Porté depuis Expressive Animator (Apache-2.0, © 2021 Zindex Software) :

| Fichier d'origine | Usage ici |
|---|---|
| `Core/Animation/Animation.ts`, `Keyframe.ts` | modèle de clés et lecture d'une valeur à un instant |
| `Core/Animation/Interpolation.ts` | interpolation par type (nombre, point, couleur, pinceau, rayons) |
| `Core/Animation/Animators/` | table des propriétés animables par type d'élément |
| `Core/Project/AnimationMiddleware.ts` | mode enregistrement (pose automatique de clés) |
| `Core/Project/Exporters` et `Importers` | format de fichier `.eaf`, lecture **et** écriture |

Trois ajouts, absents du dépôt d'origine et sans lesquels l'outil serait inutilisable :

- **Courbes d'accélération** — l'original ne déclare qu'une interface `Easing` vide.
- **Images par seconde** — le modèle d'origine ne connaît que les millisecondes ;
  sans cadence, aucun export vidéo n'est possible.
- **Toute la chaîne d'export**, inexistante dans le dépôt public.

Le rendu (Canvas 2D), les outils d'édition et l'interface sont des
implémentations indépendantes.

## Limites connues

- **Le rendu n'est pas celui du moteur d'origine.** Formes, transformations,
  contours, textes et dégradés importés sont couverts ; masques, symboles,
  modes de fusion et arrondis de coins des polygones ne le sont pas.
- **Pas d'outil plume** : les tracés de Bézier importés d'un `.eaf` s'affichent,
  mais ne peuvent pas être dessinés ni modifiés ici.
- **Les fichiers `.eaf` écrits ici n'ont jamais été relus par l'application
  d'origine** — elle ne peut pas s'exécuter. Ils respectent son format octet
  pour octet, et l'aller-retour interne est vérifié comme strictement identique.
- **Trois conventions restent des hypothèses**, signalées en commentaire, car
  elles vivent dans le moteur non publié : couleurs encodées en ARGB,
  poignées de Bézier relatives au nœud, ordre des énumérations de contour.
- **Transparence** : conservée en PNG, pas en MP4 (le H.264 ne la gère pas).
- **Pas de son** : les animations Expressive n'en comportent pas.

## Tests

```bash
node tests/run-tests.js      # Playwright + Chromium
```

Résultat sur l'environnement de développement : **30 tests réussis, 0 échec** —
démarrage, dessin des quatre formes à la souris, déplacement, redimensionnement
(valeur comparée au calcul attendu), rotation, lasso, annuler/rétablir,
pose de clés, interpolation, mode enregistrement, glissement de clé,
tête de lecture, lecture, groupes, panneaux, écriture et réouverture `.eaf`,
exports MP4 / ZIP / PNG, et relecture de la vidéo produite par le navigateur.

Réserve : le Chromium de test est compilé **sans H.264**. La chaîne MP4 est donc
validée de bout en bout via VP9 dans un conteneur MP4. Sur Chrome ou Edge de
bureau, H.264 est retenu en premier.

## Licences

- Portions portées d'Expressive Animator : Apache License 2.0, © 2021 Zindex Software.
- [mp4-muxer](https://github.com/Vanilagy/mp4-muxer) 5.2.1 (MIT), intégré au
  fichier pour un fonctionnement hors ligne.
