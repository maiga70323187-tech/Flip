# Flip — consignes pour Claude

Flip : application d'animation 2D pilotée par des agents IA.

## Économie de tokens (« mode code » appliqué à la main)

Le Code Mode expérimental de Claude Code ne fonctionne pas dans les sessions cloud.
On applique son principe : faire le travail répétitif dans un script et ne ramener
dans la conversation que le résultat utile.

1. **Lots = un script.** Si une tâche touche plus de ~5 fichiers, enregistrements ou
   appels similaires, écrire un seul script Python/Bash (hors du dépôt, dans le
   scratchpad) qui fait tout et n'affiche qu'un résumé : compteurs, anomalies, chemins.
   Ne pas traiter les éléments un par un dans la conversation.
2. **Données volumineuses.** Si une source est accessible en ligne de commande
   (API, export, fichier), la télécharger dans un fichier puis la filtrer avec `jq` ou
   Python, plutôt qu'enchaîner des appels d'outils dont chaque réponse entre dans le
   contexte.
3. **Filtrer avant de lire.** Chercher d'abord (liste de fichiers, comptage, `head_limit`),
   puis lire seulement les lignes utiles (`offset`/`limit`). Jamais de lecture
   intégrale d'un gros fichier ni de sortie complète de build ou de test : garder les
   erreurs ou les 40 dernières lignes.
4. **Commandes indépendantes groupées** dans un même appel ou en appels parallèles.
5. **Remplacements multi-fichiers** : un seul script ou `sed`, puis une recherche de
   contrôle ; pas une édition par fichier.
6. **Pas de relecture** d'un fichier déjà lu ou qui vient d'être modifié.
7. **Rendus Blender / Synfig / ffmpeg** : mode silencieux (`blender -b`,
   `ffmpeg -loglevel error`), journal complet dans un fichier, n'afficher que la fin
   ou les erreurs. Vérifier une image clé plutôt que toute une séquence.
8. **Sous-agents** : seulement sur demande explicite (chacun repart de zéro et coûte cher).
