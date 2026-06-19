// lib/trace.mjs — 运行时观测:被动记录工具调用到 .gene/trace.jsonl
import { existsSync, mkdirSync, appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function tracePath(projectDir) { return join(projectDir, '.gene', 'trace.jsonl'); }

// 从 `skills/<name>/` 形态的命令里推断技能名
export function inferSkill(command) {
  const m = (command || '').match(/skills\/([a-z0-9][a-z0-9-]*)\//);
  return m ? m[1] : null;
}

// 把 PostToolUse / PostToolUseFailure 的 hook stdin 规范化成一条 trace 事件
export function parseHookEvent(hook = {}) {
  const command = (hook.tool_input && hook.tool_input.command) || '';
  return {
    event: hook.hook_event_name || '',
    session: hook.session_id || '',
    tool: hook.tool_name || '',
    command,
    skill: inferSkill(command),
    ok: hook.hook_event_name !== 'PostToolUseFailure' && !hook.error,
  };
}

// 确保 .gene/.gitignore 忽略 trace.jsonl(运行时数据不入库)
export function ensureTraceIgnored(projectDir) {
  const p = join(projectDir, '.gene', '.gitignore');
  if (!existsSync(p)) { writeFileSync(p, 'trace.jsonl\n', 'utf8'); return; }
  const cur = readFileSync(p, 'utf8');
  if (!cur.split('\n').includes('trace.jsonl')) {
    writeFileSync(p, cur + (cur.endsWith('\n') ? '' : '\n') + 'trace.jsonl\n', 'utf8');
  }
}

// 追加一条事件(仅当 .gene/ 存在,即 gene 项目);返回写入的事件,否则 null
export function recordEvent(projectDir, event, ts) {
  if (!existsSync(join(projectDir, '.gene'))) return null;   // 非 gene 项目 → 不记录
  ensureTraceIgnored(projectDir);
  const line = { ts: ts || new Date().toISOString(), ...event };
  appendFileSync(tracePath(projectDir), `${JSON.stringify(line)}\n`, 'utf8');
  return line;
}

export function loadTrace(projectDir) {
  const p = tracePath(projectDir);
  if (!existsSync(p)) return [];
  return readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

export function summarizeTrace(events) {
  const byTool = {}; const bySkill = {}; let failures = 0;
  for (const e of events) {
    byTool[e.tool] = (byTool[e.tool] || 0) + 1;
    if (e.skill) bySkill[e.skill] = (bySkill[e.skill] || 0) + 1;
    if (e.ok === false) failures += 1;
  }
  return { total: events.length, byTool, bySkill, failures };
}
