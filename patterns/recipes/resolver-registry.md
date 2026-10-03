# Exhaustive resolver registries

Use a resolver registry when at least three stable variants expose the same operation set, more variants are expected, and compile-time missing-case detection is valuable. Keep direct functions for small or still-diverging variation.

Related cards: `patterns-costed-selection`, `modules-public-contracts`, `types-boundary-validation`.

## Reference shape

```ts
const providerKinds = ['alpha', 'beta', 'gamma'] as const
type ProviderKind = (typeof providerKinds)[number]

type QuoteInput = {
  asset: string
  amount: bigint
}

type Quote = {
  amountOut: bigint
}

type ProviderResolver = {
  getQuote(input: QuoteInput): Promise<Quote>
  validate(input: QuoteInput): void
}

const providerResolvers = {
  alpha: alphaResolver,
  beta: betaResolver,
  gamma: gammaResolver,
} satisfies Record<ProviderKind, ProviderResolver>

export const getProviderResolver = (
  kind: ProviderKind
): ProviderResolver => providerResolvers[kind]
```

For a supported subset, derive the subset from a runtime list and validate unknown values before lookup:

```ts
const quoteProviderKinds = ['alpha', 'gamma'] as const
type QuoteProviderKind = (typeof quoteProviderKinds)[number]
const quoteProviderKindSet: ReadonlySet<ProviderKind> = new Set(
  quoteProviderKinds
)

export function isQuoteProviderKind(
  value: ProviderKind
): value is QuoteProviderKind {
  return quoteProviderKindSet.has(value)
}
```

The public resolver contract belongs to the neutral domain module. Variant implementations can depend on their own transport adapters, but consumers should not import their internals.

## Avoid

- A registry for two unrelated functions that do not share a stable contract.
- A default resolver for unsupported external values.
- One giant resolver interface whose methods apply to only some variants.
- Runtime registration when the variant set is closed at build time.
- A resolver that chooses product defaults or unsupported fallback behavior.

## Adoption checks

- Adding a variant fails compilation until every required registry is complete.
- Unknown external kinds are parsed and rejected with context before lookup.
- Implementations satisfy one operation contract without placeholder methods.
- Direct import boundaries prevent consumers from reaching variant internals.
- Tests run the shared contract against every implementation and cover unsupported input.
