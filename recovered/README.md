# FlipaClip Animation agent IA MCP — Requin

Projet généré à partir de l'artifact Claude :
https://claude.ai/artifact/BrFaULDkC9L4oqX2ZCmLhi

## Contenu
- `storyboard.json` : les 25 plans structurés, avec timecodes, voix off, prompts image/vidéo, alternative AnimeEffects et montage.
- `mcp_execution_plan.json` : séquence d'actions destinée à l'agent FlipaClip/MCP.
- `README.md` : notes d'utilisation.

## Paramètres
- Format : 9:16
- Durée : 83 s
- Plans : 25
- FPS de travail : 12, configurable. Cette valeur n'était pas indiquée dans l'artifact.

## Architecture
Le projet suit le principe Frame/Element prévu dans le document de conception :
chaque frame/scène est composée d'éléments réutilisables (personnage, objet, décor)
avec position, rotation, échelle et ordre de calque.

## Important avant rendu final
Les plans 16, 18, 19 et 20 comportent des chiffres que l'artifact lui-même signale comme
à corriger ou à nuancer. Ils sont marqués dans `storyboard.json`.

## Mapping MCP
Le fichier `mcp_execution_plan.json` utilise des actions de haut niveau correspondant à la
boîte à outils prévue : génération, création de scènes/frames, mouvement, montage,
synchronisation audio, prévisualisation et export. Certaines actions comme `create_scene`,
`reuse_scene_assets`, `animate_scene` et `apply_montage` sont des macros d'orchestration :
elles devront être traduites par l'agent en appels élémentaires (`create_frame`,
`duplicate_frame`, `move_element`, `rotate_element`, `scale_element`, etc.) selon
l'implémentation réelle du serveur MCP.

## Cohérence visuelle
Avant génération des images, remplacer `[STYLE]` par une définition de style globale
et verrouillée. Les tokens `[REQUIN]` et `[HUMAIN]` doivent référencer des assets persistants
pour éviter les variations d'apparence entre les plans.
