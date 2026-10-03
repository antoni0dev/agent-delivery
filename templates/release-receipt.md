# Release receipt: <version or change>

Every field refers to the same immutable commit. Mark a field that cannot be filled `unverified` with the missing evidence; never leave it implied.

- Release authority and approver:
- Commit SHA (full):
- Tag and its provenance (creator, signature or attestation):
- Required CI run and the head SHA it tested:
- Preview URL and the SHA it serves:
- Independent audit (reviewer context, lenses, reviewed head, outcome CLEAN or BLOCKED):
- Human reviews required by policy for money, address or signing changes:

## QA journeys

| Journey | Environment | Identity or wallet reference | Result | Evidence |
|---|---|---|---|---|

## Environment configuration

| Environment | Chain ID | Contract and spender addresses (registry version) | Config and flag values | Verified against |
|---|---|---|---|---|

## Migrations

- Data, schema, cache or storage migrations, their order and compatibility window:
- Backend contract version this release requires and its promotion status:

## Rollback plan

- Trigger:
- Steps and who may run them:
- State that cannot roll back (data, on-chain transactions, approvals):

## Post-deploy smoke (read-only)

| Check | Expected | Result | Time |
|---|---|---|---|

Smoke checks read state only. A check that would sign, transfer or mutate production data needs its own release authority.
