import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse as parseYaml } from 'yaml';

type Frontmatter = Record<string, unknown>;

type DocumentRecord = {
  file: string;
  data: Frontmatter;
  // Body after the frontmatter; some artifact types (models) are validated on content.
  content: string;
};

export type CheckResult = {
  errors: string[];
  warnings: string[];
  documents: DocumentRecord[];
};

const VALID_STATUSES = new Set([
  'draft',
  'in-review',
  'accepted',
  'rejected',
  'implemented',
  'archived',
  'superseded',
  'current',
]);

const ACTIVE_DECISION_STATUSES = new Set(['accepted', 'implemented']);
// Statuses that make a document part of current truth (and therefore worth anchoring in an index).
const CURRENT_TRUTH_STATUSES = new Set(['accepted', 'implemented', 'current']);
const REFERENCE_FIELDS = ['related', 'depends_on', 'supersedes', 'superseded_by'];
// Always required (DR-012). `authors` is required only in current truth,
// `depends_on` and `related` default to empty, and the type tag may be
// inferred from the artifact folder.
const REQUIRED_FIELDS = ['id', 'title', 'status', 'created', 'updated', 'scope'];
// Every document must carry exactly one artifact type tag. The type drives
// validation rules; ID patterns are not a reliable type signal.
const TYPE_TAGS = new Set([
  'vision',
  'rfc',
  'decision',
  'spec',
  'flow',
  'ia',
  'design-system',
  'model',
  'contract',
  'prompt',
  'task',
  'playbook',
]);
// Artifact folder -> type, used when a document writes no type tag (DR-012).
// An explicit tag always wins; outside these folders the tag is required.
const FOLDER_TYPES: Record<string, string> = {
  decisions: 'decision',
  specs: 'spec',
  rfcs: 'rfc',
  flows: 'flow',
  ia: 'ia',
  'design-system': 'design-system',
  models: 'model',
  contracts: 'contract',
  prompts: 'prompt',
  tasks: 'task',
  playbooks: 'playbook',
};
// A task's external_ref names a ticket in a tracker (DR-014): `<system>:<id>` or a URL.
// Only the shape is checked; reachability would need credentials the validator must not hold.
const EXTERNAL_REF = /^(?:[a-z][a-z0-9-]*:\S+|https?:\/\/\S+)$/;
// A model's primary content is its diagram (DR-010).
const MERMAID_BLOCK = /```mermaid\b/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
// Gate 6 (DR-007): agent drafts older than this are reported for archiving.
const AGENT_DRAFT_EXPIRY_DAYS = 30;
// Dot-directories (.git, .next, .turbo, .pnpm-store, .agents, ...) and build
// output are never knowledge; skipping them keeps walks cheap in monorepos.
const SKIPPED_DIRECTORIES = new Set(['node_modules', 'dist', 'build', 'out', 'coverage', 'target', 'vendor']);

function walk(root: string): string[] {
  const results: string[] = [];

  for (const entry of readdirSync(root)) {
    if (entry.startsWith('.') || SKIPPED_DIRECTORIES.has(entry)) continue;

    const fullPath = join(root, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      results.push(...walk(fullPath));
      continue;
    }

    results.push(fullPath);
  }

  return results;
}

function parseFrontmatter(content: string): Frontmatter | null {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(content);
  if (!match) return null;

  let data: unknown;
  try {
    data = parseYaml(match[1]);
  } catch {
    return null;
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  return data as Frontmatter;
}

export function values(data: Frontmatter, field: string): string[] {
  const value = data[field];
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === 'object') return [];

  const scalar = String(value).trim();
  return scalar ? [scalar] : [];
}

export function documentType(data: Frontmatter): string | null {
  const typeTags = values(data, 'tags').filter((tag) => TYPE_TAGS.has(tag));
  return typeTags.length === 1 ? typeTags[0] : null;
}

export type CatalogDomain = {
  path?: string;
  description?: string;
  decisionIndex?: string;
  codePaths: string[];
  // External trackers that own task status for this domain (DR-014): system -> key.
  trackers: Record<string, string>;
  current: Record<string, string>;
};

export type Catalog = {
  file: string;
  rootDir: string;
  domains: Map<string, CatalogDomain>;
};

function findCatalogFiles(root: string, files: string[]): string[] {
  return files.filter((file) => relative(root, file).replace(/\\/g, '/').endsWith('knowledge/index.yaml'));
}

export function loadCatalogs(root = process.cwd()): Catalog[] {
  return findCatalogFiles(root, walk(root))
    .map((file) => parseCatalog(file))
    .filter((catalog): catalog is Catalog => catalog !== null);
}

function parseCatalog(file: string): Catalog | null {
  let parsed: unknown;
  try {
    parsed = parseYaml(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object') return null;

  const domains = new Map<string, CatalogDomain>();
  const rawDomains = (parsed as Record<string, unknown>).domains;

  if (rawDomains && typeof rawDomains === 'object' && !Array.isArray(rawDomains)) {
    for (const [name, rawDomain] of Object.entries(rawDomains as Record<string, unknown>)) {
      const domain: CatalogDomain = { current: {}, codePaths: [], trackers: {} };

      if (rawDomain && typeof rawDomain === 'object' && !Array.isArray(rawDomain)) {
        const entry = rawDomain as Record<string, unknown>;
        if (typeof entry.path === 'string') domain.path = entry.path;
        if (typeof entry.description === 'string') domain.description = entry.description;
        if (typeof entry.decision_index === 'string') domain.decisionIndex = entry.decision_index;
        for (const codePath of Array.isArray(entry.code_paths) ? entry.code_paths : []) {
          if (typeof codePath === 'string') domain.codePaths.push(codePath);
        }
        const trackers = entry.trackers;
        if (trackers && typeof trackers === 'object' && !Array.isArray(trackers)) {
          for (const [system, key] of Object.entries(trackers as Record<string, unknown>)) {
            if (typeof key === 'string') domain.trackers[system] = key;
          }
        }

        const current = entry.current;
        if (current && typeof current === 'object' && !Array.isArray(current)) {
          for (const [role, id] of Object.entries(current as Record<string, unknown>)) {
            if (typeof id === 'string' || typeof id === 'number') domain.current[role] = String(id);
          }
        }
      }

      domains.set(name, domain);
    }
  }

  return { file, rootDir: dirname(file), domains };
}

export function parseDecisionIndex(file: string): Record<string, string> | null {
  let parsed: unknown;
  try {
    parsed = parseYaml(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object') return null;

  const current: Record<string, string> = {};
  const rawCurrent = (parsed as Record<string, unknown>).current;

  if (rawCurrent && typeof rawCurrent === 'object' && !Array.isArray(rawCurrent)) {
    for (const [topic, id] of Object.entries(rawCurrent as Record<string, unknown>)) {
      if (typeof id === 'string' || typeof id === 'number') current[topic] = String(id);
    }
  }

  return current;
}

function resolveReference(root: string, sourceFile: string, reference: string, ids: Map<string, DocumentRecord>): boolean {
  if (ids.has(reference)) return true;

  if (reference.includes('/') || reference.endsWith('.md')) {
    const absolute = reference.startsWith('/') ? reference : join(dirname(sourceFile), reference);
    return existsSync(absolute) || existsSync(join(root, reference));
  }

  return false;
}

export function checkKnowledge(root = process.cwd()): CheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const files = walk(root);

  // Canonical knowledge is scoped to trees anchored by a catalog. Markdown
  // anywhere else in the repository (skills, app docs, other tools' files
  // with their own frontmatter dialects) is not this validator's business.
  const catalogs: Catalog[] = [];

  for (const file of findCatalogFiles(root, files)) {
    const catalog = parseCatalog(file);

    if (!catalog) {
      errors.push(`${relative(root, file)} is not a valid domain catalog`);
      continue;
    }

    catalogs.push(catalog);
  }

  const knowledgeRoots = catalogs.map((catalog) => catalog.rootDir);
  const underKnowledgeRoot = (file: string): boolean => knowledgeRoots.some((dir) => file.startsWith(dir + '/'));

  if (existsSync(join(root, 'knowledge')) && !existsSync(join(root, 'knowledge', 'index.yaml'))) {
    warnings.push('knowledge/ exists but has no index.yaml catalog; its documents are not validated');
  }

  const markdownFiles = files.filter(
    (file) => file.endsWith('.md') && basename(file) !== 'README.md' && basename(file) !== 'CONTEXT.md' && underKnowledgeRoot(file),
  );
  const decisionIndexFiles = files.filter(
    (file) => relative(root, file).replace(/\\/g, '/').endsWith('decisions/index.yaml') && underKnowledgeRoot(file),
  );
  const documents: DocumentRecord[] = [];
  const ids = new Map<string, DocumentRecord>();

  for (const file of markdownFiles) {
    const content = readFileSync(file, 'utf8');
    const data = parseFrontmatter(content);

    if (!data) {
      // A knowledge document the parser cannot see is a silent integrity hole:
      // it would skip every check below while looking valid to a reader.
      errors.push(`${relative(root, file)} is a knowledge document without valid frontmatter at the top of the file`);
      continue;
    }

    const document = { file, data, content };
    documents.push(document);

    const id = data.id;
    if (typeof id !== 'string' || !id) {
      errors.push(`${relative(root, file)} has frontmatter but no id`);
      continue;
    }

    if (ids.has(id)) {
      errors.push(`duplicate id ${id} in ${relative(root, ids.get(id)!.file)} and ${relative(root, file)} — renumber one: npm run knowledge -- renumber ${id} <NEW-ID>`);
    } else {
      ids.set(id, document);
    }

    const status = data.status;
    if (typeof status !== 'string' || !VALID_STATUSES.has(status)) {
      errors.push(`${relative(root, file)} has invalid status ${String(status)}`);
    }

    for (const field of REQUIRED_FIELDS) {
      if (!(field in data)) {
        errors.push(`${relative(root, file)} is missing required field ${field}`);
      }
    }

    for (const field of ['created', 'updated']) {
      if (field in data && !DATE_PATTERN.test(values(data, field)[0] ?? '')) {
        errors.push(`${relative(root, file)} has invalid ${field} date (expected YYYY-MM-DD)`);
      }
    }

    if (values(data, 'scope').length === 0) {
      errors.push(`${relative(root, file)} has empty scope`);
    }

    // A value still wrapped in <...> is a template placeholder nobody filled in (DR-013).
    for (const [field, raw] of Object.entries(data)) {
      const items = Array.isArray(raw) ? raw.map(String) : typeof raw === 'string' ? [raw] : [];
      if (items.some((item) => /^<[^>]*>$/.test(item.trim()))) {
        errors.push(`${relative(root, file)} still holds a template placeholder in ${field}`);
      }
    }

    // Promoted truth needs an accountable owner; a draft may be anonymous (DR-012).
    if (typeof status === 'string' && CURRENT_TRUTH_STATUSES.has(status) && values(data, 'authors').length === 0) {
      errors.push(`${relative(root, file)} has status ${status} but no authors (required in current truth)`);
    }

    const typeTags = values(data, 'tags').filter((tag) => TYPE_TAGS.has(tag));
    if (typeTags.length === 0) {
      const inferred = FOLDER_TYPES[basename(dirname(file))];
      if (inferred) {
        // Write the inferred tag back so every consumer of documentType() sees one signal.
        data.tags = [...values(data, 'tags'), inferred];
      } else {
        errors.push(
          `${relative(root, file)} has no artifact type tag and is not in a recognized artifact folder ` +
          `(add one of: ${[...TYPE_TAGS].join(', ')}, or place it under ${Object.keys(FOLDER_TYPES).join('/, ')}/)`,
        );
      }
    } else if (typeTags.length > 1) {
      errors.push(`${relative(root, file)} has multiple artifact type tags (${typeTags.join(', ')})`);
    }

    for (const reference of values(data, 'external_ref')) {
      if (documentType(data) !== 'task') {
        errors.push(`${relative(root, file)} has external_ref but is not a task; only task status may live in a tracker (DR-014)`);
      } else if (!EXTERNAL_REF.test(reference)) {
        errors.push(`${relative(root, file)} has external_ref ${reference} (expected <system>:<id>, like jira:PD-123, or a URL)`);
      }
    }
  }

  for (const document of documents) {
    const id = String(document.data.id);

    for (const field of REFERENCE_FIELDS) {
      for (const reference of values(document.data, field)) {
        if (!resolveReference(root, document.file, reference, ids)) {
          errors.push(`${relative(root, document.file)} references missing ${field} target ${reference}`);
        }
      }
    }

    const status = document.data.status;
    if (documentType(document.data) === 'decision' && status === 'superseded' && values(document.data, 'superseded_by').length === 0) {
      errors.push(`${relative(root, document.file)} is superseded but has no superseded_by target`);
    }

    // A contract's `implements` paths are the code it obliges (DR-010); a
    // path that does not exist is a contract about nothing.
    if (documentType(document.data) === 'contract') {
      for (const implementedPath of values(document.data, 'implements')) {
        if (!existsSync(join(root, implementedPath)) && !existsSync(join(dirname(document.file), implementedPath))) {
          errors.push(`${relative(root, document.file)} implements missing path ${implementedPath}`);
        }
      }
    }

    for (const supersededId of values(document.data, 'supersedes')) {
      const superseded = ids.get(supersededId);
      if (!superseded) continue;

      if (!values(superseded.data, 'superseded_by').includes(id)) {
        errors.push(`${relative(root, superseded.file)} does not point back to superseding record ${id}`);
      }
    }
  }

  // Gates on agent-authored knowledge (DR-007) and drift checks (DR-008).
  const now = Date.now();

  for (const document of documents) {
    const data = document.data;
    const file = relative(root, document.file);
    const draftedBy = values(data, 'drafted_by')[0];
    const status = String(data.status);
    const type = documentType(data);

    if (draftedBy && draftedBy !== 'human' && draftedBy !== 'agent') {
      errors.push(`${file} has invalid drafted_by ${draftedBy} (expected human or agent)`);
    }

    const agentDrafted = draftedBy === 'agent';

    if (agentDrafted && type === 'rfc' && values(data, 'motivated_by').length === 0) {
      errors.push(`${file} is an agent-drafted RFC without motivated_by`);
    }

    if (agentDrafted && CURRENT_TRUTH_STATUSES.has(status) && values(data, 'approved_by').length === 0) {
      errors.push(`${file} is agent-drafted with status ${status} but has empty approved_by — a human promotes it: npm run knowledge -- promote ${String(data.id)} --by <human>`);
    }

    const anchoredTypes = type === 'spec' || type === 'flow' || type === 'ia' || type === 'model' || type === 'contract';

    if (CURRENT_TRUTH_STATUSES.has(status) && anchoredTypes) {
      const anchored = values(data, 'depends_on').some((reference) => {
        const anchor = ids.get(reference);
        if (!anchor) return false;

        const anchorType = documentType(anchor.data);
        const anchorStatus = String(anchor.data.status);
        const currentSpec = anchorType === 'spec' && CURRENT_TRUTH_STATUSES.has(anchorStatus);
        // A contract exposes a spec's behavior, so only a current spec anchors it (DR-010).
        if (type === 'contract') return currentSpec;
        if (anchorType === 'decision' && ACTIVE_DECISION_STATUSES.has(anchorStatus)) return true;
        // Flows, IA and models may hang off a current spec instead of a decision.
        return type !== 'spec' && currentSpec;
      });

      if (!anchored) {
        const expected =
          type === 'spec' ? 'an active decision' : type === 'contract' ? 'a current spec' : 'an active decision or current spec';
        errors.push(`${file} has status ${status} but does not depend on ${expected}`);
      }
    }

    if (type === 'model' && !MERMAID_BLOCK.test(document.content)) {
      const message = `${file} is a model without a mermaid diagram block`;
      if (CURRENT_TRUTH_STATUSES.has(status)) {
        errors.push(message);
      } else {
        warnings.push(message);
      }
    }

    const updated = values(data, 'updated')[0] ?? '';

    for (const reference of values(data, 'depends_on')) {
      const dependency = ids.get(reference);
      if (!dependency) continue;

      const dependencyUpdated = values(dependency.data, 'updated')[0] ?? '';
      if (DATE_PATTERN.test(updated) && dependencyUpdated > updated) {
        warnings.push(`${file} may be stale: depends_on ${reference} was updated ${dependencyUpdated}, after this document (${updated})`);
      }
    }

    if (agentDrafted && (status === 'draft' || status === 'in-review') && DATE_PATTERN.test(updated)) {
      const ageDays = Math.floor((now - new Date(`${updated}T00:00:00Z`).getTime()) / 86_400_000);
      if (ageDays > AGENT_DRAFT_EXPIRY_DAYS) {
        warnings.push(`${file} is an agent draft with no update in ${ageDays} days; review or archive it`);
      }
    }
  }

  const referencedIds = new Set<string>();

  for (const document of documents) {
    for (const field of REFERENCE_FIELDS) {
      for (const reference of values(document.data, field)) {
        referencedIds.add(reference);
      }
    }
  }

  for (const file of decisionIndexFiles) {
    const current = parseDecisionIndex(file);

    if (!current) {
      errors.push(`${relative(root, file)} is not a valid decision index`);
      continue;
    }

    for (const [topic, decisionId] of Object.entries(current)) {
      referencedIds.add(decisionId);
      const record = ids.get(decisionId);

      if (!record) {
        errors.push(`${relative(root, file)} topic ${topic} points to missing decision ${decisionId}`);
        continue;
      }

      if (documentType(record.data) !== 'decision') {
        errors.push(`${relative(root, file)} topic ${topic} points to non-decision ${decisionId}`);
      }

      const status = String(record.data.status);
      if (!ACTIVE_DECISION_STATUSES.has(status)) {
        errors.push(`${relative(root, file)} topic ${topic} points to non-active decision ${decisionId} with status ${status}`);
      }
    }
  }

  for (const catalog of catalogs) {
    const file = catalog.file;

    for (const [domainName, domain] of catalog.domains) {
      for (const path of [domain.path, domain.decisionIndex]) {
        if (path && !existsSync(join(root, path))) {
          errors.push(`${relative(root, file)} points to missing path ${path}`);
        }
      }

      for (const [role, anchorId] of Object.entries(domain.current)) {
        referencedIds.add(anchorId);
        const record = ids.get(anchorId);

        if (!record) {
          errors.push(`${relative(root, file)} points to missing document ${anchorId}`);
          continue;
        }

        const status = String(record.data.status);
        if (!CURRENT_TRUTH_STATUSES.has(status)) {
          errors.push(`${relative(root, file)} domain ${domainName} anchor ${role} points to non-current document ${anchorId} with status ${status}`);
        }
      }
    }
  }

  // Scope values must be domains declared in the governing catalog. Undeclared
  // scopes are how near-duplicate domains (restaurant/restaurants) creep in.
  for (const document of documents) {
    const catalog = catalogs
      .filter((candidate) => document.file.startsWith(candidate.rootDir + '/'))
      .sort((a, b) => b.rootDir.length - a.rootDir.length)[0];

    if (!catalog) continue;

    for (const scope of values(document.data, 'scope')) {
      if (!catalog.domains.has(scope)) {
        errors.push(`${relative(root, document.file)} has scope value ${scope} that is not a domain in ${relative(root, catalog.file)} — create it: npm run knowledge -- domain add ${scope} --description "<one line>"`);
      }
    }
  }

  // Current-truth documents that no index or document references are invisible
  // to the retrieval paths this method defines.
  for (const document of documents) {
    const id = String(document.data.id ?? '');
    const status = String(document.data.status);
    if (!id || !CURRENT_TRUTH_STATUSES.has(status)) continue;

    if (!referencedIds.has(id)) {
      warnings.push(`${relative(root, document.file)} (${id}) is current truth but is not referenced by any index or document`);
    }
  }

  return { errors, warnings, documents };
}

const executedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (executedDirectly) {
  const { errors, warnings, documents } = checkKnowledge();

  for (const warning of warnings) {
    console.warn(`warning: ${warning}`);
  }

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(error);
    }
    process.exitCode = 1;
  } else {
    const warningSuffix = warnings.length > 0 ? `, ${warnings.length} warning${warnings.length === 1 ? '' : 's'}` : '';
    console.log(`knowledge: ok (${documents.length} documents checked${warningSuffix})`);
  }
}
