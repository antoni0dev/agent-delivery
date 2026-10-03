import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const { cards } = JSON.parse(readFileSync(new URL('knowledge/cards.json', root), 'utf8'));
const { topics } = JSON.parse(readFileSync(new URL('knowledge/topics.json', root), 'utf8'));
const { patterns } = JSON.parse(readFileSync(new URL('patterns/catalog.json', root), 'utf8'));
const patternTopics = new Map();
for (const pattern of patterns) {
  for (const topic of pattern.topics) {
    const ids = patternTopics.get(topic) ?? [];
    ids.push(pattern.id);
    patternTopics.set(topic, ids);
  }
}
const args = process.argv.slice(2);
try {
  if (args.length === 1 && args[0] === '--list') {
    process.stdout.write(Object.entries(topics).map(([topic, ids]) => `${topic}: ${ids.join(', ')}`).join('\n') + '\n');
  } else if (args.length === 1 && args[0] === '--list-patterns') {
    process.stdout.write([
      ...patterns.map(pattern => `${pattern.id}: ${pattern.title} [${pattern.topics.join(', ')}]`),
      '',
      ...[...patternTopics].map(([topic, ids]) => `${topic}: ${ids.join(', ')}`),
    ].join('\n') + '\n');
  } else {
    const selectedCards = new Set();
    const selectedPatterns = new Set();
    if (!args.length) throw new Error('Use --list, --list-patterns, --topic TOPIC, --card ID, --pattern-topic TOPIC or --pattern ID.');
    for (let i = 0; i < args.length; i += 2) {
      const flag = args[i];
      const value = args[i + 1];
      if (flag === '--topic' && Object.hasOwn(topics, value)) {
        topics[value].forEach(id => selectedCards.add(id));
      } else if (flag === '--card' && cards.some(card => card.id === value)) {
        selectedCards.add(value);
      } else if (flag === '--pattern-topic' && patternTopics.has(value)) {
        patternTopics.get(value).forEach(id => selectedPatterns.add(id));
      } else if (flag === '--pattern' && patterns.some(pattern => pattern.id === value)) {
        selectedPatterns.add(value);
      } else throw new Error(`Unknown selector: ${flag} ${value ?? ''}. Use --list or --list-patterns.`);
    }
    const output = [
      ...cards
        .filter(card => selectedCards.has(card.id))
        .map(card => `<!-- Card: ${card.id} -->\n${card.content}`),
      ...patterns
        .filter(pattern => selectedPatterns.has(pattern.id))
        .map(pattern => `<!-- Pattern: ${pattern.id} -->\n${readFileSync(new URL(`patterns/${pattern.recipe}`, root), 'utf8').trim()}`),
    ];
    process.stdout.write(output.join('\n\n') + '\n');
  }
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
