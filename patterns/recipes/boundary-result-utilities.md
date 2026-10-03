# Boundary assertions and recoverable results

Use assertions to narrow values at trusted internal boundaries and a `Result` only where the caller has a real recovery, alternative, or user-facing error path. Do not convert every thrown programming error into data.

Related cards: `types-boundary-validation`, `lifecycle-readiness-and-user-feedback`.

## Reference implementation

```ts
export function ensurePresent<Value>(
  value: Value | null | undefined,
  expectation: string
): Value {
  if (value === null || value === undefined) {
    throw new Error(
      `Expected ${expectation}, found ${value === null ? 'null' : 'undefined'}`
    )
  }

  return value
}
```

```ts
export type Result<Value, Failure = Error> =
  | { ok: true; value: Value }
  | { ok: false; error: Failure }

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error))

export function attempt<Value>(action: () => Value): Result<Value> {
  try {
    return { ok: true, value: action() }
  } catch (error) {
    return { ok: false, error: toError(error) }
  }
}

export async function attemptAsync<Value>(
  action: () => Promise<Value>
): Promise<Result<Value>> {
  try {
    return { ok: true, value: await action() }
  } catch (error) {
    return { ok: false, error: toError(error) }
  }
}
```

```ts
const parsed = attempt(() => schema.parse(input))

if (!parsed.ok) {
  return showValidationError(parsed.error)
}

return submit(parsed.value)
```

## Selection rules

- Use `ensurePresent` when absence contradicts an already-established invariant.
- Parse `unknown` network, storage, URL, message, and plugin values before the domain layer.
- Use `attempt` when this layer decides how to recover or communicate failure.
- Let errors bubble when the only action would be to rethrow, log, or fabricate a fallback.
- Do not use `Result` to represent pending or inactive asynchronous state. Use the query-state contract.

## Adoption checks

- Assertion messages state what was expected and what was found.
- Callers do not add `?.`, `??`, or `||` to non-optional values.
- Every caught failure has an explicit recovery, alternative, or user-facing branch.
- Tests cover missing, invalid, and successful boundary inputs.
