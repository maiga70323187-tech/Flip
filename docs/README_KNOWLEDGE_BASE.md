# Flip — Base de connaissances 2D pour agents IA

Cette base transforme des références visuelles de personnages 2D (turnaround, cut-out, expressions, sprites de course, personnages humains et animaux) en règles explicites qu'un agent LLM peut appliquer de façon fiable.

## But
Empêcher l'agent de "dessiner un personnage" avec quelques rectangles/ellipses/traits sans structure, et lui imposer un pipeline professionnel :

**Character Asset → Parts → Slots → Rig → Pose → Clip → Action sémantique → Rendu**

## Important
Cette base ne modifie aucun code par elle-même. Elle est conçue pour être copiée dans le dépôt Flip, puis lue par Claude Code ou un autre agent.

## Ordre de lecture
1. `CLAUDE.md`
2. `knowledge/00_CORE_PRINCIPLES.md`
3. `knowledge/01_CHARACTER_MODEL.md`
4. `knowledge/02_PART_DECOMPOSITION.md`
5. `knowledge/03_VIEWS_AND_TURNAROUNDS.md`
6. `knowledge/04_RIGGING_AND_PIVOTS.md`
7. `knowledge/05_LAYERING_AND_ZORDER.md`
8. `knowledge/06_EXPRESSIONS_AND_FACES.md`
9. `knowledge/07_SPRITE_AND_CUTOUT_MODES.md`
10. `knowledge/08_ANIMATION_RULES.md`
11. `knowledge/09_HUMANOID_RULES.md`
12. `knowledge/10_QUADRUPED_RULES.md`
13. `knowledge/11_STYLE_CONSISTENCY.md`
14. `knowledge/12_AI_AGENT_CONTRACT.md`
15. `knowledge/13_FLIP_INTEGRATION_NOTES.md`

## Principe fondamental
Les primitives géométriques sont acceptables pour :
- debug,
- guides,
- décor simple,
- placeholders temporaires.

Elles ne constituent pas un personnage final professionnel.
