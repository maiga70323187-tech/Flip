# Packs d'assets vectoriels — installation et branchement

Ce dossier héberge les **packs de dessins vectoriels** qui alimentent
les personnages Flip. Un pack = un dossier de SVGs, un SVG par partie
du corps, nommé selon le slot du rig humanoïde.

## Structure attendue

```
docs/asset-packs/
├── <mon-pack>/
│   ├── manifest.json
│   ├── default/                 (variante par défaut)
│   │   ├── head.svg
│   │   ├── hair_front.svg
│   │   ├── hair_back.svg
│   │   ├── neck.svg
│   │   ├── torso.svg
│   │   ├── pelvis.svg
│   │   ├── upperArm_L.svg
│   │   ├── upperArm_R.svg
│   │   ├── forearm_L.svg
│   │   ├── forearm_R.svg
│   │   ├── hand_L_open.svg
│   │   ├── hand_R_open.svg
│   │   ├── hand_R_fist.svg    (optionnel — variantes de main)
│   │   ├── hand_R_point.svg   (optionnel)
│   │   ├── thigh_L.svg
│   │   ├── thigh_R.svg
│   │   ├── shin_L.svg
│   │   ├── shin_R.svg
│   │   ├── foot_L.svg
│   │   └── foot_R.svg
│   └── happy/                   (variante « happy » : mêmes noms de fichiers, autres dessins)
│       └── ...
```

## `manifest.json`

```json
{
  "id": "mon-pack",
  "name": "Mon Pack de démo",
  "license": "CC0",
  "attribution": "Auteur / source",
  "variants": {
    "default": {},
    "happy": {}
  },
  "notes": "Style flat vectoriel, ~7 têtes"
}
```

## Où trouver des packs libres

- **Open Peeps** (Pablo Stanley, CC0) — https://www.openpeeps.com/
  téléchargeables en SVG, à découper par part et renommer selon nos slots.
- **Humaaans** (Pablo Stanley, CC0) — https://www.humaaans.com/
- **unDraw** (Katerina Limpitsouni, MIT) — https://undraw.co/ — plus
  illustration que personnage, mais réutilisable pour décors.
- **Open Doodles** (CC0) — https://opendoodles.com/
- **Kawaii SVG** (MIT) — https://kawaii.email/

Une fois le pack téléchargé, extrayez chaque partie du corps dans un
SVG séparé nommé selon la table ci-dessus, ajoutez un `manifest.json`
et déposez le dossier ici. C'est tout.

## Utilisation

Côté HTTP :

```bash
GET  /api/asset-packs                                # liste des packs
GET  /api/asset-packs/mon-pack?variant=default       # inspecte un pack
POST /api/projects/:id/characters/:cid/apply_pack
     { "pack": "mon-pack", "variant": "default" }
```

Côté MCP (agent IA) :

```
list_asset_packs()
get_asset_pack_info(pack: "mon-pack")
attach_asset_pack(project_id, character_id, pack: "mon-pack", variant: "default")
```

L'appel renvoie `{ attached: ["head", "torso", …], missing: [] }` pour
que l'agent sache ce qui manque et complète manuellement si besoin.

## Conseil pour convertir un pack existant

Ouvrez la source (Sketch, Figma, ou SVG monolithique) dans Inkscape ou
un éditeur SVG. Découpez chaque partie du corps sur un canvas propre.
Placez le point d'ancrage (pivot) au bon endroit selon
`docs/knowledge/04_RIGGING_AND_PIVOTS.md` :

- Tête : bas au niveau du cou
- Bras haut : haut au niveau de l'épaule
- Bras avant : haut au niveau du coude
- Main : haut au niveau du poignet
- Cuisse : haut au niveau de la hanche
- Tibia : haut au niveau du genou
- Pied : côté extérieur au niveau de la cheville

Exportez chaque part en SVG minimal (sans styles superflus, viewBox
serré à la forme). Renommez selon la table.
