import { useEffect, useMemo, useRef, useState } from 'react';
import { cubicBezier, PRESETS } from '../lib/bezier.js';

const PROPS = ['x', 'y', 'rotation', 'scale_x', 'scale_y', 'opacity', 'stroke_width'];
const COLORS = { x: '#ff6b6b', y: '#5ac8fa', rotation: '#f6b352', scale_x: '#b28dff', scale_y: '#a78bfa', opacity: '#4dd0a1', stroke_width: '#e2b6ff' };

function bezierFromKF(k) {
  if (k.easing === 'bezier' && Array.isArray(k.bezier) && k.bezier.length === 4) return k.bezier;
  return PRESETS[k.easing] ?? PRESETS.linear;
}

function sampleSegment(a, b, samples = 24) {
  const [x1, y1, x2, y2] = bezierFromKF(a);
  const f = cubicBezier(x1, y1, x2, y2);
  const pts = [];
  for (let i = 0; i <= samples; i++) {
    const u = i / samples;
    const eased = f(u);
    const time = a.time_ms + (b.time_ms - a.time_ms) * u;
    const value = a.value + (b.value - a.value) * eased;
    pts.push([time, value]);
  }
  return pts;
}

export function GraphEditor({ project, t_ms, setT, selected, onPatchKeyframe, onDeleteKeyframe, onClose }) {
  const [visibleProps, setVisibleProps] = useState({ x: true, y: true, rotation: true });
  const [selectedKF, setSelectedKF] = useState(null); // { property, id }
  const svgRef = useRef(null);
  const [dragging, setDragging] = useState(null);

  const shape = selected?.shape;
  const layer_id = selected?.layer_id;
  const tracks = shape?.tracks ?? {};

  // Domaines : X = [0, duration_ms], Y = min/max des valeurs visibles (avec marge)
  const duration = project?.duration_ms ?? 1000;
  const yDomain = useMemo(() => {
    let mn = Infinity, mx = -Infinity;
    for (const p of PROPS) {
      if (!visibleProps[p] || !tracks[p]) continue;
      for (const k of tracks[p]) {
        if (typeof k.value !== 'number') continue;
        if (k.value < mn) mn = k.value;
        if (k.value > mx) mx = k.value;
      }
    }
    if (!isFinite(mn) || !isFinite(mx)) { mn = 0; mx = 100; }
    if (mn === mx) { mn -= 10; mx += 10; }
    const pad = (mx - mn) * 0.15;
    return [mn - pad, mx + pad];
  }, [tracks, visibleProps]);

  const W = 900, H = 260;
  const padL = 44, padR = 12, padT = 12, padB = 26;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const xToPx = (t) => padL + (t / duration) * plotW;
  const yToPx = (v) => padT + (1 - (v - yDomain[0]) / (yDomain[1] - yDomain[0])) * plotH;
  const pxToX = (px) => Math.max(0, Math.min(duration, ((px - padL) / plotW) * duration));
  const pxToY = (py) => yDomain[1] - ((py - padT) / plotH) * (yDomain[1] - yDomain[0]);

  const clientToSvg = (evt) => {
    const svg = svgRef.current; if (!svg) return [0, 0];
    const pt = svg.createSVGPoint(); pt.x = evt.clientX; pt.y = evt.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    return [p.x, p.y];
  };

  // Ticks
  const xTicks = useMemo(() => {
    const target = 8;
    const raw = duration / target;
    const nice = [50, 100, 200, 500, 1000, 2000, 5000, 10000];
    const step = nice.find(s => s >= raw) ?? nice[nice.length - 1];
    const arr = [];
    for (let t = 0; t <= duration; t += step) arr.push(t);
    return arr;
  }, [duration]);
  const yTicks = useMemo(() => {
    const [a, b] = yDomain; const raw = (b - a) / 5;
    const magn = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = Math.max(1, Math.round(raw / magn) * magn);
    const arr = [];
    const start = Math.ceil(a / step) * step;
    for (let v = start; v <= b; v += step) arr.push(v);
    return arr;
  }, [yDomain]);

  const activeTracks = PROPS.filter(p => visibleProps[p] && tracks[p]?.length);

  const onMouseMove = (e) => {
    if (!dragging) return;
    const [mx, my] = clientToSvg(e);
    const nt = Math.round(pxToX(mx));
    const nv = Math.round(pxToY(my) * 100) / 100;
    if (dragging.kind === 'kf') {
      onPatchKeyframe?.({ property: dragging.property, kf_id: dragging.kf_id, patch: { time_ms: nt, value: nv }, phase: 'move' });
    } else if (dragging.kind === 'handleOut' || dragging.kind === 'handleIn') {
      const track = tracks[dragging.property];
      const idx = track.findIndex(k => k.id === dragging.kf_id);
      if (idx < 0) return;
      const a = track[idx];
      const b = dragging.kind === 'handleOut' ? track[idx + 1] : track[idx - 1];
      if (!b) return;
      const from = dragging.kind === 'handleOut' ? a : b;
      const to   = dragging.kind === 'handleOut' ? b : a;
      // Convert (mx, my) en fraction (fx, fy) sur ce segment
      const dx = to.time_ms - from.time_ms;
      const dv = to.value - from.value;
      const fx = dx !== 0 ? Math.max(0, Math.min(1, (nt - from.time_ms) / dx)) : 0;
      const fy = dv !== 0 ? (nv - from.value) / dv : 0;
      const cur = bezierFromKF(from);
      const bez = [...cur];
      if (dragging.kind === 'handleOut') { bez[0] = fx; bez[1] = fy; }
      else { bez[2] = fx; bez[3] = fy; }
      onPatchKeyframe?.({ property: dragging.property === 'handleIn' ? dragging.property : from === a ? dragging.property : dragging.property,
        kf_id: from.id, patch: { easing: 'bezier', bezier: bez }, phase: 'move' });
    } else if (dragging.kind === 'playhead') {
      setT(Math.round(nt));
    }
  };
  const onMouseUp = () => {
    if (dragging) onPatchKeyframe?.({ ...dragging, phase: 'end' });
    setDragging(null);
  };

  useEffect(() => {
    if (!dragging) return;
    const mm = (e) => onMouseMove(e);
    const mu = () => onMouseUp();
    window.addEventListener('mousemove', mm);
    window.addEventListener('mouseup', mu);
    return () => { window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', mu); };
  }, [dragging]);

  useEffect(() => {
    const onKey = (e) => {
      if (!selectedKF) return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onDeleteKeyframe?.(selectedKF);
        setSelectedKF(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedKF]);

  if (!project) return null;

  return (
    <div className="graph-editor">
      <header>
        <h3>Graph editor {shape ? `· ${shape.type} · ${shape.id.slice(0, 6)}` : ''}</h3>
        <div className="prop-toggles">
          {PROPS.map(p => (
            <label key={p} style={{ color: COLORS[p] }}>
              <input type="checkbox" checked={!!visibleProps[p]} onChange={e => setVisibleProps(v => ({ ...v, [p]: e.target.checked }))}/>
              {p}
            </label>
          ))}
        </div>
        <button onClick={onClose} className="close">×</button>
      </header>
      {!shape && <p className="hint">Sélectionnez une forme sur la scène pour voir ses courbes.</p>}
      {shape && (
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: H }}>
          {/* fond */}
          <rect x={padL} y={padT} width={plotW} height={plotH} fill="rgba(127,127,127,0.06)" />

          {/* gridlines */}
          {xTicks.map(t => (
            <g key={'x' + t}>
              <line x1={xToPx(t)} y1={padT} x2={xToPx(t)} y2={padT + plotH} stroke="rgba(127,127,127,0.15)"/>
              <text x={xToPx(t)} y={H - 8} fontSize="10" textAnchor="middle" fill="currentColor" opacity="0.6">{t}ms</text>
            </g>
          ))}
          {yTicks.map(v => (
            <g key={'y' + v}>
              <line x1={padL} y1={yToPx(v)} x2={padL + plotW} y2={yToPx(v)} stroke="rgba(127,127,127,0.15)"/>
              <text x={padL - 4} y={yToPx(v) + 3} fontSize="10" textAnchor="end" fill="currentColor" opacity="0.6">{Math.round(v * 100) / 100}</text>
            </g>
          ))}

          {/* playhead */}
          <line x1={xToPx(t_ms)} y1={padT} x2={xToPx(t_ms)} y2={padT + plotH} stroke="#0af" strokeWidth={1.5}/>
          <rect x={xToPx(t_ms) - 5} y={padT - 4} width={10} height={6} fill="#0af"
            style={{ cursor: 'ew-resize' }}
            onMouseDown={(e) => { e.preventDefault(); setDragging({ kind: 'playhead' }); }}/>

          {/* tracks */}
          {activeTracks.map(prop => {
            const track = tracks[prop];
            if (!track || track.length === 0) return null;
            const color = COLORS[prop];
            // trace
            const pathPts = [];
            if (track.length === 1) pathPts.push([track[0].time_ms, track[0].value]);
            for (let i = 0; i < track.length - 1; i++) {
              const seg = sampleSegment(track[i], track[i + 1]);
              if (i > 0) seg.shift();
              pathPts.push(...seg);
            }
            const d = pathPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xToPx(p[0])} ${yToPx(p[1])}`).join(' ');
            return (
              <g key={prop}>
                <path d={d} fill="none" stroke={color} strokeWidth={1.5} opacity={0.9}/>
                {/* poignées cubic-bezier pour chaque segment */}
                {track.slice(0, -1).map((a, i) => {
                  const b = track[i + 1];
                  const bez = bezierFromKF(a);
                  const hOutT = a.time_ms + (b.time_ms - a.time_ms) * bez[0];
                  const hOutV = a.value + (b.value - a.value) * bez[1];
                  const hInT  = a.time_ms + (b.time_ms - a.time_ms) * bez[2];
                  const hInV  = a.value + (b.value - a.value) * bez[3];
                  const isSelSeg = selectedKF?.id === a.id || selectedKF?.id === b.id;
                  if (!isSelSeg) return null;
                  return (
                    <g key={'h' + a.id}>
                      <line x1={xToPx(a.time_ms)} y1={yToPx(a.value)} x2={xToPx(hOutT)} y2={yToPx(hOutV)} stroke={color} strokeOpacity={0.5} strokeDasharray="3 2"/>
                      <line x1={xToPx(b.time_ms)} y1={yToPx(b.value)} x2={xToPx(hInT)} y2={yToPx(hInV)} stroke={color} strokeOpacity={0.5} strokeDasharray="3 2"/>
                      <circle cx={xToPx(hOutT)} cy={yToPx(hOutV)} r={4} fill={color} stroke="#fff" strokeWidth={1}
                        style={{ cursor: 'grab' }}
                        onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); setDragging({ kind: 'handleOut', property: prop, kf_id: a.id }); }}/>
                      <circle cx={xToPx(hInT)} cy={yToPx(hInV)} r={4} fill={color} stroke="#fff" strokeWidth={1}
                        style={{ cursor: 'grab' }}
                        onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); setDragging({ kind: 'handleIn', property: prop, kf_id: b.id }); }}/>
                    </g>
                  );
                })}
                {/* points */}
                {track.map(k => {
                  const isSel = selectedKF?.id === k.id;
                  return (
                    <rect key={k.id} x={xToPx(k.time_ms) - 5} y={yToPx(k.value) - 5} width={10} height={10} fill={isSel ? '#fff' : color} stroke={color} strokeWidth={1.5}
                      style={{ cursor: 'grab' }}
                      onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); setSelectedKF({ property: prop, id: k.id }); setDragging({ kind: 'kf', property: prop, kf_id: k.id }); }}
                    />
                  );
                })}
              </g>
            );
          })}

          {/* légende */}
          <g transform={`translate(${padL + 6} ${padT + 6})`}>
            {activeTracks.map((p, i) => (
              <g key={p} transform={`translate(0 ${i * 14})`}>
                <rect width={10} height={10} fill={COLORS[p]}/>
                <text x={14} y={9} fontSize="10" fill="currentColor" opacity="0.8">{p}</text>
              </g>
            ))}
          </g>
        </svg>
      )}
    </div>
  );
}
