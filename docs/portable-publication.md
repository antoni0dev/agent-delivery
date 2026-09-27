# Publishing and adopting a portable release

Publish a reviewed release snapshot. The development checkout contains private source snapshots and execution records outside its tracked surface, and its Git history is not the transfer format.

## Release decision

Before publication, resolve the permitted use of every included source-derived rule and example. An independently approved source-coverage audit, generic wording and a clean secret scan do not establish that permission. Exclude employer-confidential material even after paraphrasing. A changed knowledge release requires a current eligibility decision and current behavioral evidence.

Select the destination GitHub account, repository name, visibility and license explicitly. A private repository still transfers its contents to another service and does not remove source-use requirements. Do not infer permission to publish from permission to develop locally.

## Build the transfer snapshot

1. Run the source, knowledge, behavior and implementation checks for the exact candidate. Record what is verified and what remains unverified.
2. Use `delivery export --output <release-path>` to create the allowlisted archive after eligibility approval. Do not bypass eligibility with a draft export.
3. Extract to a new directory and verify every entry against `EXPORT-MANIFEST.json`.
4. Confirm the snapshot contains only generic source, approved knowledge, documentation, tests and declared build artifacts. Exclude raw supplied sources, private provenance, credentials, company configuration, ownership databases, native conversations, test accounts and execution history.
5. In that clean directory, run `npm ci` and `npm run check` with the supported Node version.
6. Initialize a fresh Git repository for the selected destination. Review its staged files and publish only after explicit publication authorization. Do not push the development repository's existing history.

The archive digest proves integrity of the selected files. It does not prove ownership, permission, model quality or safe destination configuration.

## New work-machine setup

The first release supports macOS and Node 24. Verify the destination's approved AI tools and data-handling rules before selecting a runtime profile. Use that destination's accounts and credential references; no account, token, browser profile or test identity is transferred from another workspace.

Create a fresh inactive workspace configuration with `delivery init`. Derive repository instructions, tracker owner/team/project scope, development branch, required checks and verification commands from the destination's own sources. Record a new standing authority grant. A development merge that deploys production requires a separate authorized release workflow.

Run native conformance on the new host and validate the exact models, effort controls, fresh contexts, permission behavior and cancellation. Do not substitute a different model or provider when one is unavailable. Validate the knowledge behavior proof against the current release/runtime; run a new evaluation when the proof does not apply.

Reconcile any existing delivery controller before activation. New hosts begin inactive; a same-workspace host transfer must stop the previous owner and preserve its checkpoint. Two independent ownership stores must not dispatch the same workspace.

This release follows the accepted delivery plan's rollout requirement: complete one bounded delivery, then prove two concurrent initiatives. Complete the first ticket through real planning publication, implementation, independent code review, applicable authenticated non-production QA, current CI and an authorized development merge. Then exercise two concurrent independent initiatives before enabling routine unattended intake. Missing or skipped required journeys are blockers, and local fixture tests do not replace destination acceptance.

## Release evidence to retain

- Exact source, knowledge, configuration and code versions.
- Independent coverage and candidate review, including resolved findings and explicit limits.
- Baseline/guided evaluation on the same cases, including false positives, time and measurable usage.
- Archive manifest, clean-install result and destination-native conformance.
- First pilot outcome, remaining human interventions and any rework.

Do not claim a universal productivity gain from a small fixture suite or claim portability from a second directory on the same machine.
