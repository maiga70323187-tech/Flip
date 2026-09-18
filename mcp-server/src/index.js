import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { callApi, asContent } from './toolDefinitions.js';

const s = new McpServer({ name: 'flip-animation-agent', version: '1.0.0' });

// ---------- projets ----------
s.tool('list_projects', 'Lister les projets d\'animation existants', {},
  async () => asContent(await callApi('/api/projects')));

s.tool('create_project', 'Créer un nouveau projet (scène) avec dimensions et fps',
  { name: z.string().optional(), width: z.number().optional(), height: z.number().optional(), fps: z.number().optional(), duration_ms: z.number().optional(), background: z.string().optional() },
  async (body) => asContent(await callApi('/api/projects', { method: 'POST', body })));

s.tool('get_project', 'Lire l\'état complet d\'un projet',
  { project_id: z.string() },
  async ({ project_id }) => asContent(await callApi(`/api/projects/${project_id}`)));

s.tool('update_project', 'Modifier les paramètres d\'un projet',
  { project_id: z.string(), name: z.string().optional(), width: z.number().optional(), height: z.number().optional(), fps: z.number().optional(), duration_ms: z.number().optional(), background: z.string().optional() },
  async ({ project_id, ...body }) => asContent(await callApi(`/api/projects/${project_id}`, { method: 'PATCH', body })));

// ---------- calques ----------
s.tool('add_layer', 'Ajouter un calque vectoriel ou raster (frame-by-frame)',
  { project_id: z.string(), kind: z.enum(['vector', 'raster']), name: z.string().optional(), opacity: z.number().optional(), fps: z.number().optional() },
  async ({ project_id, ...body }) => asContent(await callApi(`/api/projects/${project_id}/layers`, { method: 'POST', body })));

s.tool('update_layer', 'Renommer, verrouiller, masquer, régler l\'opacité d\'un calque',
  { project_id: z.string(), layer_id: z.string(), name: z.string().optional(), visible: z.boolean().optional(), locked: z.boolean().optional(), opacity: z.number().optional() },
  async ({ project_id, layer_id, ...body }) => asContent(await callApi(`/api/projects/${project_id}/layers/${layer_id}`, { method: 'PATCH', body })));

s.tool('delete_layer', 'Supprimer un calque',
  { project_id: z.string(), layer_id: z.string() },
  async ({ project_id, layer_id }) => { await callApi(`/api/projects/${project_id}/layers/${layer_id}`, { method: 'DELETE' }); return asContent({ ok: true }); });

s.tool('reorder_layers', 'Réordonner les calques (bas -> haut)',
  { project_id: z.string(), layer_ids: z.array(z.string()) },
  async ({ project_id, layer_ids }) => asContent(await callApi(`/api/projects/${project_id}/layers/reorder`, { method: 'PUT', body: { layer_ids } })));

// ---------- formes vectorielles ----------
const transformSchema = z.object({ x: z.number().optional(), y: z.number().optional(), rotation: z.number().optional(), scale_x: z.number().optional(), scale_y: z.number().optional(), anchor_x: z.number().optional(), anchor_y: z.number().optional() }).optional();
const styleSchema     = z.object({ fill: z.string().optional(), stroke: z.string().optional(), stroke_width: z.number().optional(), opacity: z.number().optional() }).optional();

s.tool('add_shape', 'Ajouter une forme vectorielle (path/rect/ellipse/polygon/line/text/image)',
  { project_id: z.string(), layer_id: z.string(), type: z.enum(['path', 'rect', 'ellipse', 'polygon', 'line', 'text', 'group', 'image']), props: z.any().optional(), transform: transformSchema, style: styleSchema },
  async ({ project_id, layer_id, ...body }) => asContent(await callApi(`/api/projects/${project_id}/layers/${layer_id}/shapes`, { method: 'POST', body })));

