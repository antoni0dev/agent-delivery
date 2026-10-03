# Using the engineering knowledge release

Read the [engineering decision guide](guide.md) for the complete human-readable core library. `cards.json` is the canonical runtime source; regenerate the guide after editing it. Domain knowledge packs live in `packs/`, with their own [generated guide](packs/guide.md).

Select guidance by the actual problem, repository conventions and approved behavior. A card is a decision aid, not a mandate to introduce its pattern.

Every card separates applicability, a concrete failure pattern, why it fails, illustrative bad/better approaches, legitimate exceptions and a verification scenario. Examples illustrate the decision and are not complete executable implementations or authorization to invent product behavior. Adapt them to the repository's real APIs and ownership boundaries.

Use a card in planning by recording the applicable pressure, chosen owner/contract, rejected alternative and verification requirement. Give the selected content to implementation and independent review. Reviewers should reject the material failure mechanism and accept a valid exception, even when the code differs from the illustration.

The source inventory and coverage ledger provide traceability for the supplied snapshots. They do not establish exhaustive understanding, rights to reuse the sources, or improved model performance. Source audit, permitted-use eligibility, behavior evaluation and real delivery acceptance are separate gates.

A release candidate with no current independent audit is not approved. An edited card makes prior behavioral evidence stale. Never repair a proof by changing its digest without performing the review or evaluation that proof represents.

## Domain knowledge packs

A pack is `packs/<pack>.json`: cards for one domain, selected exactly like core cards. `node .agent-harness/scripts/select.mjs --index` lists every core and pack card, and `--topic TOPIC`, `--pack NAME` and `--card ID` print full content. Each pack card's header names its pack and status.

A `candidate` pack is a usable decision aid that the historical 58-card audit does not cover. Approval requires an independent semantic review recorded in the pack's pull request; only then does the status change to `approved`. Pack digests never go into `release.json` or `audit.json`.

### Add a domain pack

Work in the harness repository:

1. Create `knowledge/packs/<pack>.json` with exactly `schemaVersion` (1), `pack` (the kebab-case file name), `title`, `status` (`candidate`), `summary` and a non-empty `cards` array. Each card has exactly `id`, `topics` and `content`.
2. Name each card `<pack>-<slug>` in kebab case, at most 60 characters and unique across core and pack cards.
3. Give each card 2-5 topics from `topics.json` or `money`, `quotes`, `chain`, `signing`, `execution`, `contracts`, `release`, `security`, `web-app`, `perps`, `frontend` and `backend`. Include `frontend` or `backend`, and `planning`, `implementation` or `review`.
4. Write 800-3200 characters of content: a `## ` title, a rule paragraph, then these bold labels in order, each starting its own paragraph: `**Apply when:**`, optional `**Boundary notes:**`, `**Checks:**`, `**Anti-pattern:**`, `**Why it fails:**`, `**Bad example (illustrative):**` and `**Better example (illustrative):**` (one line each), `**Legitimate exceptions:**`, `**Verification scenario:**` and optional `**Automatable check:**`.
5. Reference related guidance by ID, as in `Refines core card <id>.` or `pack card <id>`; the check rejects references to unknown cards.
6. Run `node scripts/render-knowledge-guide.mjs`, then `npm run check`.

The check also scans packs, roles, skills, templates, docs, `WORKFLOW.md` and `README.md` for private key headers, 0x-prefixed 64-hex values and absolute home-directory paths. List private terms such as company, people or project names in `.local/deny-terms.txt`, one case-insensitive term per line; lines starting with `#` are comments, and the file is git-ignored. Findings name only the category, file and card or line, never the matched text.
