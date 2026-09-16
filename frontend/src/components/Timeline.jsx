import { useEffect, useRef, useState } from 'react';

export function Timeline({ project, t_ms, setT, playing, setPlaying }) {
  const raf = useRef(0);
  useEffect(() => {
    if (!playing || !project) return;
    let last = performance.now();
    const step = (now) => {
      const dt = now - last; last = now;
      setT(t => {
        const nt = t + dt;
        return nt >= project.duration_ms ? 0 : nt;
      });
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, project?.duration_ms]);

  if (!project) return null;
  return (
    <div className="timeline">
      <div className="controls">
        <button onClick={() => setPlaying(p => !p)}>{playing ? '⏸' : '▶'}</button>
        <span>{Math.round(t_ms)} / {project.duration_ms} ms · {project.fps} fps</span>
      </div>
      <input type="range" min={0} max={project.duration_ms} step={1000 / project.fps} value={t_ms} onChange={e => setT(Number(e.target.value))}/>
      <div className="tracks">
        {project.layers.map(l => (
          <div key={l.id} className="track">
            <span className="tname">{l.kind === 'raster' ? '🖌️' : '⬢'} {l.name}</span>
            <div className="lane">
              {l.kind === 'vector' && l.shapes.flatMap(s => Object.entries(s.tracks || {}).flatMap(([prop, kfs]) => kfs.map(k => (
                <div key={s.id + prop + k.id} className="kf" style={{ left: `${(k.time_ms / project.duration_ms) * 100}%` }} title={`${s.type}.${prop}=${JSON.stringify(k.value)} @ ${k.time_ms}ms`}/>
              ))))}
              {l.kind === 'raster' && l.frames.map((f, i) => (
                <div key={f.id} className="rf" style={{ left: `${((i * (1000 / (l.fps || 12))) / project.duration_ms) * 100}%` }}/>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
