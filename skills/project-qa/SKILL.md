---
name: project-qa
description: Independently verify the accepted user journeys affected by a stable candidate, including browser and authenticated behavior when applicable. Use for project QA or diff QA, not fixture authoring.
---

# Independent project QA

Read [the workflow](../../../.agent-harness/WORKFLOW.md),
[project configuration](../../../.agent-harness/PROJECT.md) and
[QA role](../../../.agent-harness/roles/qa.md).
These paths target an installed skill; in the source package use root `WORKFLOW.md`,
`templates/PROJECT.md` and `roles/qa.md`. Follow repository-owned acceptance rules.

## Prepare for judgment

- Use a context separate from implementation. Obtain accepted journeys, exact head
  and base, selected card content, environment identity and required CI evidence.
- The implementation owner first stabilizes fixtures and runs the contracted journeys
  plus narrow checks locally. Do not spend independent review rounds debugging an
  unfinished fixture or waiting for required evidence that has not arrived.
- Confirm the tested app or deployment corresponds to the candidate. Record unknown
  identity as missing evidence, not a pass. Use the configured repository test commands.
- Check available browser/native tools and authorized test access. If unavailable,
  report the blocked journey precisely; never invent a browser run or install a global
  plugin as a prerequisite. Native client capabilities may differ.

## Execute the accepted journeys

- Cover changed success, loading, empty and error behavior plus accepted regression
  journeys. Use deterministic fixtures for controlled states and configured viewports.
- Changed authenticated behavior requires real non-production authentication with
  dedicated test identities. Fixture bypasses do not establish authenticated behavior.
- For writes, verify authorization, identity, destination and authoritative outcome.
  Use approved isolated non-production data; blockchain mutation tests use testnet.
  Stop if the configured destination is production or the write is unauthorized.
- Keep request, error, write and signing observations available before assertions.
  Retain useful failure traces for inert fixtures while protecting authentication
  secrets and personal data in live-browser artifacts.
- Reproduce failures narrowly. Classify findings `main-path`, `money` or `deferred`
  and distinguish product behavior, test defects, infrastructure and missing evidence.
- Return test repairs to the owner. Do not modify or push the candidate during
  independent judgment. Test changes move the head and require affected evidence again.

## Report acceptance

- Record head/base, environment, actual steps/assertions, results and artifact references.
  Missing access, skipped tests, empty runs and failed assertions never count as passes.
- State uncovered journeys and their reason. The manager applies the repository's
  explicit exception policy; QA does not silently waive a required journey.
- Stop after two no-progress rounds with the concrete blocker and next action.
  Do not expand passing contracted journeys merely for cosmetic coverage.
- Report model, effort, elapsed time and available usage. Unknown cost remains unknown.
  Subsequent candidate or relevant environment changes invalidate affected evidence.
