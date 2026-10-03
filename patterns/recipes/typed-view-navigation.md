# Typed in-memory view navigation

Use an in-memory view stack for a contained desktop pane, extension popup, modal flow, or wizard that intentionally does not need refreshable, bookmarkable URLs. Use the router for durable or shareable destinations.

Related cards: `navigation-state-contracts`, `state-single-owner`.

## Typed registry

```ts
type ViewStateMap = {
  home: undefined
  details: { itemId: string }
  edit: { itemId: string; draftId: string }
}

type ViewEntry<Map extends object> = {
  [Id in keyof Map]: Map[Id] extends undefined
    ? { id: Id }
    : { id: Id; state: Map[Id] }
}[keyof Map]

type NavigationState = {
  history: ViewEntry<ViewStateMap>[]
}

type NavigationAction<Map extends object> =
  | { type: 'push'; entry: ViewEntry<Map> }
  | { type: 'replace'; entry: ViewEntry<Map> }
  | { type: 'reset'; entry: ViewEntry<Map> }
  | { type: 'back'; steps: number }

const unreachable = (value: never): never => {
  throw new Error(`Unexpected navigation action: ${String(value)}`)
}

export function reduceNavigation<Map extends object>(
  state: { history: ViewEntry<Map>[] },
  action: NavigationAction<Map>
): { history: ViewEntry<Map>[] } {
  if (state.history.length === 0) {
    throw new Error('Expected navigation history to contain a root entry')
  }

  if (action.type === 'push') {
    return { history: [...state.history, action.entry] }
  }

  if (action.type === 'replace') {
    return { history: [...state.history.slice(0, -1), action.entry] }
  }

  if (action.type === 'reset') {
    return { history: [action.entry] }
  }

  if (action.type === 'back') {
    if (!Number.isFinite(action.steps)) {
      throw new Error('Expected a finite navigation step count')
    }

    const count = Math.max(0, Math.floor(action.steps))
    const keep = Math.max(1, state.history.length - count)
    return { history: state.history.slice(0, keep) }
  }

  return unreachable(action)
}
```

```tsx
import type { ComponentType } from 'react'

const views = {
  home: HomeView,
  details: DetailsView,
  edit: EditView,
} satisfies Record<keyof ViewStateMap, ComponentType>
```

The navigation owner exposes explicit operations:

- `push(entry)` appends a destination.
- `replace(entry)` replaces only the top entry.
- `reset(entry)` replaces the whole history.
- `back(steps)` never removes the root entry.

Do not expose the raw history setter to feature components. The owner enforces root preservation and transition semantics.

## Lazy views

A lazy registry may share one load promise between explicit prefetch and rendering. Failed loads must surface to an error boundary and retry only at a named later event, such as the next navigation. Do not create an immediate rejection loop.

Prefetch after the first useful paint, one module at a time during idle periods, and cancel pending work on unmount. Priority order and failure policy belong to the registry owner.

## Adoption checks

- Every destination and payload is a compile-time valid pair.
- Unknown persisted or external destinations are rejected before entering history.
- Push, replace, reset and back have distinct tests. Back rejects non-finite counts and never pops below root.
- Direct entry, refresh, sharing, and browser history requirements were checked before choosing in-memory navigation.
- Lazy-load failure, later retry, prefetch reuse, and error-boundary behavior are tested.
