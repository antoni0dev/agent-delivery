import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
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
const { patterns } = JSON.parse(read('patterns/catalog.json'));
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
execFileSync(process.execPath, [fileURLToPath(new URL('scripts/render-knowledge-guide.mjs', root)), '--check'], { stdio: 'inherit' });
for (const name of ['WORKFLOW.md', 'templates/PROJECT.md', 'templates/initiative.md']) assert.ok(read(name).trim(), `Missing ${name}`);
assert.equal(new Set(patterns.map(pattern => pattern.id)).size, patterns.length, 'Pattern IDs must be unique');
const cardIds = new Set(cards.map(card => card.id));
const recipeFiles = readdirSync(new URL('patterns/recipes/', root)).filter(name => name.endsWith('.md')).sort();
assert.deepEqual(patterns.map(pattern => pattern.recipe.replace('recipes/', '')).sort(), recipeFiles, 'Every recipe must have exactly one catalog entry');
const portablePatternText = [read('patterns/README.md'), read('patterns/inventory.md')];
for (const pattern of patterns) {
  assert.match(pattern.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.ok(pattern.topics.length, `Pattern needs topics: ${pattern.id}`);
  assert.ok(pattern.recipe.startsWith('recipes/') && !pattern.recipe.includes('..'), `Unsafe recipe path: ${pattern.recipe}`);
  const recipe = read(`patterns/${pattern.recipe}`);
  portablePatternText.push(recipe);
  assert.ok(recipe.startsWith(`# ${pattern.title}\n`), `Recipe title mismatch: ${pattern.id}`);
  for (const cardId of pattern.relatedCards) assert.ok(cardIds.has(cardId), `Unknown related card ${cardId} in ${pattern.id}`);
}
assert.doesNotMatch(portablePatternText.join('\n'), /\/Users\/|https?:\/\/|BEGIN [A-Z ]*PRIVATE KEY/, 'Pattern cookbook contains a non-portable path, URL or key marker');
for (const name of ['engineering-manager', 'engineering-knowledge', 'engineering-patterns', 'shape-linear-ticket', 'pr-audit', 'project-qa', 'quality-gates']) {
  const content = read(`skills/${name}/SKILL.md`);
  assert.ok(content.includes('.agent-harness/WORKFLOW.md'), `${name} must load shared workflow`);
  assert.ok(content.includes('.agent-harness/PROJECT.md'), `${name} must load project contract`);
}
process.stdout.write('Knowledge release, pattern cookbook, independent audit bindings, generated guide and shared entrypoints verified.\n');
