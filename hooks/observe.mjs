#!/usr/bin/env node
// hooks/observe.mjs — 被动观测 hook(PostToolUse / PostToolUseFailure)。
// 读 stdin 的 hook JSON,规范化后追加到 ${CLAUDE_PROJECT_DIR}/.gene/trace.jsonl。
// 非 gene 项目立即 no-op;永远 exit 0,绝不干扰 agent。
import { recordEvent, parseHookEvent } from '../lib/trace.mjs';

async function main() {
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  let raw = '';
  try {
    for await (const chunk of process.stdin) raw += chunk;
  } catch { /* ignore */ }
  try {
    recordEvent(projectDir, parseHookEvent(JSON.parse(raw || '{}')));
  } catch { /* never interfere */ }
}

main().finally(() => process.exit(0));
