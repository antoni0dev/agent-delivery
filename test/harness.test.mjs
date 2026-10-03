import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, readdirSync, writeFileSync, mkdirSync, rmSync, symlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const skillsIn = directory => readdirSync(join(directory, 'skills'), { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name);
const node = (script, ...args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
const fixturePack = () => JSON.parse(readFileSync(join(root, 'test/fixtures/packs/sample.json'), 'utf8'));
function harnessCopy(t, packs = { 'sample.json': fixturePack() }) {
  const directory = mkdtempSync(join(tmpdir(), 'harness-copy-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  for (const name of ['knowledge', 'scripts', 'roles', 'skills', 'templates', 'docs', 'WORKFLOW.md', 'README.md'])
    cpSync(join(root, name), join(directory, name), { recursive: true });
  mkdirSync(join(directory, 'knowledge/packs'), { recursive: true });
  for (const [file, pack] of Object.entries(packs)) writeFileSync(join(directory, 'knowledge/packs', file), JSON.stringify(pack, null, 2) + '\n');
  return directory;
}

test('optional knowledge check works from a checkout path containing spaces', t => {
  const directory = mkdtempSync(join(tmpdir(), 'harness with spaces-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  for (const name of ['knowledge', 'scripts', 'WORKFLOW.md', 'templates', 'skills', 'docs', 'roles', 'README.md'])
    cpSync(join(root, name), join(directory, name), { recursive: true });
  const result = spawnSync(process.execPath, [join(directory, 'scripts/check.mjs')], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

function checkout(t) {
  const dir = mkdtempSync(join(tmpdir(), 'harness-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  execFileSync('git', ['init', '--quiet', dir]);
  return dir;
}
const install = (repo, ...args) => spawnSync(process.execPath, [join(root, 'scripts/install.mjs'), '--repo', repo, '--client', 'codex', ...args], { encoding: 'utf8' });
test('upgrade preserves team rules, private project settings and initiative history', t => {
  const repo = checkout(t);
  writeFileSync(join(repo, 'AGENTS.md'), 'Team rules');
  assert.equal(install(repo).status, 0);
  writeFileSync(join(repo, '.agent-harness/PROJECT.md'), 'Personal settings');
  writeFileSync(join(repo, '.agent-harness/initiatives/current.md'), 'Work in progress');
  assert.equal(install(repo).status, 0);
  assert.equal(readFileSync(join(repo, 'AGENTS.md'), 'utf8'), 'Team rules');
  assert.equal(readFileSync(join(repo, '.agent-harness/PROJECT.md'), 'utf8'), 'Personal settings');
  assert.equal(readFileSync(join(repo, '.agent-harness/initiatives/current.md'), 'utf8'), 'Work in progress');
  assert.equal(execFileSync('git', ['-C', repo, 'status', '--porcelain'], { encoding: 'utf8' }).trim(), '?? AGENTS.md');
});
test('refuses unowned and locally edited files before modifying other files', t => {
  const repo = checkout(t);
  mkdirSync(join(repo, '.agent-harness'));
  writeFileSync(join(repo, '.agent-harness/WORKFLOW.md'), 'My workflow');
  assert.notEqual(install(repo).status, 0);
  assert.equal(existsSync(join(repo, '.agent-harness/knowledge')), false);
  rmSync(join(repo, '.agent-harness/WORKFLOW.md'));
  assert.equal(install(repo).status, 0);
  writeFileSync(join(repo, '.agent-harness/WORKFLOW.md'), 'Local edits');
  assert.match(install(repo).stderr, /Preserve local edit/);
});
test('dry run writes nothing and symlink targets cannot redirect installation', t => {
  const repo = checkout(t);
  assert.equal(install(repo, '--dry-run').status, 0);
  assert.equal(existsSync(join(repo, '.agent-harness')), false);
  const elsewhere = checkout(t);
  symlinkSync(elsewhere, join(repo, '.agent-harness'));
  assert.match(install(repo).stderr, /Refusing symlink/);
  assert.equal(existsSync(join(elsewhere, 'WORKFLOW.md')), false);
});
test('installed selector returns actual card content and rejects unknown selectors', t => {
  const repo = checkout(t);
  assert.equal(install(repo).status, 0);
  const select = (...args) => spawnSync(process.execPath, [join(repo, '.agent-harness/scripts/select.mjs'), ...args], { encoding: 'utf8' });
  assert.match(select('--list').stdout, /state:.*state-single-owner/);
  assert.match(select('--topic', 'state').stdout, /Keep one mutable owner/);
  assert.match(select('--card', 'state-single-owner').stdout, /Anti-pattern/);
  assert.notEqual(select('--topic', 'does-not-exist').status, 0);
  assert.notEqual(select('--card', 'does-not-exist').status, 0);
});
test('Git worktree exclusion path is resolved through Git rather than .git directory assumptions', t => {
  const repo = checkout(t);
  execFileSync('git', ['-C', repo, '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '--allow-empty', '-m', 'init'], { stdio: 'pipe' });
  const worktree = `${repo}-worktree`;
  execFileSync('git', ['-C', repo, 'worktree', 'add', '--quiet', '--detach', worktree]);
  t.after(() => rmSync(worktree, { recursive: true, force: true }));
  assert.equal(install(repo).status, 0);
  writeFileSync(join(repo, '.agent-harness/PROJECT.md'), 'Configured repository preferences');
  assert.notEqual(install(worktree).status, 0);
  assert.equal(install(worktree, '--project-from', repo).status, 0);
  assert.equal(readFileSync(join(worktree, '.agent-harness/PROJECT.md'), 'utf8'), 'Configured repository preferences');
  assert.equal(execFileSync('git', ['-C', worktree, 'status', '--porcelain'], { encoding: 'utf8' }).trim(), '');
});

test('an unmodified managed install accepts a source update without deleting unrelated files', t => {
  const repo = checkout(t);
  assert.equal(install(repo).status, 0);
  writeFileSync(join(repo, '.agent-harness/personal-note.md'), 'Keep me');
  const packageCopy = checkout(t);
  for (const name of ['scripts', 'knowledge', 'skills', 'roles', 'templates', 'WORKFLOW.md', 'docs']) cpSync(join(root, name), join(packageCopy, name), { recursive: true });
  writeFileSync(join(packageCopy, 'WORKFLOW.md'), 'Updated shared workflow');
  const result = spawnSync(process.execPath, [join(packageCopy, 'scripts/install.mjs'), '--repo', repo, '--client', 'codex'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(join(repo, '.agent-harness/WORKFLOW.md'), 'utf8'), 'Updated shared workflow');
  assert.equal(readFileSync(join(repo, '.agent-harness/personal-note.md'), 'utf8'), 'Keep me');
});
test('staged private project settings block installation before any managed writes', t => {
  const repo = checkout(t);
  mkdirSync(join(repo, '.agent-harness'));
  writeFileSync(join(repo, '.agent-harness/PROJECT.md'), 'Private project settings');
  execFileSync('git', ['-C', repo, 'add', '.agent-harness/PROJECT.md']);
  const result = install(repo);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /tracked by Git/);
  assert.equal(existsSync(join(repo, '.agent-harness/WORKFLOW.md')), false);
  assert.equal(existsSync(join(repo, '.agents')), false);
  assert.equal(readFileSync(join(repo, '.agent-harness/PROJECT.md'), 'utf8'), 'Private project settings');
});

for (const [client, folder] of [['codex', '.agents'], ['claude', '.claude'], ['cursor', '.cursor']]) {
  test(`${client} installs every operating skill and resolves its local documentation links`, t => {
    const repo = checkout(t);
    const result = spawnSync(process.execPath, [join(root, 'scripts/install.mjs'), '--repo', repo, '--client', client], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    for (const name of skillsIn(root)) {
      const skill = join(repo, folder, 'skills', name, 'SKILL.md');
      const content = readFileSync(skill, 'utf8');
      for (const match of content.matchAll(/\]\((\.\.\/[^)]+)\)/g))
        assert.ok(existsSync(join(repo, folder, 'skills', name, match[1])), `${name}: ${match[1]}`);
    }
    assert.ok(existsSync(join(repo, '.agent-harness/docs/knowledge.md')));
    assert.ok(existsSync(join(repo, '.agent-harness/docs/readiness.md')));
    assert.match(result.stdout, /Installation is not readiness/);
  });
}

test('project settings cannot be imported from another repository', t => {
  const repo = checkout(t);
  const foreign = checkout(t);
  assert.equal(install(foreign).status, 0);
  const result = install(repo, '--project-from', foreign);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /same Git repository/);
  assert.equal(existsSync(join(repo, '.agent-harness')), false);
});

test('installed selector merges pack cards into topics, the index and every selector', t => {
  const source = harnessCopy(t);
  const repo = checkout(t);
  assert.equal(node(join(source, 'scripts/install.mjs'), '--repo', repo, '--client', 'codex').status, 0);
  const select = (...args) => node(join(repo, '.agent-harness/scripts/select.mjs'), ...args);
  const header = id => `<!-- Card: ${id} (pack sample, candidate) -->`;
  const list = select('--list').stdout;
  assert.match(list, /^release: sample-release-notes-owner$/m);
  assert.match(list, /^review: state-single-owner, .*, sample-release-notes-owner$/m);
  const index = select('--index').stdout;
  assert.match(index, /^state-single-owner \| Keep one mutable owner \| core \| state, planning, review$/m);
  assert.match(index, /^sample-release-notes-owner \| Give each release note one owner \| pack:sample \(candidate\) \| release, backend, review$/m);
  assert.ok(select('--topic', 'release').stdout.startsWith(`${header('sample-release-notes-owner')}\n## Give each release note one owner`));
  const card = select('--card', 'sample-feature-flag-cleanup').stdout;
  assert.ok(card.startsWith(header('sample-feature-flag-cleanup')));
  assert.equal(card.match(/<!-- Card:/g).length, 1);
  const combined = select('--pack', 'sample', '--card', 'state-single-owner').stdout;
  for (const text of ['<!-- Card: state-single-owner -->\n', header('sample-release-notes-owner'), header('sample-feature-flag-cleanup')])
    assert.ok(combined.includes(text), text);
  assert.notEqual(select('--pack', 'missing').status, 0);
});

test('selector works when the packs directory is absent', t => {
  const directory = harnessCopy(t, {});
  rmSync(join(directory, 'knowledge/packs'), { recursive: true, force: true });
  const select = (...args) => node(join(directory, 'scripts/select.mjs'), ...args);
  assert.match(select('--list').stdout, /^state: state-single-owner, /m);
  assert.equal(select('--index').stdout.trim().split('\n').length, 58);
  assert.match(select('--card', 'state-single-owner').stdout, /^<!-- Card: state-single-owner -->\n## Keep one mutable owner/);
  assert.notEqual(select('--pack', 'sample').status, 0);
});

test('check accepts a valid pack once its generated guide is current', t => {
  const directory = harnessCopy(t);
  const stale = node(join(directory, 'scripts/check.mjs'));
  assert.notEqual(stale.status, 0);
  assert.match(stale.stderr, /pack guide is stale/);
  assert.equal(node(join(directory, 'scripts/render-knowledge-guide.mjs')).status, 0);
  const result = node(join(directory, 'scripts/check.mjs'));
  assert.equal(result.status, 0, result.stderr);
  const guide = readFileSync(join(directory, 'knowledge/packs/guide.md'), 'utf8');
  assert.match(guide, /^- \*\*Sample fixture pack\*\* \(`sample`, candidate\): Test fixture/m);
  assert.match(guide, /^  - \[Remove a feature flag with its last reader\]\(#sample-feature-flag-cleanup\)$/m);
  assert.match(guide, /<a id="sample-release-notes-owner"><\/a>\n\n## Give each release note one owner/);
  assert.match(guide, /\*\*Bad example \(illustrative\):\*\*\n\n```text\nNotes generated from ticket titles/);
  assert.match(guide, /^Pack: `sample` \(candidate\)\. Topics: `release`, `backend`, `review`\.$/m);
  assert.equal(readFileSync(join(directory, 'knowledge/guide.md'), 'utf8'), readFileSync(join(root, 'knowledge/guide.md'), 'utf8'));
});

test('check rejects a pack with a missing section, a duplicate id or a disallowed topic', t => {
  const mutated = mutate => {
    const pack = fixturePack();
    mutate(pack);
    return pack;
  };
  const cases = [
    [{ 'sample.json': mutated(pack => { pack.cards[0].content = pack.cards[0].content.replace(/\n\n\*\*Checks:\*\*[^\n]*/, ''); }) }, /card sample-release-notes-owner: missing section "Checks"/],
    [{ 'sample.json': mutated(pack => { pack.cards[1].id = pack.cards[0].id; }) }, /card sample-release-notes-owner: duplicate card id/],
    [{ 'state.json': mutated(pack => { pack.pack = 'state'; pack.cards[0].id = 'state-single-owner'; pack.cards[1].id = 'state-feature-flag-cleanup'; }) }, /card state-single-owner: duplicate card id/],
    [{ 'sample.json': mutated(pack => { pack.cards[0].topics = ['astrology', 'backend', 'review']; }) }, /topic "astrology" is not allowed/],
  ];
  for (const [packs, expected] of cases) {
    const result = node(join(harnessCopy(t, packs), 'scripts/check.mjs'));
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, expected);
  }
});

test('leak scan reports deny-list terms and home paths by location without printing them', t => {
  const term = 'xq7-private-term';
  const pack = fixturePack();
  pack.cards[0].content = pack.cards[0].content.replace('merged change', `merged ${term.toUpperCase()} change`);
  pack.cards[1].id = `sample-${term}`;
  const directory = harnessCopy(t, { 'sample.json': pack });
  mkdirSync(join(directory, '.local'));
  writeFileSync(join(directory, '.local/deny-terms.txt'), `# private terms\n\n${term}\n`);
  const homePath = ['', 'home', 'example-user', 'notes.md'].join('/');
  const docs = readFileSync(join(directory, 'docs/readiness.md'), 'utf8');
  writeFileSync(join(directory, 'docs/readiness.md'), `${docs}\nSee ${homePath}.\n`);
  const result = node(join(directory, 'scripts/check.mjs'));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /deny-list term: knowledge\/packs\/sample\.json card sample-release-notes-owner\n/);
  assert.match(result.stderr, /deny-list term: knowledge\/packs\/sample\.json card #2\n/);
  assert.match(result.stderr, new RegExp(`absolute home path: docs/readiness\\.md:${docs.split('\n').length + 1}\\n`));
  const output = (result.stdout + result.stderr).toLowerCase();
  for (const text of [term, 'example-user']) assert.ok(!output.includes(text), `printed ${text}`);
});

test('installer copies packs, templates and every skill directory', t => {
  const source = harnessCopy(t);
  mkdirSync(join(source, 'skills/extra-skill/references'), { recursive: true });
  writeFileSync(join(source, 'skills/extra-skill/SKILL.md'), '---\nname: extra-skill\ndescription: Test skill.\n---\n\nRead .agent-harness/WORKFLOW.md and .agent-harness/PROJECT.md.\n');
  writeFileSync(join(source, 'skills/extra-skill/references/notes.md'), 'Reference');
  const repo = checkout(t);
  const result = node(join(source, 'scripts/install.mjs'), '--repo', repo, '--client', 'claude');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(join(repo, '.agent-harness/knowledge/packs/sample.json'), 'utf8'), readFileSync(join(source, 'knowledge/packs/sample.json'), 'utf8'));
  for (const skill of skillsIn(source)) assert.ok(existsSync(join(repo, '.claude/skills', skill, 'SKILL.md')), skill);
  assert.equal(readFileSync(join(repo, '.claude/skills/extra-skill/references/notes.md'), 'utf8'), 'Reference');
  for (const name of ['initiative.md', 'PROJECT.md'])
    assert.equal(readFileSync(join(repo, '.agent-harness/templates', name), 'utf8'), readFileSync(join(source, 'templates', name), 'utf8'));
  assert.equal(readFileSync(join(repo, '.agent-harness/PROJECT.md'), 'utf8'), readFileSync(join(source, 'templates/PROJECT.md'), 'utf8'));
  assert.equal(execFileSync('git', ['-C', repo, 'status', '--porcelain'], { encoding: 'utf8' }).trim(), '');
});
