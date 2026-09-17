# 07 — Cut-out, sprite et hybride

## Cut-out
Utiliser quand :
- le personnage est composé de membres séparés;
- on veut réutiliser le même dessin;
- l'IK apporte de la valeur;
- les mouvements sont continus.

## Sprite
Utiliser quand :
- l'action repose sur des poses dessinées spécifiques;
- la silhouette varie beaucoup;
- l'effet recherché est frame-by-frame;
- course/saut/attaque stylisée.

## Sprite clip
Un sprite clip contient :
- frames ordonnées,
- durée par frame ou FPS,
- loop,
- anchor/root offset,
- events optionnels.

## Hybride
Un personnage peut marcher en cut-out et courir via sprite sheet.
La commande IA reste la même :
`playAction(character, "run")`

Le Character Engine choisit le backend du clip.
