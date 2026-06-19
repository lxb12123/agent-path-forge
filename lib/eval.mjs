// lib/eval.mjs
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// 读 <skillDir>/evals/*.json → [{ name, input, expect }]
export function loadCases(skillDir) {
  const dir = join(skillDir, 'evals');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')));
}

// 确定性判分:contains / notContains / matches(正则字符串)
export function gradeOutput(output, expect = {}) {
  const failures = [];
  for (const s of expect.contains || []) {
    if (!output.includes(s)) failures.push(`missing: ${s}`);
  }
  for (const s of expect.notContains || []) {
    if (output.includes(s)) failures.push(`should not contain: ${s}`);
  }
  for (const re of expect.matches || []) {
    if (!new RegExp(re).test(output)) failures.push(`no match: ${re}`);
  }
  return { pass: failures.length === 0, failures };
}

export function summarize(graded) {
  const passed = graded.filter((g) => g.pass).length;
  return { total: graded.length, passed, failed: graded.length - passed };
}

// runs: { <caseName>: <output text> }(由 agent 跑技能后收集);确定性判分 + 汇总
export function runEval(skillDir, runs = {}) {
  const cases = loadCases(skillDir);
  const graded = cases.map((c) => ({
    name: c.name,
    ...gradeOutput(runs[c.name] ?? '', c.expect || {}),
  }));
  return { ...summarize(graded), cases: graded };
}
