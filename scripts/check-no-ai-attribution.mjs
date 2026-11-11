#!/usr/bin/env node
// Fails on any AI-attribution credit in tracked files (owner rule 2026-11-07).
import { execFileSync } from 'node:child_process';

const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean);
const patterns = [/generated with/i, /co-authored-by/i, /claude\.com\/claude-code/i];
let hits = 0;
for (const f of files) {
  let text = '';
  try { text = execFileSync('git', ['show', `HEAD:${f}`], { encoding: 'utf8' }); } catch { continue; }
  for (const re of patterns) {
    if (re.test(text)) { console.error(`FAIL ${f}: matches /${re.source}/${re.flags}`); hits++; }
  }
}
if (hits) { console.error(`${hits} attribution hit(s)`); process.exit(1); }
console.log('no AI attribution found');
