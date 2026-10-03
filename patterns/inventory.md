# Pattern extraction inventory

This inventory maps the reusable source surfaces into the portable cookbook. It records deliberate renames and exclusions so future extraction work extends the library instead of copying overlapping helpers.

## Exhaustive branching and type boundaries

| Observed surface | Cookbook destination | Disposition |
| --- | --- | --- |
| `match` | `exhaustive-branching` | Retain the curried exhaustive handler API. |
| `Match` | `exhaustive-branching` | Retain as JSX rendering over an exhaustive handler record. |
| `PartialMatch` | `exhaustive-branching` | Keep only for intentionally optional branches with an explicit fallback contract. |
| `matchDiscriminatedUnion` | `exhaustive-branching` | Retain the narrowed-handler contract and isolate generic dispatch machinery in one tested utility. |
| `matchRecordUnion`, `MatchRecordUnion` | `exhaustive-branching` | Retain the record-union concept, but do not copy implementations that use `any` or feature-level assertions. |
| `shouldBePresent`, `shouldBeDefined` | `boundary-result-utilities` | Consolidate as contextual `ensurePresent`. |
| `attempt`, `withFallback` | `boundary-result-utilities` | Retain only at real recovery, alternative, or user-facing failure boundaries. |
| `pipe` | `functional-pipelines` | Retain for typed pure stages, not effects or short native chains. |

## Providers and state

| Observed surface | Cookbook destination | Disposition |
| --- | --- | --- |
| `createProvidedContext`, `createContextHook` | `provider-factories` | Merge into one strict context factory. |
| `setupValueProvider` | `provider-factories` | Retain as a strict read-only dependency provider. |
| `setupStateProvider` | `provider-factories` | Retain for narrow subtree state with an explicit initial value and reset boundary. |
| `setupOptionalValueProvider` | `provider-factories` | Keep as a separate optional API, never as a weakened strict provider. |
| `createPersistentStateHook` | `validated-persistent-state` | Retain through an injected adapter, codec, server snapshot and external-store subscription. |
| `PersistentStorage`, local and temporary adapters | `validated-persistent-state` | Generalize into one adapter contract. Platform serialization and events remain adapter-owned. |

## Query state and orchestration

| Observed surface | Cookbook destination | Disposition |
| --- | --- | --- |
| `Query`, `EagerQuery`, `pendingQuery`, `inactiveQuery`, `getResolvedQuery` | `explicit-query-state`, `query-composition-invalidation` | Retain explicit states. Separate ordinary and eager error contracts. |
| `MatchQuery` | `explicit-query-state` | Retain data-first rendering with required branch functions in the reference surface. |
| `ActiveQueryOnly` | `explicit-query-state` | Do not promote. It can hide why content is absent; use `MatchQuery` or an explicit precondition. |
| `isInactiveQuery` | `explicit-query-state` | Keep as a derivable predicate only when non-rendering orchestration needs it. |
| `useTransformQueryData` | `query-transforms` | Rename pure synchronous work to `transformQueryData`; the `use` prefix is reserved for actual hooks. |
| `useTransformQueryDataAsync` | `query-transforms` | Retain as a cached async transform with complete identity and source-state propagation. |
| `usePotentialQuery` | `conditional-dependent-queries` | Express as an optional-input query contract. Prefer direct `enabled` queries before a wrapper. |
| `useStateDependentQuery` | `conditional-dependent-queries` | Express as a complete-state gate. Validation and key identity must use the same fields. |
| `useQueryDependentQuery` | `conditional-dependent-queries` | Retain dependency pending and error propagation before child execution. |
| `useCombineQueries`, `useMergeQueries` | `query-composition-invalidation` | Split into named strict and eager APIs rather than a boolean mode. |
| `useRefetchQueries`, `useRefetchQueriesMutation` | `query-composition-invalidation` | Prefer owner-defined key factories and confirmed mutation settlement. Keep wrappers only when they add policy. |
| `useRefetchQueriesByCategory`, query metadata categories | `query-composition-invalidation` | Retain only when category metadata is a stable query-layer contract. |
| no-refetch, persisted, price and polling option bundles | `query-transforms`, `query-composition-invalidation` | Preserve the policy idea, not application-specific durations or categories. Every query states freshness and refetch policy. |

