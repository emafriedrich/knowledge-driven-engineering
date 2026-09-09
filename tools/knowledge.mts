// Lifecycle commands (DR-013): every transition of KDE-FLOW-001 as one command
// instead of coordinated hand edits across a document, an index, a catalog and
// a manifest. The human ceremony of DR-007 is unchanged: these commands edit
// files; authority stays with the reviewed diff.
//
//   knowledge new <type> <domain> "<title>" [--by human|agent] [--author <name>] [--prefix <P>]
//   knowledge promote <ID> --by <human> [--topic <name>]
//   knowledge supersede <OLD-ID> --by <NEW-ID>
//   knowledge domain add <name> --description "<text>" [--code-paths a/ b/] [--catalog <file>]
//   knowledge renumber <OLD-ID> <NEW-ID>
//
// Every command ends by running the validator and rewriting manifests, so the
// repository never leaves a command in a state the validator would reject
// without saying why.
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse as parseYaml } from 'yaml';

import { checkKnowledge, documentType, loadCatalogs, values, type Catalog, type CatalogDomain } from './knowledge-check.mts';
import { generateManifests } from './knowledge-context.mts';

type TypeSpec = { template: string; folder: string; prefix: string; active: string | null };

// Artifact types the commands know how to create and promote. `active` is the
// status promotion sets; null means the type is not promoted (tasks close,
// visions and prompts are edited in place).
const TYPES: Record<string, TypeSpec> = {
  decision: { template: 'decision-record.md', folder: 'decisions', prefix: 'DR', active: 'accepted' },
  rfc: { template: 'rfc.md', folder: 'rfcs', prefix: 'RFC', active: 'accepted' },
  spec: { template: 'spec.md', folder: 'specs', prefix: 'SPEC', active: 'current' },
  flow: { template: 'user-flow.md', folder: 'flows', prefix: 'FLOW', active: 'current' },
  ia: { template: 'information-architecture.md', folder: 'ia', prefix: 'IA', active: 'current' },
  'design-system': { template: 'design-system-component.md', folder: 'design-system', prefix: 'DS', active: 'current' },
  model: { template: 'model.md', folder: 'models', prefix: 'MODEL', active: 'current' },
  contract: { template: 'contract.md', folder: 'contracts', prefix: 'CONTRACT', active: 'current' },
  task: { template: 'task.md', folder: 'tasks', prefix: 'TASK', active: null },
};

const ID_PATTERN = /^[A-Z][A-Z0-9]*(?:-[A-Z][A-Z0-9]*)*-\d+$/;
const MOTIVATED_BY_PLACEHOLDER = '<the conflict, question or gap that motivated this RFC>';

export class CommandError extends Error {}

export type CommandResult = { changed: string[]; notes: string[] };

// --- Frontmatter text editing -----------------------------------------------
// Documents are edited as text, not re-serialized, so hand-written formatting
// and comments survive. Only single-line values and simple block lists occur
// in templates; anything else is left alone and reported.

type Doc = { front: string[]; body: string };

function splitDocument(content: string): Doc | null {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/.exec(content);
  if (!match) return null;
  return { front: match[1].split(/\r?\n/), body: content.slice(match[0].length) };
}

function joinDocument(doc: Doc): string {
  return `---\n${doc.front.join('\n')}\n---\n${doc.body}`;
}

function fieldRange(front: string[], key: string): [number, number] | null {
  const start = front.findIndex((line) => line.startsWith(`${key}:`));
  if (start === -1) return null;
  let end = start + 1;
  while (end < front.length && /^\s+\S/.test(front[end])) end += 1;
  return [start, end];
}

function setField(front: string[], key: string, value: string, after: string[] = []): void {
  const line = `${key}: ${value}`;
  const range = fieldRange(front, key);
  if (range) {
    front.splice(range[0], range[1] - range[0], line);
    return;
  }
  for (const anchor of after) {
    const anchorRange = fieldRange(front, anchor);
    if (anchorRange) {
      front.splice(anchorRange[1], 0, line);
      return;
    }
  }
  front.push(line);
}

