---
name: pr-audit
description: Independently audit a stable pull request or candidate diff for actionable correctness, architecture and test defects. Use for PR audit or release review; this reviewer does not implement fixes.
---

# Independent PR audit

Read [the workflow](../../../.agent-harness/WORKFLOW.md),
[project configuration](../../../.agent-harness/PROJECT.md) and
[reviewer role](../../../.agent-harness/roles/reviewer.md).
These paths target an installed skill; in the source package use root `WORKFLOW.md`,
`templates/PROJECT.md` and `roles/reviewer.md`. Follow the repository's own rules.

## Establish the candidate

- Use a fresh context that did not implement the candidate. An implementing agent
  must hand off to an available independent native agent, not label self-review independent.
- Obtain the accepted scope and plan, exact head and base, owned files, applicable
  card content and exceptions, local test results and required exact-head CI evidence.
- Verify the current diff matches those identities. If the head is moving or required
  evidence is missing, report what is needed instead of issuing release approval.
- Use authorized read-only Git/GitHub access. If independent contexts or repository
  access are unavailable, state that independence or review remains unverified.

## Inspect and judge

- Inspect changed source and direct consumers. Expand only for a concrete dependency
  needed to establish a defect; do not initiate an unrelated repository audit.
- Check contracts, architecture, authorization, state/data ownership, failure paths,
  mutations and applicable accepted user journeys against the selected guidance.
- Check artifacts and comments for misleading claims, unintended private data and
  generated noise. Check test value, determinism and assertions against real outcomes.
- Flag unnecessary complexity, dead code and speculative abstractions only when the
  finding has a concrete consequence. Do not demand patterns outside their applicability.
- Verify suspected defects from code or a bounded read-only reproduction. Never
  change the candidate, commit, push, merge or mutate application data as the reviewer.
- Classify each finding `main-path`, `money` or `deferred`; only the first two block.
  Include file/line, trigger, failure mechanism, evidence and a concise repair direction.
  Avoid hypothetical edge cases and duplicate findings.

## Return and recheck

- Return reviewed head/base, scope, blocking findings, deferred notes and uncovered
  areas. No findings means no discovered defect in the reviewed scope, not full QA.
- Send repairs to the implementation owner. Recheck the repair delta on the same base;
  a rebase or changed integration base receives the repository's required fresh review.
- Do not reuse approval for changed code. Carry forward identical-code review only
  where repository policy permits, explicitly recording what was carried forward.
- After two no-progress rounds, identify product, test, infrastructure or evidence
  blockers. Record model, effort, elapsed time and reported usage when available.
