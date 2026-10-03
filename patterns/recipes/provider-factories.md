# Strict provider factories

Use a narrow provider for mutable state shared by one subtree or for an injected read-only dependency. Required hooks fail immediately outside their provider. Optional context is a separate API so consumers cannot accidentally treat absence as valid.

Related cards: `state-single-owner`, `state-location-and-provider-contracts`.

## Strict value context

```tsx
import {
  createContext,
  type PropsWithChildren,
  useContext,
} from 'react'

export function createStrictContext<Value>(name: string) {
  const Context = createContext<Value | undefined>(undefined)

  function Provider({
    children,
    value,
  }: PropsWithChildren<{ value: Value }>) {
    return <Context.Provider value={value}>{children}</Context.Provider>
  }

  function useValue(): Value {
    const value = useContext(Context)

    if (value === undefined) {
      throw new Error(`Expected ${name} provider, found none`)
    }

    return value
  }

  return { Context, Provider, useValue }
}
```

## Stateful context

```tsx
import {
  type Dispatch,
  type PropsWithChildren,
  type SetStateAction,
  useState,
} from 'react'

export function createStateContext<Value>(name: string) {
  const state = createStrictContext<
    readonly [Value, Dispatch<SetStateAction<Value>>]
  >(name)

  function Provider({
    children,
    initialValue,
  }: PropsWithChildren<{ initialValue: Value }>) {
    const value = useState<Value>(() => initialValue)
    return <state.Provider value={value}>{children}</state.Provider>
  }

  return { Context: state.Context, Provider, useStateValue: state.useValue }
}
```

If the provider has a default, make it part of the factory contract. Do not use `undefined` both as a legitimate state value and as the missing-provider sentinel. Prefer a unique sentinel in that case.

## Provider placement

1. Name the authoritative owner and reset event.
2. Place fast-changing state at the smallest shared subtree.
3. Mount dependency providers before consumers.
4. Keep remote data in the query owner. A provider can distribute a client or stable configuration, but should not create a second server cache.
5. Use a separate `useOptionalValue` only when absence is truly supported by the caller.

## Adoption checks

- Required hooks throw a contextual error outside the provider.
- Provider order is visible at the composition root.
- Account, route, or flow resets replace state at the intended boundary.
- No broad provider exists only to avoid one or two clear props on a generic component.
- Tests cover missing provider, initialization, update, and reset behavior.
