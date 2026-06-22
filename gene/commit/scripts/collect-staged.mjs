// gene/commit/scripts/collect-staged.mjs
import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Deterministically get the "staged" changes (only --cached), for the agent to read at 0 token.
export function collectStaged(cwd = process.cwd()) {
  try {
    const files = execFileSync('git', ['diff', '--cached', '--name-only'], { cwd, encoding: 'utf8' })
      .split('\n').filter(Boolean);
    const diff = execFileSync('git', ['diff', '--cached'], { cwd, encoding: 'utf8' });
    const status = execFileSync('git', ['status', '--porcelain'], { cwd, encoding: 'utf8' });
    return { files, diff, status };
  } catch {
    return { files: [], diff: '', status: '' };   // non-git repo etc. → treat as "no staged changes"; the prompt stops cleanly on this
  }
}

// Run only when invoked directly as a script (realpath handles the macOS /var→/private/var symlink)
function isMain() {
  try { return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]); }
  catch { return false; }
}

if (isMain()) {
  console.log(JSON.stringify(collectStaged(process.cwd())));
}
