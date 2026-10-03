# Typed functional pipelines

Use a pipeline for a linear sequence of pure transformations when named stages make dataflow easier to inspect. Keep one or two native operations direct. Keep network calls, storage writes, cancellation, and user-facing error policy outside the pure pipeline.

Related card: `functional-composition-pipelines`.

## Reference implementation

Small fixed arities preserve inference without exposing assertions to callers. Add another typed overload only when real call sites need it:

```ts
export function pipe<A, B, C, D>(
  value: A,
  first: (value: A) => B,
  second: (value: B) => C,
  third: (value: C) => D
): D {
  return third(second(first(value)))
}
```

```ts
const normalized = pipe(
  response,
  parseResponse,
  removeUnsupportedItems,
  sortByPriority
)
```

If a stage can fail as domain data, return a discriminated `Result` and compose with a dedicated result helper. If a stage throws and the caller has a real recovery branch, wrap the whole pipeline once at that boundary.

## Stage contract

- One input and one output.
- No mutation of input values.
- No hidden reads from mutable global state.
- A name that describes domain meaning when the transform is non-trivial.
- Independently testable edge behavior.

## Adoption checks

- Intermediate types connect without caller assertions.
- Debugging identifies the failing stage and original boundary input.
- Array and object method chains remain direct when they are clearer.
- Tests cover every stage and at least one end-to-end composition.
