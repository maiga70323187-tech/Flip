// Générateur procédural de personnage humanoïde.
// Aucun modèle IA externe : chaque partie du corps est produite par une
// formule paramétrique -> path SVG -> data URL, branchée sur assetRoots.
//
// Voir docs/knowledge/01_CHARACTER_MODEL.md règle #4 (moteur responsable
// de la mécanique) et règle #10 (les primitives seules ne doivent pas
// être présentées comme un personnage final — ici on assemble des
// courbes Bézier propres, plus des rectangles bruts).

import { buildHumanoidRig } from './humanoid-rig.js';

// ---------- palettes de style ----------
export const PALETTES = {
  'african-cartoon-yellow': {
    skin: '#8B5A3C',
    skin_shadow: '#6b4028',
    skin_light: '#a97354',
    hair: '#1a0f0a',
    hair_shine: '#3a1e10',
    shirt: '#f4c542',
    shirt_shadow: '#c99a30',
    shirt_accent: '#f26eb0',
    pants: '#3a68a5',
    pants_shadow: '#264a7c',
    shoes: '#ffffff',
    shoes_accent: '#6b7ecf',
    outline: '#2b1810',
    eye: '#1a0f0a',
    eye_white: '#f7ecdc',
    mouth: '#8b3e4a',
    highlight: '#ffffff',
  },
};

