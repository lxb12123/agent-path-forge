// lib/ignore.mjs — ignore primitive: the gene declares "paths the host should ignore", compiled into each ignore file.
// Source: .gene/ignore (one glob per line; lines starting with # are comments, blank lines are ignored).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { upsertBlock } from './managed-block.mjs';

const START = '# >>> agent-plugin-kit:ignore >>>';
const END = '# <<< agent-plugin-kit:ignore <<<';
const TARGETS = ['.gitignore', '.cursorignore', '.geminiignore'];

export function loadIgnorePatterns(targetDir) {
  const p = join(targetDir, '.gene', 'ignore');
  if (!existsSync(p)) return [];
  return readFileSync(p, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

// Write the patterns into the agent-plugin-kit managed block of each ignore file (idempotent, preserves the user's other entries).
export function compileIgnore(targetDir) {
  const patterns = loadIgnorePatterns(targetDir);
  if (!patterns.length) return 0;
  const body = patterns.join('\n');
  for (const f of TARGETS) {
    const p = join(targetDir, f);
    const existing = existsSync(p) ? readFileSync(p, 'utf8') : '';
    writeFileSync(p, upsertBlock(existing, START, END, body), 'utf8');
  }
  return patterns.length;
}
