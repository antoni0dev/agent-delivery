---
name: engineering-knowledge
description: Select engineering reference cards, anti-patterns and examples for planning, implementation or review when architecture, state, effects, boundaries, mutations, cache or live-data behavior needs guidance.
---

Read [project conventions](../../../.agent-harness/PROJECT.md), then select relevant topics or card IDs from [the topic index](../../../.agent-harness/knowledge/topics.json). Read the full selected content in [cards.json](../../../.agent-harness/knowledge/cards.json); the readable [guide](../../../.agent-harness/knowledge/guide.md) contains the same guidance. Links target the installed layout; the source package keeps these under root `knowledge/`.

Domain packs add cards for specific domains; read [the pack guide](../../../.agent-harness/knowledge/packs/guide.md), or run `node .agent-harness/scripts/select.mjs --index` to list core and pack cards and `--topic`, `--pack` or `--card` to print full content. Record each pack card's status: a candidate pack is a usable decision aid that the historical audit does not cover.

For delivery work, use the shared [workflow](../../../.agent-harness/WORKFLOW.md); selecting a card alone does not start an initiative.

Record selected IDs, applicability and any resolved exceptions in the task packet. Give that content to implementers and independent reviewers. Consider alternatives and counterexamples; do not impose patterns that add needless complexity or conflict with approved repository behavior. Reading guidance is not evidence that the implementation satisfies it.

Read [current knowledge-use notes](../../../.agent-harness/docs/knowledge.md). Archived evaluation instructions do not require controller receipts or model-proof gates.
