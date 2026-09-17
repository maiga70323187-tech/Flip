import { useState } from 'react';
import { PRESETS, cubicBezier } from '../lib/bezier.js';

export function EasingEditor({ value, onChange }) {
  const [preset, setPreset] = useState(value?.easing ?? 'ease-in-out');
  const [b, setB] = useState(value?.bezier ?? PRESETS['ease-in-out']);

  const apply = (easing, bezier) => {
    setPreset(easing);
    if (bezier) setB(bezier);
    onChange({ easing, bezier: easing === 'bezier' ? bezier : undefined });
  };

  const size = 120;
  const curve = cubicBezier(b[0], b[1], b[2], b[3]);
  const path = ['M 0 ' + size];
  for (let i = 0; i <= 40; i++) {
    const x = i / 40;
    const y = curve(x);
    path.push(`L ${x * size} ${(1 - y) * size}`);
  }

  return (
    <div className="easing-editor">
      <select value={preset} onChange={e => {
        const p = e.target.value;
        if (p === 'bezier' || p === 'step') apply(p, b);
        else apply(p, PRESETS[p]);
      }}>
        {['linear', 'ease-in', 'ease-out', 'ease-in-out', 'step', 'bezier'].map(k => <option key={k}>{k}</option>)}
      </select>
      <svg width={size} height={size} className="easing-curve">
        <rect width={size} height={size} fill="rgba(127,127,127,0.08)"/>
        <line x1={0} y1={size} x2={size} y2={0} stroke="rgba(127,127,127,0.4)" strokeDasharray="3 3"/>
        <path d={path.join(' ')} fill="none" stroke="var(--accent, #0af)" strokeWidth={2}/>
        <line x1={0} y1={size} x2={b[0] * size} y2={(1 - b[1]) * size} stroke="rgba(127,127,127,0.5)"/>
        <line x1={size} y1={0} x2={b[2] * size} y2={(1 - b[3]) * size} stroke="rgba(127,127,127,0.5)"/>
        <circle cx={b[0] * size} cy={(1 - b[1]) * size} r={5} fill="var(--accent, #0af)" style={{ cursor: 'grab' }}
          onMouseDown={(e) => dragHandle(e, size, 0, b, apply)}/>
        <circle cx={b[2] * size} cy={(1 - b[3]) * size} r={5} fill="var(--accent, #0af)" style={{ cursor: 'grab' }}
          onMouseDown={(e) => dragHandle(e, size, 2, b, apply)}/>
      </svg>
      {preset === 'bezier' && (
        <div className="bezier-vals">
          {b.map((v, i) => (
            <input key={i} type="number" step={0.05} value={v} onChange={e => {
              const nb = [...b]; nb[i] = Number(e.target.value); apply('bezier', nb);
            }}/>
          ))}
        </div>
      )}
    </div>
  );
}

function dragHandle(e, size, idx, b, apply) {
  e.preventDefault();
  const svg = e.currentTarget.ownerSVGElement;
  const rect = svg.getBoundingClientRect();
  const move = (ev) => {
    const x = Math.max(0, Math.min(1, (ev.clientX - rect.left) / size));
    const y = Math.max(-0.5, Math.min(1.5, 1 - (ev.clientY - rect.top) / size));
    const nb = [...b]; nb[idx] = x; nb[idx + 1] = y;
    apply('bezier', nb);
  };
  const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', up);
}
