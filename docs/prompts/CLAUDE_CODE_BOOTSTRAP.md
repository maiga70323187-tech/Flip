# Prompt de démarrage pour Claude Code

Lis d'abord `CLAUDE.md`, puis tous les fichiers dans `knowledge/`, `schemas/` et `checklists/`.

Ensuite, audite le projet Flip existant sans réécrire tout le système.

Objectif : faire évoluer Flip d'un moteur générique de formes vers un moteur de personnages 2D structurés, tout en conservant autant que possible les couches, shapes, bones, keyframes, easing, renderer SVG, export et MCP déjà présents.

Commence par produire un tableau d'écarts entre l'existant et les spécifications, regroupé en :
1. Character model
2. Assets / image rendering
3. Parts / slots
4. Rig / pivots / IK
5. Views / expressions
6. Poses / clips
7. Timeline
8. Renderer
9. MCP semantic actions
10. Tests

Ne code pas immédiatement une refonte massive.

Premier jalon à implémenter seulement après l'audit :
- un `Character` réel,
- une vue front,
- des SVG/PNG de parties réelles,
- pivots corrects,
- attachement aux bones,
- IK d'un bras,
- une pose,
- un clip `wave`,
- une commande sémantique `play_action`.

Les rectangles, ellipses et lignes ne doivent pas être utilisés comme personnage final, seulement comme debug/placeholder.
