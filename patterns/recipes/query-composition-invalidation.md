# Query composition and owned invalidation

Combine query results only when the aggregate has a clear strict or eager contract. Invalidate by the server fact that changed, not by whichever component happens to request a refresh.

Related cards: `cache-identity-and-invalidation`, `mutations-confirmed-reconciliation`.

## Strict and eager composition

Strict composition resolves only when every input has data. It exposes the first failure through the ordinary `Query` contract.

Eager composition produces a partial projection from all currently resolved values. It must expose every input failure because partial data and failures can coexist.

```ts
export type EagerQuery<Value, Failure = unknown> = {
  data: Value | undefined
  errors: Failure[]
  isPending: boolean
}
```

Use named wrappers for the two modes instead of a boolean parameter:

```ts
const overview = combineQueriesStrict({
  queries: { profile, permissions },
  join: ({ profile, permissions }) => ({ profile, permissions }),
})

const visiblePrices = combineQueriesEager({
  queries: priceQueries,
  join: prices => prices,
})
```

The shared implementation may use internal type machinery, but feature callers should receive exact inferred data types and should not assert that missing data exists.

## Invalidation ownership

Use key factories for fact-level ownership:

```ts
export const projectKeys = {
  all: ['projects'] as const,
  list: (accountId: string) => ['projects', accountId] as const,
  detail: (accountId: string, projectId: string) =>
    ['projects', accountId, projectId] as const,
}
```

After a confirmed mutation, update from the returned server record or invalidate the exact lists and details whose authoritative facts changed. A category or predicate invalidation is appropriate only when the category is a stable metadata contract owned by the query layer.

## Adoption checks

- Strict and eager semantics are visible at the call site.
- A transform failure joins the same error channel as query failures.
- Empty input behavior is specified and tested.
- Keys contain account, filters, pagination, locale, and version where each shapes the response.
- Mutation settlement covers every affected cache view without invalidating unrelated data.
- Tests cover partial success, all pending, one failure, transform failure, empty inputs, and settlement.
