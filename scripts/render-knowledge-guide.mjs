import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const sourcePath = fileURLToPath(new URL('../knowledge/cards.json', import.meta.url));
const outputPath = fileURLToPath(new URL('../knowledge/guide.md', import.meta.url));
const packDirectory = fileURLToPath(new URL('../knowledge/packs/', import.meta.url));
const packGuidePath = join(packDirectory, 'guide.md');
const source = readFileSync(sourcePath, 'utf8');
const { cards } = JSON.parse(source);
const sourceDigest = createHash('sha256').update(source).digest('hex');
const titleOf = (card) => card.content.split('\n')[0].replace(/^## /, '');
const topicList = (card) => card.topics.map((topic) => `\`${topic}\``).join(', ');
const examplesAsCode = (content) => content.replace(
  /\*\*((?:Bad|Better) example \(illustrative\)):\*\* ([^\n]+)/g,
  (_match, label, example) => `**${label}:**\n\n\`\`\`text\n${example}\n\`\`\``,
);
const content = [
  '# Engineering decision guide',
  'Generated from `cards.json`. Edit that source and run `node scripts/render-knowledge-guide.mjs`; this readable guide is not a second knowledge authority.',
  `Source file SHA-256: \`${sourceDigest}\`.`,
  'Use these as scoped decision aids. Repository conventions, approved product behavior and actual runtime contracts take precedence. The examples are illustrative, and an exception is not permission to weaken a required safety or authorization boundary.',
  cards.map((card) => `- [${titleOf(card)}](#${card.id})`).join('\n'),
  ...cards.map((card) => `<a id="${card.id}"></a>\n\n${examplesAsCode(card.content)}\n\nTopics: ${topicList(card)}.`),
  '',
].join('\n\n').trimEnd() + '\n';

const packFiles = existsSync(packDirectory) ? readdirSync(packDirectory).filter((file) => file.endsWith('.json')).sort() : [];
const packs = packFiles.map((file) => {
  try {
    const pack = JSON.parse(readFileSync(join(packDirectory, file), 'utf8'));
    return {
      index: `- **${pack.title}** (\`${pack.pack}\`, ${pack.status}): ${pack.summary}\n${pack.cards.map((card) => `  - [${titleOf(card)}](#${card.id})`).join('\n')}`,
      cards: pack.cards.map((card) => `<a id="${card.id}"></a>\n\n${examplesAsCode(card.content)}\n\nPack: \`${pack.pack}\` (${pack.status}). Topics: ${topicList(card)}.`),
    };
  } catch {
    throw new Error(`Cannot render knowledge pack ${file}; run node scripts/check.mjs for details`);
  }
});
const packGuide = [
  '# Domain knowledge packs',
  'Generated from `knowledge/packs/*.json`. Edit those sources and run `node scripts/render-knowledge-guide.mjs`; this readable guide is not a second knowledge authority. The core cards are in the [engineering decision guide](../guide.md).',
  ...(packs.length ? [
    'A candidate pack is a usable decision aid that the historical 58-card audit does not cover. A pack becomes approved only after an independent semantic review recorded in its pull request. Repository conventions, approved product behavior and actual runtime contracts take precedence, and the examples are illustrative.',
    packs.map((pack) => pack.index).join('\n'),
    ...packs.flatMap((pack) => pack.cards),
  ] : ['There are no domain knowledge packs yet. [Using the knowledge release](../README.md) explains how to add one.']),
  '',
].join('\n\n').trimEnd() + '\n';

const outputs = [
  [outputPath, content, 'Knowledge guide is stale; regenerate it from cards.json'],
  [packGuidePath, packGuide, 'Knowledge pack guide is stale; regenerate it from knowledge/packs'],
];
const args = process.argv.slice(2);
if (args.length === 0) {
  mkdirSync(packDirectory, { recursive: true });
  for (const [path, text] of outputs) writeFileSync(path, text);
} else if (args.length === 1 && args[0] === '--check') {
  for (const [path, text, message] of outputs) {
    if (!existsSync(path) || readFileSync(path, 'utf8') !== text) throw new Error(message);
  }
} else {
  throw new Error('Use no arguments to generate, or --check to verify');
}
