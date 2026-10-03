# Exhaustive branching

Use this family when a closed union selects values, behavior, or JSX. It replaces repeated conditionals with a type-checked handler table. Keep a direct `if` for one boolean choice and use a state machine when transition rules matter.

Related cards: `types-boundary-validation`, `ui-branching-explicitness`.

## Public surface

- `match(value)(handlers)` for value-to-behavior dispatch.
- `<Match value={value} handlers={...} />` for JSX dispatch.
- A discriminated-union matcher when every handler needs the narrowed payload.
- `PartialMatch` only when omission is an intentional contract, never to hide a missing case.

## Reference implementation

```ts
export const match = <Key extends PropertyKey>(value: Key) =>
  <Result>(handlers: Record<Key, () => Result>): Result => handlers[value]()
```

```tsx
import type { ReactNode } from 'react'

type MatchProps<Key extends PropertyKey> = {
  value: Key
  handlers: Record<Key, () => ReactNode>
}

export function Match<Key extends PropertyKey>({
  value,
  handlers,
}: MatchProps<Key>) {
  return <>{handlers[value]()}</>
}
```

```ts
const statuses = ['idle', 'pending', 'success', 'error'] as const
type Status = (typeof statuses)[number]

const toneByStatus = {
  idle: 'neutral',
  pending: 'info',
  success: 'positive',
  error: 'negative',
} satisfies Record<Status, string>

const label = match(status)({
  idle: () => 'Ready',
  pending: () => 'Saving',
  success: () => 'Saved',
  error: () => 'Try again',
})
```

For payload unions, define handlers from the union instead of widening the key to `string`:

```ts
type Event =
  | { kind: 'created'; id: string }
  | { kind: 'failed'; error: Error }

type EventHandlers<Result> = {
  [Kind in Event['kind']]: (
    event: Extract<Event, { kind: Kind }>
  ) => Result
}
```

Keep the one generic dispatch cast, if TypeScript requires one, inside a tested shared utility. Feature code should not repeat assertions. Unknown external discriminants must be parsed into the domain union before dispatch.

## Adoption checks

- Adding a union member fails compilation at every exhaustive table.
- No default handler swallows an unknown external value.
- A simple value mapping uses `Record`, not a behavior matcher.
- A two-way boolean branch stays direct unless a reusable behavior contract exists.
- Tests cover every meaningful variant and one invalid boundary value.
