import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { parse as parseYaml } from 'yaml';

import { checkKnowledge } from '../tools/knowledge-check.mts';
import { CommandError, commandAccept, commandDomainAdd, commandDone, commandNew, commandPromote, commandRenumber, commandSupersede, run } from '../tools/knowledge.mts';

const repo = resolve(import.meta.dirname, '..');
const CATALOG = 'domains:\n  test:\n    path: knowledge/test\n    description: Test domain.\n';

function fixture(files: Record<string, string> = {}): string {
  const root = mkdtempSync(join(tmpdir(), 'knowledge-cmd-test-'));
  cpSync(join(repo, 'templates'), join(root, 'templates'), { recursive: true });
  mkdirSync(join(root, 'knowledge/test'), { recursive: true });
  for (const [path, content] of Object.entries({ 'knowledge/index.yaml': CATALOG, ...files })) {
    const full = join(root, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  return root;
}

function withFixture(files: Record<string, string>, assertion: (root: string) => void): void {
  const root = fixture(files);
  try {
    assertion(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function front(file: string): Record<string, string> {
  const match = /^---\n([\s\S]*?)\n---/.exec(readFileSync(file, 'utf8'))!;
  return Object.fromEntries(match[1].split('\n').map((line) => [line.slice(0, line.indexOf(':')), line.slice(line.indexOf(':') + 1).trim()]));
}

function only(dir: string, prefix: string): string {
  const names = readdirSync(dir).filter((name) => name.startsWith(prefix));
  assert.equal(names.length, 1, `expected one ${prefix}* in ${dir}, got ${names.join(', ')}`);
  return join(dir, names[0]);
}

test('new: a human decision costs six lines plus the author, and the repository stays valid', () => {
  withFixture({}, (root) => {
    const result = commandNew(root, 'decision', 'test', 'Orders are immutable after payment', { author: 'ema' });
    const file = only(join(root, 'knowledge/test/decisions'), 'DR-001-');
    assert.match(file, /DR-001-orders-are-immutable-after-payment\.md$/);
    const data = front(file);
    assert.equal(data.status, 'draft');
    assert.equal(data.scope, '[test]');
    assert.equal(data.authors, '[ema]');
    assert.equal(data.drafted_by, undefined);
    assert.match(readFileSync(file, 'utf8'), /# DR-001: Orders are immutable after payment/);
    assert.deepEqual(checkKnowledge(root).errors, []);
    assert.ok(result.changed.includes('knowledge/test/CONTEXT.md'), 'manifest regenerated');
  });
});

test('new: an agent RFC declares itself and leaves motivated_by as a placeholder the validator rejects', () => {
  withFixture({}, (root) => {
    const result = commandNew(root, 'rfc', 'test', 'Split fulfillment', { by: 'agent' });
    const data = front(only(join(root, 'knowledge/test/rfcs'), 'RFC-001-'));
    assert.equal(data.drafted_by, 'agent');
    assert.equal(data.approved_by, '[]');
    assert.match(data.motivated_by, /^<.*>$/);
    assert.match(checkKnowledge(root).errors.join('\n'), /RFC-001-split-fulfillment\.md still holds a template placeholder in motivated_by/);
    assert.match(result.notes.join('\n'), /write motivated_by/);
  });
});

test('new: the id prefix follows what the domain already uses', () => {
  withFixture({
    'knowledge/test/decisions/T-DR-004-existing.md': '---\nid: T-DR-004\ntitle: Existing\nstatus: draft\ncreated: 2026-09-01\nupdated: 2026-09-01\nscope: [test]\n---\n',
  }, (root) => {
    commandNew(root, 'decision', 'test', 'Next one');
    assert.ok(existsSync(join(root, 'knowledge/test/decisions/T-DR-005-next-one.md')));
    assert.throws(() => commandNew(root, 'decision', 'nowhere', 'Lost'), /domain nowhere is not in any catalog — create it: npm run knowledge -- domain add nowhere/);
    assert.throws(() => commandNew(root, 'poem', 'test', 'Lost'), CommandError);
  });
});

test('promote: sets the active status, records the approver, indexes the topic, and refuses invalid documents', () => {
  withFixture({}, (root) => {
    commandNew(root, 'decision', 'test', 'Categories first');
    const result = commandPromote(root, 'DR-001', { by: 'ema' });
    const data = front(only(join(root, 'knowledge/test/decisions'), 'DR-001-'));
    assert.equal(data.status, 'accepted');
    assert.equal(data.approved_by, '[ema]');
    assert.equal(data.authors, '[ema]', 'approver becomes the accountable author when none was given');
    assert.match(readFileSync(join(root, 'knowledge/test/decisions/index.yaml'), 'utf8'), /current:\n  categories-first: DR-001\n/);
    assert.deepEqual(checkKnowledge(root).errors, []);
    assert.match(result.notes.join('\n'), /topic: categories-first/);
    assert.deepEqual(commandPromote(root, 'DR-001', { by: 'ema' }).changed, [], 'idempotent');

    commandNew(root, 'rfc', 'test', 'Needs motivation', { by: 'agent' });
    assert.throws(() => commandPromote(root, 'RFC-001', { by: 'ema' }), /promote refused:\n- .*placeholder in motivated_by/);
    assert.equal(front(only(join(root, 'knowledge/test/rfcs'), 'RFC-001-')).status, 'draft', 'rolled back');
    assert.throws(() => commandPromote(root, 'DR-001', {}), /promotion is human-only/);
  });
});

test('promote: a spec without an anchor is refused with the validator reason', () => {
  withFixture({}, (root) => {
    commandNew(root, 'spec', 'test', 'Checkout behavior');
    assert.throws(() => commandPromote(root, 'SPEC-001', { by: 'ema' }), /promote refused:\n- .*SPEC-001/);
    assert.equal(front(only(join(root, 'knowledge/test/specs'), 'SPEC-001-')).status, 'draft');
  });
});

test('supersede: promotes a draft replacement under the old topic, links both records, and lists dependents', () => {
  withFixture({}, (root) => {
    commandNew(root, 'decision', 'test', 'Use ADR name');
    commandPromote(root, 'DR-001', { by: 'ema' });
    commandNew(root, 'spec', 'test', 'Naming spec');
    const spec = only(join(root, 'knowledge/test/specs'), 'SPEC-001-');
    writeFileSync(spec, readFileSync(spec, 'utf8').replace('depends_on: []', 'depends_on: [DR-001]'));
    commandNew(root, 'decision', 'test', 'Use Decision Record name');

    assert.throws(() => commandSupersede(root, 'DR-001', { by: 'DR-002' }), /pass --approved-by <human>/);
    const result = commandSupersede(root, 'DR-001', { by: 'DR-002', approvedBy: 'ema' });
    assert.equal(front(only(join(root, 'knowledge/test/decisions'), 'DR-001-')).status, 'superseded');
    assert.equal(front(only(join(root, 'knowledge/test/decisions'), 'DR-001-')).superseded_by, '[DR-002]');
    const replacement = front(only(join(root, 'knowledge/test/decisions'), 'DR-002-'));
    assert.equal(replacement.status, 'accepted');
    assert.equal(replacement.supersedes, '[DR-001]');
    assert.match(readFileSync(join(root, 'knowledge/test/decisions/index.yaml'), 'utf8'), /use-adr-name: DR-002/);
    assert.match(result.notes.join('\n'), /review documents that depend on DR-001: SPEC-001/);
    assert.deepEqual(checkKnowledge(root).errors, []);
  });
});

test('promote and supersede edit a decision index written in multi-line flow style, keeping its comments', () => {
  withFixture({}, (root) => {
    const indexFile = join(root, 'knowledge/test/decisions/index.yaml');
    commandNew(root, 'decision', 'test', 'Old way');
    commandPromote(root, 'DR-001', { by: 'ema' });
    // The shape early installs wrote.
    writeFileSync(indexFile, '# Keep me.\ncurrent: {\n  old-way: DR-001,\n  other: DR-001\n}\n');

    commandNew(root, 'decision', 'test', 'New way');
    commandPromote(root, 'DR-002', { by: 'ema' });
    let index = readFileSync(indexFile, 'utf8');
    assert.match(index, /^# Keep me\.$/m);
    assert.match(index, /^current:\n  old-way: DR-001\n  other: DR-001\n  new-way: DR-002\n/m, 'rewritten in block style, one current key');
    assert.deepEqual(parseYaml(index), { current: { 'old-way': 'DR-001', other: 'DR-001', 'new-way': 'DR-002' } });

    commandSupersede(root, 'DR-001', { by: 'DR-002' });
    assert.deepEqual(parseYaml(readFileSync(indexFile, 'utf8')), { current: { 'new-way': 'DR-002' } });

    commandNew(root, 'decision', 'test', 'Newest way');
    commandSupersede(root, 'DR-002', { by: 'DR-003', approvedBy: 'ema' });
    index = readFileSync(indexFile, 'utf8');
    assert.deepEqual(parseYaml(index), { current: { 'new-way': 'DR-003' } });
    assert.match(index, /^# Keep me\.$/m);
    assert.deepEqual(checkKnowledge(root).errors, []);
  });
});

test('supersede: when the replacement already has its own topic, the old topic is retired', () => {
  withFixture({}, (root) => {
    commandNew(root, 'decision', 'test', 'Old way');
    commandPromote(root, 'DR-001', { by: 'ema' });
    commandNew(root, 'decision', 'test', 'New way');
    commandPromote(root, 'DR-002', { by: 'ema' });
    const result = commandSupersede(root, 'DR-001', { by: 'DR-002' });
    const index = readFileSync(join(root, 'knowledge/test/decisions/index.yaml'), 'utf8');
    assert.doesNotMatch(index, /old-way/);
    assert.match(index, /new-way: DR-002/);
    assert.match(result.notes.join('\n'), /retired topic old-way/);
  });
});

test('domain add: catalog entry, README and empty decision index in one step, ready for new', () => {
  withFixture({}, (root) => {
    commandDomainAdd(root, 'orders', { description: 'Order lifecycle', codePaths: ['src/orders/'] });
    const catalog = readFileSync(join(root, 'knowledge/index.yaml'), 'utf8');
    assert.match(catalog, /  orders:\n    path: knowledge\/orders\n    description: Order lifecycle\n    decision_index: knowledge\/orders\/decisions\/index.yaml\n    code_paths: \[src\/orders\/\]\n/);
    assert.ok(existsSync(join(root, 'knowledge/orders/README.md')));
    assert.match(readFileSync(join(root, 'knowledge/orders/decisions/index.yaml'), 'utf8'), /current: \{\}/);
    assert.ok(existsSync(join(root, 'knowledge/orders/CONTEXT.md')));
    assert.deepEqual(checkKnowledge(root).errors, []);
    commandNew(root, 'decision', 'orders', 'First');
    assert.ok(existsSync(join(root, 'knowledge/orders/decisions/DR-001-first.md')));
    assert.throws(() => commandDomainAdd(root, 'orders', { description: 'again' }), /already in knowledge\/index.yaml/);
    assert.throws(() => commandDomainAdd(root, 'Bad Name', { description: 'x' }), CommandError);
  });
});

test('renumber: rewrites the id in the document, its file name, references and the decision index', () => {
  withFixture({}, (root) => {
    commandNew(root, 'decision', 'test', 'Base');
    commandPromote(root, 'DR-001', { by: 'ema' });
    commandNew(root, 'spec', 'test', 'Dependent');
    const spec = only(join(root, 'knowledge/test/specs'), 'SPEC-001-');
    writeFileSync(spec, readFileSync(spec, 'utf8').replace('depends_on: []', 'depends_on: [DR-001]'));
    commandPromote(root, 'SPEC-001', { by: 'ema' });

    const result = commandRenumber(root, 'DR-001', 'DR-010');
    assert.ok(existsSync(join(root, 'knowledge/test/decisions/DR-010-base.md')));
    assert.ok(!existsSync(join(root, 'knowledge/test/decisions/DR-001-base.md')));
    assert.equal(front(join(root, 'knowledge/test/decisions/DR-010-base.md')).id, 'DR-010');
    assert.equal(front(spec).depends_on, '[DR-010]');
    assert.match(readFileSync(join(root, 'knowledge/test/decisions/index.yaml'), 'utf8'), /base: DR-010/);
    assert.deepEqual(checkKnowledge(root).errors, []);
    assert.match(result.changed.join('\n'), /DR-001-base\.md -> knowledge\/test\/decisions\/DR-010-base\.md/);
    assert.throws(() => commandRenumber(root, 'DR-010', 'SPEC-001'), /already used/);
    assert.throws(() => commandRenumber(root, 'DR-010', 'dr-11'), /not a valid id/);
  });
});

test('cli: usage errors are CommandErrors, and flags with several values are collected', () => {
  withFixture({}, (root) => {
    assert.throws(() => run(root, ['promote']), /usage:/);
    assert.throws(() => run(root, ['dance']), /usage:/);
    run(root, ['domain', 'add', 'pay', '--description', 'Payments', '--code-paths', 'src/pay/', 'src/billing/']);
    assert.match(readFileSync(join(root, 'knowledge/index.yaml'), 'utf8'), /code_paths: \[src\/pay\/, src\/billing\/\]/);
    run(root, ['new', 'decision', 'pay', 'Charge', 'on', 'dispatch', '--author', 'ema']);
    assert.ok(existsSync(join(root, 'knowledge/pay/decisions/DR-001-charge-on-dispatch.md')));
  });
});

test('done: closes a task, refuses non-tasks, and names the tracker ticket when there is one', () => {
  withFixture({}, (root) => {
    commandNew(root, 'task', 'test', 'Wire the checkout button', { author: 'ema' });
    const file = only(join(root, 'knowledge/test/tasks'), 'TASK-001-');
    writeFileSync(file, readFileSync(file, 'utf8').replace(/^external_ref:.*$/m, 'external_ref: jira:PD-123'));
    const result = commandDone(root, 'TASK-001');
    assert.equal(front(file).status, 'done');
    assert.match(result.notes.join('\n'), /close jira:PD-123 there as well/);
    assert.deepEqual(checkKnowledge(root).errors, []);
    assert.deepEqual(commandDone(root, 'TASK-001').changed, [], 'idempotent');

    commandNew(root, 'task', 'test', 'Anonymous task');
    assert.throws(() => commandDone(root, 'TASK-002'), /done refused:\n- .*no authors/);
    assert.equal(front(only(join(root, 'knowledge/test/tasks'), 'TASK-002-')).status, 'draft', 'rolled back');
    commandDone(root, 'TASK-002', { by: 'ema' });
    assert.equal(front(only(join(root, 'knowledge/test/tasks'), 'TASK-002-')).status, 'done');

    commandNew(root, 'decision', 'test', 'Not a task');
    assert.throws(() => commandDone(root, 'DR-001'), /done closes tasks/);
  });
});

test('accept: runs the acceptance fence and reports per command; promote --to implemented is gated on it', () => {
  withFixture({}, (root) => {
    commandNew(root, 'decision', 'test', 'Anchor');
    commandPromote(root, 'DR-001', { by: 'ema' });
    commandNew(root, 'spec', 'test', 'Checkout behavior', { author: 'ema' });
    const spec = only(join(root, 'knowledge/test/specs'), 'SPEC-001-');
    const withAnchor = readFileSync(spec, 'utf8').replace('depends_on: []', 'depends_on: [DR-001]');

    // The template ships a placeholder command; it must fail loudly, not pass.
    writeFileSync(spec, withAnchor);
    assert.throws(() => commandAccept(root, { id: 'SPEC-001' }), /FAIL {2}npm test -- --grep "<capability>"[\s\S]*accept failed: SPEC-001 failed acceptance/);
    assert.throws(() => commandPromote(root, 'SPEC-001', { by: 'ema', to: 'implemented' }), /promote refused: acceptance checks of SPEC-001 failed/);
    assert.equal(front(spec).status, 'draft');

    writeFileSync(spec, withAnchor.replace(/```acceptance[\s\S]*?```/, '```acceptance\n# comment lines are skipped\ntest -f knowledge/index.yaml\necho checked\n```'));
    const accepted = commandAccept(root, { id: 'SPEC-001' });
    assert.match(accepted.notes.join('\n'), /ok {4}test -f knowledge\/index\.yaml\n {2}ok {4}echo checked/);

    const promoted = commandPromote(root, 'SPEC-001', { by: 'ema', to: 'implemented' });
    assert.equal(front(spec).status, 'implemented');
    assert.match(promoted.notes.join('\n'), /acceptance checks passed/);
    assert.deepEqual(checkKnowledge(root).errors, []);

    writeFileSync(spec, readFileSync(spec, 'utf8').replace(/```acceptance[\s\S]*?```\n/, '').replace('status: implemented', 'status: current'));
    assert.throws(() => commandPromote(root, 'SPEC-001', { by: 'ema', to: 'implemented' }), /has no acceptance block/);
    assert.throws(() => commandPromote(root, 'DR-001', { by: 'ema', to: 'current' }), /--to accepts only implemented/);
    // implemented belongs to specs (DR-016): a decision is accepted until superseded.
    assert.throws(() => commandPromote(root, 'DR-001', { by: 'ema', to: 'implemented' }), /implemented belongs to specs/);
    assert.throws(() => commandAccept(root, {}), /accept needs a <SPEC-ID>/);
  });
});
