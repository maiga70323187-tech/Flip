import { useEffect, useMemo, useRef, useState } from 'react';
import { resolveShape } from '../lib/interpolate.js';
import { simplify, toBezierPath } from '../lib/pathTools.js';

function ShapeSvg({ shape, t_ms, ghost }) {
  const { transform, style, props } = resolveShape(shape, t_ms);
  const tf = `translate(${transform.x} ${transform.y}) rotate(${transform.rotation}) scale(${transform.scale_x} ${transform.scale_y})`;
  const attrs = {
    fill: style.fill ?? 'none',
    stroke: style.stroke ?? 'none',
    strokeWidth: style.stroke_width ?? 0,
    strokeLinecap: style.stroke_linecap ?? 'round',
    strokeLinejoin: style.stroke_linejoin ?? 'round',
    strokeDasharray: style.stroke_dasharray || undefined,
    opacity: (style.opacity ?? 1) * (ghost ?? 1),
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

function DefsBlock({ defs = [] }) {
  return (
    <defs>
      <pattern id="flip-checker" width="16" height="16" patternUnits="userSpaceOnUse">
        <rect width="16" height="16" fill="#e5e6e9"/>
        <rect width="8" height="8" fill="#f5f6f8"/>
        <rect x="8" y="8" width="8" height="8" fill="#f5f6f8"/>
      </pattern>
      {defs.map(d => d.kind === 'linearGradient'
        ? <linearGradient key={d.id} id={d.id} x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2}>
            {d.stops.map((s, i) => <stop key={i} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity ?? 1}/>)}
          </linearGradient>
        : <radialGradient key={d.id} id={d.id} cx={d.cx} cy={d.cy} r={d.r}>
            {d.stops.map((s, i) => <stop key={i} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity ?? 1}/>)}
          </radialGradient>
      )}
    </defs>
  );
}

function bboxOf(shape) {
  const p = shape.props ?? {};
  switch (shape.type) {
    case 'rect':    return { w: p.width ?? 0, h: p.height ?? 0 };
    case 'ellipse': return { w: (p.rx ?? 0) * 2, h: (p.ry ?? 0) * 2 };
    default:        return { w: 60, h: 60 };
  }
}

