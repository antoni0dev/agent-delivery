import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const { cards } = JSON.parse(readFileSync(new URL('knowledge/cards.json', root), 'utf8'));
const { topics } = JSON.parse(readFileSync(new URL('knowledge/topics.json', root), 'utf8'));
const args = process.argv.slice(2);
try {
  if (args.length === 1 && args[0] === '--list') {
    process.stdout.write(Object.entries(topics).map(([topic, ids]) => `${topic}: ${ids.join(', ')}`).join('\n') + '\n');
  } else {
    const selected = new Set();
    if (!args.length) throw new Error('Use --list, --topic TOPIC or --card ID (repeatable).');
    for (let i = 0; i < args.length; i += 2) {
      const flag = args[i];
      const value = args[i + 1];
      if (flag === '--topic' && Object.hasOwn(topics, value)) {
        topics[value].forEach(id => selected.add(id));
      } else if (flag === '--card' && cards.some(card => card.id === value)) {
        selected.add(value);
      } else throw new Error(`Unknown selector: ${flag} ${value ?? ''}. Use --list.`);
    }
    process.stdout.write(cards.filter(card => selected.has(card.id)).map(card => `<!-- Card: ${card.id} -->\n${card.content}`).join('\n\n') + '\n');
  }
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
