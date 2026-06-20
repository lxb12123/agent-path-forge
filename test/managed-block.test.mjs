// test/managed-block.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { upsertBlock } from '../lib/managed-block.mjs';

const S = '# >>> start >>>';
const E = '# <<< end <<<';

test('空内容 → 写入一个托管块', () => {
  const out = upsertBlock('', S, E, 'a\nb');
  assert.equal(out, `${S}\na\nb\n${E}\n`);
});

test('幂等:同 body 重复 upsert 结果不变', () => {
  const once = upsertBlock('', S, E, 'a\nb');
  const twice = upsertBlock(once, S, E, 'a\nb');
  assert.equal(twice, once);
});

test('替换已有块的 body,保留前后用户内容', () => {
  const start = upsertBlock('user-top\n', S, E, 'old');
  const updated = upsertBlock(start + 'user-bottom\n', S, E, 'new');
  assert.match(updated, /user-top/);
  assert.match(updated, /user-bottom/);
  assert.match(updated, /new/);
  assert.doesNotMatch(updated, /old/);
  // 再 upsert 同 body → 幂等
  assert.equal(upsertBlock(updated, S, E, 'new'), updated);
});

test('追加到已有用户内容后,用空行隔开', () => {
  const out = upsertBlock('keep me\n', S, E, 'x');
  assert.match(out, /keep me\n\n# >>> start >>>/);
});
