const BASE = process.env.FLIP_API_URL ?? 'http://localhost:8787';

export async function callApi(pathname, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}${pathname}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API ${method} ${pathname} -> ${res.status}: ${await res.text()}`);
  const ct = res.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) return res.json();
  return res.text();
}

export function asContent(v) {
  const text = typeof v === 'string' ? v : JSON.stringify(v, null, 2);
  return { content: [{ type: 'text', text }] };
}
