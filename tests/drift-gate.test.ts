import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

import { declaredDrafts, evaluateDrift } from '../tools/drift-gate.mts';

const CATALOG = 'domains:\n  orders:\n    path: knowledge/orders\n    code_paths: [src/orders/]\n';

function doc(id: string, status: string, tags = 'spec', extra = ''): string {
  return `---\nid: ${id}\ntitle: ${id}\nstatus: ${status}\ncreated: 2026-09-01\nupdated: 2026-09-01\nauthors: [test]\nscope: [orders]\ntags: [${tags}]\ndepends_on: []\nrelated: []\n${extra}---\n\n# ${id}\n`;
}

function withFixture(files: Record<string, string>, assertion: (root: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), 'drift-gate-test-'));
  try {
    for (const [path, content] of Object.entries({ 'knowledge/index.yaml': CATALOG, ...files })) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), content);
    }
    assertion(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const CODE = ['src/orders/state.ts'];

test('declaredDrafts reads every implements-draft line, case-insensitively', () => {
  assert.deepEqual(declaredDrafts('Implements-Draft: spec-002\nsome text\nimplements-draft:FD-SPEC-010'), ['SPEC-002', 'FD-SPEC-010']);
  assert.deepEqual(declaredDrafts('no declaration'), []);
});

test('domain with only a draft spec: code changes need implements-draft or no-behavior-change', () => {
  withFixture({
    'knowledge/orders/decisions/index.yaml': 'current: {}\n',
    'knowledge/orders/specs/SPEC-002.md': doc('SPEC-002', 'draft'),
  }, (root) => {
    const bare = evaluateDrift(root, CODE, '');
    assert.match(bare.failures.join('\n'), /domain orders: 1 code file\(s\) changed .* while its only spec\(s\) are drafts \(SPEC-002\)\. Declare "implements-draft: <ID>"/);

    const declared = evaluateDrift(root, CODE, 'Adds the state machine.\n\nimplements-draft: SPEC-002');
    assert.deepEqual(declared.failures, []);
    assert.match(declared.ok.join('\n'), /implements draft SPEC-002, declared \(still needs promotion\)/);

    assert.deepEqual(evaluateDrift(root, CODE, 'no-behavior-change').failures, []);
  });
});

test('implements-draft must name a draft spec; a current spec, a decision or an unknown id fail', () => {
  withFixture({
    'knowledge/orders/decisions/index.yaml': 'current:\n  topic: DR-001\n',
    'knowledge/orders/decisions/DR-001.md': doc('DR-001', 'accepted', 'decision'),
    'knowledge/orders/specs/SPEC-001.md': doc('SPEC-001', 'current', 'spec', 'depends_on: [DR-001]\n').replace('depends_on: []\n', ''),
  }, (root) => {
    const output = evaluateDrift(root, CODE, 'implements-draft: SPEC-001\nimplements-draft: DR-001\nimplements-draft: SPEC-999').failures.join('\n');
    assert.match(output, /implements-draft names SPEC-001, which is a spec document with status current/);
    assert.match(output, /implements-draft names DR-001, which is a decision document/);
    assert.match(output, /implements-draft names SPEC-999, which is not a cataloged document/);
  });
});

test('domain with a current spec keeps the DR-008 rule, and a declared draft also satisfies it', () => {
  withFixture({
    'knowledge/orders/decisions/index.yaml': 'current:\n  topic: DR-001\n',
    'knowledge/orders/decisions/DR-001.md': doc('DR-001', 'accepted', 'decision'),
    'knowledge/orders/specs/SPEC-001.md': doc('SPEC-001', 'current', 'spec', 'depends_on: [DR-001]\n').replace('depends_on: []\n', ''),
    'knowledge/orders/specs/SPEC-002.md': doc('SPEC-002', 'draft'),
  }, (root) => {
    const bare = evaluateDrift(root, CODE, '');
    assert.match(bare.failures.join('\n'), /no knowledge document under knowledge\/orders was touched.*or declare "implements-draft: SPEC-002"/);
    assert.deepEqual(evaluateDrift(root, [...CODE, 'knowledge/orders/specs/SPEC-001.md'], '').failures, []);
    assert.deepEqual(evaluateDrift(root, CODE, 'implements-draft: SPEC-002').failures, []);
    assert.deepEqual(evaluateDrift(root, ['README.md'], '').failures, [], 'code outside code_paths is not gated');
  });
});

test('a domain with no specs at all is not gated', () => {
  withFixture({ 'knowledge/orders/decisions/index.yaml': 'current: {}\n' }, (root) => {
    const result = evaluateDrift(root, CODE, '');
    assert.deepEqual(result.failures, []);
  });
});
