# Spécification de style — cartoon vectoriel plat (kit character)

Extrait des références déposées par l'utilisateur dans ce dossier.

## Ce que ces kits ont en commun

- **Style** : vectoriel plat, aplats de couleurs, contour SOUPLE de 1,5–2 px maxi.
- **Proportions** : ~7 têtes de haut (adulte moderne, silhouette réaliste sans être photoréaliste).
- **Épaules** : nettement plus larges que la taille. Chez la femme, environ 1,3× la largeur de la taille.
- **Taille** : cintrée, marquée.
- **Hanches** : chez la femme, une courbe visible qui s'évase depuis la taille.
- **Cuisses** : galbées, plus larges au haut, se resserrent vers le genou.
- **Molets** : légèrement dessinés avec une petite courbe extérieure.
- **Chaussures** : forme de basket ou ballerine avec semelle blanche visible, contour du soulier différencié.
- **Mains** : petites, doigts souvent groupés en silhouette simple (pas 5 doigts détaillés à cette échelle).
- **Visage** : yeux ronds mais pas énormes (~1/6 de la largeur du visage), sourcils épais, nez très discret (souvent une seule courbe ou juste une ombre), bouche fine.
- **Cheveux** : volumineux, coupe distincte selon le personnage, boucles/afro dessinés en amas globuleux plutôt qu'en mèches individuelles.

## Palette de la référence #4 (femme afro coupe courte, chemise blanche)

C'est la référence la plus proche du personnage-test « Awa » qu'on avait décidé.

- Peau : `#7b4b32` (base) · `#5d3623` (ombre)
- Cheveux : `#3a2416` (base) · `#1c110a` (ombre)
- Chemise (blanche cassée) : `#f4f0ea` (base) · `#c8bfb0` (ombre)
- Col chemise (V-neck) : `#dcd4c4`
- Pantalon (anthracite) : `#242426` (base) · `#111112` (ombre)
- Contour général : `#231610` (brun très foncé, PAS noir pur)

## Anatomie normalisée (femme adulte, ~7 têtes)

Prenons une tête de 100 px. Le personnage total fait ~700 px.

| Segment | Longueur (px) | % du total |
|---|---|---|
| Tête | 100 | 14 % |
| Cou | 25 | 3 % |
| Torse + hanches | 200 | 29 % |
| Cuisse | 155 | 22 % |
| Tibia | 155 | 22 % |
| Pied (hauteur) | 40 | 6 % |
| Épaule (largeur) | 130 | — |
| Taille (largeur) | 90 | — |
| Hanches (largeur) | 115 | — |
| Bras (haut) | 145 | 21 % |
| Avant-bras | 130 | 19 % |
| Main | 35 | 5 % |

## Points de contact clés

- Épaule = à l'intersection torse-bras, plus large qu'un rond simple : forme trapézoïdale douce.
- Coude = point de bascule visible du bras : le SVG du haut du bras se termine, l'avant-bras commence légèrement décalé.
- Genou = idem, cuisse et tibia se rencontrent à un « genou ovale » à peine plus large.
- Cheville = fine, le pied s'écarte perpendiculairement pour former la basket.

## Ce que mes fonctions Bézier actuelles ratent

1. Torse : trop rectangulaire, pas de courbe taille/hanche.
2. Bras : rectangles arrondis, pas de renflement biceps ni de tapered avant-bras.
3. Jambes : rectangles droits, pas de galbe cuisse ni de courbe molet.
4. Cheveux : nuage globuleux au lieu d'une coupe reconnaissable.
5. Visage : yeux et bouche mal proportionnés par rapport au reste.
6. Mains : blob indistinct au lieu d'une silhouette main-doigts stylisée.

## Deux voies possibles pour atteindre le niveau des références

### Voie A — Ré-écrire chaque fonction de dessin **avec beaucoup plus de soin**

Long. Chaque part demande 30–50 lignes de path Bézier soigneusement placé. Itération visuelle avec l'utilisateur, une part à la fois. Plafond : je code des paths mais je ne « dessine » pas — il y aura toujours un côté rigide.

Temps estimé : 6–10 itérations par part × 20 parts = beaucoup d'allers-retours.

### Voie B — Utiliser DIRECTEMENT les kits de référence comme assets

L'utilisateur ou moi extrait les parts (SVG ou PNG découpé) depuis les images de référence, on les branche sur `assetRoots`. Le moteur compose. Aucun dessin procédural.

Avantage : résultat = qualité des références, immédiatement.
Contrainte : ces images sont probablement sous licence (Freepik / autres). Il faut soit les acheter, soit dessiner soi-même dans le même style, soit utiliser des packs libres (unDraw, Humaaans, open peeps).

### Voie C — Compromis : Procédural amélioré + gabarits libres

Je continue à améliorer mon générateur procédural (ça sert quand même : rig prêt, animations retargetables), mais on ajoute au dépôt un **loader de packs libres** (Humaaans, Open Peeps) qui vient remplacer les parts procédurales quand un pack est présent.

Le générateur procédural devient le « placeholder debug qualité correcte », les packs libres deviennent le rendu final.

## Recommandation

**Voie C**. On garde le procédural comme base d'animation/tests et on branche progressivement des vraies parts vectorielles depuis Open Peeps ou Humaaans (deux banques MIT/CC0). L'agent IA en tire deux bénéfices :

1. Il peut appeler `build_procedural_character` pour tester une animation vite.
2. Il peut appeler `attach_asset_pack(pack: "open-peeps", variant: "curly-afro-woman")` pour un rendu pro.

Le procédural sera toujours moins joli que les références — c'est un fait technique. On l'accepte et on ajoute la voie « vraies parts ».
