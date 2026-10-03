# Conditional and dependent queries

Use explicit preconditions when a query needs an optional input, a complete local state record, or the successful output of another query. The execution gate and cache key must be derived from the same values.

Related cards: `queries-explicit-async-states`, `cache-identity-and-invalidation`.

## Prefer direct enabled queries

```ts
const accountId = session.data?.accountId

const projectsQuery = useQuery({
  queryKey: ['projects', accountId],
  enabled: accountId !== undefined,
  queryFn: () => {
    if (accountId === undefined) {
      throw new Error('Expected accountId for enabled projects query')
    }

    return api.getProjects({ accountId })
  },
})

const projects =
  accountId === undefined ? inactiveQuery : projectsQuery
```

The raw disabled query is not the public result. In TanStack Query, a disabled
uncached query is pending with an idle fetch status. Normalize it to
`inactiveQuery` before passing it to `MatchQuery`, otherwise a missing
prerequisite renders as loading.

Use a wrapper only when the same contract repeats across the repository.

## Three recurring contracts

| Contract | Gate | Inactive result |
| --- | --- | --- |
| Optional input | one value is defined | `inactiveQuery` or approved fallback data |
| State-dependent | every required field is defined and valid | `inactiveQuery` |
| Query-dependent | dependency has data, no error, and is not pending | propagate dependency pending/error, otherwise inactive |

For a query-dependent read:

```ts
const profile = useProfileQuery()

const canLoadPermissions =
  profile.data !== undefined &&
  profile.error === null &&
  !profile.isPending

const permissionsQuery = useQuery({
  queryKey: ['permissions', profile.data?.id],
  enabled: canLoadPermissions,
  queryFn: () => {
    if (profile.data === undefined) {
      throw new Error('Expected profile for enabled permissions query')
    }

    return api.getPermissions({ profileId: profile.data.id })
  },
})

const permissions = resolveDependentQuery({
  dependency: profile,
  enabled: canLoadPermissions,
  query: permissionsQuery,
})
```

```ts
type ResolveDependentQueryInput<Dependency, Value, DependencyFailure, Failure> = {
  dependency: Query<Dependency, DependencyFailure>
  enabled: boolean
  query: Query<Value, Failure>
}

export function resolveDependentQuery<
  Dependency,
  Value,
  DependencyFailure,
  Failure,
>({
  dependency,
  enabled,
  query,
}: ResolveDependentQueryInput<
  Dependency,
  Value,
  DependencyFailure,
  Failure
>): Query<Value, DependencyFailure | Failure> {
  if (dependency.isPending) {
    return { data: undefined, error: null, isPending: true }
  }

  if (dependency.error !== null) {
    return { data: undefined, error: dependency.error, isPending: false }
  }

  if (!enabled) return inactiveQuery

  return query
}
```

When exposing one composed result, propagate the dependency state before the child state:

1. Dependency pending.
2. Dependency error.
3. Missing successful prerequisite, represented as inactive.
4. Dependent query result.

## Avoid

- Dummy cache keys that collide across identities.
- Calling ordinary hooks conditionally.
- Treating disabled as pending.
- Passing a raw disabled query to `MatchQuery` without normalizing it to inactive.
- Using an empty result to conceal missing prerequisites.
- Reading prerequisite values with an assertion before the gate proves them.

## Adoption checks

- Every request input appears in the key or is proved irrelevant to identity.
- Switching account or scope cannot show a previous scope's data.
- Dependency errors prevent the child request and remain visible.
- Tests cover every missing prerequisite individually, dependency error, child error, and success.
