#!/usr/bin/env node
// mcp/server.mjs — hand-written, zero-dependency minimal MCP stdio server exposing a single diagnostics tool.
// Protocol: line-delimited JSON-RPC 2.0; stdout carries only JSON-RPC, all logs go to stderr.
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runDiagnostics } from '../lib/diagnostics.mjs';

const PROTOCOL_VERSION = '2025-11-25';

const DIAGNOSTICS_TOOL = {
  name: 'diagnostics',
  description: 'Run a diagnostic command in the project (e.g. "npm test" / "npm run build") and return the exit code, a summary of error lines, and the tail of the output, so the agent can self-correct.',
  inputSchema: {
    type: 'object',
    properties: {
      command: { type: 'string', description: 'The command to run, for example "npm test"' },
      cwd: { type: 'string', description: 'Working directory (defaults to the current project)' },
    },
    required: ['command'],
    additionalProperties: false,
  },
};

// Pure function: given a JSON-RPC message, return the response object; a notification (no id) returns null.
export function handleMessage(msg) {
  if (!msg || msg.id === undefined) return null; // notification → no reply
  const { id, method, params } = msg;

  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: 'agent-path-forge-diagnostics', version: '0.1.0' },
      },
    };
  }
  if (method === 'ping') return { jsonrpc: '2.0', id, result: {} };
  if (method === 'tools/list') return { jsonrpc: '2.0', id, result: { tools: [DIAGNOSTICS_TOOL] } };
  if (method === 'tools/call') {
    if (params?.name !== 'diagnostics') {
      return { jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown tool: ${params?.name}` } };
    }
    const args = params.arguments || {};
    const result = runDiagnostics(args.command || '', args.cwd);
    return {
      jsonrpc: '2.0',
      id,
      result: {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        isError: !result.ok,
      },
    };
  }
  return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } };
}

function isMain() {
  try { return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]); }
  catch { return false; }
}

// stdio main loop (starts only when run directly; not started when imported, to ease testing)
if (isMain()) {
  let buf = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => {
    buf += chunk;
    let nl;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      let msg;
      try { msg = JSON.parse(line); } catch { continue; } // ignore malformed lines
      let res = null;
      try { res = handleMessage(msg); } catch (e) { process.stderr.write(`agent-path-forge-mcp error: ${e}\n`); }
      if (res) process.stdout.write(`${JSON.stringify(res)}\n`);
    }
  });
  process.stdin.on('end', () => process.exit(0));
}
