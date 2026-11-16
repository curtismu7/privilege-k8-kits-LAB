// Pins the served page's layout and accessibility basics. Parses public/index.html as text.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const html = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
const count = (re) => (html.match(re) || []).length;

test('page has exactly one h1 and one main', () => {
  assert.equal(count(/<h1[\s>]/gi), 1);
  assert.equal(count(/<main[\s>]/gi), 1);
  assert.match(html, /<h1>\s*Agent Privilege Gateway Kubernetes Deployment Kits\s*<\/h1>/);
});

test('shell bar comes first, then main whose first child is the banner', () => {
  const bar = html.indexOf('<header class="shell-bar"');
  const main = html.indexOf('<main');
  assert.ok(bar >= 0 && bar < main, 'shell-bar before main');
  // A leading HTML comment (the checker escape) is not an element.
  const afterMain = html.slice(html.indexOf('>', main) + 1).replace(/^(\s*<!--[\s\S]*?-->)+/, '').trimStart();
  assert.match(afterMain, /^<p class="banner" role="note"/);
  assert.equal(count(/class="banner"/g), 1);
});

test('Mode and Theme selects have accessible names', () => {
  for (const [id, name] of [['mode-select', 'Mode'], ['theme-select', 'Theme']]) {
    const tag = html.match(new RegExp(`<select[^>]*id="${id}"[^>]*>`));
    assert.ok(tag, `${id} present`);
    assert.match(tag[0], new RegExp(`aria-label="${name}"`));
  }
});

test('text size uses a data attribute, not an inline font-size', () => {
  assert.doesNotMatch(html, /style\.fontSize/);
  assert.match(html, /setAttribute\("data-font-step"/);
  assert.match(html, /"pkgk\.font"/);
});