s.tool('draw_path', 'Raccourci pour ajouter une forme SVG "path" en fournissant l\'attribut d',
  { project_id: z.string(), layer_id: z.string(), d: z.string(), fill: z.string().optional(), stroke: z.string().optional(), stroke_width: z.number().optional() },
  async ({ project_id, layer_id, d, fill, stroke, stroke_width }) => asContent(await callApi(`/api/projects/${project_id}/layers/${layer_id}/shapes`, { method: 'POST', body: { type: 'path', props: { d }, style: { fill: fill ?? '#222', stroke: stroke ?? 'none', stroke_width: stroke_width ?? 0 } } })));

const anchorSchema = z.object({
  x: z.number(),
  y: z.number(),
  hIn: z.tuple([z.number(), z.number()]).nullable().optional(),
  hOut: z.tuple([z.number(), z.number()]).nullable().optional(),
});
s.tool('draw_path_anchors', 'Dessiner un tracé Bézier en fournissant une liste d\'ancres (x, y, hIn?, hOut?). hIn/hOut sont des offsets [dx, dy] relatifs à l\'ancre ; null = coin anguleux. closed=true ferme la forme.',
  { project_id: z.string(), layer_id: z.string(), anchors: z.array(anchorSchema).min(2), closed: z.boolean().optional(), fill: z.string().optional(), stroke: z.string().optional(), stroke_width: z.number().optional() },
  async ({ project_id, layer_id, anchors, closed, fill, stroke, stroke_width }) => {
    // conversion en d côté agent : réutilise le même algo que le frontend.
    const fmt = (n) => Math.round(n * 100) / 100;
    const a0 = anchors[0];
    let d = `M ${fmt(a0.x)} ${fmt(a0.y)}`;
    const end = closed ? anchors.length : anchors.length - 1;
    for (let i = 0; i < end; i++) {
      const cur = anchors[i];
      const next = anchors[(i + 1) % anchors.length];
      if (!cur.hOut && !next.hIn) d += ` L ${fmt(next.x)} ${fmt(next.y)}`;
      else {
        const c1x = cur.x + (cur.hOut?.[0] ?? 0);
        const c1y = cur.y + (cur.hOut?.[1] ?? 0);
        const c2x = next.x + (next.hIn?.[0] ?? 0);
        const c2y = next.y + (next.hIn?.[1] ?? 0);
        d += ` C ${fmt(c1x)} ${fmt(c1y)}, ${fmt(c2x)} ${fmt(c2y)}, ${fmt(next.x)} ${fmt(next.y)}`;
      }
    }
    if (closed) d += ' Z';
    return asContent(await callApi(`/api/projects/${project_id}/layers/${layer_id}/shapes`, { method: 'POST', body: { type: 'path', props: { d, anchors, closed: !!closed }, style: { fill: fill ?? (closed ? '#222' : 'none'), stroke: stroke ?? (closed ? 'none' : '#222'), stroke_width: stroke_width ?? (closed ? 0 : 2) } } }));
  });

s.tool('update_shape', 'Modifier transform/style/props d\'une forme',
  { project_id: z.string(), layer_id: z.string(), shape_id: z.string(), transform: transformSchema, style: styleSchema, props: z.any().optional(), parent_bone: z.string().nullable().optional() },
  async ({ project_id, layer_id, shape_id, ...body }) => asContent(await callApi(`/api/projects/${project_id}/layers/${layer_id}/shapes/${shape_id}`, { method: 'PATCH', body })));

s.tool('delete_shape', 'Supprimer une forme',
  { project_id: z.string(), layer_id: z.string(), shape_id: z.string() },
  async ({ project_id, layer_id, shape_id }) => { await callApi(`/api/projects/${project_id}/layers/${layer_id}/shapes/${shape_id}`, { method: 'DELETE' }); return asContent({ ok: true }); });

