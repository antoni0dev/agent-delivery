# Preserved engineering knowledge

The lightweight harness preserves the entire existing `knowledge/` directory byte for byte. It contains 58 reference cards, readable guidance, topic mappings, anti-patterns, alternatives, exceptions, bad/better examples, fixtures, source-unit coverage and historical audit/release metadata.

This migration does not re-read or re-audit all original resources. The existing inventory and audit record the earlier curation work; keeping their hashes intact preserves that evidence without claiming a fresh semantic review. Private originals and source identities are not part of the portable harness.

## Use the library

Start with `topics.json` or the selector, then read full applicable cards from `cards.json` or `guide.md`. Include selected IDs, applicable content, rationale and resolved exceptions in both implementation and review packets. Repository contracts and approved behavior take precedence. Do not turn all 58 cards into mandatory rules for every task.

Rules express stable constraints. Cards compare architecture choices. Anti-patterns explain concrete failure mechanisms. Skills describe procedures. Roles establish independent responsibility. Actual tests and review establish whether the resulting code is correct; none of these replaces the others.

## Use the pattern cookbook

The separate `patterns/` directory turns selected card guidance into concrete TypeScript and React recipes. It includes exhaustive matching, explicit query state, query transformations and dependencies, provider factories, persistent state, resolver registries, render-prop flows, typed navigation, form boundaries and focused hooks.

Start with `patterns/catalog.json`, read only the matching recipe, and include its related cards in the task packet. The examples are copy-ready starting points, not an importable framework. Adapt them to the destination repository's framework versions, module boundaries, error model and approved behavior. Copy only patterns whose stated pressure exists, then remove unused helpers.

The cookbook is maintained independently from the preserved 58-card release. Adding or editing a recipe does not rewrite the historical card audit or imply that the recipe has inherited its approval. Repository checks validate catalog integrity and installation, while implementation correctness still requires destination tests and review.

## Historical records

| Artifact | What it preserves |
|---|---|
| `cards.json`, `guide.md`, `topics.json` | Curated guidance and its routing |
| `source-snapshot.json`, `coverage.json` | Opaque source units and their recorded dispositions |
| `release.json`, `audit.json`, `eligibility.json` | Earlier content bindings, coverage approval and permitted-use attestation |
| `fixtures/`, `evaluation.md` | Evaluation scenarios and the earlier evaluation protocol |

Some preserved documentation describes the former controller, runtime receipts or release gates. Those statements are historical context, not requirements to activate this harness. There is no runtime model-proof cache or freshness check in the direct workflow. Fixture scores are not universal productivity evidence or proof that a new client follows the guidance.

When editing guidance later, review the affected examples and mappings, document the change and obtain independent semantic review where warranted. Do not rewrite old audit records to imply approval of new content. Original source eligibility and permitted use remain separate from scanning for secrets or identifiers.
