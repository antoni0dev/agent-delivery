# Focused UI hooks

Extract a hook around a named capability, not merely to shorten a component. A hook shares logic, not state. Two callers share state only when both subscribe to the same external owner.

Related cards: `custom-hooks-intent-boundaries`, `effects-external-sync`, `react-render-purity-and-identity`.

## Boolean transitions

```ts
import { useState } from 'react'

export function useBoolean(initialValue = false) {
  const [value, setValue] = useState(initialValue)

  return {
    value,
    set: () => setValue(true),
    unset: () => setValue(false),
    toggle: () => setValue(current => !current),
    update: setValue,
  }
}
```

Use direct local state if a component needs only `value` and `setValue`. The hook earns its place when the named transitions repeat.

## Debounced value

```ts
import { useEffect, useState } from 'react'

export function useDebouncedValue<Value>(value: Value, delayMs: number) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timeout)
  }, [delayMs, value])

  return debounced
}
```

Debounce a derived value for search or preview work. Do not debounce controlled input display, safety checks, or a mutation unless product behavior explicitly requires it.

## External synchronization

For keyboard, resize, media-query, scroll, or storage hooks:

1. Make the external target explicit.
2. Subscribe in one effect or `useSyncExternalStore` contract.
3. Remove exactly the registered listener.
4. Define server-render behavior.
5. Avoid reading mutable external state during render without a subscription.

Do not add `useMemo` or `useCallback` by default. Keep stable identities only when an effect dependency, external subscription, or third-party API requires them and record that reason in the implementation.

## Adoption checks

- Hooks run unconditionally at stable top-level positions.
- Separate callers have the intended independent or shared state.
- Timers and listeners clean up on dependency change and unmount.
- Rapid input, zero delay, target replacement, and server rendering are tested where applicable.
- The public return shape communicates intent instead of exposing unrelated setter details.
