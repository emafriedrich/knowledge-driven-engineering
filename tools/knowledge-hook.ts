// Harness hook: runs the knowledge validator when a session touches knowledge
// artifacts, so agents get integrity errors in-session instead of at PR time.
// Silent and cheap on success; exit code 2 feeds errors back to the agent.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

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
  process.exit(0);
}

let checkKnowledge: (typeof import('./knowledge-check.ts'))['checkKnowledge'];
try {
  ({ checkKnowledge } = await import('./knowledge-check.ts'));
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
