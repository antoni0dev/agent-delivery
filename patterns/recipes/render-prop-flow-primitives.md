# Render-prop flow primitives

Use render-prop components when behavior repeats but callers must own the UI. These primitives manage only transition state. Feature visuals, validation, mutations, focus policy, and copy remain with the caller.

Related cards: `components-composition-contracts`, `components-cohesive-ownership`.

## ValueTransfer

Use a discriminated state so `undefined` can be a legitimate transferred value.

```tsx
import { type ReactNode, useState } from 'react'

type TransferState<Value> =
  | { step: 'from' }
  | { step: 'to'; value: Value }

type ValueTransferProps<Value> = {
  from: (finish: (value: Value) => void) => ReactNode
  to: (input: { value: Value; back: () => void }) => ReactNode
}

export function ValueTransfer<Value>({
  from,
  to,
}: ValueTransferProps<Value>) {
  const [state, setState] = useState<TransferState<Value>>({ step: 'from' })

  if (state.step === 'from') {
    return <>{from(value => setState({ step: 'to', value }))}</>
  }

  return <>{to({ value: state.value, back: () => setState({ step: 'from' }) })}</>
}
```

## StepTransition and Opener

`StepTransition` is the boolean version of `ValueTransfer`. `Opener` exposes `{ isOpen, open, close }` to a trigger render function and renders content only while open. Use a hook instead when only one local component needs the behavior.

```tsx
import type { ComponentType, PropsWithChildren, ReactNode } from 'react'

type WrapProps = {
  children: ReactNode
  wrap?: ComponentType<PropsWithChildren>
}

export function Wrap({ children, wrap: Wrapper }: WrapProps) {
  return Wrapper ? <Wrapper>{children}</Wrapper> : children
}
```

## Adoption checks

- Back, close, finish, and reset paths are symmetric.
- The primitive owns no feature-specific visuals or server mutation.
- State resets at the approved lifecycle boundary.
- Focus restoration and keyboard behavior stay with the relevant UI owner.
- Tests render custom caller UI and exercise every transition, including repeated back and open actions.
