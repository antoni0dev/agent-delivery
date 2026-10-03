# Engineering pattern cookbook

This cookbook turns the decision guidance in `knowledge/` into concrete TypeScript and React implementation recipes. The knowledge cards decide whether a pattern fits. A recipe shows the smallest reusable surface, the contract it must preserve, and the checks that prove an adoption.

See [the extraction inventory](inventory.md) for the complete mapping of reusable hooks, utilities and components, including deliberate renames and exclusions.

The examples are reference implementations, not a package to import. Copy only the selected family into the destination repository and adapt names, imports, error types, query versions, and test tools to that repository. Repository conventions and approved product behavior take precedence.

## Select a recipe

```sh
node scripts/select.mjs --list-patterns
node scripts/select.mjs --pattern-topic query
node scripts/select.mjs --pattern explicit-query-state
```

After installation, run the same commands against `.agent-harness/scripts/select.mjs`.

Each recipe contains:

- Fit and non-fit criteria.
- A recommended public surface.
- Copy-ready illustrative code.
- Adoption steps and verification cases.
- Related audited decision cards.

## Families

| Family | Main surface |
| --- | --- |
| Exhaustive branching | `match`, `<Match>`, discriminated-union dispatch |
| Boundary results | `ensurePresent`, `attempt`, `Result` |
| Provider factories | strict value, state, and optional contexts |
| Explicit query state | `Query`, `MatchQuery`, inactive query state |
| Query transforms | `transformQueryData`, cached async transforms |
| Conditional queries | optional, state-dependent, and query-dependent reads |
| Query composition | strict and eager combination, owned invalidation |
| Persistent state | validated storage through `useSyncExternalStore` |
| Resolver registry | exhaustive operations across stable variants |
| Functional pipelines | typed pure transformation stages |
| Flow primitives | `ValueTransfer`, `StepTransition`, `Opener`, `Wrap` |
| View navigation | typed in-memory stack for contained flows |
| Form submission | explicit readiness and single submission boundary |
| Focused hooks | boolean state, debounce, event, and external subscriptions |

## Adoption rule

Start from the related card, state why the pattern applies, then copy the recipe. Do not install the whole cookbook into application source. Patterns carry maintenance cost and should enter a codebase only when their named pressure exists.
