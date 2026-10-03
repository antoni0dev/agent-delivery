# Technical spec: <feature or service>

- Author and reviewers:
- PRD, design source and master ticket:
- Status: draft, approved or superseded

Two or three sentences on the technical approach, assuming the reader has the PRD.

## Scope

- In scope:
- Out of scope:

## Key decisions

| Decision | Choice | Rationale | Strongest rejected alternative |
|---|---|---|---|

## State

One owner for each piece of mutable state: where it lives, how it is cached, its lifetime and how it is scoped to account, chain or wallet identity. Write "stateless" when nothing persists.

## Interfaces

| Boundary | Kind | Authoritative artifact | Serialization | Cardinality | Errors |
|---|---|---|---|---|---|
| | REST, stream, ABI, indexer or event | | | | |

Link each artifact and its provenance. Generated types prove wire shape only; record semantics the artifact does not state as open questions for the owning team.

## Logic

Algorithms, state machines, ordering and reconciliation rules. For amount math, state units, precision and rounding direction at every conversion.

## Observability

| Metric | Meaning | Target | Alert threshold |
|---|---|---|---|

| Log event | Level | When | Key fields |
|---|---|---|---|

Name the correlation ID that ties client, API and chain events together. Never log secrets, keys or raw payloads with personal data.

## Failure modes

| Failure | Impact | Detection | Mitigation |
|---|---|---|---|

Include timeouts, unknown outcomes, partial success, reconnects, RPC failure and reorgs where they apply.

## Security

- Keys and secrets:
- Authentication and session:
- Authorization:
- Input validation:
- Signing and approvals (scope, spender, chain):
- Rate limits and abuse:

## Rollout

- Flags and exposure:
- Migrations and compatibility window:
- Backend contract version and promotion dependency:
- Rollback:
- Release authority and receipt (`templates/release-receipt.md`):
