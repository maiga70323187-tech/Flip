export function frameDurationMs(fps){return 1000/Number(fps||12)}
export function totalDurationMs(frames=[]){return frames.reduce((n,f)=>n+Number(f.duration_ms||0),0)}
export function clamp(v,min,max){return Math.min(max,Math.max(min,v))}
