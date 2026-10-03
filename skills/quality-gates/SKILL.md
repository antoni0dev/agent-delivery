---
name: quality-gates
description: Discover and run the repository's required checks for the current change, then report candidate-bound results and blockers. Use for quality gates or final checks in any language or toolchain.
---

# Repository quality checks

Read [the workflow](../../../.agent-harness/WORKFLOW.md),
[project configuration](../../../.agent-harness/PROJECT.md) and
[implementer role](../../../.agent-harness/roles/implementer.md).
These paths target an installed skill; in the source package use root `WORKFLOW.md`,
`templates/PROJECT.md` and `roles/implementer.md`. Repository rules own the commands.

## Select checks

- Identify the exact candidate and change scope. Read repository instructions,
  contributor docs, build manifests, lockfiles and CI definitions to find required
  commands. Use the language, versions and package manager already chosen there.
- No operating system, Node version, package manager or global plugin is imposed
  by this skill. Missing project commands require investigation or configuration,
  not invented successful checks or a replacement toolchain.
- Inspect command definitions before executing them. Distinguish read-only checks
  from formatters, installers, migrations, deployment and live-data mutation scripts.
  Run only commands covered by the task's authority and intended environment.
- Select narrow checks that establish the current repair, then the required final
  suite for the candidate. Do not replace required CI with a smaller local subset.
- Coordinate expensive builds, browser runs and dependency setup with other owners.
  Preserve unrelated files and reuse existing approved setup where practical.

## Execute and diagnose

- Start from a clean tree at a known head; do not record results for a dirty tree.
  Record each command, working directory, full head SHA, exit status and relevant
  environment as a gate record bound to that head. Run with bounded native process
  tools; preserve actual exit status.
- If an autofix or formatter changes files during the run, that record fails and
  lists the files. The owner reviews and commits the change, then reruns the full
  gate on the new head. See "Gate record at exact HEAD" in
  `.agent-harness/templates/checks/README.md`.
- Read failure output and retained artifacts. Reproduce the exact failure before
  changing code. Return out-of-scope or infrastructure failures with concrete evidence.
- Never weaken an assertion, disable a required check, fabricate fixtures or treat
  skipped/empty output as success merely to clear a gate.
- If fixes are authorized, the owner implements them and reruns the failing check.
  Read the diff after automated edits. A code-changing formatter also changes the
  candidate and invalidates affected earlier checks.
- Do not repeatedly invoke models while CI or credentials are the only blocker.
  Use supported native completion/watch tools instead of sleep-based polling.

## Hand off evidence

- Report pass, fail, skipped or unverified for each required check with the actual
  candidate identity and result reference. Distinguish local checks from remote CI.
  Accept a gate record only when its SHA equals the current head.
- Verify CI belongs to the candidate and the actual tested ref; a PR head and
  integration/merge ref are not interchangeable. Respect required repository policy.
- Hand stable source and evidence to independent audit and applicable QA. Passing
  checks do not substitute for either and do not independently authorize a merge.
- Keep logs and private environment details in the destination's evidence location.
  Record elapsed time and reported usage where available without exposing secrets.
