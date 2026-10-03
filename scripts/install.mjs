import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const source = fileURLToPath(new URL('../', import.meta.url));
const clients = { codex: '.agents', claude: '.claude', cursor: '.cursor' };
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = message => { throw new Error(message); };
const args = process.argv.slice(2);
try {
  let repo;
  let client;
  let dryRun = false;
  let projectFrom;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--repo') repo = args[++i];
    else if (args[i] === '--client') client = args[++i];
    else if (args[i] === '--project-from') projectFrom = args[++i];
    else if (args[i] === '--dry-run') dryRun = true;
    else fail(`Unknown argument: ${args[i]}`);
  }
  if (!repo || !isAbsolute(repo) || !Object.hasOwn(clients, client)) fail('Use --repo ABSOLUTE_PATH --client codex|claude|cursor [--project-from CONFIGURED_CHECKOUT] [--dry-run]');
  repo = realpathSync(repo);
  const top = realpathSync(execFileSync('git', ['-C', repo, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim());
  if (top !== repo) fail('--repo must be a Git checkout root');
  const trackedPrivate = execFileSync('git', ['-C', repo, 'ls-files', '-z', '--', '.agent-harness/PROJECT.md', '.agent-harness/initiatives'], { encoding: 'utf8' });
  if (trackedPrivate) fail('Private PROJECT.md or initiative files are tracked by Git. Remove them from tracking deliberately before installing; local exclusions cannot protect tracked files.');
  const manifestPath = join(repo, '.agent-harness/install-manifest.json');
  const safePath = name => {
    const full = resolve(repo, name);
    if (!full.startsWith(repo + sep)) fail(`Unsafe managed path: ${name}`);
    let current = repo;
    for (const part of relative(repo, full).split(sep)) {
      current = join(current, part);
      if (lstatSync(current, { throwIfNoEntry: false })?.isSymbolicLink()) fail(`Refusing symlink: ${current}`);
    }
    return full;
  };
  safePath('.agent-harness/install-manifest.json');
  const old = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : { version: 1, files: {} };
  if (old.version !== 1 || !old.files || typeof old.files !== 'object') fail('Invalid installation manifest');
  const files = new Map();
  const add = (from, to) => {
    if (lstatSync(from).isSymbolicLink()) fail(`Source symlink is not portable: ${from}`);
    if (lstatSync(from).isDirectory()) {
      for (const entry of readdirSync(from)) add(join(from, entry), `${to}/${entry}`);
    } else files.set(to, readFileSync(from));
  };
  for (const name of ['WORKFLOW.md', 'roles', 'knowledge', 'scripts/select.mjs', 'templates', 'docs/knowledge.md', 'docs/readiness.md']) add(join(source, name), `.agent-harness/${name}`);
  const skills = readdirSync(join(source, 'skills')).filter(skill => !lstatSync(join(source, 'skills', skill)).isFile()).sort();
  for (const skill of skills) add(join(source, 'skills', skill), `${clients[client]}/skills/${skill}`);
  // Validate every planned write before modifying the checkout.
  for (const [name, bytes] of files) {
    const path = safePath(name);
    if (!existsSync(path)) continue;
    if (!lstatSync(path).isFile()) fail(`Not a regular managed file: ${name}`);
    const actual = hash(readFileSync(path));
    if (!Object.hasOwn(old.files, name)) fail(`Refusing unowned file: ${name}`);
    if (actual !== old.files[name]) fail(`Preserve local edit before upgrading: ${name}`);
  }
  const projectPath = safePath('.agent-harness/PROJECT.md');
  safePath('.agent-harness/initiatives');
  let projectTemplate = readFileSync(join(source, 'templates/PROJECT.md'));
  const gitCommon = root => realpathSync(execFileSync('git', ['-C', root, 'rev-parse', '--path-format=absolute', '--git-common-dir'], { encoding: 'utf8' }).trim());
  if (projectFrom) {
    if (!isAbsolute(projectFrom)) fail('--project-from requires an absolute checkout path');
    const origin = realpathSync(projectFrom);
    if (gitCommon(origin) !== gitCommon(repo)) fail('--project-from must belong to the same Git repository');
    projectTemplate = readFileSync(join(origin, '.agent-harness/PROJECT.md'));
  }
  const common = gitCommon(repo);
  const gitDirectory = realpathSync(execFileSync('git', ['-C', repo, 'rev-parse', '--absolute-git-dir'], { encoding: 'utf8' }).trim());
  if (common !== gitDirectory && !existsSync(projectPath) && !projectFrom)
    fail('New worktree: use --project-from <configured-checkout> to preserve project settings');
  const exclude = resolve(repo, execFileSync('git', ['-C', repo, 'rev-parse', '--git-path', 'info/exclude'], { encoding: 'utf8' }).trim());
  if (existsSync(exclude) && lstatSync(exclude).isSymbolicLink()) fail('Refusing symlinked Git exclusion file');
  const exclusions = ['/.agent-harness/', ...skills.map(skill => `/${clients[client]}/skills/${skill}/`)];
  const priorExclude = existsSync(exclude) ? readFileSync(exclude, 'utf8') : '';
  const missing = exclusions.filter(line => !priorExclude.split(/\r?\n/).includes(line));
  const next = { version: 1, files: { ...old.files } };
  for (const [name, bytes] of files) next.files[name] = hash(bytes);
  if (!dryRun) {
    for (const [name, bytes] of files) {
      const path = safePath(name);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, bytes);
    }
    if (!existsSync(projectPath)) writeFileSync(projectPath, projectTemplate);
    mkdirSync(join(repo, '.agent-harness/initiatives'), { recursive: true });
    writeFileSync(manifestPath, JSON.stringify(next, null, 2) + '\n');
    if (missing.length) {
      mkdirSync(dirname(exclude), { recursive: true });
      writeFileSync(exclude, priorExclude + (priorExclude.endsWith('\n') || !priorExclude ? '' : '\n') + missing.join('\n') + '\n');
    }
  }
  process.stdout.write(`${dryRun ? 'Would install' : 'Installed'} ${files.size} managed files for ${client}. PROJECT.md and initiatives are preserved; after an upgrade, compare PROJECT.md with .agent-harness/templates/PROJECT.md for new sections. Installation is not readiness: complete .agent-harness/docs/readiness.md before delivery.\n`);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
