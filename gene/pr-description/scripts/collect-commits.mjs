// gene/pr-description/scripts/collect-commits.mjs
import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Deterministically get the commit subjects and change size of "this branch relative to the baseline", for the agent to read at 0 token.
export function collectCommits(cwd = process.cwd(), base = 'main') {
  const range = `${base}..HEAD`;
  try {
    const commits = execFileSync('git', ['log', range, '--pretty=%s'], { cwd, encoding: 'utf8' })
      .split('\n').filter(Boolean);
    const diffstat = execFileSync('git', ['diff', '--stat', range], { cwd, encoding: 'utf8' });
    return { base, commits, diffstat };
  } catch {
    return { base, commits: [], diffstat: '' };   // non-git repo / baseline missing → "no new commits"; the prompt stops on this
  }
}

// Run only when invoked directly as a script (realpath handles the macOS /var→/private/var symlink)
function isMain() {
  try { return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]); }
  catch { return false; }
}

if (isMain()) {
  console.log(JSON.stringify(collectCommits(process.cwd(), process.argv[2] || 'main')));
}
