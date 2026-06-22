#!/usr/bin/env node
// hooks/observe.mjs — passive observation hook (PostToolUse / PostToolUseFailure).
// Reads the hook JSON from stdin, normalizes it, and appends to ${CLAUDE_PROJECT_DIR}/.gene/trace.jsonl.
// No-ops immediately for non-gene projects; always exits 0, never interferes with the agent.
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
