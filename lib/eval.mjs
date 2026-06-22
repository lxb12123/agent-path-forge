// lib/eval.mjs
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Read <skillDir>/evals/*.json → [{ name, input, expect }]
export function loadCases(skillDir) {
  const dir = join(skillDir, 'evals');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')));
}

// Grading: deterministic assertions (contains / notContains / matches regex) + optional subjective rubric verdict.
// rubricVerdict is the true/false the agent (LLM-as-judge) gives for expect.rubric.
export function gradeOutput(output, expect = {}, rubricVerdict) {
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
  if (expect.rubric && rubricVerdict !== true) {
    failures.push(`rubric not met: ${expect.rubric}`);
  }
  return { pass: failures.length === 0, failures };
}

export function summarize(graded) {
  const passed = graded.filter((g) => g.pass).length;
  return { total: graded.length, passed, failed: graded.length - passed };
}

// runs: { <caseName>: <output text> | { output, rubric } } (collected after the agent runs the skill;
// for cases with expect.rubric, the agent must also provide a rubric boolean verdict). Grade + summarize.
export function runEval(skillDir, runs = {}) {
  const cases = loadCases(skillDir);
  const graded = cases.map((c) => {
    const entry = runs[c.name];
    const output = typeof entry === 'string' ? entry : (entry && entry.output) || '';
    const rubricVerdict = entry && typeof entry === 'object' ? entry.rubric : undefined;
    return { name: c.name, ...gradeOutput(output, c.expect || {}, rubricVerdict) };
  });
  return { ...summarize(graded), cases: graded };
}
