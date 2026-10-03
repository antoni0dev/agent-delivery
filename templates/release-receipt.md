# Release receipt: <version or change>

Bind each item to the immutable ref it actually proves. Mark a field that does not apply to the repository's release model `not applicable` with a reason. Mark missing required evidence `unverified`; never imply that evidence for one ref proves another.

- Release authority and approver:
- Reviewed PR head SHA (full):
- Merge commit SHA (full, or not applicable with reason):
- Required CI run and the exact ref or SHA it tested:
- Preview URL and the exact ref or SHA it serves:
- Deployed artifact digest and the source commit that produced it:
- Tag and its provenance (creator, signature or attestation), or not applicable with reason:
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

## Provenance relationship

Explain how the reviewed head, merge commit, tested ref, preview, artifact digest and tag relate. A merge queue or synthetic integration ref is recorded explicitly rather than described as the PR head.
