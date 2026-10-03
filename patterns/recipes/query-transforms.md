# Synchronous and asynchronous query transforms

Transform query data without erasing its pending, failure, inactive, or placeholder semantics. A synchronous pure transform does not need React state. An asynchronous or externally observed transform needs its own cache identity.

Related cards: `queries-explicit-async-states`, `cache-identity-and-invalidation`, `functional-composition-pipelines`.

## Synchronous transform

Prefer a pure function. Older code may call this `useTransformQueryData`, but a function that calls no hooks should not use the `use` prefix.

```ts
export function transformQueryData<Input, Output, Failure>(
  query: Query<Input, Failure>,
  transform: (input: Input) => Output
): Query<Output, Failure | Error> {
  if (query.data === undefined) {
    return { ...query, data: undefined }
  }

  const input = query.data
  const result = attempt(() => transform(input))

  return result.ok
    ? { ...query, data: result.value }
    : { ...query, data: undefined, error: result.error }
}
```

If transform failures are programming errors, do not catch them. Let the error boundary own them. Catch only when the returned query intentionally exposes the failure to the query UI.

## Cached asynchronous transform

```ts
import { useQuery } from '@tanstack/react-query'

type UseAsyncTransformInput<Input, Output, Failure> = {
  source: Query<Input, Failure>
  /** Includes source query identity and a stable source-data revision. */
  identity: readonly unknown[]
  transform: (input: Input) => Promise<Output>
}

export function useAsyncQueryTransform<Input, Output, Failure>({
  source,
  identity,
  transform,
}: UseAsyncTransformInput<Input, Output, Failure>): Query<
  Output,
  Failure | Error
> {
  const input = source.data
  const transformed = useQuery({
    queryKey: ['query-transform', ...identity],
    enabled: input !== undefined && source.error === null,
    queryFn: () => {
      if (input === undefined) {
        throw new Error('Expected source data for enabled query transform')
      }

      return transform(input)
    },
  })

  if (input === undefined) {
    return {
      data: undefined,
      error: source.error,
      isPending: source.isPending,
      isFetching: source.isFetching,
      isPlaceholderData: source.isPlaceholderData,
    }
  }

  return {
    data: transformed.data,
    error: source.error ?? transformed.error,
    isPending: source.isPending || transformed.isPending,
    isFetching: source.isFetching || transformed.isFetching,
    isPlaceholderData:
      source.isPlaceholderData || transformed.isPlaceholderData,
  }
}
```

## Identity contract

- Include every input that can change the output, including the source query key and source-data revision, locale, feature version, account scope, or external pricing context.
- Do not include unstable function identities or timestamps merely to force recomputation.
- If the transform reads live remote state, prefer a real query with an authoritative key over disguising it as a local projection.

## Adoption checks

- Missing source data preserves inactive or pending state.
- Source errors win over transform execution.
- Transform failures are visible only when the UI has a recovery branch.
- Equivalent identities share results; changed identities recompute.
- Tests cover missing data, source failure, transform failure, cache reuse, and identity change.
