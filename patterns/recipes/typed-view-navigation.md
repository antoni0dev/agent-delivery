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
- `setCurrentState(updater)` updates only the top entry's state.

Do not expose the raw history setter to feature components. The owner enforces root preservation and transition semantics.

## Lazy views

A lazy registry may share one load promise between explicit prefetch and rendering. Failed loads must surface to an error boundary and retry only at a named later event, such as the next navigation. Do not create an immediate rejection loop.

Prefetch after the first useful paint, one module at a time during idle periods, and cancel pending work on unmount. Priority order and failure policy belong to the registry owner.

## Adoption checks

- Every destination and payload is a compile-time valid pair.
- Unknown persisted or external destinations are rejected before entering history.
- Back never pops below root; reset and replace have distinct tests.
- Direct entry, refresh, sharing, and browser history requirements were checked before choosing in-memory navigation.
- Lazy-load failure, later retry, prefetch reuse, and error-boundary behavior are tested.
