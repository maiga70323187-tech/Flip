// Générateur de rig humanoïde par défaut.
// Suit docs/knowledge/04_RIGGING_AND_PIVOTS.md :
//   root
//   └── hips
//       ├── spine → chest → neck → head
//       ├── chest → shoulder_L → elbow_L → wrist_L
//       ├── chest → shoulder_R → elbow_R → wrist_R
//       ├── hip_L → knee_L → ankle_L
//       └── hip_R → knee_R → ankle_R
//
// Le personnage résultant est prêt à être positionné dans la scène.
// Aucune asset image n'est attachée — l'agent utilisera set_character_part_asset
// pour brancher ses propres images de parts.

const DEFAULT_LIMITS = {
  head:       { min: -35, max: 35 },
  shoulder:   { min: -160, max: 160 },
  elbow:      { min: 0, max: 155 },   // ne se plie que dans un sens
  wrist:      { min: -80, max: 80 },
  hip:        { min: -100, max: 100 },
  knee:       { min: -155, max: 0 },  // genou plie vers l'arrière (relatif : angle négatif)
  ankle:      { min: -45, max: 45 },
};

// Proportions par défaut (headsTall ≈ 6,8 comme dans l'exemple KB).
const P = {
  hipsX: 0, hipsY: 300,
  spineLen: 80,
  chestLen: 70,
  neckLen: 25,
  headLen: 75,
  clavicleLen: 30,     // décalage épaule depuis chest.tip
  upperArmLen: 110,
  forearmLen: 105,
  handLen: 40,
  pelvisWidth: 55,      // décalage horizontal hanche depuis hips
  thighLen: 130,
  shinLen: 130,
  footLen: 55,
};

function bone(id, parent, opts = {}) {
  return {
    id, parent,
    x: opts.x ?? 0, y: opts.y ?? 0,
    length: opts.length ?? 0,
    rotation: opts.rotation ?? 0,
    ...(opts.limits ? { limits: opts.limits } : {}),
  };
}

// Slot standard : { id, bone, part, zIndex }.
function slot(id, boneId, zIndex, part = null) { return { id, bone: boneId, part, zIndex, visible: true }; }

// Part factory (aucune source d'asset ; l'agent branche ses images ensuite).
function part(id, boneId, opts = {}) {
  return {
    id,
    source: opts.source ?? `assets/${id}.svg`,   // clé logique dans assetRoots
    view: opts.view ?? 'front',
    bone: boneId,
    pivot: opts.pivot ?? { x: 0.5, y: 0.9 },
    width: opts.width ?? 100,
    height: opts.height ?? 100,
    zIndex: opts.zIndex ?? 30,
    ...(opts.variantGroup ? { variantGroup: opts.variantGroup } : {}),
  };
}

