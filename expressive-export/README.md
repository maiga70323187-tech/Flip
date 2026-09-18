# Expressive Export

Banc de rendu et d'export **MP4 / PNG** pour les animations d'[Expressive Animator](https://github.com/gqshell/ExpressiveAnimator).

Un fichier HTML autonome : aucune installation, aucune dépendance réseau.
Ouvrir `expressive-export.html` dans Chrome ou Edge, et exporter.

## Pourquoi cet outil

Le dépôt Expressive Animator **ne contient aucune fonction d'export image ou vidéo** :
son unique exportateur écrit le fichier projet `.eaf`, et la seule restitution
disponible est la prévisualisation à l'écran. Il n'est d'ailleurs pas exécutable
en l'état, son moteur de rendu (`@zindex/canvas-engine`, `@zindex/skia-js`)
n'étant pas publié sur npm.

Cet outil comble ce manque : il reprend le modèle d'animation du projet, le rend
avec Canvas 2D et produit des fichiers diffusables.

## Ce qu'il fait

| Sortie | Détail |
|---|---|
| **MP4** | WebCodecs, H.264 en priorité, puis VP9 ou AV1 dans le conteneur MP4 |
| **PNG** | Image isolée à l'instant courant |
| **Séquence PNG** | Toutes les images d'un intervalle, dans une archive ZIP |
| **WebM** | Repli automatique si aucun encodeur MP4 n'est disponible |

Réglages : images par seconde (12 à 60), résolution (25 % à 200 %), débit,
couleur de fond ou transparence, intervalle de temps à exporter.

L'encodage est fait **image par image**, pas par capture temps réel : la cadence
est donc exacte, indépendamment de la puissance de la machine.

## Sources

- **Démo enrichie** : scène de démonstration intégrée (formes, texte, dégradé).
- **Projet de test du dépôt** : port fidèle de `src/doc1.ts`.
- **Fichier `.eaf`** : ouverture d'un projet Expressive Animator réel.

## Ce qui est repris du dépôt d'origine

Porté depuis Expressive Animator (Apache-2.0, © 2021 Zindex Software) :

| Fichier d'origine | Usage ici |
|---|---|
| `src/Core/Animation/Animation.ts` | classe `Animation`, lecture d'une valeur à un instant |
| `src/Core/Animation/Keyframe.ts` | structure des keyframes |
| `src/Core/Animation/Interpolation.ts` | fonctions d'interpolation (nombre, point, couleur, pinceau…) |
| `src/Core/Animation/Animators/` | table des propriétés animables par type d'élément |
| `src/Core/Project/Exporters/NativeAnimationExporter.ts` | schéma du format `.eaf` |
| `src/Core/Project/Importers/NativeAnimationImporter.ts` | lecture du conteneur `.eaf` |
| `src/doc1.ts` | scène de démonstration |

Deux ajouts par rapport à l'original :

- **Courbes d'accélération** : le dépôt d'origine ne déclare qu'une interface
  `Easing` sans aucune implémentation. Une Bézier cubique (façon CSS) est fournie ici.
- **Notion d'images par seconde** : absente du modèle d'origine, qui ne raisonne
  qu'en millisecondes. Sans elle, aucun export vidéo cadencé n'est possible.

Le rendu, lui, est une implémentation Canvas 2D indépendante — le moteur Skia
d'origine étant indisponible.

## Limites connues

- **Le rendu n'est pas celui du moteur d'origine.** Les formes, transformations,
  dégradés, contours et textes sont couverts ; les masques, symboles, modes de
  fusion et rayons de coin des polygones ne le sont pas. Un fichier complexe
  peut donc différer de ce qu'affiche l'application.
- **Le lecteur `.eaf` n'a jamais été confronté à un fichier produit par
  l'application réelle** — c'est impossible, elle ne peut pas s'exécuter. Il a été
  validé contre un fichier synthétique construit octet pour octet selon le format
  de `NativeAnimationExporter.ts`.
- **Trois conventions sont des hypothèses**, signalées en commentaire dans le code,
  car elles vivent dans le moteur non publié : couleurs encodées en ARGB
  (`parseColor`), poignées de Bézier relatives au nœud (`RELATIVE_HANDLES`),
  ordre des énumérations `lineCap` / `lineJoin`. Chacune se corrige en une ligne.
- **Pas de son** : les animations Expressive n'en comportent pas.
- **Transparence** : conservée en PNG, pas en MP4 (le H.264 ne la gère pas).

## Tests

```bash
node tests/make-eaf.js      # fabrique un .eaf de test
node tests/run-tests.js     # suite complète (Playwright + Chromium)
```

Résultat sur l'environnement de développement : **15 tests réussis, 0 échec** —
chargement sans erreur, rendu des deux démos, import `.eaf` avec vérification des
valeurs interpolées, export PNG, export ZIP, export MP4, puis relecture du MP4
par le navigateur (durée et dimensions conformes).

Une réserve : le Chromium de test est compilé **sans H.264**. La branche MP4 a
donc été validée de bout en bout via VP9 dans un conteneur MP4. Sur Chrome ou Edge
de bureau, où H.264 est présent, c'est ce codec qui sera retenu en premier.

## Licences

- Portions portées d'Expressive Animator : Apache License 2.0, © 2021 Zindex Software.
- [mp4-muxer](https://github.com/Vanilagy/mp4-muxer) 5.2.1 (MIT), intégré au fichier
  pour un fonctionnement hors ligne.