export function Stage({ project, t_ms, onSelectShape, selectedId, tool, drawColor, strokeWidth, filled, onionSkin, activeVectorLayerId, onDraw, onDragTransform }) {
  const svgRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const [drawing, setDrawing] = useState(null); // { points } for freehand, or { start, end } for shapes
  const [dragging, setDragging] = useState(null); // { shape, layer_id, start_ms, start: {x,y} }

  useEffect(() => { setPan({ x: 0, y: 0 }); setZoom(1); }, [project?.id]);

  const svgToClient = () => svgRef.current?.getScreenCTM();
  const clientToSvg = (evt) => {
    const svg = svgRef.current;
    if (!svg) return [0, 0];
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return [0, 0];
    const inv = ctm.inverse();
    const p = pt.matrixTransform(inv);
    return [p.x, p.y];
  };

  const width = project?.width ?? 640;
  const height = project?.height ?? 360;
  const margin = 60;
  const viewBox = `${-margin} ${-margin} ${width + margin * 2} ${height + margin * 2}`;

  const onWheel = (e) => {
    if (!project) return;
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.min(8, Math.max(0.2, z * factor)));
  };

  const onMouseDown = (e) => {
    if (!project) return;
    if (e.button === 1 || e.altKey || e.shiftKey) { // pan
      setPanning({ x: e.clientX, y: e.clientY, sx: pan.x, sy: pan.y });
      return;
    }
    const [x, y] = clientToSvg(e);
    if (tool === 'freehand') {
      setDrawing({ kind: 'freehand', points: [[x, y]] });
    } else if (tool === 'rect' || tool === 'ellipse' || tool === 'line') {
      setDrawing({ kind: tool, start: [x, y], end: [x, y] });
    }
  };

  const onMouseMove = (e) => {
    if (panning) {
      const dx = (e.clientX - panning.x) / zoom;
      const dy = (e.clientY - panning.y) / zoom;
      setPan({ x: panning.sx + dx, y: panning.sy + dy });
      return;
    }
    if (drawing) {
      const [x, y] = clientToSvg(e);
      if (drawing.kind === 'freehand') setDrawing({ ...drawing, points: [...drawing.points, [x, y]] });
      else setDrawing({ ...drawing, end: [x, y] });
      return;
    }
    if (dragging) {
      const [x, y] = clientToSvg(e);
      const nx = dragging.start.tx + (x - dragging.start.x);
      const ny = dragging.start.ty + (y - dragging.start.y);
      onDragTransform?.({ ...dragging, x: nx, y: ny, phase: 'move' });
    }
  };

  const onMouseUp = (e) => {
    if (panning) return setPanning(false);
    if (drawing) { commitDrawing(); return setDrawing(null); }
    if (dragging) { onDragTransform?.({ ...dragging, phase: 'end' }); setDragging(null); }
  };

  function commitDrawing() {
    if (!drawing || !activeVectorLayerId) return;
    const fill = filled ? drawColor : 'none';
    const stroke = filled ? 'none' : drawColor;
    const sw = filled ? 0 : strokeWidth;
    if (drawing.kind === 'freehand') {
      if (drawing.points.length < 2) return;
      const pts = simplify(drawing.points, 1.4);
      const d = toBezierPath(pts);
      onDraw?.(activeVectorLayerId, { type: 'path', props: { d }, style: { fill, stroke, stroke_width: sw, stroke_linecap: 'round', stroke_linejoin: 'round' } });
    } else if (drawing.kind === 'rect') {
      const [x1, y1] = drawing.start, [x2, y2] = drawing.end;
      const w = Math.abs(x2 - x1), h = Math.abs(y2 - y1);
      const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
      onDraw?.(activeVectorLayerId, { type: 'rect', props: { width: w, height: h }, transform: { x: cx, y: cy }, style: { fill, stroke, stroke_width: sw } });
    } else if (drawing.kind === 'ellipse') {
      const [x1, y1] = drawing.start, [x2, y2] = drawing.end;
      const rx = Math.abs(x2 - x1) / 2, ry = Math.abs(y2 - y1) / 2;
      const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
      onDraw?.(activeVectorLayerId, { type: 'ellipse', props: { rx, ry }, transform: { x: cx, y: cy }, style: { fill, stroke, stroke_width: sw } });
    } else if (drawing.kind === 'line') {
      const [x1, y1] = drawing.start, [x2, y2] = drawing.end;
      onDraw?.(activeVectorLayerId, { type: 'line', props: { x1: 0, y1: 0, x2: x2 - x1, y2: y2 - y1 }, transform: { x: x1, y: y1 }, style: { fill: 'none', stroke: drawColor, stroke_width: strokeWidth || 2, stroke_linecap: 'round' } });
    }
  }

  const startShapeDrag = (shape, layer_id, e) => {
    if (tool !== 'select') return;
    e.stopPropagation();
    const [x, y] = clientToSvg(e);
    setDragging({ shape, layer_id, start_ms: t_ms, start: { x, y, tx: shape.transform.x, ty: shape.transform.y } });
    onSelectShape?.({ layer_id, shape });
  };

  const onionOffsets = useMemo(() => onionSkin ? [-2, -1, 1, 2].map(k => k * (1000 / (project?.fps ?? 24))) : [], [onionSkin, project?.fps]);

  if (!project) return <div className="stage placeholder">Aucun projet chargé.</div>;

  const selBox = (() => {
    if (!selectedId) return null;
    for (const l of project.layers) {
      if (l.kind !== 'vector') continue;
      const s = l.shapes?.find(x => x.id === selectedId);
      if (!s) continue;
      const { transform } = resolveShape(s, t_ms);
      const { w, h } = bboxOf(s);
      return { s, transform, w: w * transform.scale_x, h: h * transform.scale_y };
    }
    return null;
  })();

  return (
    <div className="stage" onWheel={onWheel}>
      <svg
        ref={svgRef}
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{ cursor: tool === 'select' ? (panning ? 'grabbing' : 'default') : 'crosshair' }}
      >
        {/* damier autour de la scène */}
        <rect x={-margin} y={-margin} width={width + margin * 2} height={height + margin * 2} fill="url(#flip-checker)"/>

        <DefsBlock defs={project.defs}/>

        <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`} transform-origin="center">
          {/* fond de scène */}
          <rect x={0} y={0} width={width} height={height} fill={project.background} shapeRendering="crispEdges"/>

          {/* onion skinning */}
          {onionOffsets.map(off => {
            const tt = t_ms + off;
            if (tt < 0 || tt > project.duration_ms) return null;
            return (
              <g key={off} opacity={0.18} style={{ pointerEvents: 'none' }}>
                {project.layers.filter(l => l.kind === 'vector' && l.visible).map(l => (
                  <g key={l.id}>{l.shapes.map(s => <ShapeSvg key={s.id} shape={s} t_ms={tt} ghost={0.6}/>)}</g>
                ))}
              </g>
            );
          })}

          {/* calques */}
          {project.layers.map(l => {
            if (!l.visible) return null;
            if (l.kind === 'raster') {
              const period = 1000 / (l.fps || 12);
              const idx = Math.min((l.frames.length || 1) - 1, Math.max(0, Math.floor(t_ms / period)));
              const f = l.frames[idx];
              return f?.image ? <image key={l.id} href={f.image} width={width} height={height} opacity={l.opacity}/> : null;
            }
            return (
              <g key={l.id} opacity={l.opacity}>
                {l.shapes.map(s => (
                  <g key={s.id} onMouseDown={(e) => startShapeDrag(s, l.id, e)}>
                    <ShapeSvg shape={s} t_ms={t_ms}/>
                  </g>
                ))}
              </g>
            );
          })}

          {/* poignée de sélection */}
          {selBox && (
            <g style={{ pointerEvents: 'none' }}>
              <rect
                x={selBox.transform.x - selBox.w * selBox.transform.anchor_x}
                y={selBox.transform.y - selBox.h * selBox.transform.anchor_y}
                width={selBox.w} height={selBox.h}
                transform={`rotate(${selBox.transform.rotation} ${selBox.transform.x} ${selBox.transform.y})`}
                fill="none" stroke="#0af" strokeWidth={1.5 / zoom} strokeDasharray={`${6 / zoom} ${4 / zoom}`}
              />
              <circle cx={selBox.transform.x} cy={selBox.transform.y} r={4 / zoom} fill="#0af"/>
            </g>
          )}

          {/* preview du trait en cours */}
          {drawing && drawing.kind === 'freehand' && drawing.points.length > 1 && (
            <path d={toBezierPath(drawing.points)} fill="none" stroke={drawColor} strokeWidth={strokeWidth || 2} strokeLinecap="round" strokeLinejoin="round" opacity={0.9}/>
          )}
          {drawing && drawing.kind === 'rect' && (() => {
            const [x1, y1] = drawing.start, [x2, y2] = drawing.end;
            return <rect x={Math.min(x1, x2)} y={Math.min(y1, y2)} width={Math.abs(x2 - x1)} height={Math.abs(y2 - y1)} fill={filled ? drawColor : 'none'} stroke={filled ? 'none' : drawColor} strokeWidth={filled ? 0 : strokeWidth}/>;
          })()}
          {drawing && drawing.kind === 'ellipse' && (() => {
            const [x1, y1] = drawing.start, [x2, y2] = drawing.end;
            return <ellipse cx={(x1 + x2) / 2} cy={(y1 + y2) / 2} rx={Math.abs(x2 - x1) / 2} ry={Math.abs(y2 - y1) / 2} fill={filled ? drawColor : 'none'} stroke={filled ? 'none' : drawColor} strokeWidth={filled ? 0 : strokeWidth}/>;
          })()}
          {drawing && drawing.kind === 'line' && (
            <line x1={drawing.start[0]} y1={drawing.start[1]} x2={drawing.end[0]} y2={drawing.end[1]} stroke={drawColor} strokeWidth={strokeWidth || 2} strokeLinecap="round"/>
          )}
        </g>
      </svg>
      <div className="stage-hud">
        <span>{Math.round(zoom * 100)}%</span>
        <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>Recadrer</button>
        <span className="hint">Molette : zoom · Alt/Shift-drag : pan</span>
      </div>
    </div>
  );
}
