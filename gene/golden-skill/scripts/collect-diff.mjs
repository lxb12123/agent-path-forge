// gene/golden-skill/scripts/collect-diff.mjs
import { execFileSync } from 'node:child_process';

export function collectDiff(cwd = process.cwd(), base = 'HEAD') {
  const files = execFileSync('git', ['diff', '--name-only', base], { cwd, encoding: 'utf8' })
    .split('\n').filter(Boolean);
  const diff = execFileSync('git', ['diff', base], { cwd, encoding: 'utf8' });
  return { files, diff };
}

// CLI: node collect-diff.mjs [base]  → 打印 JSON(供 agent 读取,0 token 推理)
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(collectDiff(process.cwd(), process.argv[2] || 'HEAD')));
}