## Components, forms and navigation

| Observed surface | Cookbook destination | Disposition |
| --- | --- | --- |
| `ValueTransfer` | `render-prop-flow-primitives` | Retain with discriminated internal state so `undefined` remains a valid payload. |
| `StepTransition` | `render-prop-flow-primitives` | Retain for repeated two-step behavior; use local state for one-off flows. |
| `Opener` | `render-prop-flow-primitives` | Retain behavior-only render props. Focus and feature UI stay caller-owned. |
| `Wrap` | `render-prop-flow-primitives` | Retain as the smallest conditional wrapper. |
| `getFormProps` | `form-submission-contract` | Retain event containment, but pair guards with visible readiness and feedback. |
| `useViewState`, `useNavigate`, `useNavigateBack` | `typed-view-navigation` | Retain behind a typed destination map and navigation owner operations. |
| `useStepNavigation` | `typed-view-navigation` | Keep for local ordered steps with explicit first, next, previous and exit behavior. |
| lazy view registry and idle prefetch | `typed-view-navigation` | Retain shared load identity, bounded idle work, error surfacing and later retry. |
| `useBoolean` | `focused-ui-hooks` | Retain only when named transitions repeat. Avoid default memoization. |
| `useDebounce` | `focused-ui-hooks` | Retain as `useDebouncedValue` with timer cleanup and explicit delay units. |
| DOM event, size, key and scroll hooks | `focused-ui-hooks` | Capture the subscription contract rather than copying environment-specific hooks wholesale. |

## Supporting data utilities

| Observed surface | Cookbook destination | Disposition |
| --- | --- | --- |
| `isOneOf` and runtime const arrays | `exhaustive-branching`, `resolver-registry` | Retain for narrowing unknown or wider variants into a supported subset. |
| record mapping, typed keys, typed entries and record construction | `exhaustive-branching`, `resolver-registry` | Keep in one tested utility module when the repository repeatedly needs typed record traversal. |
| record-union key and value accessors | `exhaustive-branching` | Keep with the record-union matcher rather than exposing casts to feature code. |
| removal of undefined fields and complete-state checks | `conditional-dependent-queries` | Prefer schema parsing for external values and a typed completeness guard for local prerequisites. |
| last-item and immutable index update helpers | `typed-view-navigation` | Keep private to navigation unless other real consumers establish a neutral owner. |
| event default and propagation wrappers | `form-submission-contract` | Inline at one call site; extract only when the repository repeats the exact event contract. |
| custom query-key serialization | `query-composition-invalidation` | Prefer the query library default. Adopt a proven serializer only for demonstrated unsupported key values. |

## Architecture patterns

| Observed surface | Cookbook destination | Disposition |
| --- | --- | --- |
| Variant resolver maps | `resolver-registry` | Retain exhaustive `Record` registries for stable shared operations across three or more variants. |
| Component autonomy and feature folders | Existing knowledge cards plus cookbook selection | Keep as ownership guidance, not a code helper. |
| Module boundaries and public entrypoints | Existing knowledge cards plus `resolver-registry` | Keep as repository contracts. Do not copy source package names or paths. |

## Deliberate exclusions

- Application-specific chain, signing, account, product, storage-key, query-category, timing and design-system values.
- Generic one-line array, record, event and DOM helpers that do not encode an architectural contract.
- Implementations that require `any`, broad assertions, hidden fallback behavior, silent query-state loss, or unconditional memoization.
- Source package names, project paths, organizations, personal identifiers, tickets, URLs, credentials and internal business terms.

The inventory covers reusable pattern families, not every exported function. A future candidate belongs here only when it carries a stable ownership, state, failure, type, cache, or lifecycle contract that agents can apply across repositories.
