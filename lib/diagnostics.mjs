// lib/diagnostics.mjs — deterministic probe: run a diagnostic command, return errors/output in a structured form
import { spawnSync } from 'node:child_process';

const ERROR_RE = /error|fail|exception|✖|✗|panic|traceback/i;

export function extractErrors(text, max = 20) {
  return (text || '').split('\n').filter((l) => ERROR_RE.test(l)).slice(0, max);
}

export function tail(text, n = 30) {
  const lines = (text || '').split('\n');
  return lines.slice(Math.max(0, lines.length - n)).join('\n');
}

// Run the command (via the shell), capture stdout/stderr/exit code, extract error lines + tail of output
export function runDiagnostics(command, cwd = process.cwd()) {
  const r = spawnSync(command, {
    cwd, shell: true, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024,
  });
  const out = `${r.stdout || ''}\n${r.stderr || ''}`;
  const exitCode = r.status ?? (r.error ? -1 : 0);
  return {
    command,
    exitCode,
    ok: exitCode === 0,
    errors: extractErrors(out),
    tail: tail(out),
  };
}
