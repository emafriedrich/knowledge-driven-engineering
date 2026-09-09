import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

const repo = resolve(import.meta.dirname, '..');
const version = JSON.parse(readFileSync(join(repo, 'package.json'), 'utf8')).version as string;

// Runs install.sh from the local clone against a scratch repository. The yaml
// dependency step runs npm offline so the test never touches the network; the
// installer warns instead of failing when the package is not cached.
function install(cwd: string, ...args: string[]): string {
  return execFileSync('bash', [join(repo, 'install.sh'), ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, KDE_SOURCE: repo, npm_config_offline: 'true', npm_config_loglevel: 'silent' },
  });
}

function firstLine(file: string): string {
  return readFileSync(file, 'utf8').split('\n')[0];
}

test('installer stamps framework-owned files with the package.json version and reports skew before upgrading', () => {
  const root = mkdtempSync(join(tmpdir(), 'kde-install-test-'));
  try {
    const fresh = install(root, 'shop');
    assert.match(fresh, new RegExp(`Installing Knowledge-Driven Engineering ${version.replace(/\./g, '\\.')} into`));
    assert.match(fresh, /add {3}tools\/knowledge-check\.mts/);
    assert.doesNotMatch(fresh, /WARN {2}framework-owned/);

    for (const tool of ['knowledge-check', 'knowledge-context', 'drift-gate', 'knowledge-hook']) {
      assert.equal(firstLine(join(root, `tools/${tool}.mts`)), `// kde-version: ${version}`);
    }
    assert.equal(firstLine(join(root, '.github/workflows/kde.yml')), `# kde-version: ${version}`);

    // Second run: everything up to date, nothing rewritten, no warning.
    const again = install(root);
    assert.match(again, new RegExp(`ok {4}tools/knowledge-check\\.mts \\(kde ${version.replace(/\./g, '\\.')}\\)`));
    assert.doesNotMatch(again, /WARN {2}framework-owned/);

    // Simulate a repository that installed an older release, edited a tool locally,
    // and customised a template.
    const check = join(root, 'tools/knowledge-check.mts');
    writeFileSync(check, readFileSync(check, 'utf8').replace(/^.*\n/, '// kde-version: 0.0.9\n'));
    appendFileSync(join(root, 'tools/drift-gate.mts'), '// local edit\n');
    appendFileSync(join(root, 'templates/rfc.md'), '\n## Team Section\n');

    const stale = install(root);
    assert.match(stale, /skip {2}tools\/knowledge-check\.mts/);
    assert.match(stale, new RegExp(`WARN {2}framework-owned files differ from kde ${version.replace(/\./g, '\\.')} \\(installed: 0\\.0\\.9\\)`));
    assert.match(stale, /- tools\/knowledge-check\.mts\n\s+- tools\/drift-gate\.mts/);
    assert.match(stale, /Re-run with --upgrade/);
    assert.equal(firstLine(check), '// kde-version: 0.0.9', 'a run without --upgrade must not rewrite framework files');

    const upgraded = install(root, '--upgrade');
    assert.match(upgraded, new RegExp(`upgrade tools/knowledge-check\\.mts \\(0\\.0\\.9 -> ${version.replace(/\./g, '\\.')}\\)`));
    assert.match(upgraded, /WARN {2}tools\/drift-gate\.mts had local edits; overwritten with kde /);
    assert.match(upgraded, /skip {2}templates\/rfc\.md/);
    assert.doesNotMatch(upgraded, /WARN {2}framework-owned/);
    assert.equal(firstLine(check), `// kde-version: ${version}`);
    assert.doesNotMatch(readFileSync(join(root, 'tools/drift-gate.mts'), 'utf8'), /local edit/);
    assert.match(readFileSync(join(root, 'templates/rfc.md'), 'utf8'), /## Team Section/, '--upgrade must not touch adopter-owned templates');

    // A copy from before markers existed is reported as pre-0.1.0, not as current.
    writeFileSync(check, readFileSync(check, 'utf8').replace(/^.*\n/, ''));
    assert.match(install(root), /\(installed: pre-0\.1\.0\)/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('installer rejects unknown options', () => {
  const root = mkdtempSync(join(tmpdir(), 'kde-install-test-'));
  try {
    assert.throws(() => install(root, '--nope'), /unknown option --nope/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
