# Preserved engineering knowledge

The lightweight harness preserves the existing 58-card core release byte for byte. Its files contain readable guidance, topic mappings, anti-patterns, alternatives, exceptions, bad/better examples, fixtures, source-unit coverage and historical audit/release metadata. Domain knowledge packs in `knowledge/packs/` add cards beside that release without changing it.

This migration does not re-read or re-audit all original resources. The existing inventory and audit record the earlier curation work; keeping their hashes intact preserves that evidence without claiming a fresh semantic review. Private originals and source identities are not part of the portable harness.

## Use the library

Start with the selector index, `topics.json` or the pack guide, then read the full applicable cards from `cards.json`, `guide.md` or `knowledge/packs/`. Include selected IDs, applicable content, rationale and resolved exceptions in both implementation and review packets. Repository contracts and approved behavior take precedence. Do not turn every card into a mandatory rule for every task.

The optional selector treats core and pack cards alike:

```sh
node .agent-harness/scripts/select.mjs --index        # every card: id | title | core or pack:<name> (<status>) | topics
node .agent-harness/scripts/select.mjs --topic money  # core and pack cards for one topic
node .agent-harness/scripts/select.mjs --pack NAME    # every card in one pack
node .agent-harness/scripts/select.mjs --card ID      # one card
```

Selectors are repeatable and combinable; `--list` shows each topic with its core and pack card IDs. A pack card is printed under a header naming its pack and status, so packets and reviews show when guidance comes from a candidate pack. Without the helper, read `knowledge/packs/*.json` or `knowledge/packs/guide.md` directly.

Rules express stable constraints. Cards compare architecture choices. Anti-patterns explain concrete failure mechanisms. Skills describe procedures. Roles establish independent responsibility. Actual tests and review establish whether the resulting code is correct; none of these replaces the others.

## Domain knowledge packs

A pack is one JSON file of cards for a domain, such as money movement, chain integration or release work. Pack cards use the same sections as core cards and are selected the same way. `knowledge/packs/guide.md` is their generated readable guide.

- `candidate`: a usable decision aid that the historical 58-card audit does not cover. Apply it only where its pressure exists, like any card, and do not present it as audited guidance.
- `approved`: an independent semantic review of the pack is recorded in the pack's pull request, and only then does its status change to `approved`. Approval never edits `release.json`, `audit.json` or the other historical records, and an edited card needs a fresh review.

To add a pack, follow [Add a domain pack](../knowledge/README.md#add-a-domain-pack): one file per pack in the harness repository, the fixed card format, a regenerated guide and a passing `npm run check`, which also runs the leak scan.

## Use the pattern cookbook

The separate `patterns/` directory turns selected card guidance into concrete TypeScript and React recipes. It includes exhaustive matching, explicit query state, query transformations and dependencies, provider factories, persistent state, resolver registries, render-prop flows, typed navigation, form boundaries and focused hooks.

Start with `patterns/catalog.json`, read only the matching recipe, and include its related cards in the task packet. The examples are adaptation-ready starting points, not an importable framework. Adapt them to the destination repository's framework versions, module boundaries, error model and approved behavior. Copy only patterns whose stated pressure exists, then remove unused helpers.

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
