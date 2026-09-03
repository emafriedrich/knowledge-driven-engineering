import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

import { checkKnowledge } from '../tools/knowledge-check.mts';

// Documents are only validated inside a cataloged knowledge tree, so every
// fixture that expects validation ships this catalog.
const CATALOG = 'domains:\n  test:\n    path: knowledge/test\n';

function fixture(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'knowledge-check-test-'));

  for (const [path, content] of Object.entries(files)) {
    const fullPath = join(root, path);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content);
  }

  return root;
}

function frontmatter(id: string, status: string, overrides: Record<string, string> = {}): string {
  const fields: Record<string, string> = {
    id,
    title: id,
    status,
    created: '2026-08-30',
    updated: '2026-08-30',
    authors: '[test]',
    scope: '[test]',
    tags: `[${id.includes('DR-') ? 'decision' : 'spec'}]`,
    depends_on: '[]',
    related: '[]',
    supersedes: '[]',
    superseded_by: '[]',
    ...overrides,
  };

  const lines = Object.entries(fields).map(([key, value]) => `${key}: ${value}`);
  return `---\n${lines.join('\n')}\n---\n\n# ${id}\n`;
}

function withFixture(files: Record<string, string>, assertion: (root: string) => void): void {
  const root = fixture({ 'knowledge/index.yaml': CATALOG, ...files });

  try {
    assertion(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('accepts a valid active decision index', () => {
  withFixture({
    'knowledge/test/decisions/index.yaml': 'current:\n  topic.example: DR-001\n',
    'knowledge/test/decisions/DR-001.md': frontmatter('DR-001', 'accepted'),
  }, (root) => {
    assert.deepEqual(checkKnowledge(root).errors, []);
  });
});

test('detects duplicate ids', () => {
  withFixture({
    'knowledge/test/one.md': frontmatter('DR-001', 'accepted'),
    'knowledge/test/two.md': frontmatter('DR-001', 'accepted'),
  }, (root) => {
    assert.match(checkKnowledge(root).errors.join('\n'), /duplicate id DR-001/);
  });
});

test('rejects a current index target that is superseded', () => {
  withFixture({
    'knowledge/test/decisions/index.yaml': 'current:\n  topic.example: DR-001\n',
    'knowledge/test/decisions/DR-001.md': frontmatter('DR-001', 'superseded', { superseded_by: '[DR-002]' }),
    'knowledge/test/decisions/DR-002.md': frontmatter('DR-002', 'accepted', { supersedes: '[DR-001]' }),
  }, (root) => {
    assert.match(checkKnowledge(root).errors.join('\n'), /non-active decision DR-001/);
  });
});

test('detects broken depends_on references', () => {
  withFixture({
    'knowledge/test/one.md': frontmatter('SPEC-001', 'current', { depends_on: '[DR-404]' }),
  }, (root) => {
    assert.match(checkKnowledge(root).errors.join('\n'), /missing depends_on target DR-404/);
  });
});

test('detects missing domain catalog targets', () => {
  withFixture({
    'knowledge/index.yaml': 'domains:\n  checkout:\n    current:\n      specification: SPEC-404\n',
  }, (root) => {
    assert.match(checkKnowledge(root).errors.join('\n'), /points to missing document SPEC-404/);
  });
});

test('detects missing domain catalog paths', () => {
  withFixture({
    'knowledge/index.yaml': 'domains:\n  checkout:\n    path: knowledge/checkout\n    decision_index: knowledge/checkout/decisions/index.yaml\n',
  }, (root) => {
    assert.match(checkKnowledge(root).errors.join('\n'), /points to missing path knowledge\/checkout/);
  });
});

test('rejects a knowledge document whose frontmatter is wrapped in a code fence', () => {
  // Copying a pre-fix template verbatim produced this shape. It must fail
  // loudly instead of being silently skipped by the validator.
  withFixture({
    'knowledge/test/specs/SPEC-001.md': '# SPEC-001\n\n```yaml\n' + frontmatter('SPEC-001', 'current') + '```\n',
  }, (root) => {
    assert.match(checkKnowledge(root).errors.join('\n'), /without valid frontmatter/);
  });
});

test('rejects a knowledge document with no frontmatter at all', () => {
  withFixture({
    'knowledge/test/specs/SPEC-001.md': '# SPEC-001\n\nJust prose.\n',
  }, (root) => {
    assert.match(checkKnowledge(root).errors.join('\n'), /without valid frontmatter/);
  });
});

test('allows README and generated CONTEXT files without frontmatter inside knowledge trees', () => {
  withFixture({
    'knowledge/test/README.md': '# Test Domain\n',
    'knowledge/test/CONTEXT.md': '<!-- GENERATED -->\n# Context: test\n',
  }, (root) => {
    assert.deepEqual(checkKnowledge(root).errors, []);
  });
});

test('ignores markdown outside cataloged knowledge trees', () => {
  // Field bug: skills, rules, and app docs carry their own frontmatter
  // dialects (name/description) and are not this validator's business.
  withFixture({
    'knowledge/test/README.md': '# Test Domain\n',
    'agents/skills/graphify/SKILL.md': '---\nname: graphify\ndescription: any input to knowledge graph\n---\n\n# Skill\n',
    'apps/web/rules/style.md': '---\nname: style\ndescription: css rules\n---\n\n# Rules\n',
  }, (root) => {
    const result = checkKnowledge(root);
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.warnings, []);
  });
});

test('ignores knowledge directories that have no catalog', () => {
  withFixture({
    'knowledge/test/README.md': '# Test Domain\n',
    'apps/scrapper/agents/knowledge/note.md': '---\ntopic: scraping\n---\n\n# Note\n',
  }, (root) => {
    const result = checkKnowledge(root);
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.warnings, []);
  });
});

test('warns when a root knowledge tree has no catalog', () => {
  const root = fixture({
    'knowledge/notes.md': '---\nfoo: bar\n---\n\n# Notes\n',
  });

  try {
    const result = checkKnowledge(root);
    assert.deepEqual(result.errors, []);
    assert.match(result.warnings.join('\n'), /knowledge\/ exists but has no index\.yaml catalog/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('requires exactly one artifact type tag', () => {
  withFixture({
    'knowledge/test/no-type.md': frontmatter('SPEC-001', 'draft', { tags: '[payments]' }),
    'knowledge/test/two-types.md': frontmatter('SPEC-002', 'draft', { tags: '[spec, decision]' }),
  }, (root) => {
    const output = checkKnowledge(root).errors.join('\n');
    assert.match(output, /no-type\.md has no artifact type tag/);
    assert.match(output, /two-types\.md has multiple artifact type tags \(spec, decision\)/);
  });
});

test('treats the type tag, not the id pattern, as the decision type signal', () => {
  withFixture({
    'knowledge/test/decisions/index.yaml': 'current:\n  topic.example: SPEC-DR-001\n',
    'knowledge/test/decisions/SPEC-DR-001.md': frontmatter('SPEC-DR-001', 'accepted', { tags: '[spec]' }),
  }, (root) => {
    assert.match(checkKnowledge(root).errors.join('\n'), /points to non-decision SPEC-DR-001/);
  });
});

test('rejects scope values that are not declared domains', () => {
  withFixture({
    'knowledge/index.yaml': 'domains:\n  checkout:\n    path: knowledge/checkout\n',
    'knowledge/checkout/specs/SPEC-001.md': frontmatter('SPEC-001', 'draft', { scope: '[payments]' }),
  }, (root) => {
    assert.match(checkKnowledge(root).errors.join('\n'), /scope value payments that is not a domain/);
  });
});

test('accepts scope values that match declared domains', () => {
  withFixture({
    'knowledge/index.yaml': 'domains:\n  checkout:\n    path: knowledge/checkout\n    current:\n      specification: SPEC-001\n',
    'knowledge/checkout/decisions/DR-001.md': frontmatter('DR-001', 'accepted', { scope: '[checkout]' }),
    'knowledge/checkout/specs/SPEC-001.md': frontmatter('SPEC-001', 'current', { scope: '[checkout]', depends_on: '[DR-001]' }),
  }, (root) => {
    assert.deepEqual(checkKnowledge(root).errors, []);
  });
});

test('warns about current-truth documents no index or document references', () => {
  withFixture({
    'knowledge/test/decisions/DR-009.md': frontmatter('DR-009', 'accepted'),
  }, (root) => {
    assert.match(checkKnowledge(root).warnings.join('\n'), /DR-009\) is current truth but is not referenced/);
  });
});

test('does not warn about unreferenced drafts', () => {
  withFixture({
    'knowledge/test/rfcs/RFC-001.md': frontmatter('RFC-001', 'draft', { tags: '[rfc]' }),
  }, (root) => {
    assert.deepEqual(checkKnowledge(root).warnings, []);
  });
});

test('rejects malformed dates', () => {
  withFixture({
    'knowledge/test/one.md': frontmatter('SPEC-001', 'draft', { created: '30/08/2026' }),
  }, (root) => {
    assert.match(checkKnowledge(root).errors.join('\n'), /invalid created date/);
  });
});

test('parses yaml the hand-rolled parser could not', () => {
  withFixture({
    'knowledge/test/one.md': `---
id: SPEC-001
title: "Checkout: totals, fees, and tips"
status: draft
created: 2026-08-30
updated: 2026-08-30
authors: [test]
scope: [test]
tags:
  - spec
depends_on: []
related: []
---

# SPEC-001
`,
  }, (root) => {
    const result = checkKnowledge(root);
    assert.deepEqual(result.errors, []);
    assert.equal(result.documents[0].data.title, 'Checkout: totals, fees, and tips');
  });
});

test('gate 2: agent-drafted rfc requires motivated_by', () => {
  withFixture({
    'knowledge/test/rfcs/RFC-001.md': frontmatter('RFC-001', 'draft', { tags: '[rfc]', drafted_by: 'agent' }),
  }, (root) => {
    assert.match(checkKnowledge(root).errors.join('\n'), /agent-drafted RFC without motivated_by/);
  });
});

test('gate 3: agent-drafted document cannot hold an active status unapproved', () => {
  withFixture({
    'knowledge/test/decisions/DR-001.md': frontmatter('DR-001', 'accepted', { drafted_by: 'agent' }),
    'knowledge/test/decisions/DR-002.md': frontmatter('DR-002', 'accepted', { drafted_by: 'agent', approved_by: '[maria]' }),
  }, (root) => {
    const output = checkKnowledge(root).errors.join('\n');
    assert.match(output, /DR-001\.md is agent-drafted with status accepted but has empty approved_by/);
    assert.doesNotMatch(output, /DR-002\.md is agent-drafted/);
  });
});

test('gate 4: current spec must depend on an active decision', () => {
  withFixture({
    'knowledge/test/specs/SPEC-001.md': frontmatter('SPEC-001', 'current'),
  }, (root) => {
    assert.match(checkKnowledge(root).errors.join('\n'), /SPEC-001\.md has status current but does not depend on an active decision/);
  });
});

test('gate 4: a flow may anchor to a current spec instead of a decision', () => {
  withFixture({
    'knowledge/test/decisions/DR-001.md': frontmatter('DR-001', 'accepted'),
    'knowledge/test/specs/SPEC-001.md': frontmatter('SPEC-001', 'current', { depends_on: '[DR-001]' }),
    'knowledge/test/flows/FLOW-001.md': frontmatter('FLOW-001', 'current', { tags: '[flow]', depends_on: '[SPEC-001]' }),
    'knowledge/test/ia/IA-001.md': frontmatter('IA-001', 'current', { tags: '[ia]' }),
  }, (root) => {
    const output = checkKnowledge(root).errors.join('\n');
    assert.doesNotMatch(output, /FLOW-001\.md has status current/);
    assert.match(output, /IA-001\.md has status current but does not depend on an active decision or current spec/);
  });
});

test('warns when a document is older than a dependency', () => {
  withFixture({
    'knowledge/test/decisions/DR-001.md': frontmatter('DR-001', 'accepted', { updated: '2026-09-02' }),
    'knowledge/test/specs/SPEC-001.md': frontmatter('SPEC-001', 'current', { depends_on: '[DR-001]', updated: '2026-08-30' }),
  }, (root) => {
    assert.match(checkKnowledge(root).warnings.join('\n'), /SPEC-001\.md may be stale: depends_on DR-001 was updated 2026-09-02/);
  });
});

test('warns about expired agent drafts and rejects invalid drafted_by', () => {
  withFixture({
    'knowledge/test/rfcs/RFC-001.md': frontmatter('RFC-001', 'draft', { tags: '[rfc]', drafted_by: 'agent', motivated_by: 'DR-001 conflict', updated: '2026-01-01' }),
    'knowledge/test/rfcs/RFC-002.md': frontmatter('RFC-002', 'draft', { tags: '[rfc]', drafted_by: 'robot' }),
  }, (root) => {
    const result = checkKnowledge(root);
    assert.match(result.warnings.join('\n'), /RFC-001\.md is an agent draft with no update in \d+ days/);
    assert.match(result.errors.join('\n'), /RFC-002\.md has invalid drafted_by robot/);
  });
});
