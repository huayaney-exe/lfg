#!/usr/bin/env node
// Cross-platform syntax check for all project .mjs files.
// Replaces shell loops that break on Windows. Zero deps.

import { spawnSync } from 'node:child_process';
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DIRS = ['bin', 'src', 'test', 'scripts'];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (name.endsWith('.mjs')) out.push(p);
  }
  return out;
}

const files = [];
for (const d of DIRS) {
  const abs = join(ROOT, d);
  try { walk(abs, files); } catch { /* dir may not exist */ }
}

let failures = 0;
for (const f of files) {
  const rel = f.replace(ROOT + '/', '').replace(ROOT + '\\', '');
  const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
  if (r.status !== 0) {
    failures++;
    console.error(`✗ ${rel}`);
    if (r.stderr) console.error(r.stderr);
  } else {
    console.log(`✓ ${rel}`);
  }
}

// Verify package.json parses + has expected fields
try {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  for (const k of ['name', 'version', 'bin', 'engines', 'files']) {
    if (!pkg[k]) {
      console.error(`✗ package.json missing required field: ${k}`);
      failures++;
    }
  }
  console.log('✓ package.json');
} catch (err) {
  console.error('✗ package.json: ' + err.message);
  failures++;
}

// Verify files listed in pkg.files actually exist
try {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  for (const entry of pkg.files || []) {
    try {
      statSync(join(ROOT, entry));
      console.log(`✓ files[]: ${entry}`);
    } catch {
      console.error(`✗ files[]: ${entry} does not exist`);
      failures++;
    }
  }
} catch { /* covered above */ }

if (failures > 0) {
  console.error(`\n${failures} lint error(s)`);
  process.exit(1);
}
console.log(`\n${files.length} files checked, all clean`);
