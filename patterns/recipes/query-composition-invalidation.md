# Query composition and owned invalidation

Combine query results only when the aggregate has a clear strict or eager contract. Invalidate by the server fact that changed, not by whichever component happens to request a refresh.

Related cards: `cache-identity-and-invalidation`, `mutations-confirmed-reconciliation`.

## Strict and eager composition

Strict composition resolves only when every input has data. It exposes the first failure through the ordinary `Query` contract.

Eager composition produces a partial projection from all currently resolved values. It must expose every input failure because partial data and failures can coexist.

```ts
export type EagerQuery<
  Value,
  Failure = unknown,
  Source extends PropertyKey = string,
> = {
  data: Value | undefined
  errors: Array<
    | { stage: 'query'; source: Source; error: Failure }
    | { stage: 'join'; error: Error }
  >
  isPending: boolean
}
```

Use named wrappers for the two modes instead of a boolean parameter:

```ts
type MinimalQuery<Value, Failure> = {
  data: Value | undefined
  error: Failure | null
  isPending: boolean
  isFetching?: boolean
}

type CombineQueriesInput<Value, Output, Failure> = {
  queries: readonly MinimalQuery<Value, Failure>[]
  join: (values: readonly Value[]) => Output
}

export function combineQueriesStrict<Value, Output, Failure>({
  queries,
  join,
}: CombineQueriesInput<Value, Output, Failure>): Query<
  Output,
  Failure | Error
> {
  const isPending = queries.some(query => query.isPending)
  const isFetching = queries.some(query => query.isFetching)
  const error = queries.find(query => query.error !== null)?.error ?? null
  const values: Value[] = []

  for (const query of queries) {
    if (query.data === undefined) {
      return { data: undefined, error, isPending, isFetching }
    }

    values.push(query.data)
  }

  const result = attempt(() => join(values))
  return result.ok
    ? { data: result.value, error, isPending, isFetching }
    : { data: undefined, error: result.error, isPending, isFetching }
}

type EagerQueryInput<Source extends PropertyKey, Value, Output, Failure> = {
  queries: ReadonlyArray<{
    source: Source
    query: MinimalQuery<Value, Failure>
  }>
  join: (values: ReadonlyArray<{ source: Source; data: Value }>) => Output
}

export function combineQueriesEager<
  Source extends PropertyKey,
  Value,
  Output,
  Failure,
>({
  queries,
  join,
}: EagerQueryInput<Source, Value, Output, Failure>): EagerQuery<
  Output,
  Failure | Error,
  Source
> {
  const values: Array<{ source: Source; data: Value }> = []
  const errors: Array<
    | { stage: 'query'; source: Source; error: Failure }
    | { stage: 'join'; error: Error }
  > = []

  for (const { source, query } of queries) {
    if (query.data !== undefined) values.push({ source, data: query.data })
    if (query.error !== null) {
      errors.push({ stage: 'query', source, error: query.error })
    }
  }

  if (values.length === 0) {
    return {
      data: undefined,
      errors,
      isPending: queries.some(({ query }) => query.isPending),
    }
  }

  const result = attempt(() => join(values))
  if (!result.ok) {
    errors.push({ stage: 'join', error: result.error })
  }

  return {
    data: result.ok ? result.value : undefined,
    errors,
    isPending: queries.some(({ query }) => query.isPending),
  }
}

const overview = combineQueriesStrict({
  queries: projectQueries,
  join: projects => projects.flat(),
})

const visiblePrices = combineQueriesEager({
  queries: [
    { source: 'current', query: currentPrice },
    { source: 'benchmark', query: benchmarkPrice },
  ],
  join: prices => prices,
})
```

Use a record-based overload only when heterogeneous named inputs repeat often
enough to justify its internal type machinery. Keep any required generic cast
inside the tested shared utility; feature callers should not assert that
missing data exists.

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
