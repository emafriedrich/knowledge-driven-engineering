import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
    assert.match(upgraded, /note {2}templates\/rfc\.md differs from kde .* \(yours; not touched\)/);
    assert.match(upgraded, /skip {2}templates\/spec\.md/, 'an untouched template is not noted');
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

test('a domain argument on an installed repository creates nothing and points at domain add', () => {
  const root = mkdtempSync(join(tmpdir(), 'kde-install-test-'));
  try {
    install(root, 'shop');
    const catalog = readFileSync(join(root, 'knowledge/index.yaml'), 'utf8');

    const again = install(root, 'payments');
    assert.match(again, /WARN {2}KDE is already installed here/);
    assert.match(again, /npm run knowledge -- domain add payments/);
    assert.equal(existsSync(join(root, 'knowledge/payments')), false, 'an uncataloged domain folder must not be created');
    assert.equal(readFileSync(join(root, 'knowledge/index.yaml'), 'utf8'), catalog);

    // Re-running the original command stays quiet: the domain already exists.
    assert.doesNotMatch(install(root, 'shop'), /already installed/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('the kde section of AGENTS.md is framework-owned: reported when stale, replaced only between the markers on --upgrade', () => {
  const root = mkdtempSync(join(tmpdir(), 'kde-install-test-'));
  try {
    writeFileSync(join(root, 'AGENTS.md'), '# Team rules\n\nUse tabs.\n\n');
    install(root, 'shop');
    const agents = join(root, 'AGENTS.md');
    const fresh = readFileSync(agents, 'utf8');
    assert.match(fresh, /Approval in chat is not promotion/);
    assert.match(install(root), /ok {4}AGENTS\.md KDE section/);

    // An older release's section, with adopter text on both sides of it.
    const stale = fresh.replace(/<!-- kde:begin -->[\s\S]*<!-- kde:end -->/, '<!-- kde:begin -->\n## Knowledge-Driven Engineering\n\nOld rules.\n<!-- kde:end -->') + '\n## After\n\nKeep me.\n';
    writeFileSync(agents, stale);
    const plain = install(root);
    assert.match(plain, /WARN {2}framework-owned files differ/);
    assert.match(plain, /- AGENTS\.md:KDE-section/);
    assert.equal(readFileSync(agents, 'utf8'), stale, 'a run without --upgrade must not rewrite the section');

    assert.match(install(root, '--upgrade'), /upgrade AGENTS\.md KDE section/);
    assert.equal(readFileSync(agents, 'utf8'), fresh + '\n## After\n\nKeep me.\n', 'only the text between the markers changes');

    // A damaged section is left alone rather than guessed at.
    writeFileSync(agents, stale.replace('<!-- kde:end -->', ''));
    assert.match(install(root, '--upgrade'), /kde:begin marker without kde:end; section left alone/);
    assert.match(readFileSync(agents, 'utf8'), /Keep me\./);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
