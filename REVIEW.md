# Repository Review

Date: 2026-08-30

## Perspective A: Staff Engineer Joining After Six Months

### Strengths

- Domain-first structure gives a clear starting point for work. A reader can start at `knowledge/index.yaml`, choose a domain, and inspect current anchors.
- Artifact responsibilities stay distinct. RFCs discuss proposals, Decision Records preserve decisions, specs define behavior, and tasks track work.
- The current-truth mechanism stays small. Domain decision indexes point to active Decision Records without duplicating rationale.
- The methodology now records its own significant changes through Decision Records.
- `depends_on` gives reviewers a practical way to find knowledge that may need review after a decision changes.

### Weaknesses

- Domain boundaries will need discipline. If teams create overlapping domains such as `restaurant`, `restaurants`, and `merchant`, retrieval quality will degrade.
- The validator parses a narrow YAML subset. That keeps dependencies low, but it means authors must keep frontmatter and indexes simple.
- The method still relies on human judgment to decide when a change needs an RFC or Decision Record.
- Tasks remain lightly specified. That is intentional for V1, but teams that lack task discipline may put product truth back into task trackers.

### Maintainability

The structure is maintainable because each domain owns its knowledge locally and the root catalog stays small. The highest maintenance risk is metadata drift, especially stale `depends_on` lists. The validator catches broken references but cannot prove semantic completeness.

## Perspective B: Implementation Agent With 128k Context

### Strengths

- Retrieval starts from domain scope, which limits context before code reading starts.
- Domain indexes expose current anchors without requiring a scan across all historical records.
- `depends_on` helps an agent identify review targets when changing decisions or specs.
- Prompt artifacts reference canonical IDs and paths instead of copying source knowledge.

### Weaknesses

- The repository does not yet provide a machine-readable map from code paths to knowledge domains. An agent still has to infer that a storefront component maps to `storefront`.
- `scope` improves retrieval, but it does not solve cross-domain changes by itself.
- Domain catalogs list current anchors, but they do not declare ownership or review roles.
- The validator checks links and metadata shape, not whether a spec contradicts an active decision.

### Retrieval Efficiency

The refactor improves retrieval because an agent can load:

1. `knowledge/index.yaml`
2. the relevant domain README,
3. the current spec,
4. the domain decision index,
5. only the decisions, flows, IA, or prompts needed for the task.

That path scales better than artifact-type folders because the agent avoids unrelated decisions and specs from other domains.

## Tradeoffs

- Domain-first organization improves locality but requires teams to name domains with care.
- `scope` adds metadata, but it replaces unreliable retrieval through loose tags.
- `depends_on` adds review upkeep, but it solves a real reasoning problem after decisions change.
- The validator stays dependency-free and small, but it supports only the YAML subset this repository uses.
- The method rejects a full knowledge graph for now. The repository needs field evidence before adding graph tooling.

## Unresolved Questions

- Should domains declare owners once the method enters a multi-team product?
- Should repositories add a code-to-knowledge map, such as `knowledge/code-map.yaml`, after integration with Posadas Delivery?
- Should `depends_on` become required for all specs and prompts, or remain allowed to be empty?
- Should task artifacts live in this repository or stay in the team's normal issue tracker with links back to canonical knowledge?

## Recommendations For V2

- Test the domain model against Posadas Delivery by mapping real areas such as storefront, checkout, restaurants, orders, payments, and admin.
- Add a code-to-domain mapping only if agents struggle to find the right domain from file paths.
- Add validator checks for domain names in `scope` after real domain names stabilize.
- Add a review report command that lists documents depending on a changed ID.
- Keep rejecting new artifact types until repeated project work shows a specific missing question.

