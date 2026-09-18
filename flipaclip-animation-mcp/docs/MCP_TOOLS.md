# Outils MCP

Le serveur MCP appelle l'API backend. Chaque outil renvoie un contenu texte JSON afin d'être facile à inspecter par un agent.

| Outil | But |
|---|---|
| create_frame | créer une frame |
| duplicate_frame | dupliquer une frame existante |
| delete_frame | supprimer une frame |
| reorder_frames | réordonner la timeline |
| move_element | changer x/y |
| rotate_element | changer rotation |
| scale_element | changer l'échelle |
| create_layer | créer un élément/calque |
| set_layer_order | changer l'ordre d'affichage |
| toggle_layer_visibility | masquer/afficher |
| generate_character/object/background | créer un asset via provider ou mock |
| inpaint_region | enregistrer une instruction d'édition ciblée |
| add_transition/apply_effect | ajouter des métadonnées de montage |
| add_audio_track | attacher un fichier audio |
| sync_to_audio | verrouiller fps/durée ou marqueurs |
| preview_animation | produire le manifeste de preview |
| export_animation | produire un export de manifeste |
