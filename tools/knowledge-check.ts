import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

type FrontmatterValue = string | string[];

type DocumentRecord = {
  file: string;
  data: Record<string, FrontmatterValue>;
};

export type CheckResult = {
  errors: string[];
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
const REFERENCE_FIELDS = ['related', 'supersedes', 'superseded_by'];

function walk(root: string): string[] {
  const results: string[] = [];

  for (const entry of readdirSync(root)) {
    if (entry === '.git' || entry === 'node_modules' || entry === '.serena') continue;

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

function parseList(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '[]') return [];
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) return [cleanScalar(trimmed)];

  return trimmed
    .slice(1, -1)
    .split(',')
    .map((item) => cleanScalar(item.trim()))
    .filter(Boolean);
}

function cleanScalar(value: string): string {
  return value.replace(/^['"]|['"]$/g, '').trim();
}

function parseFrontmatter(content: string): Record<string, FrontmatterValue> | null {
  if (!content.startsWith('---\n')) return null;

  const end = content.indexOf('\n---', 4);
  if (end === -1) return null;

  const raw = content.slice(4, end).trim();
  const data: Record<string, FrontmatterValue> = {};

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(trimmed);
    if (!match) continue;

    const [, key, value] = match;
    data[key] = value.trim().startsWith('[') ? parseList(value) : cleanScalar(value);
  }

  return data;
}

function values(data: Record<string, FrontmatterValue>, field: string): string[] {
  const value = data[field];
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function parseDecisionIndex(file: string): Record<string, string> {
  const content = readFileSync(file, 'utf8');
  const current: Record<string, string> = {};
  let inCurrent = false;

  for (const line of content.split('\n')) {
    if (/^current:\s*$/.test(line)) {
      inCurrent = true;
      continue;
    }

    if (/^[A-Za-z0-9_-]+:\s*$/.test(line)) {
      inCurrent = false;
      continue;
    }

    if (!inCurrent) continue;

    const match = /^  ([A-Za-z0-9_.-]+):\s*([A-Za-z0-9_.-]+)\s*$/.exec(line);
    if (match) current[match[1]] = match[2];
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
  const files = walk(root);
  const markdownFiles = files.filter((file) => file.endsWith('.md') && !relative(root, file).startsWith('templates/'));
  const indexFiles = files.filter((file) => file.endsWith('decisions/index.yaml'));
  const documents: DocumentRecord[] = [];
  const ids = new Map<string, DocumentRecord>();

  for (const file of markdownFiles) {
    const data = parseFrontmatter(readFileSync(file, 'utf8'));
    if (!data) continue;

    const document = { file, data };
    documents.push(document);

    const id = data.id;
    if (typeof id !== 'string' || !id) {
      errors.push(`${relative(root, file)} has frontmatter but no id`);
      continue;
    }

    if (ids.has(id)) {
      errors.push(`duplicate id ${id} in ${relative(root, ids.get(id)!.file)} and ${relative(root, file)}`);
    } else {
      ids.set(id, document);
    }

    const status = data.status;
    if (typeof status !== 'string' || !VALID_STATUSES.has(status)) {
      errors.push(`${relative(root, file)} has invalid status ${String(status)}`);
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
    if (id.includes('DR-') && status === 'superseded' && values(document.data, 'superseded_by').length === 0) {
      errors.push(`${relative(root, document.file)} is superseded but has no superseded_by target`);
    }

    for (const supersededId of values(document.data, 'supersedes')) {
      const superseded = ids.get(supersededId);
      if (!superseded) continue;

      if (!values(superseded.data, 'superseded_by').includes(id)) {
        errors.push(`${relative(root, superseded.file)} does not point back to superseding record ${id}`);
      }
    }
  }

  for (const file of indexFiles) {
    const current = parseDecisionIndex(file);

    for (const [topic, decisionId] of Object.entries(current)) {
      const record = ids.get(decisionId);

      if (!record) {
        errors.push(`${relative(root, file)} topic ${topic} points to missing decision ${decisionId}`);
        continue;
      }

      if (!String(record.data.id).includes('DR-')) {
        errors.push(`${relative(root, file)} topic ${topic} points to non-decision ${decisionId}`);
      }

      const status = String(record.data.status);
      if (!ACTIVE_DECISION_STATUSES.has(status)) {
        errors.push(`${relative(root, file)} topic ${topic} points to non-active decision ${decisionId} with status ${status}`);
      }
    }
  }

  return { errors, documents };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = checkKnowledge(process.cwd());

  if (result.errors.length > 0) {
    for (const error of result.errors) {
      console.error(`knowledge: ${error}`);
    }
    process.exit(1);
  }

  console.log(`knowledge: ok (${result.documents.length} documents checked)`);
}
