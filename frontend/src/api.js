const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8787';

async function j(pathname, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}${pathname}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${pathname}: ${res.status}`);
  if (res.status === 204) return true;
  const ct = res.headers.get('content-type') ?? '';
  return ct.includes('application/json') ? res.json() : res.text();
}

export const api = {
  base: BASE,
  listProjects:  ()          => j('/api/projects'),
  createProject: (body)      => j('/api/projects', { method: 'POST', body }),
  getProject:    (id)        => j(`/api/projects/${id}`),
  patchProject:  (id, body)  => j(`/api/projects/${id}`, { method: 'PATCH', body }),
  addLayer:      (id, body)  => j(`/api/projects/${id}/layers`, { method: 'POST', body }),
  patchLayer:    (id, lid, body) => j(`/api/projects/${id}/layers/${lid}`, { method: 'PATCH', body }),
  deleteLayer:   (id, lid)   => j(`/api/projects/${id}/layers/${lid}`, { method: 'DELETE' }),
  addShape:      (id, lid, body) => j(`/api/projects/${id}/layers/${lid}/shapes`, { method: 'POST', body }),
  patchShape:    (id, lid, sid, body) => j(`/api/projects/${id}/layers/${lid}/shapes/${sid}`, { method: 'PATCH', body }),
  deleteShape:   (id, lid, sid) => j(`/api/projects/${id}/layers/${lid}/shapes/${sid}`, { method: 'DELETE' }),
  addKeyframe:   (id, lid, sid, body) => j(`/api/projects/${id}/layers/${lid}/shapes/${sid}/keyframes`, { method: 'POST', body }),
  patchKeyframe: (id, lid, sid, prop, kfid, body) => j(`/api/projects/${id}/layers/${lid}/shapes/${sid}/keyframes/${kfid}?property=${encodeURIComponent(prop)}`, { method: 'PATCH', body }),
  deleteKeyframe:(id, lid, sid, prop, kfid) => j(`/api/projects/${id}/layers/${lid}/shapes/${sid}/keyframes/${kfid}?property=${encodeURIComponent(prop)}`, { method: 'DELETE' }),
  addBone:       (id, lid, body) => j(`/api/projects/${id}/layers/${lid}/bones`, { method: 'POST', body }),
  patchBone:     (id, lid, bid, body) => j(`/api/projects/${id}/layers/${lid}/bones/${bid}`, { method: 'PATCH', body }),
  deleteBone:    (id, lid, bid) => j(`/api/projects/${id}/layers/${lid}/bones/${bid}`, { method: 'DELETE' }),
  addBoneKf:     (id, lid, bid, body) => j(`/api/projects/${id}/layers/${lid}/bones/${bid}/keyframes`, { method: 'POST', body }),
  solveIK:       (id, body) => j(`/api/projects/${id}/ik/solve`, { method: 'POST', body }),
  addDef:        (id, body)  => j(`/api/projects/${id}/defs`, { method: 'POST', body }),
  addDecor:      (id, body)  => j(`/api/projects/${id}/decor`, { method: 'POST', body }),
  export:        (id, body)  => j(`/api/projects/${id}/export`, { method: 'POST', body }),
  render:        (id, t)     => `${BASE}/api/projects/${id}/render?t_ms=${t}`,
  manifest:      (id)        => j(`/api/projects/${id}/manifest`),
};
