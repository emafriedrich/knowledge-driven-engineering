// PR drift gate (DR-008): code changes mapped to a domain with a current spec
// must touch that domain's knowledge or declare no-behavior-change in the PR body.
// Draft declaration (DR-015): when the domain's only specs are drafts, the PR
// must declare which draft it implements (`implements-draft: <ID>`) — visibility,
// not permission; the spec still needs promotion.
// Contract obligation (DR-010): code under a current contract's `implements`
// paths must change together with the contract, or declare no-behavior-change.
import { execSync } from 'node:child_process';
import { relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkKnowledge, documentType, loadCatalogs, values } from './knowledge-check.mts';

const CURRENT_TRUTH = new Set(['accepted', 'implemented', 'current']);
const DRAFT = new Set(['draft', 'in-review']);

export type DriftResult = { ok: string[]; failures: string[] };

const matchesPrefix = (file: string, prefix: string): boolean => {
  const clean = prefix.replace(/\/$/, '');
  return file === clean || file.startsWith(`${clean}/`);
};

export function declaredDrafts(prBody: string): string[] {
  return [...prBody.matchAll(/implements-draft:\s*([A-Za-z][A-Za-z0-9-]*-\d+)/gi)].map((match) => match[1].toUpperCase());
}

export function evaluateDrift(root: string, changed: string[], prBody: string): DriftResult {
  const ok: string[] = [];
  const failures: string[] = [];
  if (changed.length === 0) return { ok: ['no changes.'], failures };

  const catalogs = loadCatalogs(root);
  const { documents } = checkKnowledge(root);
  const byId = new Map(documents.map((document) => [String(document.data.id), document]));
  const noBehaviorChange = /no-behavior-change/i.test(prBody);
  const drafts = declaredDrafts(prBody);

  for (const id of drafts) {
    const record = byId.get(id);
    if (!record || documentType(record.data) !== 'spec' || !DRAFT.has(String(record.data.status))) {
      failures.push(
        `implements-draft names ${id}, which is ${record ? `a ${documentType(record.data) ?? 'untyped'} document with status ${String(record.data.status)}` : 'not a cataloged document'}; ` +
        'declare a draft spec, or drop the declaration.',
      );
    }
  }

  for (const catalog of catalogs) {
    for (const [name, domain] of catalog.domains) {
      const codeChanged = changed.filter((file) => domain.codePaths.some((prefix) => matchesPrefix(file, prefix)));
      if (codeChanged.length === 0) continue;

      const specs = documents.filter((document) => {
        if (documentType(document.data) !== 'spec' || !domain.path) return false;
        return matchesPrefix(relative(root, document.file).replace(/\\/g, '/'), domain.path);
      });
      const currentSpecs = specs.filter((spec) => CURRENT_TRUTH.has(String(spec.data.status)));
      const draftSpecs = specs.filter((spec) => DRAFT.has(String(spec.data.status)));
      const implementedDrafts = draftSpecs.map((spec) => String(spec.data.id)).filter((id) => drafts.includes(id));
      const knowledgeTouched = domain.path !== undefined && changed.some((file) => matchesPrefix(file, domain.path!));
      const files = `${codeChanged.length} code file(s) changed (${codeChanged.slice(0, 5).join(', ')})`;

      if (currentSpecs.length > 0) {
        if (knowledgeTouched) ok.push(`domain ${name} — code and knowledge changed together. OK.`);
        else if (implementedDrafts.length > 0) ok.push(`domain ${name} — implements draft ${implementedDrafts.join(', ')}, declared. OK.`);
        else if (noBehaviorChange) ok.push(`domain ${name} — code changed, no-behavior-change declared. OK.`);
        else {
          failures.push(
            `domain ${name}: ${files} but no knowledge document under ${domain.path ?? '(unmapped path)'} was touched. ` +
            `Update the domain's knowledge, add "no-behavior-change" to the PR description` +
            (draftSpecs.length > 0 ? `, or declare "implements-draft: ${draftSpecs.map((spec) => String(spec.data.id)).join(' | ')}".` : '.'),
          );
        }
      } else if (draftSpecs.length > 0) {
        if (implementedDrafts.length > 0) ok.push(`domain ${name} — implements draft ${implementedDrafts.join(', ')}, declared (still needs promotion). OK.`);
        else if (noBehaviorChange) ok.push(`domain ${name} — code changed, no-behavior-change declared. OK.`);
        else {
          failures.push(
            `domain ${name}: ${files} while its only spec(s) are drafts (${draftSpecs.map((spec) => String(spec.data.id)).join(', ')}). ` +
            `Declare "implements-draft: <ID>" in the PR description — visibility, not permission; the spec still needs promotion — or "no-behavior-change".`,
          );
        }
      }
    }
  }

  const changedSet = new Set(changed);
  for (const document of documents) {
    if (documentType(document.data) !== 'contract' || !CURRENT_TRUTH.has(String(document.data.status))) continue;

    const implementedPaths = values(document.data, 'implements');
    const codeChanged = changed.filter((file) => implementedPaths.some((prefix) => matchesPrefix(file, prefix)));
    if (codeChanged.length === 0) continue;

    const id = String(document.data.id);
    const contractFile = relative(root, document.file);

    if (changedSet.has(contractFile)) ok.push(`contract ${id} — implementation and contract changed together. OK.`);
    else if (noBehaviorChange) ok.push(`contract ${id} — implementation changed, no-behavior-change declared. OK.`);
    else {
      failures.push(
        `contract ${id}: ${codeChanged.length} file(s) it implements changed (${codeChanged.slice(0, 5).join(', ')}) ` +
        `but ${contractFile} was not updated. ` +
        `Update the contract, or add "no-behavior-change" to the PR description.`,
      );
    }
  }

  return { ok, failures };
}

const executedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (executedDirectly) {
  const root = process.cwd();
  const baseRef = process.env.DRIFT_BASE_REF ?? 'origin/main';
  const prBody = process.env.PR_BODY ?? '';

  let changed: string[] = [];
  try {
    changed = execSync(`git diff --name-only "${baseRef}"...HEAD`, { encoding: 'utf8' })
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (error) {
    console.error(`drift-gate: could not diff against ${baseRef}: ${String(error)}`);
    process.exit(1);
  }

  const { ok, failures } = evaluateDrift(root, changed, prBody);
  for (const line of ok) console.log(`drift-gate: ${line}`);

  if (failures.length > 0) {
    console.error('drift-gate failed:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log('drift-gate: ok.');
}
