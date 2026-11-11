#!/usr/bin/env node
// Doctor: everything the app needs to run, checked in one command.
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
let fail = 0;
const ok = (m) => console.log(`  ok   ${m}`);
const bad = (m) => { console.log(`  FAIL ${m}`); fail++; };

console.log('privilege-k8-kits doctor');

for (const f of ['kits/one-gateway-privilege-k8.zip', 'kits/multi-gateway-privilege-k8.zip',
                 'kits/checksums.json', 'docs/PingOne-Privilege-AI-Gateway-K8s-Deployment-Guide.pdf',
                 'public/index.html', 'public/standalone-ui.css']) {
  (fs.existsSync(path.join(ROOT, f)) ? ok : bad)(f);
}

try {
  const cs = JSON.parse(fs.readFileSync(path.join(ROOT, 'kits/checksums.json'), 'utf8'));
  const { createHash } = await import('node:crypto');
  for (const [file, hash] of Object.entries(cs)) {
    const actual = createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'kits', file))).digest('hex');
    (actual === hash ? ok : bad)(`checksum ${file}`);
  }
} catch (e) { bad(`checksums: ${e.message}`); }

const health = await new Promise((resolve) => {
  const req = http.get('http://127.0.0.1:7809/api/health', { timeout: 2000 }, (res) => {
    let d = '';
    res.on('data', (c) => (d += c));
    res.on('end', () => resolve(res.statusCode === 200 && d.includes('demo-health/1')));
  });
  req.on('error', () => resolve(false));
  req.on('timeout', () => { req.destroy(); resolve(false); });
});
(health ? ok : bad)('GET /api/health returns demo-health/1 (app running?)');

process.exit(fail ? 1 : 0);
