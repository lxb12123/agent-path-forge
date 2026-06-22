// lib/trace.mjs — runtime observation: passively records tool calls to .gene/trace.jsonl
import { existsSync, mkdirSync, appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function tracePath(projectDir) { return join(projectDir, '.gene', 'trace.jsonl'); }

// Infer the skill name from a command of the form `skills/<name>/`
export function inferSkill(command) {
  const m = (command || '').match(/skills\/([a-z0-9][a-z0-9-]*)\//);
  return m ? m[1] : null;
}

// Normalize the PostToolUse / PostToolUseFailure hook stdin into a single trace event
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

// Ensure .gene/.gitignore ignores trace.jsonl (runtime data is not committed)
export function ensureTraceIgnored(projectDir) {
  const p = join(projectDir, '.gene', '.gitignore');
  if (!existsSync(p)) { writeFileSync(p, 'trace.jsonl\n', 'utf8'); return; }
  const cur = readFileSync(p, 'utf8');
  if (!cur.split('\n').includes('trace.jsonl')) {
    writeFileSync(p, cur + (cur.endsWith('\n') ? '' : '\n') + 'trace.jsonl\n', 'utf8');
  }
}

// Append an event (only when .gene/ exists, i.e. a gene project); returns the written event, otherwise null
export function recordEvent(projectDir, event, ts) {
  if (!existsSync(join(projectDir, '.gene'))) return null;   // not a gene project → do not record
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
