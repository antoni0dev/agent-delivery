---
name: engineering-patterns
description: Select and apply concrete TypeScript and React recipes for exhaustive matching, async query state, query transforms, provider factories, persistent state, resolver registries, typed navigation, render-prop flows, forms, or focused hooks.
---

Read [project conventions](../../../.agent-harness/PROJECT.md), then inspect [the pattern catalog](../../../.agent-harness/patterns/catalog.json). Read only the recipes matching the task from `../../../.agent-harness/patterns/recipes/`, plus every related decision card from [cards.json](../../../.agent-harness/knowledge/cards.json).

Use [the shared workflow](../../../.agent-harness/WORKFLOW.md) for delivery work. The optional selector can list or print recipes:

```sh
node .agent-harness/scripts/select.mjs --list-patterns
node .agent-harness/scripts/select.mjs --pattern-topic query
node .agent-harness/scripts/select.mjs --pattern explicit-query-state
```

Before editing, record the source of truth, owner, failure behavior, cache or invalidation contract, and executable verification. Copy only the smallest recipe family that solves the demonstrated pressure. Adapt its illustrative code to the destination's framework versions and public module boundaries. Do not introduce every helper, treat examples as a dependency, invent product behavior, or override repository conventions.

Before handoff, verify the recipe's adoption checks, remove pass-through abstractions and unused copied helpers, and report any unverified behavior.
