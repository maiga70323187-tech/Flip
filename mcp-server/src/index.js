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

s.tool('export_project', 'Exporter le projet (json complet ou svg d\'un instant)',
  { project_id: z.string(), format: z.enum(['json', 'svg']).optional(), t_ms: z.number().optional() },
  async ({ project_id, format, t_ms }) => asContent(await callApi(`/api/projects/${project_id}/export`, { method: 'POST', body: { format, t_ms } })));

const transport = new StdioServerTransport();
await s.connect(transport);