const round = (v) => Math.round(v * 100) / 100;
const svgWrap = (w, h, inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`;
const toDataUrl = (svg) => 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
const OUTLINE_W = 2.5;

// ---------- TÊTE (visage vu de face) ----------
function drawHead(p) {
  const w = 100, h = 130;
  const cx = w / 2;
  // Crâne : ovale allongé, avec joues qui s'arrondissent puis mâchoire qui se resserre
  const d = [
    `M ${cx} 6`,
    `C ${cx + 42} 6, ${cx + 47} 42, ${cx + 46} 66`,
    `C ${cx + 44} 88, ${cx + 32} 108, ${cx} 122`,
    `C ${cx - 32} 108, ${cx - 44} 88, ${cx - 46} 66`,
    `C ${cx - 47} 42, ${cx - 42} 6, ${cx} 6`,
    'Z',
  ].join(' ');
  const eyeY = 65, eyeSpacing = 15, eyeR = 5.5;
  const face = [
    // Peau
    `<path d="${d}" fill="${p.skin}" stroke="${p.outline}" stroke-width="${OUTLINE_W}" stroke-linejoin="round"/>`,
    // Ombre douce sur un côté (subtile, pour donner du volume)
    `<path d="M ${cx + 20} 40 C ${cx + 40} 58, ${cx + 42} 90, ${cx + 20} 108 L ${cx + 20} 40 Z" fill="${p.skin_shadow}" opacity="0.35"/>`,
    // Blanc des yeux
    `<ellipse cx="${cx - eyeSpacing}" cy="${eyeY}" rx="${eyeR + 1}" ry="${eyeR}" fill="${p.eye_white}" stroke="${p.outline}" stroke-width="1.2"/>`,
    `<ellipse cx="${cx + eyeSpacing}" cy="${eyeY}" rx="${eyeR + 1}" ry="${eyeR}" fill="${p.eye_white}" stroke="${p.outline}" stroke-width="1.2"/>`,
    // Pupilles
    `<circle cx="${cx - eyeSpacing}" cy="${eyeY + 1}" r="3.2" fill="${p.eye}"/>`,
    `<circle cx="${cx + eyeSpacing}" cy="${eyeY + 1}" r="3.2" fill="${p.eye}"/>`,
    // Reflets
    `<circle cx="${cx - eyeSpacing + 1.4}" cy="${eyeY - 0.5}" r="0.9" fill="${p.highlight}"/>`,
    `<circle cx="${cx + eyeSpacing + 1.4}" cy="${eyeY - 0.5}" r="0.9" fill="${p.highlight}"/>`,
    // Sourcils épais
    `<path d="M ${cx - eyeSpacing - 7} ${eyeY - 11} Q ${cx - eyeSpacing} ${eyeY - 14}, ${cx - eyeSpacing + 6} ${eyeY - 11}" fill="none" stroke="${p.hair}" stroke-width="3" stroke-linecap="round"/>`,
    `<path d="M ${cx + eyeSpacing - 6} ${eyeY - 11} Q ${cx + eyeSpacing} ${eyeY - 14}, ${cx + eyeSpacing + 7} ${eyeY - 11}" fill="none" stroke="${p.hair}" stroke-width="3" stroke-linecap="round"/>`,
    // Nez : petite courbe discrète
    `<path d="M ${cx - 2} 78 Q ${cx - 3.5} 88, ${cx + 3} 90" fill="none" stroke="${p.skin_shadow}" stroke-width="1.5" stroke-linecap="round"/>`,
    // Bouche : sourire discret
    `<path d="M ${cx - 8} 103 Q ${cx} 108, ${cx + 8} 103" fill="none" stroke="${p.mouth}" stroke-width="2" stroke-linecap="round"/>`,
  ].join('');
  return svgWrap(w, h, face);
}

// ---------- CHEVEUX (avant : couvre le front) ----------
function drawHairFront(p) {
  const w = 100, h = 130;
  const cx = w / 2;
  // Une couronne de mèches courtes, bouclées
  const d = [
    `M ${cx - 46} 40`,
    // Front + boucles au-dessus
    `Q ${cx - 40} 5, ${cx - 20} 12`,
    `Q ${cx - 10} 2, ${cx} 10`,
    `Q ${cx + 12} 0, ${cx + 22} 12`,
    `Q ${cx + 40} 4, ${cx + 46} 42`,
    // Retour par les tempes vers front (couvre le haut du crâne)
    `Q ${cx + 40} 30, ${cx + 25} 32`,
    `Q ${cx + 10} 20, ${cx} 30`,
    `Q ${cx - 10} 20, ${cx - 25} 32`,
    `Q ${cx - 40} 30, ${cx - 46} 42`,
    'Z',
  ].join(' ');
  const inner = [
    `<path d="${d}" fill="${p.hair}" stroke="${p.outline}" stroke-width="${OUTLINE_W}" stroke-linejoin="round"/>`,
    // 3 petits reflets bruns pour donner du volume aux boucles
    `<circle cx="${cx - 20}" cy="12" r="2" fill="${p.hair_shine}"/>`,
    `<circle cx="${cx + 4}" cy="8" r="2" fill="${p.hair_shine}"/>`,
    `<circle cx="${cx + 22}" cy="14" r="2" fill="${p.hair_shine}"/>`,
  ].join('');
  return svgWrap(w, h, inner);
}

// ---------- CHEVEUX (arrière : masse derrière la tête) ----------
function drawHairBack(p) {
  const w = 110, h = 130;
  const cx = w / 2;
  const d = `M ${cx - 50} 30 Q ${cx - 55} 80, ${cx - 30} 118 L ${cx + 30} 118 Q ${cx + 55} 80, ${cx + 50} 30 Q ${cx} -6, ${cx - 50} 30 Z`;
  return svgWrap(w, h, `<path d="${d}" fill="${p.hair}" stroke="${p.outline}" stroke-width="${OUTLINE_W}" stroke-linejoin="round"/>`);
}

// ---------- COU ----------
function drawNeck(p) {
  const w = 40, h = 40;
  const d = `M 8 4 Q 8 22, 14 34 L 26 34 Q 32 22, 32 4 Z`;
  const inner = [
    `<path d="${d}" fill="${p.skin}" stroke="${p.outline}" stroke-width="${OUTLINE_W}"/>`,
    // Ombre du menton
    `<path d="M 10 6 Q 12 12, 20 12 Q 28 12, 30 6" fill="${p.skin_shadow}" opacity="0.5"/>`,
  ].join('');
  return svgWrap(w, h, inner);
}

// ---------- TORSE (t-shirt avec cœur) ----------
function drawTorso(p) {
  const w = 130, h = 150;
  const cx = w / 2;
  // Silhouette t-shirt : épaules larges, taille légèrement rétrécie
  const d = [
    `M ${cx - 55} 14`,
    // épaule gauche
    `Q ${cx - 62} 18, ${cx - 60} 32`,
    // côté gauche resserré à la taille
    `Q ${cx - 44} 60, ${cx - 42} 105`,
    // ourlet bas
    `Q ${cx - 42} 132, ${cx - 30} 138`,
    `L ${cx + 30} 138`,
    `Q ${cx + 42} 132, ${cx + 42} 105`,
    // côté droit
    `Q ${cx + 44} 60, ${cx + 60} 32`,
    // épaule droite
    `Q ${cx + 62} 18, ${cx + 55} 14`,
    // col avant (creux)
    `Q ${cx + 20} 8, ${cx + 12} 22`,
    `Q ${cx} 26, ${cx - 12} 22`,
    `Q ${cx - 20} 8, ${cx - 55} 14`,
    'Z',
  ].join(' ');
  // Cœur au centre du torse
  const hx = cx, hy = 82;
  const heart = `M ${hx} ${hy + 12} C ${hx - 14} ${hy}, ${hx - 14} ${hy - 12}, ${hx} ${hy - 4} C ${hx + 14} ${hy - 12}, ${hx + 14} ${hy}, ${hx} ${hy + 12} Z`;
  const inner = [
    `<path d="${d}" fill="${p.shirt}" stroke="${p.outline}" stroke-width="${OUTLINE_W}" stroke-linejoin="round"/>`,
    // Ombre sous le col
    `<path d="M ${cx - 14} 26 Q ${cx} 32, ${cx + 14} 26 L ${cx + 12} 34 Q ${cx} 38, ${cx - 12} 34 Z" fill="${p.shirt_shadow}" opacity="0.5"/>`,
    // Ombre côté
    `<path d="M ${cx + 40} 40 Q ${cx + 48} 80, ${cx + 40} 120" fill="none" stroke="${p.shirt_shadow}" stroke-width="6" opacity="0.35" stroke-linecap="round"/>`,
    // Cœur rose
    `<path d="${heart}" fill="${p.shirt_accent}" stroke="${p.outline}" stroke-width="1.5"/>`,
  ].join('');
  return svgWrap(w, h, inner);
}

// ---------- PELVIS (haut du jean, transition) ----------
function drawPelvis(p) {
  const w = 100, h = 40;
  const d = `M 8 4 Q 50 -2, 92 4 L 92 36 Q 50 32, 8 36 Z`;
  return svgWrap(w, h, `<path d="${d}" fill="${p.pants}" stroke="${p.outline}" stroke-width="${OUTLINE_W}" stroke-linejoin="round"/>`);
}

// ---------- BRAS (haut ou avant) ----------
function drawArmSegment(p, { withHand = false, sleeveTop = false } = {}) {
  const w = 40, h = 120;
  const d = `M 10 4 Q 6 60, 10 116 Q 20 120, 30 116 Q 34 60, 30 4 Q 20 0, 10 4 Z`;
  const inner = [
    `<path d="${d}" fill="${p.skin}" stroke="${p.outline}" stroke-width="${OUTLINE_W}" stroke-linejoin="round"/>`,
    `<path d="M 24 16 Q 28 60, 24 108" fill="none" stroke="${p.skin_shadow}" stroke-width="3" opacity="0.35" stroke-linecap="round"/>`,
  ];
  if (sleeveTop) {
    inner.unshift(`<path d="M 6 4 Q 4 24, 12 32 L 28 32 Q 36 24, 34 4 Q 20 -2, 6 4 Z" fill="${p.shirt}" stroke="${p.outline}" stroke-width="${OUTLINE_W}" stroke-linejoin="round"/>`);
  }
  return svgWrap(w, h, inner.join(''));
}

// ---------- MAIN ----------
function drawHand(p, pose = 'open') {
  const w = 40, h = 50;
  let d;
  if (pose === 'fist') {
    d = `M 10 6 Q 4 22, 8 38 Q 20 46, 32 38 Q 36 22, 30 6 Q 20 2, 10 6 Z`;
  } else if (pose === 'point') {
    d = `M 12 4 L 12 26 Q 4 30, 8 42 Q 20 48, 32 42 Q 36 30, 28 26 L 28 12 Q 26 6, 22 6 L 20 6 Q 18 4, 12 4 Z`;
  } else {
    d = `M 8 20 Q 4 32, 10 44 Q 20 50, 30 44 Q 36 32, 32 20 Q 30 6, 24 6 L 24 20 M 20 6 L 20 20 M 16 8 L 16 20`;
  }
  const inner = [
    `<path d="${d}" fill="${p.skin}" stroke="${p.outline}" stroke-width="${OUTLINE_W}" stroke-linejoin="round" stroke-linecap="round"/>`,
  ].join('');
  return svgWrap(w, h, inner);
}

// ---------- JAMBE (cuisse ou tibia) ----------
function drawLegSegment(p, { top = false, side } = {}) {
  const w = 44, h = 130;
  const d = `M 8 4 Q 4 60, 10 124 Q 22 128, 34 124 Q 40 60, 36 4 Q 22 0, 8 4 Z`;
  const inner = [
    `<path d="${d}" fill="${p.pants}" stroke="${p.outline}" stroke-width="${OUTLINE_W}" stroke-linejoin="round"/>`,
    // Couture verticale
    `<path d="M 22 8 L 22 122" fill="none" stroke="${p.pants_shadow}" stroke-width="1" opacity="0.5" stroke-dasharray="2 3"/>`,
    // Ombre côté extérieur
    `<path d="M 34 16 Q 36 60, 30 116" fill="none" stroke="${p.pants_shadow}" stroke-width="4" opacity="0.4" stroke-linecap="round"/>`,
  ].join('');
  return svgWrap(w, h, inner);
}

// ---------- PIED (basket) ----------
function drawFoot(p) {
  const w = 60, h = 40;
  const d = `M 6 22 Q 4 32, 12 36 L 50 36 Q 58 34, 56 24 Q 52 8, 30 6 Q 12 8, 6 22 Z`;
  const inner = [
    `<path d="${d}" fill="${p.shoes}" stroke="${p.outline}" stroke-width="${OUTLINE_W}" stroke-linejoin="round"/>`,
    // Semelle
    `<path d="M 6 28 L 56 28 L 56 36 L 12 36 Q 4 34, 6 28 Z" fill="${p.shoes_accent}" stroke="${p.outline}" stroke-width="1"/>`,
    // Lacet
    `<path d="M 20 14 L 40 14 M 20 18 L 40 18 M 20 22 L 40 22" fill="none" stroke="${p.outline}" stroke-width="1.2"/>`,
  ].join('');
  return svgWrap(w, h, inner);
}

// ---------- ORCHESTRATEUR ----------
export function buildProceduralCharacter(opts = {}) {
  const palette = { ...(PALETTES[opts.paletteName] ?? PALETTES['african-cartoon-yellow']), ...(opts.palette ?? {}) };
  const base = buildHumanoidRig({
    id: opts.id,
    name: opts.name ?? 'Personnage procédural',
    originX: 0,
    originY: 0,
  });
  // Placement dans la scène : character.transform, pas dans le root bone.
  base.transform = { x: opts.originX ?? 250, y: opts.originY ?? 200, rotation: 0, scale: opts.scale ?? 1 };

  // On génère les SVGs pour chaque source déclarée dans base.parts.
  const assetRoots = {};
  const put = (source, svg) => { assetRoots[source] = toDataUrl(svg); };

  for (const part of base.parts) {
    switch (part.id) {
      case 'head':          put(part.source, drawHead(palette)); break;
      case 'face':          put(part.source, svgWrap(100, 130, '')); break; // face intégrée dans head pour Phase 1 procédural
      case 'hair_front':    put(part.source, drawHairFront(palette)); break;
      case 'hair_back':     put(part.source, drawHairBack(palette)); break;
      case 'neck':          put(part.source, drawNeck(palette)); break;
      case 'torso':         put(part.source, drawTorso(palette)); break;
      case 'pelvis':        put(part.source, drawPelvis(palette)); break;
      case 'upperArm_L':
      case 'upperArm_R':    put(part.source, drawArmSegment(palette, { sleeveTop: true })); break;
      case 'forearm_L':
      case 'forearm_R':     put(part.source, drawArmSegment(palette)); break;
      case 'hand_L_open':
      case 'hand_R_open':   put(part.source, drawHand(palette, 'open')); break;
      case 'hand_R_fist':   put(part.source, drawHand(palette, 'fist')); break;
      case 'hand_R_point':  put(part.source, drawHand(palette, 'point')); break;
      case 'thigh_L':
      case 'thigh_R':       put(part.source, drawLegSegment(palette, { top: true })); break;
      case 'shin_L':
      case 'shin_R':        put(part.source, drawLegSegment(palette)); break;
      case 'foot_L':
      case 'foot_R':        put(part.source, drawFoot(palette)); break;
      default: /* placeholder inchangé */ break;
    }
    // Dimensions cohérentes avec les SVGs pour que le pivot marche.
  }

  // Ajuster width/height des parts pour matcher les SVGs
  const dims = {
    head: [100, 130], face: [100, 130], hair_front: [100, 130], hair_back: [110, 130],
    neck: [40, 40], torso: [130, 150], pelvis: [100, 40],
    upperArm_L: [40, 120], upperArm_R: [40, 120],
    forearm_L: [40, 120], forearm_R: [40, 120],
    hand_L_open: [40, 50], hand_R_open: [40, 50], hand_R_fist: [40, 50], hand_R_point: [40, 50],
    thigh_L: [44, 130], thigh_R: [44, 130], shin_L: [44, 130], shin_R: [44, 130],
    foot_L: [60, 40], foot_R: [60, 40],
  };
  for (const part of base.parts) {
    if (dims[part.id]) { part.width = dims[part.id][0]; part.height = dims[part.id][1]; }
  }

  return {
    ...base,
    styleProfile: { geometry: 'flat-cartoon', headsTall: 6.5, outline: 'soft', shading: 'minimal', paletteName: opts.paletteName ?? 'african-cartoon-yellow' },
    assetRoots,
  };
}
