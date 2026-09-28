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
  for (const name of ['knowledge', 'scripts', 'WORKFLOW.md', 'templates', 'skills'])
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
  assert.equal(install(worktree).status, 0);
  assert.equal(execFileSync('git', ['-C', worktree, 'status', '--porcelain'], { encoding: 'utf8' }).trim(), '');
});

test('an unmodified managed install accepts a source update without deleting unrelated files', t => {
  const repo = checkout(t);
  assert.equal(install(repo).status, 0);
  writeFileSync(join(repo, '.agent-harness/personal-note.md'), 'Keep me');
  const packageCopy = checkout(t);
  for (const name of ['scripts', 'knowledge', 'skills', 'roles', 'templates', 'WORKFLOW.md']) cpSync(join(root, name), join(packageCopy, name), { recursive: true });
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
