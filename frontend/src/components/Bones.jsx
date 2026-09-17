import { computeBoneTransforms } from '../lib/rigging.js';

export function BonesOverlay({ project, t_ms, zoom, selectedBoneId, onSelectBone, onStartJointDrag, onStartTipDrag, tool }) {
  return (
    <g style={{ pointerEvents: tool === 'select' || tool === 'bone' ? 'auto' : 'none' }}>
      {project.layers.map(layer => {
        if (layer.kind !== 'vector' || !layer.visible || !layer.bones?.length) return null;
        const bt = computeBoneTransforms(layer.bones, t_ms);
        return (
          <g key={layer.id}>
            {layer.bones.map(b => {
              const t = bt[b.id];
              if (!t) return null;
              const isSel = b.id === selectedBoneId;
              return (
                <g key={b.id}>
                  <line x1={t.x} y1={t.y} x2={t.tipX} y2={t.tipY} stroke={isSel ? '#f6b352' : '#7cd0ff'} strokeWidth={3 / zoom} strokeLinecap="round" opacity={0.85}
                    style={{ cursor: 'pointer' }} onMouseDown={(e) => { e.stopPropagation(); onSelectBone?.(layer.id, b); }}/>
                  {/* joint (origine) */}
                  <circle cx={t.x} cy={t.y} r={6 / zoom} fill={isSel ? '#f6b352' : '#7cd0ff'} stroke="#fff" strokeWidth={1.5 / zoom}
                    style={{ cursor: 'grab' }}
                    onMouseDown={(e) => { e.stopPropagation(); onSelectBone?.(layer.id, b); onStartJointDrag?.(layer, b, e); }}/>
                  {/* tip */}
                  <circle cx={t.tipX} cy={t.tipY} r={4 / zoom} fill="#fff" stroke={isSel ? '#f6b352' : '#7cd0ff'} strokeWidth={1.5 / zoom}
                    style={{ cursor: 'grab' }}
                    onMouseDown={(e) => { e.stopPropagation(); onSelectBone?.(layer.id, b); onStartTipDrag?.(layer, b, e); }}/>
                </g>
              );
            })}
          </g>
        );
      })}
    </g>
  );
}
