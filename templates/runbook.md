# Runbook: <system or alert>

- System and owner:
- Last verified (date and by whom):

## Alert

| Field | Value |
|---|---|
| Name | |
| Severity | warning, high or critical |
| Source service or metric | |
| Threshold in plain words | |
| Alert automation posture | `safe`, `unsafe` or `none` |

## Meaning

What is failing for users or funds when this fires, and what it does not mean. Name known false positives.

## Diagnostics

Read-only commands, queries and dashboards that establish scope and cause. Never print credentials or key material.

| Step | Command or query | Healthy result | Automation |
|---|---|---|---|

## Mitigation

| Step | Action | Reversible | Automation |
|---|---|---|---|

## Escalation

Who owns this when mitigation fails, how to reach them and after how long.

## Alert automation posture

The alert has one default posture:

- `safe`: the registered automatic response is bounded, reversible and has no user, fund or availability impact.
- `unsafe`: the response changes production state, funds, keys or availability and always requires a human or explicit incident authority.
- `none`: detection and escalation only. No automatic mitigation exists.

An alert absent from the registry defaults to `unsafe`, never `safe`.

## Step authority

Every diagnostic and mitigation step separately records `read-only`, `explicit-authority` or `human-only` in its Automation column. Alert-level posture never grants a step more authority than this row.

## Verification after mitigation

List the read-only checks that prove the user or fund impact stopped, the authoritative state recovered and no secondary invariant was broken. Record the expected result, actual result and evidence before closing the incident.