// raccourcis de transformation
for (const [name, patch] of [
  ['move_shape', (v) => ({ transform: { x: v.x, y: v.y } })],
  ['rotate_shape', (v) => ({ transform: { rotation: v.rotation } })],
  ['scale_shape', (v) => ({ transform: { scale_x: v.scale_x, scale_y: v.scale_y } })],
]) {
  s.tool(name, `Raccourci: ${name}`,
    { project_id: z.string(), layer_id: z.string(), shape_id: z.string(), x: z.number().optional(), y: z.number().optional(), rotation: z.number().optional(), scale_x: z.number().optional(), scale_y: z.number().optional() },
    async (args) => asContent(await callApi(`/api/projects/${args.project_id}/layers/${args.layer_id}/shapes/${args.shape_id}`, { method: 'PATCH', body: patch(args) })));
}

// ---------- keyframes / tweens ----------
s.tool('add_keyframe', 'Ajouter une keyframe pour animer une propriété d\'une forme (x, y, rotation, scale_x, scale_y, opacity, fill, stroke, stroke_width, d)',
  { project_id: z.string(), layer_id: z.string(), shape_id: z.string(), property: z.enum(['x', 'y', 'rotation', 'scale_x', 'scale_y', 'opacity', 'fill', 'stroke', 'stroke_width', 'd']), time_ms: z.number(), value: z.any(), easing: z.enum(['linear', 'ease-in', 'ease-out', 'ease-in-out', 'step', 'bezier']).optional() },
  async ({ project_id, layer_id, shape_id, ...body }) => asContent(await callApi(`/api/projects/${project_id}/layers/${layer_id}/shapes/${shape_id}/keyframes`, { method: 'POST', body })));

s.tool('patch_keyframe', 'Modifier une keyframe existante (time_ms, value, easing, bezier)',
  { project_id: z.string(), layer_id: z.string(), shape_id: z.string(), property: z.string(), keyframe_id: z.string(), time_ms: z.number().optional(), value: z.any().optional(), easing: z.enum(['linear', 'ease-in', 'ease-out', 'ease-in-out', 'step', 'bezier']).optional(), bezier: z.array(z.number()).length(4).optional() },
  async ({ project_id, layer_id, shape_id, property, keyframe_id, ...body }) => asContent(await callApi(`/api/projects/${project_id}/layers/${layer_id}/shapes/${shape_id}/keyframes/${keyframe_id}?property=${encodeURIComponent(property)}`, { method: 'PATCH', body })));

s.tool('delete_keyframe', 'Supprimer une keyframe',
  { project_id: z.string(), layer_id: z.string(), shape_id: z.string(), property: z.string(), keyframe_id: z.string() },
  async ({ project_id, layer_id, shape_id, property, keyframe_id }) => { await callApi(`/api/projects/${project_id}/layers/${layer_id}/shapes/${shape_id}/keyframes/${keyframe_id}?property=${encodeURIComponent(property)}`, { method: 'DELETE' }); return asContent({ ok: true }); });

s.tool('tween_property', 'Créer un tween en posant deux keyframes (début et fin)',
  { project_id: z.string(), layer_id: z.string(), shape_id: z.string(), property: z.string(), from: z.any(), to: z.any(), start_ms: z.number(), end_ms: z.number(), easing: z.string().optional() },
  async ({ project_id, layer_id, shape_id, property, from, to, start_ms, end_ms, easing }) => {
    const base = `/api/projects/${project_id}/layers/${layer_id}/shapes/${shape_id}/keyframes`;
    const a = await callApi(base, { method: 'POST', body: { property, time_ms: start_ms, value: from, easing: easing ?? 'ease-in-out' } });
    const b = await callApi(base, { method: 'POST', body: { property, time_ms: end_ms,   value: to,   easing: easing ?? 'ease-in-out' } });
    return asContent({ from: a, to: b });
  });

// ---------- rigging ----------
s.tool('add_bone', 'Ajouter un os pour rigger un personnage vectoriel',
  { project_id: z.string(), layer_id: z.string(), name: z.string().optional(), parent_id: z.string().nullable().optional(), length: z.number().optional(), rotation: z.number().optional(), x: z.number().optional(), y: z.number().optional() },
  async ({ project_id, layer_id, ...body }) => asContent(await callApi(`/api/projects/${project_id}/layers/${layer_id}/bones`, { method: 'POST', body })));

