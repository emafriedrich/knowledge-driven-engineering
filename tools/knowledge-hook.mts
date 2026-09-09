// Harness hook: runs the knowledge validator when a session touches knowledge
// artifacts, so agents get integrity errors in-session instead of at PR time.
// Silent and cheap on success; exit code 2 feeds errors back to the agent.
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { relative } from 'node:path';

type HookInput = {
  hook_event_name?: string;
  stop_hook_active?: boolean;
  tool_input?: { file_path?: string };
};

const KNOWLEDGE_PATH_PATTERN = /(^|[\\/])(knowledge|templates)([\\/]|$)|index\.yaml$/;

let input: HookInput = {};
try {
  input = JSON.parse(readFileSync(0, 'utf8')) as HookInput;
} catch {
  process.exit(0);
}

// A previous Stop hook already blocked once this turn; let the turn end.
if (input.stop_hook_active) process.exit(0);

if (input.hook_event_name === 'Stop') {
  // Safety net for edits made through shell commands: only validate when the
  // working tree actually has pending changes to knowledge artifacts.
  let status = '';
  try {
    status = execSync('git status --porcelain', { encoding: 'utf8' });
  } catch {
    process.exit(0);
  }

  const touched = status
    .split('\n')
    .some((line) => KNOWLEDGE_PATH_PATTERN.test(line.slice(3)));
  if (!touched) process.exit(0);
} else if (!KNOWLEDGE_PATH_PATTERN.test(input.tool_input?.file_path ?? '')) {
  await warnIfImplementingAgainstDraft(input.tool_input?.file_path ?? '');
  process.exit(0);
}

// Local parity with the drift gate (DR-015): a write under a domain's code
// paths while that domain's only specs are drafts gets one line, never a block.
// Reads the root catalog directly so ordinary code edits stay cheap.
async function warnIfImplementingAgainstDraft(filePath: string): Promise<void> {
  const catalogFile = 'knowledge/index.yaml';
  if (!filePath || !existsSync(catalogFile)) return;
  const file = relative(process.cwd(), filePath).replace(/\\/g, '/');
  if (file.startsWith('..')) return;
  try {
    const { parse } = await import('yaml');
    const catalog = parse(readFileSync(catalogFile, 'utf8')) as { domains?: Record<string, { path?: string; code_paths?: string[] }> } | null;
    const hit = Object.entries(catalog?.domains ?? {}).find(([, domain]) =>
      (domain?.code_paths ?? []).some((prefix) => {
        const clean = String(prefix).replace(/\/$/, '');
        return file === clean || file.startsWith(`${clean}/`);
      }),
    );
    if (!hit) return;
    const [name, domain] = hit;
    const { checkKnowledge, documentType } = await import('./knowledge-check.mts');
    const specs = checkKnowledge().documents.filter((document) => {
      if (documentType(document.data) !== 'spec' || !domain.path) return false;
      return relative(process.cwd(), document.file).replace(/\\/g, '/').startsWith(domain.path.replace(/\/$/, '') + '/');
    });
    const statuses = specs.map((document) => String(document.data.status));
    if (statuses.some((status) => status === 'current' || status === 'implemented' || status === 'accepted')) return;
    const drafts = specs.filter((document) => document.data.status === 'draft' || document.data.status === 'in-review').map((document) => String(document.data.id));
    if (drafts.length === 0) return;
    console.error(`knowledge: ${file} is under domain ${name}, whose only spec(s) are drafts (${drafts.join(', ')}) — implementing against a draft is fine, declare it: "implements-draft: ${drafts[0]}" in the PR.`);
    process.exit(2);
  } catch {
    // Dependencies missing or catalog unreadable: stay silent, CI is the guarantee.
  }
}

let checkKnowledge: (typeof import('./knowledge-check.mts'))['checkKnowledge'];
try {
  ({ checkKnowledge } = await import('./knowledge-check.mts'));
} catch {
  // Dependencies not installed; CI remains the hard guarantee.
  process.exit(0);
}

const { errors } = checkKnowledge();

if (errors.length > 0) {
  console.error(`knowledge:check failed (${errors.length} error${errors.length === 1 ? '' : 's'}):`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(2);
}
