import { existsSync, readdirSync, readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = name => JSON.parse(readFileSync(new URL(name, root), 'utf8'));
const titleOf = card => card.content.split('\n')[0].replace(/^## /, '');
const { patterns } = read('patterns/catalog.json');
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
  const cards = read('knowledge/cards.json').cards.map(card => ({ ...card, source: 'core', header: card.id }));
  const ids = new Set(cards.map(card => card.id));
  const topics = new Map(Object.entries(read('knowledge/topics.json').topics).map(([topic, members]) => [topic, [...members]]));
  const packs = new Map();
  const packDirectory = new URL('knowledge/packs/', root);
  for (const file of existsSync(packDirectory) ? readdirSync(packDirectory).filter(name => name.endsWith('.json')).sort() : []) {
    try {
      const { pack, status, cards: packCards } = read(`knowledge/packs/${file}`);
      packs.set(pack, packCards.map(card => card.id));
      for (const card of packCards) {
        if (ids.has(card.id)) throw new Error(`duplicate card id ${card.id}`);
        ids.add(card.id);
        cards.push({ ...card, source: `pack:${pack} (${status})`, header: `${card.id} (pack ${pack}, ${status})` });
        for (const topic of card.topics) {
          if (!topics.has(topic)) topics.set(topic, []);
          topics.get(topic).push(card.id);
        }
      }
    } catch (error) {
      throw new Error(`Invalid knowledge pack knowledge/packs/${file}: ${error.message}`);
    }
  }

  const cardSelectors = {
    '--topic': value => topics.get(value),
    '--pack': value => packs.get(value),
    '--card': value => (ids.has(value) ? [value] : undefined),
  };
  const patternSelectors = {
    '--pattern-topic': value => patternTopics.get(value),
    '--pattern': value => (patterns.some(pattern => pattern.id === value) ? [value] : undefined),
  };

  if (args.length === 1 && args[0] === '--list') {
    process.stdout.write([...topics.keys()].sort().map(topic => `${topic}: ${topics.get(topic).join(', ')}`).join('\n') + '\n');
  } else if (args.length === 1 && args[0] === '--index') {
    process.stdout.write(cards.map(card => `${card.id} | ${titleOf(card)} | ${card.source} | ${card.topics.join(', ')}`).join('\n') + '\n');
  } else if (args.length === 1 && args[0] === '--list-patterns') {
    process.stdout.write([
      ...patterns.map(pattern => `${pattern.id}: ${pattern.title} [${pattern.topics.join(', ')}]`),
      '',
      ...[...patternTopics].map(([topic, patternIds]) => `${topic}: ${patternIds.join(', ')}`),
    ].join('\n') + '\n');
  } else {
    const selectedCards = new Set();
    const selectedPatterns = new Set();
    if (!args.length) throw new Error('Use --list, --index, --list-patterns, --topic TOPIC, --pack NAME, --card ID, --pattern-topic TOPIC or --pattern ID.');
    for (let i = 0; i < args.length; i += 2) {
      const flag = args[i];
      const value = args[i + 1];
      const cardMatches = Object.hasOwn(cardSelectors, flag) ? cardSelectors[flag](value) : undefined;
      const patternMatches = Object.hasOwn(patternSelectors, flag) ? patternSelectors[flag](value) : undefined;
      if (cardMatches) cardMatches.forEach(id => selectedCards.add(id));
      else if (patternMatches) patternMatches.forEach(id => selectedPatterns.add(id));
      else throw new Error(`Unknown selector: ${flag} ${value ?? ''}. Use --list, --index or --list-patterns.`);
    }
    const output = [
      ...cards.filter(card => selectedCards.has(card.id)).map(card => `<!-- Card: ${card.header} -->\n${card.content}`),
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
