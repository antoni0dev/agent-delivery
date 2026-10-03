import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync, symlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));

test('optional knowledge check works from a checkout path containing spaces', t => {
  const directory = mkdtempSync(join(tmpdir(), 'harness with spaces-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  for (const name of ['knowledge', 'patterns', 'scripts', 'WORKFLOW.md', 'templates', 'skills', 'docs'])
    cpSync(join(root, name), join(directory, name), { recursive: true });
  const result = spawnSync(process.execPath, [join(directory, 'scripts/check.mjs')], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

test('pattern catalog validation rejects selector-breaking field shapes', t => {
  const directory = mkdtempSync(join(tmpdir(), 'harness-pattern-catalog-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  for (const name of ['knowledge', 'patterns', 'scripts', 'WORKFLOW.md', 'templates', 'skills', 'docs'])
    cpSync(join(root, name), join(directory, name), { recursive: true });
  const catalogPath = join(directory, 'patterns/catalog.json');
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
  catalog.patterns[0].topics = 'branching';
  writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
  const result = spawnSync(process.execPath, [join(directory, 'scripts/check.mjs')], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /slug topics/);
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
  assert.match(select('--list-patterns').stdout, /explicit-query-state: Explicit query state and MatchQuery/);
  assert.match(select('--pattern-topic', 'query').stdout, /Pattern: explicit-query-state/);
  assert.match(select('--pattern', 'query-transforms').stdout, /Synchronous and asynchronous query transforms/);
  assert.notEqual(select('--topic', 'does-not-exist').status, 0);
  assert.notEqual(select('--card', 'does-not-exist').status, 0);
  assert.notEqual(select('--pattern', 'does-not-exist').status, 0);
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
  for (const name of ['scripts', 'knowledge', 'patterns', 'skills', 'roles', 'templates', 'WORKFLOW.md', 'docs']) cpSync(join(root, name), join(packageCopy, name), { recursive: true });
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
    for (const name of ['engineering-manager', 'engineering-knowledge', 'engineering-patterns', 'shape-linear-ticket', 'pr-audit', 'project-qa', 'quality-gates']) {
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
