// lib/registry.mjs — skill versions/dependencies + distribution registry (resolve bundled golden skills by name)
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, isAbsolute, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseYaml } from './yaml-lite.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));   // parent of lib/ = plugin root

// Plugin root directory (where registry.json / gene/* live)
export function pluginRoot() { return ROOT; }

// Read a skill source directory's skill.yaml (for version / dependencies etc.)
export function readSkillMeta(skillDir) {
  const p = join(skillDir, 'skill.yaml');
  if (!existsSync(p)) return {};
  try { return parseYaml(readFileSync(p, 'utf8')) || {}; }
  catch { return {}; }   // a corrupt skill.yaml shouldn't crash the whole inherit
}

// Check whether all dependencies a skill declares are installed (by name)
export function checkDependencies(installedNames, dependencies = []) {
  const missing = (dependencies || []).filter((d) => !installedNames.includes(d));
  return { ok: missing.length === 0, missing };
}

// Read the distribution registry registry.json (missing/corrupt → empty list, never throws)
export function loadRegistry(root = ROOT) {
  const p = join(root, 'registry.json');
  if (!existsSync(p)) return { skills: [] };
  try {
    const r = JSON.parse(readFileSync(p, 'utf8'));
    return { skills: Array.isArray(r.skills) ? r.skills : [] };
  } catch { return { skills: [] }; }
}

export function listRegistry(root = ROOT) { return loadRegistry(root).skills; }

// Resolve --from into a skill source directory: an existing path is returned as-is; otherwise look up the registry name → source directory; if not found, return as-is.
export function resolveSource(nameOrPath, root = ROOT) {
  if (!nameOrPath) return nameOrPath;
  if (existsSync(join(nameOrPath, 'skill.yaml'))) return nameOrPath;   // it's a skill path
  const entry = loadRegistry(root).skills.find((s) => s.name === nameOrPath);
  if (entry) {
    if (isAbsolute(entry.source)) throw new Error(`registry source must be relative: ${entry.source}`);
    const abs = resolve(root, entry.source);
    if (abs !== root && !abs.startsWith(root + sep)) {   // confine to the plugin root, prevent directory traversal
      throw new Error(`registry source escapes plugin root: ${entry.source}`);
    }
    return abs;
  }
  return nameOrPath;   // unknown name → return as-is (inherit will give a friendly error)
}
