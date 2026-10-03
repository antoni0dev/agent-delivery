# Form submission contract

Keep form state, validation, submission, and user feedback separate. The form boundary prevents browser navigation and event leakage, but it must not silently discard a user action.

Related cards: `mutations-confirmed-reconciliation`, `lifecycle-readiness-and-user-feedback`.

## Reference shape

```tsx
import type { FormEvent, KeyboardEvent } from 'react'

type FormHandlersInput = {
  submit: () => void
  close?: () => void
  disabledReason?: string
  isPending: boolean
}

export function getFormHandlers({
  submit,
  close,
  disabledReason,
  isPending,
}: FormHandlersInput) {
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    event.stopPropagation()

    if (disabledReason !== undefined || isPending) return
    submit()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== 'Escape' || close === undefined) return
    event.stopPropagation()
    close()
  }

  return { onSubmit, onKeyDown }
}
```

The submit control should expose the same readiness contract through disabled state and approved explanatory UI. The event guard is the final boundary, not the only feedback.

## Mutation contract

1. Parse user input into a domain command.
2. Expose the existing in-flight state.
3. Submit once through the mutation owner.
4. Use the confirmed result or targeted invalidation for final UI.
5. Show actionable failure without erasing valid user input.

Optimistic state is reserved for approved, reversible interactions with snapshot rollback and settlement reconciliation. It is usually inappropriate for money movement, irreversible effects, and server-assigned identities.

## Adoption checks

- Enter submits and Escape closes only where intended.
- Invalid or pending actions are visibly unavailable or explained.
- Validation errors remain distinct from transport and server errors.
- Retry behavior is deliberate for non-idempotent operations.
- Tests cover keyboard submission, repeated click while pending, validation failure, server failure, and confirmed success.