s.tool('update_bone', 'Modifier un os (rotation, longueur, parent)',
  { project_id: z.string(), layer_id: z.string(), bone_id: z.string(), rotation: z.number().optional(), length: z.number().optional(), parent_id: z.string().nullable().optional() },
  async ({ project_id, layer_id, bone_id, ...body }) => asContent(await callApi(`/api/projects/${project_id}/layers/${layer_id}/bones/${bone_id}`, { method: 'PATCH', body })));

s.tool('delete_bone', 'Supprimer un os (ses enfants sont ré-attachés au parent, les shapes attachées sont détachées)',
  { project_id: z.string(), layer_id: z.string(), bone_id: z.string() },
  async ({ project_id, layer_id, bone_id }) => { await callApi(`/api/projects/${project_id}/layers/${layer_id}/bones/${bone_id}`, { method: 'DELETE' }); return asContent({ ok: true }); });

s.tool('attach_shape_to_bone', 'Rattacher une forme à un os (elle suit désormais l\'os)',
  { project_id: z.string(), layer_id: z.string(), shape_id: z.string(), bone_id: z.string().nullable() },
  async ({ project_id, layer_id, shape_id, bone_id }) => asContent(await callApi(`/api/projects/${project_id}/layers/${layer_id}/shapes/${shape_id}`, { method: 'PATCH', body: { parent_bone: bone_id } })));

s.tool('add_bone_chain', 'Créer une chaîne d\'os d\'un coup, chaque os héritant du précédent',
  { project_id: z.string(), layer_id: z.string(), root_x: z.number(), root_y: z.number(), segments: z.array(z.object({ name: z.string().optional(), length: z.number(), rotation: z.number().optional() })).min(1) },
  async ({ project_id, layer_id, root_x, root_y, segments }) => {
    const created = [];
    let parent_id = null;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const body = i === 0
        ? { name: seg.name ?? `os-${i + 1}`, x: root_x, y: root_y, length: seg.length, rotation: seg.rotation ?? 0 }
        : { name: seg.name ?? `os-${i + 1}`, parent_id, length: seg.length, rotation: seg.rotation ?? 0 };
      const b = await callApi(`/api/projects/${project_id}/layers/${layer_id}/bones`, { method: 'POST', body });
      created.push(b);
      parent_id = b.id;
    }
    return asContent(created);
  });

s.tool('animate_bone_rotation', 'Ajouter une keyframe sur la rotation d\'un os (pour l\'animation FK)',
  { project_id: z.string(), layer_id: z.string(), bone_id: z.string(), time_ms: z.number(), value: z.number(), easing: z.enum(['linear', 'ease-in', 'ease-out', 'ease-in-out', 'step', 'bezier']).optional(), bezier: z.array(z.number()).length(4).optional() },
  async ({ project_id, layer_id, bone_id, ...body }) => asContent(await callApi(`/api/projects/${project_id}/layers/${layer_id}/bones/${bone_id}/keyframes`, { method: 'POST', body: { property: 'rotation', ...body } })));

s.tool('solve_ik', 'Résout la cinématique inverse : trouver les rotations des os pour que la pointe atteigne (target_x, target_y). apply=true applique le résultat aux os.',
  { project_id: z.string(), layer_id: z.string(), tip_bone_id: z.string(), target_x: z.number(), target_y: z.number(), apply: z.boolean().optional() },
  async (body) => asContent(await callApi(`/api/projects/${body.project_id}/ik/solve`, { method: 'POST', body })));

// ---------- frame-by-frame ----------
s.tool('add_raster_frame', 'Ajouter une frame dessinée (image data URL ou strokes) sur un calque raster',
  { project_id: z.string(), layer_id: z.string(), duration_ms: z.number(), image: z.string().optional(), strokes: z.array(z.any()).optional() },
  async ({ project_id, layer_id, ...body }) => asContent(await callApi(`/api/projects/${project_id}/layers/${layer_id}/frames`, { method: 'POST', body })));

