// lib/skill-install.mjs
import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync, existsSync, rmSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { hashContent } from './fingerprint.mjs';

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out.sort();
}

export function fingerprintDir(srcDir) {
  const parts = walk(srcDir).map((f) => `${relative(srcDir, f)}:${readFileSync(f, 'utf8')}`);
  return hashContent(parts.join('\n'));
}

export function installSkill(targetDir, srcDir, name) {
  const fingerprint = fingerprintDir(srcDir);
  const destBase = join(targetDir, 'skills', name);
  if (existsSync(destBase) && fingerprintDir(destBase) === fingerprint) {
    return { name, fingerprint, changed: false };       // idempotent: skip if content is identical
  }
  rmSync(destBase, { recursive: true, force: true });   // clean re-carve: leave no stale files behind
  for (const f of walk(srcDir)) {
    const dest = join(destBase, relative(srcDir, f));
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, readFileSync(f));
  }
  return { name, fingerprint, changed: true };
}
