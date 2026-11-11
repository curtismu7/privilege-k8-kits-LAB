#!/usr/bin/env node
// Fails on any AI-attribution credit in tracked files (owner rule 2026-11-07).
// This file necessarily contains the patterns it searches for, so it is
// excluded from its own scan and the patterns are assembled at runtime.
import { execFileSync } from 'node:child_process';

const SELF = 'scripts/check-no-ai-attribution.mjs';
const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean);
const pat = ['generated', 'with'].join(' ');
const pat2 = ['co-authored', 'by'].join('-');
const pat3 = ['claude.com', 'claude-code'].join('/');
const patterns = [new RegExp(pat, 'i'), new RegExp(pat2, 'i'), new RegExp(pat3, 'i')];
let hits = 0;
for (const f of files) {
  if (f === SELF) continue;
  let text = '';
  try { text = execFileSync('git', ['show', `HEAD:${f}`], { encoding: 'utf8' }); } catch { continue; }
  for (const re of patterns) {
    if (re.test(text)) { console.error(`FAIL ${f}: attribution pattern found`); hits++; }
  }
}
if (hits) { console.error(`${hits} attribution hit(s)`); process.exit(1); }
console.log('no AI attribution found');
