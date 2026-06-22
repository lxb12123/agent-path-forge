// test/mcp-server.test.mjs — protocol-level tests (handleMessage pure function)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleMessage } from '../mcp/server.mjs';

test('initialize returns protocolVersion + tools capability + serverInfo', () => {
  const r = handleMessage({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
  assert.equal(r.result.protocolVersion, '2025-11-25');
  assert.ok(r.result.capabilities.tools);
  assert.ok(r.result.serverInfo.name);
});

test('notification (no id) gets no reply', () => {
  assert.equal(handleMessage({ jsonrpc: '2.0', method: 'notifications/initialized' }), null);
});

test('ping → empty result', () => {
  assert.deepEqual(handleMessage({ jsonrpc: '2.0', id: 2, method: 'ping' }),
    { jsonrpc: '2.0', id: 2, result: {} });
});

test('tools/list exposes the diagnostics tool (valid inputSchema)', () => {
  const r = handleMessage({ jsonrpc: '2.0', id: 3, method: 'tools/list' });
  const t = r.result.tools[0];
  assert.equal(t.name, 'diagnostics');
  assert.equal(t.inputSchema.type, 'object');
  assert.ok(t.inputSchema.required.includes('command'));
});

test('tools/call diagnostics: failing command → isError:true + text content', () => {
  const r = handleMessage({
    jsonrpc: '2.0', id: 4, method: 'tools/call',
    params: { name: 'diagnostics', arguments: { command: 'node -e "process.exit(1)"' } },
  });
  assert.equal(r.result.isError, true);
  assert.equal(r.result.content[0].type, 'text');
});

test('tools/call unknown tool → JSON-RPC -32601', () => {
  const r = handleMessage({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'nope' } });
  assert.equal(r.error.code, -32601);
});

test('unknown method → -32601', () => {
  const r = handleMessage({ jsonrpc: '2.0', id: 6, method: 'foo/bar' });
  assert.equal(r.error.code, -32601);
});