function removeField(front: string[], key: string): void {
  const range = fieldRange(front, key);
  if (range) front.splice(range[0], range[1] - range[0]);
}

function yamlScalar(text: string): string {
  return /^[A-Za-z0-9][A-Za-z0-9 _./-]*$/.test(text) ? text : JSON.stringify(text);
}

function yamlList(items: string[]): string {
  return `[${items.map(yamlScalar).join(', ')}]`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
}

// --- Repository lookups -----------------------------------------------------

function findDomain(root: string, name: string): { catalog: Catalog; domain: CatalogDomain } {
  for (const catalog of loadCatalogs(root)) {
    const domain = catalog.domains.get(name);
    if (domain) return { catalog, domain };
  }
  throw new CommandError(`domain ${name} is not in any catalog — create it: npm run knowledge -- domain add ${name} --description "<one line>"`);
}

function domainOfFile(root: string, file: string): { name: string; domain: CatalogDomain } | null {
  const rel = relative(root, file).replace(/\\/g, '/');
  for (const catalog of loadCatalogs(root)) {
    for (const [name, domain] of catalog.domains) {
      if (domain.path && rel.startsWith(domain.path.replace(/\/$/, '') + '/')) return { name, domain };
    }
  }
  return null;
}

// Ids ever used for a prefix: every cataloged document plus every file name git
// has seen on any branch, so a draft on a sibling branch is less likely to
// collide. Not airtight — the validator still catches duplicates at merge.
function usedNumbers(root: string, prefix: string, documents: { data: Record<string, unknown> }[]): Set<number> {
  const used = new Set<number>();
  const idPattern = new RegExp(`^${prefix}-(\\d+)$`);
  for (const document of documents) {
    const match = idPattern.exec(String(document.data.id ?? ''));
    if (match) used.add(Number(match[1]));
  }
  try {
    const names = execSync('git log --all --name-only --format=', { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const filePattern = new RegExp(`(?:^|/)${prefix}-(\\d+)(?:[-.]|$)`, 'gm');
    for (const match of names.matchAll(filePattern)) used.add(Number(match[1]));
  } catch {
    // No git, or no commits yet: the document scan is all there is.
  }
  return used;
}

function nextId(prefix: string, used: Set<number>): string {
  const next = (used.size === 0 ? 0 : Math.max(...used)) + 1;
  return `${prefix}-${String(next).padStart(3, '0')}`;
}

// The domain's own prefix for a type (FD-DR, KDE-RFC, DR...), read from what it
// already has; the framework default when it has nothing of that type yet.
function inferPrefix(type: string, spec: TypeSpec, root: string, domain: CatalogDomain, documents: { file: string; data: Record<string, unknown> }[]): string {
  const counts = new Map<string, number>();
  for (const document of documents) {
    if (documentType(document.data) !== type) continue;
    const rel = relative(root, document.file).replace(/\\/g, '/');
    if (!domain.path || !rel.startsWith(domain.path.replace(/\/$/, '') + '/')) continue;
    const match = /^(.*)-\d+$/.exec(String(document.data.id ?? ''));
    if (match) counts.set(match[1], (counts.get(match[1]) ?? 0) + 1);
  }
  let best = spec.prefix;
  let bestCount = 0;
  for (const [prefix, count] of counts) {
    if (count > bestCount) {
      best = prefix;
      bestCount = count;
    }
  }
  return best;
}

function findDocument(root: string, id: string) {
  const { documents } = checkKnowledge(root);
  const document = documents.find((entry) => String(entry.data.id) === id);
  if (!document) throw new CommandError(`no cataloged document has id ${id}`);
  return { document, documents };
}

// --- Validation with rollback -------------------------------------------------
// Transitions are applied, validated, and undone if they introduced an error.
// The command then prints the validator's exact reason instead of leaving a
// half-promoted repository behind.

function snapshot(files: string[]): Map<string, string | null> {
  return new Map(files.map((file) => [file, existsSync(file) ? readFileSync(file, 'utf8') : null]));
}

function restore(saved: Map<string, string | null>): void {
  for (const [file, content] of saved) {
    if (content !== null) writeFileSync(file, content);
  }
}

// A transition is refused when it introduces an error anywhere, or when any
// error — pre-existing or not — sits on a file it touched: promoting a document
// that is itself invalid would launder the error into current truth.
function blockingErrors(root: string, before: string[], after: string[], touched: string[]): string[] {
  const seen = new Set(before);
  const files = touched.map((file) => relative(root, file));
  return after.filter((error) => !seen.has(error) || files.some((file) => error.includes(file)));
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function writeManifests(root: string): string[] {
  const written: string[] = [];
  for (const manifest of generateManifests(root)) {
    if (!existsSync(dirname(manifest.file))) continue;
    if (existsSync(manifest.file) && readFileSync(manifest.file, 'utf8') === manifest.content) continue;
    writeFileSync(manifest.file, manifest.content);
    written.push(relative(root, manifest.file));
  }
  return written;
}

// --- new ------------------------------------------------------------------------

export function commandNew(
  root: string,
  type: string,
  domainName: string,
  title: string,
  options: { by?: string; author?: string; prefix?: string } = {},
): CommandResult {
  const spec = TYPES[type];
  if (!spec) throw new CommandError(`unknown type ${type} (expected one of: ${Object.keys(TYPES).join(', ')})`);
  const by = options.by ?? 'human';
  if (by !== 'human' && by !== 'agent') throw new CommandError(`--by must be human or agent, got ${by}`);
  if (!title.trim()) throw new CommandError('title must not be empty');

  const { domain } = findDomain(root, domainName);
  if (!domain.path) throw new CommandError(`domain ${domainName} has no path in its catalog`);

  const templateFile = join(root, 'templates', spec.template);
  if (!existsSync(templateFile)) throw new CommandError(`template ${relative(root, templateFile)} is missing — run the installer`);

  const { documents } = checkKnowledge(root);
  const prefix = options.prefix ?? inferPrefix(type, spec, root, domain, documents);
  const id = nextId(prefix, usedNumbers(root, prefix, documents));

  const template = splitDocument(readFileSync(templateFile, 'utf8'));
  if (!template) throw new CommandError(`template ${spec.template} has no frontmatter`);
  const templateId = values(template.front.reduce<Record<string, unknown>>((acc, line) => {
    const match = /^id:\s*(.+)$/.exec(line);
    if (match) acc.id = match[1].trim();
    return acc;
  }, {}), 'id')[0] ?? `${spec.prefix}-NNN`;

  const front = template.front;
  const date = today();
  setField(front, 'id', id);
  setField(front, 'title', yamlScalar(title));
  setField(front, 'status', 'draft');
  setField(front, 'created', date);
  setField(front, 'updated', date);
  setField(front, 'scope', yamlList([domainName]));
  if (options.author) setField(front, 'authors', yamlList([options.author]), ['updated']);
  else removeField(front, 'authors');
  if (by === 'agent') {
    setField(front, 'drafted_by', 'agent', ['authors', 'updated']);
    setField(front, 'approved_by', '[]', ['drafted_by']);
    if (type === 'rfc') setField(front, 'motivated_by', MOTIVATED_BY_PLACEHOLDER, ['approved_by']);
  } else {
    removeField(front, 'drafted_by');
  }
  // Remaining template placeholders in list fields (depends_on: [<DR-or-SPEC-id>]) become empty lists.
  for (let index = 0; index < front.length; index += 1) {
    front[index] = front[index].replace(/:\s*\[<[^\]]*>\]\s*$/, ': []');
  }

  const body = template.body.replaceAll(templateId, id).replace(/<Title>|<Name>/g, title);
  const targetDir = join(root, domain.path, spec.folder);
  const target = join(targetDir, `${id}-${slugify(title) || type}.md`);
  if (existsSync(target)) throw new CommandError(`${relative(root, target)} already exists`);

  mkdirSync(targetDir, { recursive: true });
  writeFileSync(target, joinDocument({ front, body }));

  const notes: string[] = [];
  if (by === 'agent' && type === 'rfc') notes.push(`write motivated_by in ${relative(root, target)} — the validator rejects the placeholder`);
  const changed = [relative(root, target), ...writeManifests(root)];
  return { changed, notes };
}

// --- promote --------------------------------------------------------------------

export function commandPromote(root: string, id: string, options: { by?: string; topic?: string }): CommandResult {
  if (!options.by) throw new CommandError('promote requires --by <human>: promotion is human-only (DR-007)');
  const { document } = findDocument(root, id);
  const type = documentType(document.data);
  const spec = type ? TYPES[type] : undefined;
  if (!type || !spec || !spec.active) {
    throw new CommandError(`${id} is a ${type ?? 'untyped'} document; promote handles ${Object.entries(TYPES).filter(([, entry]) => entry.active).map(([name]) => name).join(', ')}`);
  }
  const status = String(document.data.status);
  if (status === spec.active) return { changed: [], notes: [`${id} is already ${status}`] };
  if (status === 'superseded' || status === 'rejected' || status === 'archived') {
    throw new CommandError(`${id} is ${status}; closed documents are not promoted`);
  }

  const doc = splitDocument(document.content);
  if (!doc) throw new CommandError(`${relative(root, document.file)} has no frontmatter`);

  const touched = [document.file];
  let indexFile: string | null = null;
  let topic: string | null = null;

  if (type === 'decision') {
    const owner = domainOfFile(root, document.file);
    if (!owner) throw new CommandError(`${relative(root, document.file)} is not inside a cataloged domain path`);
    indexFile = owner.domain.decisionIndex ? join(root, owner.domain.decisionIndex) : join(root, owner.domain.path!, 'decisions', 'index.yaml');
    const fileSlug = basename(document.file, '.md').replace(new RegExp(`^${id}-?`), '');
    topic = options.topic ?? (fileSlug || slugify(String(document.data.title)));
    touched.push(indexFile);
  }

  const before = checkKnowledge(root).errors;
  const saved = snapshot(touched);

  const approvers = values(document.data, 'approved_by');
  if (!approvers.includes(options.by)) approvers.push(options.by);
  setField(doc.front, 'status', spec.active);
  setField(doc.front, 'updated', today());
  setField(doc.front, 'approved_by', yamlList(approvers), ['drafted_by', 'authors', 'updated']);
  if (values(document.data, 'authors').length === 0) setField(doc.front, 'authors', yamlList([options.by]), ['updated']);
  writeFileSync(document.file, joinDocument(doc));

  const notes: string[] = [];
  if (indexFile && topic) {
    const result = upsertIndexTopic(indexFile, topic, id);
    if (result === 'exists') notes.push(`decision index already maps ${topic} to ${id}`);
    else if (result === 'conflict') {
      restore(saved);
      throw new CommandError(`decision index already has topic ${topic} pointing at another record — supersede it (npm run knowledge -- supersede <OLD-ID> --by ${id}) or pass --topic <other-name>`);
    }
  }

  const blocking = blockingErrors(root, before, checkKnowledge(root).errors, touched);
  if (blocking.length > 0) {
    restore(saved);
    throw new CommandError(`promote refused:\n- ${blocking.join('\n- ')}`);
  }

  const changed = [...touched.map((file) => relative(root, file)), ...writeManifests(root)];
  if (topic) notes.push(`decision index topic: ${topic}`);
  return { changed, notes };
}

// Adds `topic: id` under `current:` in a decision index as text, keeping the
// file's comments. The index files the framework writes have a single top-level
// key, which is what makes appending safe; anything else is refused.
function upsertIndexTopic(indexFile: string, topic: string, id: string): 'added' | 'exists' | 'conflict' {
  if (!existsSync(indexFile)) {
    mkdirSync(dirname(indexFile), { recursive: true });
    writeFileSync(indexFile, `# Maps decision topics to the active Decision Record.\n# Keep rationale in the referenced record, not in this file.\ncurrent:\n  ${topic}: ${id}\n`);
    return 'added';
  }
  const text = readFileSync(indexFile, 'utf8');
  const parsed = (parseYaml(text) ?? {}) as Record<string, unknown>;
  const current = (parsed.current ?? {}) as Record<string, unknown>;
  if (current[topic] === id) return 'exists';
  if (topic in current) return 'conflict';
  const keys = Object.keys(parsed);
  if (keys.some((key) => key !== 'current')) {
    throw new CommandError(`${indexFile} has keys other than current (${keys.join(', ')}); add the topic by hand`);
  }
  let next: string;
  if (/^current:\s*\{\s*\}\s*$/m.test(text)) {
    next = text.replace(/^current:\s*\{\s*\}\s*$/m, `current:\n  ${topic}: ${id}`);
  } else if (/^current:\s*$/m.test(text)) {
    next = `${text.replace(/\s*$/, '')}\n  ${topic}: ${id}\n`;
  } else {
    next = `${text.replace(/\s*$/, '')}\ncurrent:\n  ${topic}: ${id}\n`;
  }
  writeFileSync(indexFile, next.endsWith('\n') ? next : `${next}\n`);
  return 'added';
}

// --- supersede ------------------------------------------------------------------

export function commandSupersede(root: string, oldId: string, options: { by?: string; approvedBy?: string }): CommandResult {
  if (!options.by) throw new CommandError('supersede requires --by <NEW-ID>');
  const newId = options.by;
  if (oldId === newId) throw new CommandError('a record cannot supersede itself');
  const { document: oldDoc, documents } = findDocument(root, oldId);
  const newDoc = documents.find((entry) => String(entry.data.id) === newId);
  if (!newDoc) throw new CommandError(`no cataloged document has id ${newId}`);
  const type = documentType(oldDoc.data);
  if (type !== 'decision' || documentType(newDoc.data) !== 'decision') {
    throw new CommandError(`supersede links Decision Records; ${oldId} is ${type ?? 'untyped'} and ${newId} is ${documentType(newDoc.data) ?? 'untyped'}`);
  }
  if (String(oldDoc.data.status) === 'superseded') return { changed: [], notes: [`${oldId} is already superseded`] };
  const newStatus = String(newDoc.data.status);
  const newIsActive = newStatus === 'accepted' || newStatus === 'implemented';
  if (!newIsActive && newStatus !== 'draft' && newStatus !== 'in-review') {
    throw new CommandError(`${newId} is ${newStatus}; a superseding record must be active or a draft to promote`);
  }
  if (!newIsActive && !options.approvedBy) {
    throw new CommandError(`${newId} is ${newStatus}; pass --approved-by <human> to promote it as part of the supersession (promotion is human-only, DR-007)`);
  }

  const oldSplit = splitDocument(oldDoc.content);
  const newSplit = splitDocument(newDoc.content);
  if (!oldSplit || !newSplit) throw new CommandError('a record has no frontmatter');

  const touched = [oldDoc.file, newDoc.file];
  const owner = domainOfFile(root, oldDoc.file);
  const indexFile = owner
    ? owner.domain.decisionIndex ? join(root, owner.domain.decisionIndex) : join(root, owner.domain.path!, 'decisions', 'index.yaml')
    : null;
  if (indexFile && existsSync(indexFile)) touched.push(indexFile);

  const before = checkKnowledge(root).errors;
  const saved = snapshot(touched);
  const date = today();

  setField(oldSplit.front, 'status', 'superseded');
  setField(oldSplit.front, 'updated', date);
  setField(oldSplit.front, 'superseded_by', yamlList([newId]), ['supersedes', 'related', 'depends_on']);
  writeFileSync(oldDoc.file, joinDocument(oldSplit));

  const supersedes = values(newDoc.data, 'supersedes');
  if (!supersedes.includes(oldId)) supersedes.push(oldId);
  setField(newSplit.front, 'supersedes', yamlList(supersedes), ['related', 'depends_on']);
  setField(newSplit.front, 'updated', date);
  const notes: string[] = [];
  if (!newIsActive && options.approvedBy) {
    // The replacement is promoted here, under the old record's topic, so the
    // index never carries the same decision twice.
    const approvers = values(newDoc.data, 'approved_by');
    if (!approvers.includes(options.approvedBy)) approvers.push(options.approvedBy);
    setField(newSplit.front, 'status', 'accepted');
    setField(newSplit.front, 'approved_by', yamlList(approvers), ['drafted_by', 'authors', 'updated']);
    if (values(newDoc.data, 'authors').length === 0) setField(newSplit.front, 'authors', yamlList([options.approvedBy]), ['updated']);
    notes.push(`${newId} promoted to accepted by ${options.approvedBy}`);
  }
  writeFileSync(newDoc.file, joinDocument(newSplit));

  if (indexFile && existsSync(indexFile)) {
    const text = readFileSync(indexFile, 'utf8');
    const current = ((parseYaml(text) ?? {}) as Record<string, unknown>).current as Record<string, unknown> | undefined;
    const entries = Object.entries(current ?? {});
    const oldTopics = entries.filter(([, value]) => value === oldId).map(([topic]) => topic);
    const newTopics = entries.filter(([, value]) => value === newId).map(([topic]) => topic);
    let next = text;
    if (oldTopics.length === 0) {
      notes.push(`decision index had no topic for ${oldId}`);
    } else if (newTopics.length > 0) {
      // The replacement already stands under its own topic (DR-001 -> DR-004 precedent): retire the old one.
      for (const topic of oldTopics) next = next.replace(new RegExp(`^[ \\t]+${escapeRegExp(topic)}:[ \\t]*${escapeRegExp(oldId)}[ \\t]*\\n`, 'm'), '');
      notes.push(`retired topic ${oldTopics.join(', ')}; ${newId} stands under ${newTopics.join(', ')}`);
    } else {
      next = next.replace(new RegExp(`^([ \\t]+[^:#]+:[ \\t]*)${escapeRegExp(oldId)}[ \\t]*$`, 'gm'), `$1${newId}`);
      notes.push(`decision index topic ${oldTopics.join(', ')} now points at ${newId}`);
    }
    if (next !== text) writeFileSync(indexFile, next);
  }

  const blocking = blockingErrors(root, before, checkKnowledge(root).errors, touched);
  if (blocking.length > 0) {
    restore(saved);
    throw new CommandError(`supersede refused:\n- ${blocking.join('\n- ')}`);
  }

  const dependents = documents
    .filter((entry) => values(entry.data, 'depends_on').includes(oldId))
    .map((entry) => `${String(entry.data.id)} (${relative(root, entry.file)})`);
  if (dependents.length > 0) notes.push(`review documents that depend on ${oldId}: ${dependents.join(', ')}`);

  return { changed: [...touched.map((file) => relative(root, file)), ...writeManifests(root)], notes };
}

// --- domain add -----------------------------------------------------------------

export function commandDomainAdd(
  root: string,
  name: string,
  options: { description?: string; codePaths?: string[]; catalog?: string },
): CommandResult {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) throw new CommandError(`domain name ${name} must be lowercase letters, digits and dashes`);
  if (!options.description?.trim()) throw new CommandError('domain add requires --description "<one line>"');

  const catalogFile = join(root, options.catalog ?? 'knowledge/index.yaml');
  const catalogDir = relative(root, dirname(catalogFile)).replace(/\\/g, '/');
  const domainPath = `${catalogDir}/${name}`;
  const changed: string[] = [];

  let text = existsSync(catalogFile)
    ? readFileSync(catalogFile, 'utf8')
    : '# Domain catalog for retrieval. Keep rationale inside canonical documents.\ndomains: {}\n';
  const parsed = (parseYaml(text) ?? {}) as Record<string, unknown>;
  const domains = (parsed.domains ?? {}) as Record<string, unknown>;
  if (name in domains) throw new CommandError(`domain ${name} is already in ${relative(root, catalogFile)}`);
  const keys = Object.keys(parsed);
  if (keys.some((key) => key !== 'domains')) {
    throw new CommandError(`${relative(root, catalogFile)} has keys other than domains (${keys.join(', ')}); add the domain by hand`);
  }

  const lines = [
    `  ${name}:`,
    `    path: ${domainPath}`,
    `    description: ${yamlScalar(options.description.trim())}`,
    `    decision_index: ${domainPath}/decisions/index.yaml`,
  ];
  if (options.codePaths && options.codePaths.length > 0) lines.push(`    code_paths: ${yamlList(options.codePaths)}`);
  const block = lines.join('\n');

  if (/^domains:\s*\{\s*\}\s*$/m.test(text)) text = text.replace(/^domains:\s*\{\s*\}\s*$/m, `domains:\n${block}`);
  else if (/^domains:\s*$/m.test(text)) text = `${text.replace(/\s*$/, '')}\n${block}\n`;
  else text = `${text.replace(/\s*$/, '')}\ndomains:\n${block}\n`;
  if (!text.endsWith('\n')) text += '\n';

  mkdirSync(join(root, domainPath, 'decisions'), { recursive: true });
  const readme = join(root, domainPath, 'README.md');
  if (!existsSync(readme)) {
    writeFileSync(readme, [
      `# ${name} Domain`,
      '',
      options.description.trim(),
      '',
      '## Retrieval Path',
      '',
      `1. Read \`${catalogDir}/index.yaml\` to confirm the domain.`,
      '2. Read this file for the domain map.',
      '3. Read the current spec for the capability, if one exists.',
      '4. Read active decisions from `decisions/index.yaml`.',
      '5. Read implementation after intended behavior is clear.',
      '',
    ].join('\n'));
    changed.push(relative(root, readme));
  }
  const index = join(root, domainPath, 'decisions', 'index.yaml');
  if (!existsSync(index)) {
    writeFileSync(index, '# Maps decision topics to the active Decision Record.\n# Keep rationale in the referenced record, not in this file.\ncurrent: {}\n');
    changed.push(relative(root, index));
  }
  mkdirSync(dirname(catalogFile), { recursive: true });
  writeFileSync(catalogFile, text);
  changed.push(relative(root, catalogFile));

  return { changed: [...changed, ...writeManifests(root)], notes: [] };
}

// --- renumber -------------------------------------------------------------------
// Rewrites an id everywhere it appears — the document, its file name, every
// reference in other documents, decision indexes and catalogs — so resolving
// a cross-branch collision is one command, not a search-and-replace by hand.

export function commandRenumber(root: string, oldId: string, newId: string): CommandResult {
  if (!ID_PATTERN.test(newId)) throw new CommandError(`${newId} is not a valid id (expected PREFIX-NNN, like DR-014 or FD-SPEC-002)`);
  if (oldId === newId) throw new CommandError('old and new id are the same');
  const { document, documents } = findDocument(root, oldId);
  if (documents.some((entry) => String(entry.data.id) === newId)) throw new CommandError(`${newId} is already used by another document`);
  const prefix = newId.replace(/-\d+$/, '');
  const number = Number(newId.slice(prefix.length + 1));
  if (usedNumbers(root, prefix, []).has(number)) {
    console.warn(`warning: git history already has a file named ${newId}-*; the id may collide with another branch`);
  }

  const pattern = new RegExp(`(?<![A-Za-z0-9-])${oldId.replace(/[-]/g, '\\-')}(?![A-Za-z0-9-])`, 'g');
  const changed: string[] = [];
  const rewrite = (file: string): void => {
    const text = readFileSync(file, 'utf8');
    const next = text.replace(pattern, newId);
    if (next !== text) {
      writeFileSync(file, next);
      changed.push(relative(root, file));
    }
  };

  for (const entry of documents) rewrite(entry.file);
  for (const catalog of loadCatalogs(root)) {
    rewrite(catalog.file);
    for (const domain of catalog.domains.values()) {
      const indexFile = domain.decisionIndex ? join(root, domain.decisionIndex) : domain.path ? join(root, domain.path, 'decisions', 'index.yaml') : null;
      if (indexFile && existsSync(indexFile)) rewrite(indexFile);
    }
  }

  const name = basename(document.file);
  if (name.startsWith(oldId)) {
    const target = join(dirname(document.file), newId + name.slice(oldId.length));
    renameSync(document.file, target);
    changed.push(`${relative(root, document.file)} -> ${relative(root, target)}`);
  }

  return { changed: [...changed, ...writeManifests(root)], notes: [] };
}

// --- CLI ------------------------------------------------------------------------

function parseArgs(args: string[]): { positional: string[]; flags: Record<string, string[]> } {
  const positional: string[] = [];
  const flags: Record<string, string[]> = {};
  let current: string | null = null;
  for (const arg of args) {
    if (arg.startsWith('--')) {
      current = arg.slice(2);
      flags[current] ??= [];
    } else if (current) {
      flags[current].push(arg);
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

const USAGE = `usage:
  knowledge new <type> <domain> "<title>" [--by human|agent] [--author <name>] [--prefix <P>]
  knowledge promote <ID> --by <human> [--topic <name>]
  knowledge supersede <OLD-ID> --by <NEW-ID> [--approved-by <human>]   (promotes a draft NEW-ID)
  knowledge domain add <name> --description "<text>" [--code-paths a/ b/] [--catalog knowledge/index.yaml]
  knowledge renumber <OLD-ID> <NEW-ID>
types: ${Object.keys(TYPES).join(', ')}`;

export function commandName(argv: string[]): string | undefined {
  return parseArgs(argv).positional[0];
}

export function run(root: string, argv: string[]): CommandResult {
  const { positional, flags } = parseArgs(argv);
  const one = (name: string): string | undefined => flags[name]?.[0];
  const [command, ...rest] = positional;

  switch (command) {
    case 'new':
      if (rest.length < 3) throw new CommandError(USAGE);
      return commandNew(root, rest[0], rest[1], rest.slice(2).join(' '), { by: one('by'), author: one('author'), prefix: one('prefix') });
    case 'promote':
      if (rest.length !== 1) throw new CommandError(USAGE);
      return commandPromote(root, rest[0], { by: one('by'), topic: one('topic') });
    case 'supersede':
      if (rest.length !== 1) throw new CommandError(USAGE);
      return commandSupersede(root, rest[0], { by: one('by'), approvedBy: one('approved-by') });
    case 'domain':
      if (rest[0] !== 'add' || rest.length !== 2) throw new CommandError(USAGE);
      return commandDomainAdd(root, rest[1], { description: one('description'), codePaths: flags['code-paths'], catalog: one('catalog') });
    case 'renumber':
      if (rest.length !== 2) throw new CommandError(USAGE);
      return commandRenumber(root, rest[0], rest[1]);
    default:
      throw new CommandError(USAGE);
  }
}

const executedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (executedDirectly) {
  const root = process.cwd();
  try {
    const result = run(root, process.argv.slice(2));
    for (const file of result.changed) console.log(`  ${file}`);
    for (const note of result.notes) console.log(`note: ${note}`);

    const { errors, warnings } = checkKnowledge(root);
    for (const warning of warnings) console.warn(`warning: ${warning}`);
    if (errors.length > 0) {
      console.error(`knowledge: ${errors.length} error(s) to resolve:`);
      for (const error of errors) console.error(`- ${error}`);
      // The exit code is about this command. Errors on files it wrote fail it
      // (a fresh `new` document is allowed to need filling in); errors elsewhere
      // are reported and left to their own change.
      const own = errors.some((error) => result.changed.some((file) => error.includes(file.split(' -> ').pop()!)));
      process.exit(own && commandName(process.argv.slice(2)) !== 'new' ? 1 : 0);
    }
    console.log('knowledge: ok');
  } catch (error) {
    if (error instanceof CommandError) {
      console.error(`knowledge: ${error.message}`);
      process.exit(2);
    }
    throw error;
  }
}
