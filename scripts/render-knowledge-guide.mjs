import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const sourcePath = fileURLToPath(new URL('../knowledge/cards.json', import.meta.url));
const outputPath = fileURLToPath(new URL('../knowledge/guide.md', import.meta.url));
const source = readFileSync(sourcePath, 'utf8');
const { cards } = JSON.parse(source);
const sourceDigest = createHash('sha256').update(source).digest('hex');
const examplesAsCode = (content) => content.replace(
  /\*\*((?:Bad|Better) example \(illustrative\)):\*\* ([^\n]+)/g,
  (_match, label, example) => `**${label}:**\n\n\`\`\`text\n${example}\n\`\`\``,
);
const content = [
  '# Engineering decision guide',
  'Generated from `cards.json`. Edit that source and run `node scripts/render-knowledge-guide.mjs`; this readable guide is not a second knowledge authority.',
  `Source file SHA-256: \`${sourceDigest}\`.`,
  'Use these as scoped decision aids. Repository conventions, approved product behavior and actual runtime contracts take precedence. The examples are illustrative, and an exception is not permission to weaken a required safety or authorization boundary.',
  cards.map((card) => `- [${card.content.split('\n')[0].replace(/^## /, '')}](#${card.id})`).join('\n'),
  ...cards.map((card) => `<a id="${card.id}"></a>\n\n${examplesAsCode(card.content)}\n\nTopics: ${card.topics.map((topic) => `\`${topic}\``).join(', ')}.`),
  '',
].join('\n\n').trimEnd() + '\n';

const args = process.argv.slice(2);
if (args.length === 0) {
  writeFileSync(outputPath, content);
} else if (args.length === 1 && args[0] === '--check') {
  if (readFileSync(outputPath, 'utf8') !== content) {
    throw new Error('Knowledge guide is stale; regenerate it from cards.json');
  }
} else {
  throw new Error('Use no arguments to generate, or --check to verify');
}
