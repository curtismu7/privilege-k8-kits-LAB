import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { hostAllowed, labAllowedHosts, writeAllowed } from './safety.js';

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT) || 7809;
const STATIC_DIR = path.resolve('public');
const KITS_DIR = path.resolve('kits');
const LAB_HOSTS = labAllowedHosts(process.env.LAB_ALLOWED_HOSTS);

const state = {
  // Single runtime: both sources serve the same packaged artifacts from disk.
  source: 'mock',
};

const KITS = [
  {
    id: 'one-gateway-privilege-k8',
    name: '1 Gateway Privilege K8',
    file: 'one-gateway-privilege-k8.zip',
    tag: 'Single node',
    description:
      'Simplest working deployment: one gateway node, no Redis, no load balancer. ' +
      'Client registrations live in gateway memory and are lost on a restart ' +
      '(clients register again). Ships the 18-page deployment guide with a Quick Start.',
  },
  {
    id: 'multi-gateway-privilege-k8',
    name: 'Multi-Gateway Privilege K8',
    file: 'multi-gateway-privilege-k8.zip',
    tag: 'High availability',
    description:
      'Full HA platform: shared Redis (registrations survive restarts and failover), ' +
      'the integrated load balancer (client pinning, callback routing, health checks), ' +
      'and one Helm release per gateway node in a single mesh cluster.',
  },
];

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.ico': 'image/x-icon',
};

function nowIso() {
  return new Date().toISOString();
}

function json(res, code, body, extra) {
  const data = JSON.stringify(body);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...(extra || {}),
  });
  res.end(data);
}

function kitMeta(id) {
  return KITS.find((k) => k.id === id);
}

function kitBytes(file) {
  return fs.statSync(path.join(KITS_DIR, file)).size;
}

function kitChecksums() {
  return JSON.parse(fs.readFileSync(path.join(KITS_DIR, 'checksums.json'), 'utf8'));
}

const server = http.createServer((req, res) => {
  if (!hostAllowed(req.headers.host, LAB_HOSTS, PORT)) {
    json(res, 403, { error: 'bad_client', message: 'this server accepts loopback clients only' });
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodedPath(parsedUrl.pathname);

  // POST /mode — rule 19 mode switch (Express-style name: app.post('/mode')).
  if (req.method === 'POST' && pathname === '/api/mode') {
    if (!writeAllowed(req.method, req.headers, LAB_HOSTS, PORT)) {
      json(res, 403, { error: 'bad_origin', message: 'this server accepts same-origin writes only' });
      return;
    }
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 4096) req.destroy(); });
    req.on('end', () => {
      let source;
      try { source = JSON.parse(body || '{}').source; } catch { source = undefined; }
      if (source !== 'mock' && source !== 'real') {
        json(res, 409, { error: 'bad_mode', message: 'source must be exactly "mock" or "real"' });
        return;
      }
      // Both sources serve the same packaged artifacts from disk; the toggle
      // records the selection so the UI can show which is current.
      state.source = source;
      json(res, 200, { source: state.source, realAvailable: true });
    });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/health') {
    json(res, 200, {
      schema: 'demo-health/1',
      at: nowIso(),
      state: 'ready',
      runtime: 'offline',
      demo: { id: 'privilege-k8-kits', name: 'Agent Privilege K8 Deployment Kits', version: '1.0.0' },
    });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/info') {
    const checksums = kitChecksums();
    json(res, 200, {
      schema: 'kits-info/1',
      at: nowIso(),
      source: state.source,
      realAvailable: true,
      kits: KITS.map((k) => ({
        id: k.id,
        name: k.name,
        tag: k.tag,
        description: k.description,
        file: k.file,
        bytes: kitBytes(k.file),
        sha256: checksums[k.file] || null,
        url: `/kits/${k.file}`,
      })),
      guide: { name: 'PingOne-Privilege-AI-Gateway-K8s-Deployment-Guide.pdf', url: '/guide' },
    });
    return;
  }

  if (req.method === 'GET' && pathname.startsWith('/api/download/')) {
    const id = pathname.slice('/api/download/'.length);
    const kit = kitMeta(id);
    if (!kit) {
      json(res, 404, { error: 'not_found', message: `no kit with id ${JSON.stringify(id)}` });
      return;
    }
    const abs = path.join(KITS_DIR, kit.file);
    if (!fs.existsSync(abs)) {
      json(res, 500, { error: 'missing_artifact', message: `${kit.file} is not packaged in this app` });
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'application/zip',
      'Content-Length': kitBytes(kit.file),
      'Content-Disposition': `attachment; filename="${kit.file}"`,
      'Cache-Control': 'no-store',
    });
    fs.createReadStream(abs).pipe(res);
    return;
  }

  if (req.method === 'GET' && pathname === '/guide') {
    const abs = path.join('docs', 'PingOne-Privilege-AI-Gateway-K8s-Deployment-Guide.pdf');
    if (!fs.existsSync(abs)) {
      json(res, 500, { error: 'missing_artifact', message: 'guide PDF is not packaged' });
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Length': fs.statSync(abs).size,
      'Content-Disposition': 'inline; filename="PingOne-Privilege-AI-Gateway-K8s-Deployment-Guide.pdf"',
      'Cache-Control': 'no-store',
    });
    fs.createReadStream(abs).pipe(res);
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    json(res, 405, { error: 'method_not_allowed', message: 'read-only app: GET and HEAD only' });
    return;
  }

  if (pathname === '/' || pathname === '/index.html') {
    serveFile(res, path.join(STATIC_DIR, 'index.html'));
    return;
  }
  if (pathname.startsWith('/kits/')) {
    const name = path.basename(pathname);
    if (!KITS.some((k) => k.file === name)) {
      json(res, 404, { error: 'not_found' });
      return;
    }
    serveFile(res, path.join(KITS_DIR, name), { 'Content-Disposition': `attachment; filename="${name}"` });
    return;
  }
  serveFile(res, path.join(STATIC_DIR, pathname.replace(/^\/+/, '')));
});

function decodedPath(p) {
  try {
    return decodeURIComponent(p);
  } catch {
    return '\u0000invalid';
  }
}

function serveFile(res, abs, extra) {
  const rel = path.relative(process.cwd(), abs);
  if (rel.startsWith('..') || rel.includes('.removed-stale')) {
    json(res, 403, { error: 'bad_path' });
    return;
  }
  fs.readFile(abs, (err, data) => {
    if (err) {
      json(res, 404, { error: 'not_found', message: 'no such file' });
      return;
    }
    res.writeHead(200, {
      'Content-Type': mime[path.extname(abs)] || 'application/octet-stream',
      'Content-Length': data.length,
      'Cache-Control': 'no-store',
      ...(extra || {}),
    });
    res.end(data);
  });
}

server.listen(PORT, HOST, () => {
  console.log(`privilege-k8-kits listening on http://${HOST}:${PORT}`);
});
