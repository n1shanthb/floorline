import http from 'node:http';

const PORT = Number(process.env.FLOORLINE_PROXY_PORT ?? 4190);
const PROVIDERS = [
  'https://near-testnet.drpc.org',
  'https://test.rpc.fastnear.com',
];
const ALLOWED = new Set(['status', 'block', 'query', 'gas_price', 'tx']);

const headers = {
  'access-control-allow-origin': process.env.FLOORLINE_STAGING_ORIGIN ?? 'http://127.0.0.1:4187',
  'access-control-allow-headers': 'content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
  'content-type': 'application/json',
  'cache-control': 'no-store',
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers); res.end(); return;
  }
  if (req.method !== 'POST' || req.url !== '/') {
    res.writeHead(404, headers); res.end('{"error":"not found"}'); return;
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks);
  let parsed;
  try { parsed = JSON.parse(body); } catch {
    res.writeHead(400, headers); res.end('{"error":"invalid json"}'); return;
  }
  if (!ALLOWED.has(parsed.method)) {
    res.writeHead(403, headers); res.end(JSON.stringify({ error: 'read-only RPC method denied' })); return;
  }
  const failures = [];
  for (const provider of PROVIDERS) {
    try {
      const upstream = await fetch(provider, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body,
        signal: globalThis.AbortSignal.timeout(20_000),
      });
      const text = await upstream.text();
      if (!upstream.ok) { failures.push(`${provider}:${upstream.status}`); continue; }
      const result = JSON.parse(text);
      if (result.error?.code === -32000 || result.error?.cause?.name === 'TOO_MANY_REQUESTS') {
        failures.push(`${provider}:rpc-rate-limit`); continue;
      }
      res.writeHead(200, { ...headers, 'x-floorline-rpc-provider': provider });
      res.end(text); return;
    } catch (error) {
      failures.push(`${provider}:${error instanceof Error ? error.name : 'error'}`);
    }
  }
  res.writeHead(503, headers);
  res.end(JSON.stringify({ jsonrpc: '2.0', id: parsed.id ?? null, error: { code: -32098, message: 'All read-only testnet RPC providers unavailable', data: failures } }));
});

server.listen(PORT, '127.0.0.1', () => console.log(`Read-only testnet RPC proxy: http://127.0.0.1:${PORT}`));
