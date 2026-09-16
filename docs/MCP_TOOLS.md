# Outils MCP — Flip Animation

Serveur MCP : `flip-animation-agent` (stdio). Chaque outil renvoie du texte JSON pour être inspectable par l'agent. Ils appellent l'API HTTP du backend (`FLIP_API_URL`, `http://localhost:8787` par défaut).

## Projets

| Outil | Rôle |
|---|---|
| `list_projects` | Liste les projets |
| `create_project` | Crée un projet (dimensions, fps, durée, fond) |
| `get_project` | Lit l'état complet d'un projet |
| `update_project` | Modifie les paramètres du projet |

## Calques

| `add_layer` | Ajoute un calque `vector` ou `raster` |
| `update_layer` | Renomme, masque, verrouille, opacité |
| `delete_layer` | Supprime un calque |
| `reorder_layers` | Réordonne les calques |

## Formes vectorielles

| `add_shape` | Ajoute une forme (path, rect, ellipse, polygon, line, text, group, image) |
| `draw_path` | Raccourci pour un `path` avec attribut `d` SVG |
| `update_shape` | Modifie transform / style / props |
| `delete_shape` | Supprime une forme |
| `move_shape` / `rotate_shape` / `scale_shape` | Raccourcis de transformation |

## Animation

| `add_keyframe` | Ajoute une keyframe (property, time_ms, value, easing) |
| `tween_property` | Pose deux keyframes (début et fin) en une seule commande |

Propriétés animables : `x, y, rotation, scale_x, scale_y, opacity, fill, stroke, stroke_width, d`.
Easings : `linear, ease-in, ease-out, ease-in-out, step, bezier`.

## Rigging

| `add_bone` | Ajoute un os (parent, longueur, rotation, position) |
| `update_bone` | Modifie un os |

Les formes peuvent être attachées à un os via `update_shape` (`parent_bone`).

## Frame-by-frame

| `add_raster_frame` | Ajoute une frame dessinée (image data URL et/ou strokes) sur un calque raster |

## Rendu & export

| `render_frame_svg` | Rend l'état de la scène à `t_ms` en SVG |
| `get_manifest` | Obtient le manifeste (fps, count, calques, audio) |
| `export_project` | Exporte en JSON complet ou en SVG d'un instant |
