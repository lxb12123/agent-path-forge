// test/command-frontmatter.test.mjs
// 契约:每个 commands/*.md 必须以 frontmatter 开头(第一行就是 ---),
// 否则 Claude Code 解析不到 description,会把第一行(常是注释)当描述显示。
// 这条防呆钉死一次真实回归:命令文件开头加了 <!-- 路径 --> 注释,导致描述错乱。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const COMMANDS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'commands');
const files = readdirSync(COMMANDS_DIR).filter((f) => f.endsWith('.md'));

test('commands/ 目录里有命令文件', () => {
  assert.ok(files.length > 0, '应至少有一个命令文件');
});

for (const file of files) {
  test(`${file}: 第一行必须是 --- (frontmatter 居顶,否则 description 解析失败)`, () => {
    const text = readFileSync(join(COMMANDS_DIR, file), 'utf8');
    const firstLine = text.split('\n')[0];
    assert.equal(
      firstLine,
      '---',
      `${file} 第一行应是 "---",实际是 ${JSON.stringify(firstLine)}；`
        + '不要在 frontmatter 前加注释/空行。',
    );
  });

  test(`${file}: frontmatter 含 name 与 description`, () => {
    const text = readFileSync(join(COMMANDS_DIR, file), 'utf8');
    const end = text.indexOf('\n---', 3);
    assert.ok(end > 0, `${file} 缺少闭合的 frontmatter`);
    const fm = text.slice(3, end);
    assert.match(fm, /^name:\s*\S/m, `${file} frontmatter 缺 name`);
    assert.match(fm, /^description:\s*\S/m, `${file} frontmatter 缺 description`);
  });
}