// ---------- rendu / export ----------
s.tool('render_frame_svg', 'Rendre l\'état de la scène à un instant t_ms en SVG',
  { project_id: z.string(), t_ms: z.number().optional() },
  async ({ project_id, t_ms }) => asContent(await callApi(`/api/projects/${project_id}/render?t_ms=${t_ms ?? 0}`)));

s.tool('get_manifest', 'Obtenir le manifeste de rendu (fps, count, calques, audio)',
  { project_id: z.string() },
  async ({ project_id }) => asContent(await callApi(`/api/projects/${project_id}/manifest`)));

s.tool('export_project', 'Exporter le projet (json, svg, png ou mp4). mp4 rend la timeline complète en local via resvg + ffmpeg, sans modèle externe.',
  { project_id: z.string(), format: z.enum(['json', 'svg', 'png', 'mp4']).optional(), t_ms: z.number().optional(), fps: z.number().optional(), width: z.number().optional() },
  async ({ project_id, ...body }) => asContent(await callApi(`/api/projects/${project_id}/export`, { method: 'POST', body })));

// ---------- defs (gradients) ----------
const stopSchema = z.object({ offset: z.number(), color: z.string(), opacity: z.number().optional() });

s.tool('add_linear_gradient', 'Ajouter un dégradé linéaire réutilisable (fill: url(#id))',
  { project_id: z.string(), name: z.string().optional(), x1: z.number().optional(), y1: z.number().optional(), x2: z.number().optional(), y2: z.number().optional(), stops: z.array(stopSchema) },
  async ({ project_id, ...body }) => asContent(await callApi(`/api/projects/${project_id}/defs`, { method: 'POST', body: { ...body, kind: 'linearGradient' } })));

s.tool('add_radial_gradient', 'Ajouter un dégradé radial (fill: url(#id))',
  { project_id: z.string(), name: z.string().optional(), cx: z.number().optional(), cy: z.number().optional(), r: z.number().optional(), stops: z.array(stopSchema) },
  async ({ project_id, ...body }) => asContent(await callApi(`/api/projects/${project_id}/defs`, { method: 'POST', body: { ...body, kind: 'radialGradient' } })));

// ---------- décor procédural ----------
s.tool('apply_decor_preset', 'Appliquer un décor procédural (sky_day, sky_sunset, sky_night, mountains, grass_field). Un nouveau calque est créé sous les autres. 100 % local, déterministe via seed.',
  { project_id: z.string(), preset: z.enum(['sky_day', 'sky_sunset', 'sky_night', 'mountains', 'grass_field']), seed: z.number().optional() },
  async ({ project_id, preset, seed }) => asContent(await callApi(`/api/projects/${project_id}/decor`, { method: 'POST', body: { preset, seed } })));

// ---------- characters (Phase 1) — voir docs/knowledge/12_AI_AGENT_CONTRACT.md ----------
s.tool('list_characters', 'Lister les personnages présents dans un projet',
  { project_id: z.string() },
  async ({ project_id }) => asContent(await callApi(`/api/projects/${project_id}/characters`)));

s.tool('add_character', 'Ajouter un personnage validé conforme à docs/schemas/character.schema.json (Character Package v1.0). L\'agent choisit l\'intention, le moteur calcule la mécanique.',
  { project_id: z.string(), character: z.any() },
  async ({ project_id, character }) => asContent(await callApi(`/api/projects/${project_id}/characters`, { method: 'POST', body: character })));

s.tool('get_character_capabilities', 'Renvoie les capabilities, views, expressions, poses et clips d\'un personnage. Avant toute action, l\'agent doit interroger ce endpoint.',
  { project_id: z.string(), character_id: z.string() },
  async ({ project_id, character_id }) => asContent(await callApi(`/api/projects/${project_id}/characters/${character_id}/capabilities`)));