export function buildHumanoidRig(opts = {}) {
  const id = opts.id ?? `hum_${Math.random().toString(36).slice(2, 8)}`;
  const rootX = opts.originX ?? 0;
  const rootY = opts.originY ?? 0;

  const bones = [
    bone('root', null, { x: rootX, y: rootY }),
    bone('hips', 'root', { x: P.hipsX, y: P.hipsY, length: 0 }),
    bone('spine', 'hips', { rotation: -90, length: P.spineLen }),
    bone('chest', 'spine', { rotation: 0, length: P.chestLen }),
    bone('neck', 'chest', { rotation: 0, length: P.neckLen }),
    bone('head', 'neck', { rotation: 0, length: P.headLen, limits: DEFAULT_LIMITS.head }),

    // Bras gauche (au repos, hangs down). chest world = -90.
    // clavicle_L world = -90 + (-90) = -180 = 180 (pointe à gauche)
    bone('clavicle_L', 'chest', { rotation: -90, length: P.clavicleLen }),
    // shoulder_L world = 180 + (-90) = 90 (pointe vers le bas) ✓
    bone('shoulder_L', 'clavicle_L', { rotation: -90, length: P.upperArmLen, limits: DEFAULT_LIMITS.shoulder }),
    bone('elbow_L', 'shoulder_L', { rotation: 0, length: P.forearmLen, limits: DEFAULT_LIMITS.elbow }),
    bone('wrist_L', 'elbow_L', { rotation: 0, length: P.handLen, limits: DEFAULT_LIMITS.wrist }),

    // Bras droit. clavicle_R world = -90 + 90 = 0 (pointe à droite)
    bone('clavicle_R', 'chest', { rotation: 90, length: P.clavicleLen }),
    // shoulder_R world = 0 + 90 = 90 (pointe vers le bas)
    bone('shoulder_R', 'clavicle_R', { rotation: 90, length: P.upperArmLen, limits: DEFAULT_LIMITS.shoulder }),
    bone('elbow_R', 'shoulder_R', { rotation: 0, length: P.forearmLen, limits: DEFAULT_LIMITS.elbow }),
    bone('wrist_R', 'elbow_R', { rotation: 0, length: P.handLen, limits: DEFAULT_LIMITS.wrist }),

    // Jambe gauche (hip_L décalé horizontalement puis descend)
    bone('hip_L', 'hips', { rotation: 180, length: P.pelvisWidth / 2 }),
    bone('knee_L', 'hip_L', { rotation: -90, length: P.thighLen, limits: DEFAULT_LIMITS.hip }),
    bone('ankle_L', 'knee_L', { rotation: 0, length: P.shinLen, limits: DEFAULT_LIMITS.knee }),
    bone('foot_L', 'ankle_L', { rotation: 0, length: P.footLen, limits: DEFAULT_LIMITS.ankle }),

    // Jambe droite
    bone('hip_R', 'hips', { rotation: 0, length: P.pelvisWidth / 2 }),
    bone('knee_R', 'hip_R', { rotation: 90, length: P.thighLen, limits: DEFAULT_LIMITS.hip }),
    bone('ankle_R', 'knee_R', { rotation: 0, length: P.shinLen, limits: DEFAULT_LIMITS.knee }),
    bone('foot_R', 'ankle_R', { rotation: 0, length: P.footLen, limits: DEFAULT_LIMITS.ankle }),
  ];

  // Slots : un par bone visible.
  // Z-order de docs/knowledge/05_LAYERING_AND_ZORDER.md
  // Convention : les bones hip_L / hip_R sont des CONNECTEURS pelviens (courts,
  // horizontaux). Les parts jambes (cuisse/tibia/pied) sont attachées aux bones
  // knee_L/ankle_L/foot_L qui sont eux les segments visuels.
  const slots = [
    slot('hair_back',  'head',       10, 'hair_back'),
    slot('arm_back',   'shoulder_L', 20, 'upperArm_L'),
    slot('forearm_back','elbow_L',   21, 'forearm_L'),
    slot('hand_back',  'wrist_L',    22, 'hand_L_open'),
    slot('leg_back',   'knee_L',     25, 'thigh_L'),
    slot('shin_back',  'ankle_L',    26, 'shin_L'),
    slot('foot_back',  'foot_L',     27, 'foot_L'),
    slot('pelvis',     'hips',       30, 'pelvis'),
    slot('torso',      'chest',      31, 'torso'),
    slot('leg_front',  'knee_R',     35, 'thigh_R'),
    slot('shin_front', 'ankle_R',    36, 'shin_R'),
    slot('foot_front', 'foot_R',     37, 'foot_R'),
    slot('arm_front',  'shoulder_R', 50, 'upperArm_R'),
    slot('forearm_front','elbow_R',  51, 'forearm_R'),
    slot('hand_front', 'wrist_R',    52, 'hand_R_open'),
    slot('neck',       'neck',       55, 'neck'),
    slot('head',       'head',       60, 'head'),
    slot('face',       'head',       61, 'face'),
    slot('hair_front', 'head',       70, 'hair_front'),
  ];

  // Parts par défaut (une seule variante par slot, sauf les mains :
  // hand_R_open / hand_R_fist / hand_R_point pour montrer le pattern).
  const parts = [
    part('hair_back', 'head',  { pivot: { x: 0.5, y: 0.55 }, zIndex: 10 }),
    part('upperArm_L','shoulder_L', { pivot: { x: 0.5, y: 0.08 }, zIndex: 20 }),
    part('forearm_L', 'elbow_L',    { pivot: { x: 0.5, y: 0.08 }, zIndex: 21 }),
    part('hand_L_open','wrist_L',   { pivot: { x: 0.5, y: 0.1 }, zIndex: 22, variantGroup: 'hand_back' }),
    // Parts jambes attachées aux bones qui les représentent visuellement.
    part('thigh_L',   'knee_L',     { pivot: { x: 0.5, y: 0.08 }, zIndex: 25 }),
    part('shin_L',    'ankle_L',    { pivot: { x: 0.5, y: 0.08 }, zIndex: 26 }),
    part('foot_L',    'foot_L',     { pivot: { x: 0.3, y: 0.5 },  zIndex: 27 }),
    part('pelvis',    'hips',       { pivot: { x: 0.5, y: 0.5 },  zIndex: 30 }),
    part('torso',     'chest',      { pivot: { x: 0.5, y: 0.88 }, zIndex: 31 }),
    part('thigh_R',   'knee_R',     { pivot: { x: 0.5, y: 0.08 }, zIndex: 35 }),
    part('shin_R',    'ankle_R',    { pivot: { x: 0.5, y: 0.08 }, zIndex: 36 }),
    part('foot_R',    'foot_R',     { pivot: { x: 0.3, y: 0.5 },  zIndex: 37 }),
    part('upperArm_R','shoulder_R', { pivot: { x: 0.5, y: 0.08 }, zIndex: 50 }),
    part('forearm_R', 'elbow_R',    { pivot: { x: 0.5, y: 0.08 }, zIndex: 51 }),
    part('hand_R_open', 'wrist_R',  { pivot: { x: 0.5, y: 0.1 },  zIndex: 52, variantGroup: 'hand_front' }),
    part('hand_R_fist', 'wrist_R',  { pivot: { x: 0.5, y: 0.1 },  zIndex: 52, variantGroup: 'hand_front' }),
    part('hand_R_point','wrist_R',  { pivot: { x: 0.5, y: 0.1 },  zIndex: 52, variantGroup: 'hand_front' }),
    part('neck',      'neck',       { pivot: { x: 0.5, y: 0.8 },  zIndex: 55 }),
    part('head',      'head',       { pivot: { x: 0.5, y: 0.9 },  zIndex: 60 }),
    part('face',      'head',       { pivot: { x: 0.5, y: 0.9 },  zIndex: 61 }),
    part('hair_front','head',       { pivot: { x: 0.5, y: 0.9 },  zIndex: 70 }),
  ];

  return {
    schemaVersion: '1.0',
    id,
    name: opts.name ?? 'Humanoid Rig',
    kind: 'human',
    rigProfile: 'humanoid',
    defaultView: 'front',
    styleProfile: opts.styleProfile ?? { geometry: 'flat-stylized', headsTall: 6.8, outline: 'soft', shading: 'minimal' },
    views: opts.views ?? { front: { available: true }, sideLeft: { available: false }, back: { available: false } },
    parts,
    slots,
    bones,
    ikChains: [
      { id: 'arm_L', root: 'shoulder_L', middle: 'elbow_L', end: 'wrist_L', bendDirection: 'auto', allowStretch: false },
      { id: 'arm_R', root: 'shoulder_R', middle: 'elbow_R', end: 'wrist_R', bendDirection: 'auto', allowStretch: false },
      { id: 'leg_L', root: 'hip_L', middle: 'knee_L', end: 'ankle_L', bendDirection: 'auto', allowStretch: false },
      { id: 'leg_R', root: 'hip_R', middle: 'knee_R', end: 'ankle_R', bendDirection: 'auto', allowStretch: false },
    ],
    expressions: { neutral: {}, happy: {}, sad: {}, angry: {}, surprised: {}, eyesClosed: {} },
    poses: { idle: {} },
    clips: {},
    capabilities: {
      canWave: true, canWalk: true, canRun: true, canSit: true,
      canLookAt: true, canBlink: true, supportsIKArms: true, supportsIKLegs: true,
    },
  };
}
