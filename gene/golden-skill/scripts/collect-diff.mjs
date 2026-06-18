// gene/golden-skill/scripts/collect-diff.mjs
import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function collectDiff(cwd = process.cwd(), base = 'HEAD') {
  const files = execFileSync('git', ['diff', '--name-only', base], { cwd, encoding: 'utf8' })
    .split('\n').filter(Boolean);
  const diff = execFileSync('git', ['diff', base], { cwd, encoding: 'utf8' });
  return { files, diff };
}

// 仅当作为脚本直接运行时执行(realpath 兼容 macOS /var→/private/var 符号链接)
function isMain() {
  try { return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]); }
  catch { return false; }
}

// CLI: node collect-diff.mjs [base]  → 打印 JSON(供 agent 读取,0 token 推理)
if (isMain()) {
  console.log(JSON.stringify(collectDiff(process.cwd(), process.argv[2] || 'HEAD')));
}
