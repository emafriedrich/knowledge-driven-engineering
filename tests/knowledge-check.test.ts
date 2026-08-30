import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

import { checkKnowledge } from '../tools/knowledge-check.ts';

function fixture(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'knowledge-check-test-'));

  for (const [path, content] of Object.entries(files)) {
    const fullPath = join(root, path);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content);
  }

  return root;
}

function frontmatter(id: string, status: string, extra = ''): string {
  return `---
id: ${id}
title: ${id}
status: ${status}
created: 2026-08-30
updated: 2026-08-30
authors: [test]
tags: []
related: []
supersedes: []
superseded_by: []
${extra}---

# ${id}
`;
}

test('accepts a valid active decision index', () => {
  const root = fixture({
    'knowledge/decisions/index.yaml': 'current:\n  topic.example: DR-001\n',
    'knowledge/decisions/records/DR-001.md': frontmatter('DR-001', 'accepted'),
  });

  try {
    assert.deepEqual(checkKnowledge(root).errors, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('detects duplicate ids', () => {
  const root = fixture({
    'one.md': frontmatter('DR-001', 'accepted'),
    'two.md': frontmatter('DR-001', 'accepted'),
  });

  try {
    assert.match(checkKnowledge(root).errors.join('\n'), /duplicate id DR-001/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('rejects a current index target that is superseded', () => {
  const root = fixture({
    'knowledge/decisions/index.yaml': 'current:\n  topic.example: DR-001\n',
    'knowledge/decisions/records/DR-001.md': frontmatter('DR-001', 'superseded', 'superseded_by: [DR-002]\n'),
    'knowledge/decisions/records/DR-002.md': frontmatter('DR-002', 'accepted', 'supersedes: [DR-001]\n'),
  });

  try {
    assert.match(checkKnowledge(root).errors.join('\n'), /non-active decision DR-001/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

