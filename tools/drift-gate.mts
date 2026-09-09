// PR drift gate (DR-008): code changes mapped to a domain with a current spec
// must touch that domain's knowledge or declare no-behavior-change in the PR body.
// Contract obligation (DR-010): code under a current contract's `implements`
// paths must change together with the contract, or declare no-behavior-change.
import { execSync } from 'node:child_process';
import { relative } from 'node:path';
import { checkKnowledge, documentType, loadCatalogs, values } from './knowledge-check.mts';

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

if (changed.length === 0) {
  console.log('drift-gate: no changes.');
  process.exit(0);
}

const catalogs = loadCatalogs(root);
const { documents } = checkKnowledge(root);
const byId = new Map(documents.map((document) => [String(document.data.id), document]));

const matchesPrefix = (file: string, prefix: string): boolean => {
  const clean = prefix.replace(/\/$/, '');
  return file === clean || file.startsWith(`${clean}/`);
};

const declared = /no-behavior-change/i.test(prBody);
const failures: string[] = [];

for (const catalog of catalogs) {
  for (const [name, domain] of catalog.domains) {
    const codeChanged = changed.filter((file) => domain.codePaths.some((prefix) => matchesPrefix(file, prefix)));
    if (codeChanged.length === 0) continue;

    const hasCurrentSpec = Object.values(domain.current).some((id) => {
      const record = byId.get(id);
      return record !== undefined && documentType(record.data) === 'spec';
    });
    if (!hasCurrentSpec) continue;

    const knowledgeTouched = domain.path !== undefined && changed.some((file) => matchesPrefix(file, domain.path!));

    if (knowledgeTouched) {
      console.log(`drift-gate: domain ${name} — code and knowledge changed together. OK.`);
    } else if (declared) {
      console.log(`drift-gate: domain ${name} — code changed, no-behavior-change declared. OK.`);
    } else {
      failures.push(
        `domain ${name}: ${codeChanged.length} code file(s) changed (${codeChanged.slice(0, 5).join(', ')}) ` +
        `but no knowledge document under ${domain.path ?? '(unmapped path)'} was touched. ` +
        `Update the domain's knowledge, or add "no-behavior-change" to the PR description.`,
      );
    }
  }
}

const CURRENT_TRUTH = new Set(['accepted', 'implemented', 'current']);
const changedSet = new Set(changed);

for (const document of documents) {
  if (documentType(document.data) !== 'contract' || !CURRENT_TRUTH.has(String(document.data.status))) continue;

  const implementedPaths = values(document.data, 'implements');
  const codeChanged = changed.filter((file) => implementedPaths.some((prefix) => matchesPrefix(file, prefix)));
  if (codeChanged.length === 0) continue;

  const id = String(document.data.id);
  const contractFile = relative(root, document.file);

  if (changedSet.has(contractFile)) {
    console.log(`drift-gate: contract ${id} — implementation and contract changed together. OK.`);
  } else if (declared) {
    console.log(`drift-gate: contract ${id} — implementation changed, no-behavior-change declared. OK.`);
  } else {
    failures.push(
      `contract ${id}: ${codeChanged.length} file(s) it implements changed (${codeChanged.slice(0, 5).join(', ')}) ` +
      `but ${contractFile} was not updated. ` +
      `Update the contract, or add "no-behavior-change" to the PR description.`,
    );
  }
}

if (failures.length > 0) {
  console.error('drift-gate failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('drift-gate: ok.');
