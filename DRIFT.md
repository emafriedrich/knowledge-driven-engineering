# Drift

Writing a rule down is the easy part. The hard part is that the written rule and the running code stop agreeing, and nothing tells you. That gap is **drift**, and it is the problem most of this method's machinery exists for.

## Two directions

Drift runs both ways, and the first production adoption hit both within a week ([in the field](ADOPTING.md#in-the-field)):

- **Code moves, knowledge stays.** Someone changes checkout; the decision that governs checkout is not touched. The record still says `accepted`. A snapshot of the business rules written by agents contradicted the code six days after it was written.
- **Knowledge moves, code stays.** A Decision Record is accepted and never implemented, or implemented differently. An *accepted* record described behavior the code did not have. Nobody noticed until an audit diffed the two.

Either way the repository now holds two answers to "what does the system do", and whoever reads the wrong one acts on it.

## Why agents make it worse

A human who finds a stale document discounts it. Experience says "this is probably old", and they go read the code. An agent does the opposite: it obeys the document literally, because that is what it was told to do, and a rule that no longer holds looks exactly like one that does. The precedence order that makes canonical knowledge useful (active decision beats code) is the same order that makes stale knowledge dangerous.

Drift also runs faster with agents than the word suggests.

- **Slow drift** happens between tasks and people, over days: the classic case of documentation rot.
- **Fast drift** happens inside one session, after one prompt. The agent reads the domain's `CONTEXT.md` at the start; a hundred thousand tokens later its context is saturated, and what it implements answers a degraded reading of the rules, or an assumption it made along the way and never surfaced. Nothing in the repository changed. The agent stopped following it.

With agents doing most of the implementation, fast drift is the common case, not the edge case.

## What the gate does

The drift gate runs on every pull request and looks at the result, not the process. It does not know whether a divergence took a week or twenty minutes, and it does not need to.

For each domain that declares `code_paths` in `knowledge/index.yaml` and has a spec:

- If the PR changes code under those paths and the domain has a **current** spec, the PR must also change a document under the domain's knowledge path, or declare `no-behavior-change` in its description. Otherwise it fails.
- If the domain's only specs are **drafts**, the PR must declare `implements-draft: <SPEC-ID>` (or `no-behavior-change`). Implementing against a draft is allowed; hiding it is not. The spec still needs a human to promote it.
- If the code changed sits under a current **Contract**'s `implements` paths, the contract must change in the same PR, or the PR declares `no-behavior-change`.

The gate prints one line per domain it evaluated, so a reviewer sees which declaration carried the PR.

```text
drift-gate: domain businesses — code and knowledge changed together. OK.
drift-gate: domain orders — code changed, no-behavior-change declared. OK.
```

Decision Records and manifests are protected by different means: the validator refuses a decision index that points at a superseded record, and `knowledge:context --check` fails CI when a committed `CONTEXT.md` differs from what the generator produces.

## What the gate does not catch

Say this to your team before they trust it too much:

- **`no-behavior-change` by reflex.** The declaration is a sentence in a PR description. It will get pasted the way `skip-changelog` gets pasted. The gate makes the shortcut visible; it does not make it rare. Reviewers and CODEOWNERS do that.
- **Code outside `code_paths`.** A domain without declared code paths is not gated. Partial adoption is deliberate, so unmapped code is simply outside the contract.
- **A domain with decisions but no specs.** The `DR -> code` path has nothing mechanical to hang on; review and the project's tests verify it. A team that wants the mechanical link writes the spec.
- **Knowledge that changed in the wrong direction.** A PR that edits both the code and the spec passes, even if the spec now contradicts the decision it depends on. The validator checks structure, not meaning; a human reads the diff.
- **Fast drift before the PR.** The gate fires when the branch is pushed. Inside the session, the defenses are procedural: the context receipt from `knowledge:context` pasted in the PR, re-reading `CONTEXT.md` before touching governed code, and the rule that an agent facing an ambiguous request drafts an RFC and stops instead of implementing against an assumption (AGENTS.md, "Choosing the artifact"). The harness hooks run the validator in-session, but only on knowledge edits.

## Tuning it

- Declare `code_paths` per domain as soon as the domain has a spec. Prefix matching, one line in `knowledge/index.yaml`.
- Keep specs anchored: a spec entering current truth must depend on an active decision, so the chain from code to rule to rationale stays walkable.
- Treat `no-behavior-change` as a review signal. If a PR needs it, ask why the behavior did not change when the code did.
- Run the gate locally before pushing when in doubt:

```bash
PR_BODY="no-behavior-change" DRIFT_BASE_REF=origin/main node --experimental-strip-types tools/drift-gate.mts
```

The gate is `tools/drift-gate.mts`; the decisions behind it are DR-008 (mechanical drift verification), DR-010 (contract obligations) and DR-015 (declared drafts).
