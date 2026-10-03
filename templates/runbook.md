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

## Automation permission

Every diagnostic and mitigation step carries one value:

- `safe`: read-only, or reversible with no user, fund or availability impact. An agent may run it and report the result.
- `unsafe`: changes production state, funds, keys or availability. A human runs it, or an agent with explicit authority for this incident.
- `none`: manual or judgment-only; no automation.

An unlisted step is `none`.
