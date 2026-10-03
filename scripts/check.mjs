import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readdirSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const base = fileURLToPath(root);
const read = name => readFileSync(new URL(name, root), 'utf8');
const json = name => JSON.parse(read(`knowledge/${name}.json`));
const stable = value => {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value !== null && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(',')}}`;
  return JSON.stringify(value);
};
const digest = value => createHash('sha256').update(stable(value)).digest('hex');
const { cards } = json('cards');
const release = json('release');
const audit = json('audit');
const snapshot = json('source-snapshot');
const coverage = json('coverage');
const topics = json('topics');
assert.equal(cards.length, 58, 'Preserve the complete 58-card knowledge release');
assert.equal(new Set(cards.map(card => card.id)).size, cards.length);
const digests = {
  cardSetDigest: digest(cards.map(card => ({ id: card.id, digest: digest({ id: card.id, topics: card.topics, content: card.content }) }))),
  sourceSnapshotDigest: digest({ schemaVersion: snapshot.schemaVersion, sources: snapshot.sources }),
  coverageDigest: digest({ schemaVersion: coverage.schemaVersion, sourceSnapshotDigest: coverage.sourceSnapshotDigest, units: coverage.units }),
  topicIndexDigest: digest({ schemaVersion: topics.schemaVersion, topics: topics.topics }),
};
for (const [key, value] of Object.entries(digests)) {
  assert.equal(release[key], value, `Release mismatch: ${key}`);
  assert.equal(audit[key], value, `Audit mismatch: ${key}`);
}
const { auditDigest, ...auditPayload } = audit;
assert.equal(digest(auditPayload), auditDigest, 'Audit receipt mismatch');
assert.equal(audit.decision, 'approved');
assert.equal(coverage.sourceSnapshotDigest, digests.sourceSnapshotDigest);
const expectedTopics = {};
for (const card of cards) for (const topic of card.topics) (expectedTopics[topic] ??= []).push(card.id);
assert.deepEqual(topics.topics, expectedTopics);

// Leak scan. Findings name the category and location only, never the matched text.
const denyFile = join(base, '.local/deny-terms.txt');
const denyTerms = existsSync(denyFile) ? readFileSync(denyFile, 'utf8').split('\n').map(line => line.trim().toLowerCase()).filter(line => line && !line.startsWith('#')) : [];
const leakRules = {
  'private key header': text => /-----BEGIN [A-Z0-9 ]*PRIVATE KEY/.test(text),
  '0x-prefixed 64-hex value': text => /0[xX][0-9a-fA-F]{64}/.test(text),
  'absolute home path': text => /(?<![\w.-])(?:\/(?:Users|home)\/|[A-Za-z]:\\Users\\)[^\s/\\]+/.test(text),
  'deny-list term': text => denyTerms.some(term => text.toLowerCase().includes(term)),
};
const leaksIn = text => Object.keys(leakRules).filter(category => leakRules[category](text));
const shown = (text, fallback) => (leaksIn(text).length ? fallback : text);
const strings = value => {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value !== null && typeof value === 'object') return Object.entries(value).flatMap(([key, item]) => [key, ...strings(item)]);
  return [];
};
const parseJson = text => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};
const walk = name => {
  const stat = lstatSync(join(base, name), { throwIfNoEntry: false });
  if (stat?.isDirectory()) return readdirSync(join(base, name)).sort().flatMap(entry => walk(`${name}/${entry}`));
  return stat?.isFile() ? [name] : [];
};
const leaks = [];
for (const scanRoot of ['knowledge/packs', 'knowledge/README.md', 'roles', 'skills', 'templates', 'docs', 'scripts', 'test', '.github', 'WORKFLOW.md', 'README.md', 'AGENTS.md']) {
  for (const name of walk(scanRoot)) {
    const file = shown(name, `${scanRoot}/<redacted path>`);
    const report = (location, text) => leaksIn(text).forEach(category => leaks.push(`${category}: ${file}${location}`));
    report(' (file name)', name);
    const text = readFileSync(join(base, name), 'utf8');
    const before = leaks.length;
    const pack = name.endsWith('.json') ? parseJson(text) : undefined;
    if (Array.isArray(pack?.cards)) {
      const { cards: packCards, ...metadata } = pack;
      report(' (pack metadata)', strings(metadata).join('\n'));
      packCards.forEach((card, index) => report(` card ${typeof card?.id === 'string' ? shown(card.id, `#${index + 1}`) : `#${index + 1}`}`, strings(card).join('\n')));
    } else {
      text.split('\n').forEach((line, index) => report(`:${index + 1}`, line));
    }
    // Catch terms wrapped across lines and values hidden by duplicate JSON keys.
    if (leaks.length === before) report(' (across lines or raw text)', text.replace(/\\n/g, ' ').replace(/\s+/g, ' '));
  }
}
if (leaks.length) throw new Error(`Leak scan failed (matched text is not shown):\n${leaks.join('\n')}`);

const allowedTopics = new Set([...Object.keys(topics.topics), 'money', 'quotes', 'chain', 'signing', 'execution', 'contracts', 'release', 'security', 'web-app', 'frontend', 'backend']);
const sections = ['Apply when', 'Boundary notes', 'Checks', 'Anti-pattern', 'Why it fails', 'Bad example (illustrative)', 'Better example (illustrative)', 'Legitimate exceptions', 'Verification scenario', 'Automatable check'];
const optionalSections = new Set(['Boundary notes', 'Automatable check']);
const exampleSections = new Set(['Bad example (illustrative)', 'Better example (illustrative)']);
const kebab = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const hasExactly = (value, keys) => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join() === [...keys].sort().join();
const nonEmpty = value => typeof value === 'string' && value.trim() !== '';
const sectionProblems = content => {
  const [title, ...paragraphs] = content.split(/\n\s*\n/);
  const found = [];
  let ruleParagraphs = 0;
  for (const paragraph of paragraphs) {
    const label = /^\*\*([^*\n]+):\*\*/.exec(paragraph)?.[1];
    if (label) found.push({ label, paragraph, continued: false });
    else if (found.length) found.at(-1).continued = true;
    else ruleParagraphs++;
  }
  const problems = [];
  if (!/^## \S[^\n]*$/.test(title)) problems.push('content must start with a one-line "## " title followed by a blank line');
  if (!ruleParagraphs) problems.push('a rule paragraph must follow the title');
  let last = -1;
  for (const { label, paragraph, continued } of found) {
    const at = sections.indexOf(label);
    if (at === -1) problems.push(`unexpected section "${label}"`);
    else if (at <= last) problems.push(`section "${label}" is repeated or out of order`);
    else last = at;
    if (exampleSections.has(label) && (continued || !/^\*\*[^*\n]+:\*\* \S[^\n]*$/.test(paragraph))) problems.push(`"${label}" must be a single line`);
    else if (!continued && !paragraph.slice(label.length + 5).trim()) problems.push(`section "${label}" is empty`);
  }
  for (const label of sections) {
    if (optionalSections.has(label) || found.some(item => item.label === label)) continue;
    problems.push(content.includes(`**${label}:**`) ? `section "${label}" must start its own paragraph` : `missing section "${label}"`);
  }
  return problems;
};
const packDirectory = join(base, 'knowledge/packs');
const packFiles = existsSync(packDirectory) ? readdirSync(packDirectory).filter(file => file.endsWith('.json')).sort() : [];
const cardIds = new Set(cards.map(card => card.id));
const packProblems = [];
for (const file of packFiles) {
  const name = file.slice(0, -'.json'.length);
  const problem = message => packProblems.push(`knowledge/packs/${file}: ${message}`);
  const pack = parseJson(readFileSync(join(packDirectory, file), 'utf8'));
  if (!hasExactly(pack, ['schemaVersion', 'pack', 'title', 'status', 'summary', 'cards'])) {
    problem(pack === undefined ? 'invalid JSON' : 'fields must be exactly schemaVersion, pack, title, status, summary and cards');
    continue;
  }
  if (pack.schemaVersion !== 1) problem('schemaVersion must be 1');
  if (pack.pack !== name || !kebab.test(name)) problem('pack must be a kebab-case name equal to the file name');
  if (!nonEmpty(pack.title) || !nonEmpty(pack.summary)) problem('title and summary must be non-empty strings');
  if (!['candidate', 'approved'].includes(pack.status)) problem('status must be candidate or approved');
  if (!Array.isArray(pack.cards) || !pack.cards.length) {
    problem('cards must be a non-empty array');
    continue;
  }
  pack.cards.forEach((card, index) => {
    const cardProblem = message => problem(`card ${typeof card?.id === 'string' ? card.id : `#${index + 1}`}: ${message}`);
    if (!hasExactly(card, ['id', 'topics', 'content'])) return cardProblem('fields must be exactly id, topics and content');
    if (typeof card.id !== 'string' || !kebab.test(card.id) || !card.id.startsWith(`${name}-`) || card.id.length > 60) cardProblem(`id must be kebab-case, start with "${name}-" and have at most 60 characters`);
    else if (cardIds.has(card.id)) cardProblem('duplicate card id across core cards and packs');
    else cardIds.add(card.id);
    const cardTopics = Array.isArray(card.topics) ? card.topics : [];
    if (cardTopics.length < 2 || cardTopics.length > 5 || new Set(cardTopics).size !== cardTopics.length) cardProblem('topics must be an array of 2-5 distinct topics');
    for (const topic of cardTopics) if (!allowedTopics.has(topic)) cardProblem(`topic "${topic}" is not allowed`);
    if (!cardTopics.some(topic => ['frontend', 'backend'].includes(topic))) cardProblem('topics need frontend or backend');
    if (!cardTopics.some(topic => ['planning', 'implementation', 'review'].includes(topic))) cardProblem('topics need planning, implementation or review');
    if (typeof card.content !== 'string') return cardProblem('content must be a string');
    if (card.content.length < 800 || card.content.length > 3200) cardProblem(`content has ${card.content.length} characters; use 800-3200`);
    sectionProblems(card.content).forEach(cardProblem);
  });
}
const referencePattern = /(?:(?:core|pack) cards?|\bsee) ([a-z0-9]+(?:-[a-z0-9]+)+(?:(?:, | and )[a-z0-9]+(?:-[a-z0-9]+)+)*)/gi;
for (const file of packFiles) {
  const pack = parseJson(readFileSync(join(packDirectory, file), 'utf8'));
  for (const card of Array.isArray(pack?.cards) ? pack.cards : []) {
    if (typeof card?.content !== 'string') continue;
    for (const [, list] of card.content.matchAll(referencePattern))
      for (const id of list.split(/, | and /)) if (!cardIds.has(id)) packProblems.push(`knowledge/packs/${file}: card ${card.id}: references unknown card "${id}"`);
  }
}
if (packProblems.length) throw new Error(`Knowledge pack validation failed:\n${packProblems.join('\n')}`);

execFileSync(process.execPath, [fileURLToPath(new URL('scripts/render-knowledge-guide.mjs', root)), '--check'], { stdio: 'inherit' });
for (const name of ['WORKFLOW.md', 'templates/PROJECT.md', 'templates/initiative.md']) assert.ok(read(name).trim(), `Missing ${name}`);
const skillDirectory = join(base, 'skills');
const skills = readdirSync(skillDirectory).filter(name => !lstatSync(join(skillDirectory, name)).isFile()).sort();
assert.ok(skills.length, 'skills/ must contain at least one skill directory');
for (const name of skills) {
  assert.ok(lstatSync(join(skillDirectory, name)).isDirectory(), `skills/${name} must be a directory, not a link`);
  const path = join(skillDirectory, name, 'SKILL.md');
  assert.ok(existsSync(path), `${name}: missing SKILL.md`);
  const content = readFileSync(path, 'utf8');
  const frontmatter = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(content)?.[1];
  assert.ok(frontmatter !== undefined, `${name}: SKILL.md must start with YAML frontmatter at its first byte`);
  const field = key => new RegExp(`^${key}:[ \\t]*(.*)$`, 'm').exec(frontmatter)?.[1].trim();
  assert.equal(field('name'), name, `${name}: frontmatter name must equal the directory name`);
  assert.ok(field('description'), `${name}: frontmatter needs a description`);
  assert.ok(content.includes('.agent-harness/WORKFLOW.md'), `${name} must load shared workflow`);
  assert.ok(content.includes('.agent-harness/PROJECT.md'), `${name} must load project contract`);
}
process.stdout.write(`Knowledge release, independent audit bindings, ${packFiles.length} knowledge pack(s), leak scan (${denyTerms.length ? `${denyTerms.length} private deny-list terms` : 'no private deny list found; built-in patterns only'}), generated guides and ${skills.length} shared skill entrypoints verified.\n`);
