// lib/foundation.mjs
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { hasGene, writeManifest, emptyManifest, genePath } from './manifest.mjs';

const GENE_MD = `# Gene

This project is stamped with Agent Plugin Kit genes. Architectural decisions and context are recorded here (committable, cross-session).
`;

const MEMORY_MD = `# Memory

Cross-session memory for this project (committable). Record durable facts, learnings, and context that should survive across sessions and agents — distinct from architectural decisions, which live in GENE.md.
`;

export function stampFoundation(targetDir) {
  if (hasGene(targetDir)) return { stamped: false };   // idempotent: skip if already stamped
  mkdirSync(genePath(targetDir), { recursive: true });
  writeManifest(targetDir, emptyManifest());
  mkdirSync(join(targetDir, 'skills'), { recursive: true });
  // gene #4 — committable artifacts: GENE.md (config/architecture) ⟂ MEMORY.md (memory). Never overwrite user edits.
  const geneMd = join(targetDir, 'GENE.md');
  if (!existsSync(geneMd)) writeFileSync(geneMd, GENE_MD, 'utf8');
  const memoryMd = join(targetDir, 'MEMORY.md');
  if (!existsSync(memoryMd)) writeFileSync(memoryMd, MEMORY_MD, 'utf8');
  return { stamped: true };
}
