---
name: verify-task
description: Triangulate a ticket against product, design, frontend, API contract and backend sources before implementation, then decide proceed, block or reduce scope. Use when asked to "verify task", "validate this ticket", "is this bug real", "has product or design answered this", or before any non-trivial implementation.
---

# Verify a task before implementation

Read [the workflow](../../../.agent-harness/WORKFLOW.md) and
[project configuration](../../../.agent-harness/PROJECT.md).
These paths target an installed skill; in the source package use root `WORKFLOW.md`
and `templates/PROJECT.md`. Repository sources and approved decisions outrank this skill.

## Classify

- **Bug:** state the claim in one sentence and reproduce it on current code before
  tracing a cause. Trace from the visible symptom to the root cause; do not patch the
  first plausible site.
- **Feature:** restate the requirement in one sentence, list observable acceptance
  criteria and map the affected surface. Flag a surface larger than the ticket implies.
- **Refactor:** state the invariant that must not change and the tests that cover it.
  Bound the files in scope.

## Triangulate sources

Build one row per requirement or apparent ambiguity:

| Question | Product | Design | Frontend | API contract | Backend | Conclusion |
|---|---|---|---|---|---|---|

- **Product:** approved PRD files, recorded decisions and ticket acceptance criteria.
- **Design:** the authoritative nodes or prototype for every state in question. Labels,
  grouping, counts and omitted states are evidence; an unrepresented state is not an answer.
- **Frontend:** current behavior, call sites and shared conventions that already decide
  a fallback or ownership.
- **API contract:** OpenAPI documents, stream contracts, ABIs, indexer schemas and
  generated clients. They prove wire shape, not semantics.
- **Backend:** handlers, services, queries, filters and lifecycle transitions, read to
  establish semantics or name a contract gap, never to encode undocumented behavior.

Read the source artifacts themselves, not summaries or earlier handoffs. Resolve
everything the sources answer. When design defines data the backend cannot serve,
report a concrete contract gap rather than a product ambiguity. Never invent product
behavior, copy, defaults, limits or placement: record each unanswered question in the
initiative or ticket open questions register with its owner, what it blocks and two
or three concrete options.

## Decide

- **Proceed:** the task is real, reproduced when it is a bug, and scoped. Give a
  one-paragraph strategy with the decisive evidence.
- **Block:** list what the sources answered, then the exact conflict or omission and the
  narrowest question that remains. Do not start coding.
- **Reduce scope:** propose a smaller first slice that can proceed now and list the
  deferred items.

Block a bug when it does not reproduce after two honest attempts, needs data or
credentials you lack, would only mask the symptom, or current code already looks
correct. Money, signing and authentication paths need an explicit reproduction and
root-cause trace before any change; an unknown amount, address, fee or decimals
source blocks. File adjacent issues separately instead of bundling them.

Record the evidence table and outcome in the initiative note or master ticket.
