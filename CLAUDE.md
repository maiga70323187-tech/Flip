# CLAUDE.md — Contrat de développement Flip

Toute session qui modifie le moteur de personnages, le rigging, l'animation,
le rendu, la timeline ou le MCP DOIT lire d'abord :

1. `docs/README_KNOWLEDGE_BASE.md`
2. `docs/knowledge/00_CORE_PRINCIPLES.md` → `12_AI_AGENT_CONTRACT.md`
3. `docs/knowledge/13_FLIP_INTEGRATION_NOTES.md`
4. `docs/schemas/*.schema.json`
5. `docs/examples/characters/*.json`

## Règles non négociables

1. Un personnage est une entité structurée (`Character`), pas un groupe
   arbitraire de shapes.
2. Les parties du corps sont nommées sémantiquement et reliées à un rig
   (`humanoid`, `quadruped`, `custom`) ou à un système de sprites.
3. Les pivots correspondent aux articulations réelles.
4. Les transformations parent/enfant sont calculées par le moteur, pas
   par l'agent.
5. Les bras/jambes utilisent des contraintes d'angle et, si utile, de l'IK.
6. Les actions haut niveau (`walk`, `run`, `wave`, `lookAt`, `reach`,
   `sit`…) sont traduites par le moteur en poses/keyframes. L'agent
   choisit l'intention ; le moteur calcule la mécanique.
7. L'identité visuelle du personnage doit rester stable entre vues,
   poses, expressions et frames.
8. Les images de référence servent à déduire une grammaire visuelle,
   pas à être recopiées telles quelles.
9. Ne jamais masquer une capacité absente : renvoyer une erreur
   structurée (`UNKNOWN_CHARACTER`, `MISSING_VIEW`, `UNSUPPORTED_EXPRESSION`…)
   ou demander un asset.
10. Les primitives seules (ellipse + rect + line) ne doivent jamais
    être présentées comme un personnage professionnel final — elles
    servent au debug, aux guides, aux placeholders.
11. Pour les personnages non humains, utiliser un `rigProfile` adapté
    (`quadruped`, `custom`) au lieu de forcer un squelette humanoïde.
12. La base de connaissances ne modifie pas le code toute seule : à
    chaque évolution du moteur, valider les schémas et écrire un test
    minimal avant de coder.

## Architecture cible

```
LLM
 → MCP / API HTTP
 → Commandes sémantiques (playAction, setPose, lookAt, reach, setExpression, pickUp)
 → Character / Scene Engine
 → Rig / Sprite Clip
 → Animation Engine
 → Renderer (SVG / PNG / MP4)
```

## Migration progressive (à partir de la base actuelle)

L'existant (`Project`, layers vector/raster, shapes, bones, keyframes,
easing, FK/FABRIK, renderer SVG, export PNG/MP4, MCP) est conservé. On
ajoute au-dessus, phase par phase :

| Phase | Ajout                                                               |
|-------|---------------------------------------------------------------------|
| 1     | `characters[]` + import de personnages + rendu image                |
| 2     | `slots[]` + pivots + rig humanoïde                                  |
| 3     | `poses[]` + `clips[]` + actions sémantiques (`playAction`, `setPose`) |
| 4     | Sprite clips (frame-by-frame déclenchés par action)                 |
| 5     | Quadrupèdes + rigs custom                                           |
| 6     | Outils MCP sémantiques (`add_character`, `set_expression`, …)       |

Voir `docs/knowledge/13_FLIP_INTEGRATION_NOTES.md` pour le détail.

## Discipline d'implémentation

Avant de coder :
- identifier le modèle de données concerné ;
- valider les schémas de `docs/schemas/` ;
- conserver la compatibilité avec l'existant si possible ;
- écrire un test minimal ;
- éviter les hacks purement visuels.

Après avoir codé : commit avec un message qui référence la phase et le
document de la KB appliqué.
