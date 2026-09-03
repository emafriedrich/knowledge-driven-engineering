// Prints the retrieval bundle for a code path or domain (DR-008). Its output
// is the context receipt an agent attaches to a PR or task (DR-007, Gate 5).
import { relative, resolve } from 'node:path';
import { checkKnowledge, loadCatalogs, parseDecisionIndex, values, type Catalog } from './knowledge-check.ts';

const root = process.cwd();
const input = process.argv[2];

if (!input) {
  console.error('usage: npm run knowledge:context -- <file-or-domain>');
  process.exit(1);
}

const catalogs = loadCatalogs(root);
const { documents } = checkKnowledge(root);
const byId = new Map(documents.map((document) => [String(document.data.id), document]));

function describe(id: string): string {
  const document = byId.get(id);
  return document ? `${id} (${relative(root, document.file)})` : `${id} (unresolved)`;
}

type Match = { catalog: Catalog; name: string };

const matches: Match[] = [];
const asPath = relative(root, resolve(root, input));

for (const catalog of catalogs) {
  for (const [name, domain] of catalog.domains) {
    const isDomainName = name === input;
    const ownsCode = domain.codePaths.some((prefix) => asPath.startsWith(prefix.replace(/\/$/, '') + '/') || asPath === prefix.replace(/\/$/, ''));
    const ownsKnowledge = domain.path !== undefined && (asPath.startsWith(domain.path.replace(/\/$/, '') + '/') || asPath === domain.path);

    if (isDomainName || ownsCode || ownsKnowledge) matches.push({ catalog, name });
  }
}

if (matches.length === 0) {
  const known = catalogs.flatMap((catalog) => [...catalog.domains.keys()]);
  console.error(`no domain matches ${input}. Known domains: ${known.join(', ')}. Map code with code_paths in the domain catalog.`);
  process.exit(1);
}

console.log('# Context Receipt');
console.log('');
console.log(`Input: ${input}`);
console.log(`Generated: ${new Date().toISOString().slice(0, 10)}`);

for (const { catalog, name } of matches) {
  const domain = catalog.domains.get(name)!;
  console.log('');
  console.log(`## Domain: ${name}`);
  console.log('');
  if (domain.path) console.log(`- Domain README: ${domain.path.replace(/\/$/, '')}/README.md`);

  for (const [role, id] of Object.entries(domain.current)) {
    console.log(`- ${role}: ${describe(id)}`);
  }

  if (domain.decisionIndex) {
    const decisions = parseDecisionIndex(resolve(root, domain.decisionIndex));
    for (const [topic, id] of Object.entries(decisions ?? {})) {
      console.log(`- active decision ${topic}: ${describe(id)}`);
    }
  }
}

console.log('');
console.log('## Confirmation');
console.log('');
console.log('- Documents above were read before changing behavior.');
console.log('- Conflicts found: <none | describe the conflict>');
