import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

test('kit artifacts are packaged', () => {
  const kits = path.join(ROOT, 'kits');
  for (const f of ['one-gateway-privilege-k8.zip', 'multi-gateway-privilege-k8.zip']) {
    const p = path.join(kits, f);
    assert.ok(fs.existsSync(p), `${f} missing from kits/`);
    assert.ok(fs.statSync(p).size > 10000, `${f} suspiciously small`);
  }
});

test('checksums.json matches the packaged zips', async () => {
  const cs = JSON.parse(fs.readFileSync(path.join(ROOT, 'kits', 'checksums.json'), 'utf8'));
  for (const [file, hash] of Object.entries(cs)) {
    assert.match(hash, /^[a-f0-9]{64}$/, `${file} hash not sha256`);
  }
  // Recompute and compare (crypto, no external dependency).
  const { createHash } = await import('node:crypto');
  for (const [file, hash] of Object.entries(cs)) {
    const actual = createHash('sha256')
      .update(fs.readFileSync(path.join(ROOT, 'kits', file)))
      .digest('hex');
    assert.equal(actual, hash, `${file} checksum drift — run ./checksums.sh`);
  }
});

test('guide PDF is packaged', () => {
  const p = path.join(ROOT, 'docs', 'PingOne-Privilege-AI-Gateway-K8s-Deployment-Guide.pdf');
  assert.ok(fs.existsSync(p), 'guide PDF missing');
  const head = fs.readFileSync(p).subarray(0, 5).toString();
  assert.equal(head, '%PDF-', 'guide file is not a PDF');
});

test('guide has no stale identifiers', () => {
  const buf = fs.readFileSync(path.join(ROOT, 'docs', 'PingOne-Privilege-AI-Gateway-K8s-Deployment-Guide.pdf'), null);
  const text = buf.toString('latin1');
  // The PDF text is compressed, so scan the generator source instead.
  const gen = fs.readFileSync(path.join(ROOT, 'docs', 'build_guide.py'), 'utf8');
  for (const bad of ['agentless', 'opensearch', 'ping-devops', 'cmuir', 'orion']) {
    assert.ok(!gen.toLowerCase().includes(bad), `generator contains stale identifier "${bad}"`);
  }
});

test('kits zips contain no stale identifiers in entry names', async () => {
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const run = promisify(execFile);
  for (const f of ['one-gateway-privilege-k8.zip', 'multi-gateway-privilege-k8.zip']) {
    const { stdout } = await run('unzip', ['-l', path.join(ROOT, 'kits', f)]);
    // Only scan zip ENTRY lines (unzip prints "  length  date  time  name"),
    // not the "Archive: <absolute path>" header, which contains the local
    // checkout path and can false-positive on the author's username.
    // Date format is locale-dependent (11-05-2026 vs 2026-11-05), so match
    // any digit-dash-date shape.
    const entryLines = stdout
      .split('\n')
      .filter((l) => /^\s*\d+\s+\d[\d-]*\d\s+\d/.test(l));
    assert.ok(entryLines.length > 5, `${f}: unzip -l produced no entry lines`);
    for (const bad of ['agentless', 'opensearch', 'ping-devops', 'cmuir', 'orion']) {
      const hit = entryLines.find((l) => l.toLowerCase().includes(bad));
      assert.ok(!hit, `${f} contains stale entry "${bad}": ${hit}`);
    }
  }
});

test('server safety: host check refuses non-loopback, non-lab hosts', async () => {
  const { hostAllowed } = await import(path.join(ROOT, 'safety.js'));
  assert.equal(hostAllowed('127.0.0.1:7809', new Set(), 7809), true);
  assert.equal(hostAllowed('localhost:7809', new Set(), 7809), true);
  assert.equal(hostAllowed('evil.example.com:7809', new Set(), 7809), false);
  assert.equal(
    hostAllowed('privilege-k8-kits.local.ping-devops.com:7809',
      new Set(['privilege-k8-kits.local.ping-devops.com']), 7809),
    true
  );
  assert.equal(hostAllowed('other.local.ping-devops.com:7809', new Set(['privilege-k8-kits.local.ping-devops.com']), 7809), false);
});

test('mode switch: POST /api/mode flips source, 409 on bad value', async () => {
  const { spawn } = await import('node:child_process');
  const app = spawn('node', ['server.js'], { env: { ...process.env, PORT: '7819', HOST: '127.0.0.1' }, stdio: 'ignore' });
  try {
    await new Promise((r) => setTimeout(r, 800));
    const base = 'http://127.0.0.1:7819';
    const info0 = await (await fetch(`${base}/api/info`)).json();
    assert.equal(info0.source, 'mock');
    assert.equal(info0.realAvailable, true);
    const flipped = await (await fetch(`${base}/api/mode`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'real' }),
    })).json();
    assert.equal(flipped.source, 'real');
    const info1 = await (await fetch(`${base}/api/info`)).json();
    assert.equal(info1.source, 'real');
    const bad = await fetch(`${base}/api/mode`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'bogus' }),
    });
    assert.equal(bad.status, 409);
  } finally {
    app.kill();
  }
});
