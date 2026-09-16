import { resolveShape } from '../lib/interpolate.js';

function Shape({ shape, t_ms }) {
  const { transform, style, props } = resolveShape(shape, t_ms);
  const tf = `translate(${transform.x} ${transform.y}) rotate(${transform.rotation}) scale(${transform.scale_x} ${transform.scale_y})`;
  const attrs = {
    fill: style.fill ?? 'none',
    stroke: style.stroke ?? 'none',
    strokeWidth: style.stroke_width ?? 0,
    opacity: style.opacity ?? 1,
    transform: tf,
  };
  switch (shape.type) {
    case 'rect':    return <rect x={-((props.width ?? 0) * transform.anchor_x)} y={-((props.height ?? 0) * transform.anchor_y)} width={props.width} height={props.height} rx={props.rx ?? 0} ry={props.ry ?? 0} {...attrs}/>;
    case 'ellipse': return <ellipse cx={0} cy={0} rx={props.rx} ry={props.ry} {...attrs}/>;
    case 'path':    return <path d={props.d} {...attrs}/>;
    case 'polygon': return <polygon points={props.points} {...attrs}/>;
    case 'line':    return <line x1={props.x1} y1={props.y1} x2={props.x2} y2={props.y2} {...attrs}/>;
    case 'text':    return <text x={0} y={0} fontFamily={props.font_family} fontSize={props.font_size} fontWeight={props.font_weight} {...attrs}>{props.text}</text>;
    default: return null;
  }
}

export function Stage({ project, t_ms, onSelectShape, selectedId }) {
  if (!project) return <div className="stage placeholder">Aucun projet chargé.</div>;
  return (
    <div className="stage">
      <svg viewBox={`0 0 ${project.width} ${project.height}`} preserveAspectRatio="xMidYMid meet">
        <rect width="100%" height="100%" fill={project.background}/>
        {project.layers.map(l => {
          if (!l.visible) return null;
          if (l.kind === 'raster') {
            const period = 1000 / (l.fps || 12);
            const idx = Math.min((l.frames.length || 1) - 1, Math.max(0, Math.floor(t_ms / period)));
            const f = l.frames[idx];
            return f?.image ? <image key={l.id} href={f.image} width={project.width} height={project.height} opacity={l.opacity}/> : null;
          }
          return (
            <g key={l.id} opacity={l.opacity}>
              {l.shapes.map(s => (
                <g key={s.id} onClick={() => onSelectShape?.({ layer_id: l.id, shape: s })} style={{ cursor: 'pointer', outline: s.id === selectedId ? '1px dashed #0af' : 'none' }}>
                  <Shape shape={s} t_ms={t_ms}/>
                </g>
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
