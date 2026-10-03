# Explicit query state and MatchQuery

Keep pending, failure, inactive, empty success, populated success, and background refresh distinct. `MatchQuery` centralizes rendering order without changing cache or execution behavior.

Related cards: `queries-explicit-async-states`, `ui-branching-explicitness`.

## Minimal query contract

```ts
export type Query<Value, Failure = unknown> = {
  data: Value | undefined
  error: Failure | null
  isPending: boolean
  isFetching?: boolean
  isPlaceholderData?: boolean
}

export const inactiveQuery = {
  data: undefined,
  error: null,
  isPending: false,
} satisfies Query<never>

export const resolvedQuery = <Value>(value: Value): Query<Value> => ({
  data: value,
  error: null,
  isPending: false,
})
```

## MatchQuery

```tsx
import type { ReactNode } from 'react'

type MatchQueryProps<Value, Failure> = {
  query: Query<Value, Failure>
  pending: () => ReactNode
  error: (error: Failure) => ReactNode
  inactive: () => ReactNode
  success: (data: Value) => ReactNode
}

export function MatchQuery<Value, Failure>({
  query,
  pending,
  error,
  inactive,
  success,
}: MatchQueryProps<Value, Failure>) {
  if (query.data !== undefined) return <>{success(query.data)}</>
  if (query.error !== null) return <>{error(query.error)}</>
  if (query.isPending) return <>{pending()}</>
  return <>{inactive()}</>
}
```

Data-first ordering preserves usable stale data during a background refetch or non-blocking refresh failure. If the product must replace stale data with an error, encode that policy explicitly instead of silently changing the matcher order.

```tsx
<MatchQuery
  query={itemsQuery}
  pending={() => <ItemsSkeleton />}
  error={error => <ItemsError error={error} />}
  inactive={() => <ChooseAccount />}
  success={items =>
    items.length === 0 ? <EmptyItems /> : <ItemsList items={items} />
  }
/>
```

## Adoption checks

- The query precondition and cache key use the same identity inputs.
- Empty success is decided inside `success`, not by defaulting missing data to `[]`.
- Background refresh behavior is deliberate.
- Success branches that become complex move to typed child components.
- Tests cover inactive, first load, error, empty success, populated success, and retained-data refresh.