s.tool('list_character_examples', 'Lister les exemples de personnages disponibles dans la knowledge base (docs/examples/characters/)',
  {},
  async () => asContent(await callApi('/api/knowledge/characters')));

s.tool('load_character_example', 'Charger un exemple depuis la KB par sa clé (ex: "humanoid", "quadruped-cat"). Utile pour amorcer un projet.',
  { key: z.string() },
  async ({ key }) => asContent(await callApi(`/api/knowledge/characters/${key}`)));

// ---------- Phase 2 : slots + rig humanoïde ----------
s.tool('build_humanoid_rig', 'Créer un personnage humanoïde complet (bones + slots + parts) conforme à docs/knowledge/04_RIGGING_AND_PIVOTS.md. Aucune image d\'asset n\'est attachée ; utiliser set_character_part_asset ensuite.',
  { project_id: z.string(), name: z.string().optional(), origin_x: z.number().optional(), origin_y: z.number().optional(), style_profile: z.any().optional() },
  async ({ project_id, name, origin_x, origin_y, style_profile }) => asContent(await callApi(`/api/projects/${project_id}/characters/humanoid_rig`, { method: 'POST', body: { name, originX: origin_x, originY: origin_y, styleProfile: style_profile } })));

s.tool('build_procedural_character', 'Créer un humanoïde COMPLET avec des SVG de chaque partie du corps générés localement (aucun modèle externe). L\'agent choisit le style (nom de palette), le moteur produit les paths Bézier de tête/torse/bras/jambes/mains/pieds/cheveux. La règle #10 CLAUDE.md est respectée : ce ne sont pas des primitives brutes mais un dessin flat-cartoon assemblé.',
  { project_id: z.string(), name: z.string().optional(), origin_x: z.number().optional(), origin_y: z.number().optional(), palette_name: z.string().optional() },
  async ({ project_id, name, origin_x, origin_y, palette_name }) => asContent(await callApi(`/api/projects/${project_id}/characters/procedural`, { method: 'POST', body: { name, originX: origin_x, originY: origin_y, paletteName: palette_name } })));

s.tool('set_character_variant', 'Sélectionner quelle variante de part est visible pour un slot donné (ex: slot_id="hand_front", part_id="hand_R_fist"). Refuse MISSING_SLOT/MISSING_ASSET si l\'id est inconnu.',
  { project_id: z.string(), character_id: z.string(), slot_id: z.string(), part_id: z.string().nullable() },
  async ({ project_id, character_id, slot_id, part_id }) => asContent(await callApi(`/api/projects/${project_id}/characters/${character_id}/slots/${slot_id}`, { method: 'PATCH', body: { part: part_id } })));

s.tool('set_character_state', 'Modifier la vue/expression courante et le placement (transform) d\'un personnage. Refuse MISSING_VIEW/UNSUPPORTED_EXPRESSION si non déclarés.',
  { project_id: z.string(), character_id: z.string(), currentView: z.string().optional(), currentExpression: z.string().optional(), transform: z.object({ x: z.number().optional(), y: z.number().optional(), rotation: z.number().optional(), scale: z.number().optional() }).optional(), visible: z.boolean().optional() },
  async ({ project_id, character_id, ...body }) => asContent(await callApi(`/api/projects/${project_id}/characters/${character_id}`, { method: 'PATCH', body })));

s.tool('set_character_part_asset', 'Attacher une image (data URL ou http URL) à une clé de part (la valeur de part.source). Enregistré dans character.assetRoots.',
  { project_id: z.string(), character_id: z.string(), part_source: z.string(), asset_url: z.string() },
  async ({ project_id, character_id, part_source, asset_url }) => asContent(await callApi(`/api/projects/${project_id}/characters/${character_id}`, { method: 'PATCH', body: { assetRoots: { [part_source]: asset_url } } })));

const transport = new StdioServerTransport();
await s.connect(transport);
