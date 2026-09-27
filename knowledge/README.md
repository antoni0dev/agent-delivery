# Using the engineering knowledge release

Read the [engineering decision guide](guide.md) for the complete human-readable library. `cards.json` is the canonical runtime source; regenerate the guide after editing it.

Select guidance by the actual problem, repository conventions and approved behavior. A card is a decision aid, not a mandate to introduce its pattern.

Every card separates applicability, a concrete failure pattern, why it fails, illustrative bad/better approaches, legitimate exceptions and a verification scenario. Examples illustrate the decision and are not complete executable implementations or authorization to invent product behavior. Adapt them to the repository's real APIs and ownership boundaries.

Use a card in planning by recording the applicable pressure, chosen owner/contract, rejected alternative and verification requirement. Give the selected content to implementation and independent review. Reviewers should reject the material failure mechanism and accept a valid exception, even when the code differs from the illustration.

The source inventory and coverage ledger provide traceability for the supplied snapshots. They do not establish exhaustive understanding, rights to reuse the sources, or improved model performance. Source audit, permitted-use eligibility, behavior evaluation and real delivery acceptance are separate gates.

A release candidate with no current independent audit is not approved. An edited card makes prior behavioral evidence stale. Never repair a proof by changing its digest without performing the review or evaluation that proof represents.
