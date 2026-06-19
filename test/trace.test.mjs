// test/trace.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseHookEvent, inferSkill, recordEvent, loadTrace, summarizeTrace } from '../lib/trace.mjs';

function tmp() { return mkdtempSync(join(tmpdir(), 'mh-')); }

test('inferSkill 从命令里抽 skills/<name>/', () => {
  assert.equal(inferSkill('node skills/review/scripts/collect-diff.mjs HEAD'), 'review');
  assert.equal(inferSkill('npm test'), null);
});

test('parseHookEvent 规范化 PostToolUse / 失败事件', () => {
  const ev = parseHookEvent({
    hook_event_name: 'PostToolUse', session_id: 's1', tool_name: 'Bash',
    tool_input: { command: 'node skills/review/scripts/collect-diff.mjs' },
  });
  assert.equal(ev.tool, 'Bash');
  assert.equal(ev.skill, 'review');
  assert.equal(ev.ok, true);
  const fail = parseHookEvent({ hook_event_name: 'PostToolUseFailure', tool_name: 'Bash', tool_input: { command: 'x' }, error: 'boom' });
  assert.equal(fail.ok, false);
});

test('recordEvent: 无 .gene 不记录; 有 .gene 追加并忽略 trace', () => {
  const noGene = tmp();
  assert.equal(recordEvent(noGene, { tool: 'Bash', ok: true }, 'T'), null);   // 非 gene → null
  const proj = tmp();
  mkdirSync(join(proj, '.gene'), { recursive: true });
  recordEvent(proj, parseHookEvent({
    hook_event_name: 'PostToolUse', tool_name: 'Bash',
    tool_input: { command: 'node skills/review/scripts/x.mjs' },
  }), 'T1');
  const events = loadTrace(proj);
  assert.equal(events.length, 1);
  assert.equal(events[0].skill, 'review');
  assert.equal(events[0].ts, 'T1');
  assert.equal(existsSync(join(proj, '.gene', '.gitignore')), true);
  assert.match(readFileSync(join(proj, '.gene', '.gitignore'), 'utf8'), /trace\.jsonl/);
  rmSync(noGene, { recursive: true, force: true }); rmSync(proj, { recursive: true, force: true });
});

test('summarizeTrace 按工具/技能计数 + 失败数', () => {
  const s = summarizeTrace([
    { tool: 'Bash', skill: 'review', ok: true },
    { tool: 'Bash', skill: 'review', ok: false },
    { tool: 'Edit', skill: null, ok: true },
  ]);
  assert.equal(s.total, 3);
  assert.equal(s.byTool.Bash, 2);
  assert.equal(s.bySkill.review, 2);
  assert.equal(s.failures, 1);
});
