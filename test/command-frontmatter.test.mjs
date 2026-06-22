// test/command-frontmatter.test.mjs
// Contract: every commands/*.md must start with frontmatter (the very first line is ---),
// otherwise Claude Code cannot parse the description and will display the first line (often a comment) as the description.
// This guard nails down a real regression: a <!-- path --> comment was added at the top of a command file, garbling the description.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const COMMANDS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'commands');
const files = readdirSync(COMMANDS_DIR).filter((f) => f.endsWith('.md'));

test('the commands/ directory has command files', () => {
  assert.ok(files.length > 0, 'there should be at least one command file');
});

for (const file of files) {
  test(`${file}: the first line must be --- (frontmatter at the top, otherwise description parsing fails)`, () => {
    const text = readFileSync(join(COMMANDS_DIR, file), 'utf8');
    const firstLine = text.split('\n')[0];
    assert.equal(
      firstLine,
      '---',
      `${file} first line should be "---", but it is ${JSON.stringify(firstLine)}; `
        + 'do not add a comment/blank line before the frontmatter.',
    );
  });

  test(`${file}: frontmatter includes name and description`, () => {
    const text = readFileSync(join(COMMANDS_DIR, file), 'utf8');
    const end = text.indexOf('\n---', 3);
    assert.ok(end > 0, `${file} is missing a closing frontmatter`);
    const fm = text.slice(3, end);
    assert.match(fm, /^name:\s*\S/m, `${file} frontmatter is missing name`);
    assert.match(fm, /^description:\s*\S/m, `${file} frontmatter is missing description`);
  });
}
