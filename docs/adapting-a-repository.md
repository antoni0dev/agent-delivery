# Adapt a repository

Keep this controller checkout separate from the application repository. Share one controller state directory across repositories in the same company workspace. Use a separate configuration, state directory and credential source for every company. Never copy another employer's configuration or runtime history.

## Install the source

Use macOS and Node 24 in the version range declared by package.json. Install Git and the selected native runtime CLI using your organization's approved method.

```sh
npm ci
npm run check
node dist/cli.js help
```

Run commands below from this controller checkout until the managed `delivery` command is installed. Do not rely on a previously installed global version during onboarding.

## Generate private configuration

Replace these two paths with absolute paths on this machine:

```sh
node dist/cli.js init --config /absolute/private/workspace.json --root /absolute/application-repository
```

The generated file is intentionally incomplete and inactive. It is a template, not a runnable example. Keep it outside both repositories. Relative configuration paths resolve against its directory. Set `stateDirectory` to a private stable location and `knowledgeRoot` to this controller checkout, not to the application repository.

Fill the template using the destination repository and team policy:

| Configuration | What to supply |
| --- | --- |
| `workspaceId` | Stable lowercase workspace name, unique on this host |
| `linear.workspaceId`, `linear.assigneeId` | Exact tracker workspace and human account IDs |
| `linear.credential` or `linear.mcp` | Exactly one destination-scoped connection; never both |
| `github.login`, `github.credential` | Authorized account and a credential reference for this destination |
| `runtimes` | Absolute paths to installed native executables; select one `intakeRuntimeProfile` |
| `projects[].id`, `root`, `repository`, `remote` | Local project ID, actual checkout, owner/repository and its exact Git remote |
| `gitIdentity` | Commit name/email authorized for this destination |
| `teamIds`, `projectIds` | Tracker UUIDs defining scope; an empty project list permits the configured teams' projects |
| `instructions` | Repository-relative instruction files to include in planning |
| `commands` | Real executable and argument arrays for this repository's checks |
| `preparation` | Optional idempotent, lockfile-preserving setup command for a fresh worktree |
| `environment` | Dedicated non-production QA environment, authentication and allowed mutations |
| `release` | Development target, merge method, exact required check names and optional strict current-base policy |
| `authority` | Recorded grant reference and only the actions the destination permits |

A merge that deploys production cannot be authorized by declaring it a development merge. Keep production and mainnet flags false only when that describes the real destination. Preserve human-review and CODEOWNER requirements.

Credential references are either an environment-variable name or a command that resolves a secret at use time. Do not put secret values in JSON, command arguments, Git remotes or documentation. Scheduled launchd jobs do not inherit your interactive shell's environment; use a destination-approved credential helper or intentionally provision its scheduler environment. The helper must print exactly one token value only to its caller. Never display it for diagnostics.

Configure the optional `runtimeCredentials.cursor` reference to supply a key to native Cursor. Without it, no API key is forwarded, and execution uses an isolated home directory; do not assume desktop authentication is inherited. A profile is unavailable until its exact selected models, efforts and permission behavior pass conformance. No provider substitution is automatic.

## Choose intake behavior

For the label-free workflow, add this inside `linear`:

```json
"intake": { "mode": "private", "automaticOthers": false }
```

Keep automatic intake disabled for the first explicit pilot. Later, setting `automaticOthers` to true allows newly observed, in-scope assignments created by other people to enter the pipeline. The first scan records the backlog without starting it. Self-created tickets and unknown creators never auto-start. Keep the template's `readyLabel` field for compatibility; it is unused in private mode.

Changing configuration after activation invalidates its binding. Pause, drain and explicitly reactivate after validation. A changed configuration establishes a fresh intake baseline. See [private intake](private-intake.md) for manual reservations and polling limits.

## Prepare isolated worktrees

Configure `projects[].preparation` when the repository needs installed dependencies. For an npm repository this may be `{ "executable": "npm", "args": ["ci"] }`; use the actual pinned package manager and immutable/frozen-lockfile option for other repositories. Monorepos may need a destination-private bootstrap script that selects the correct subdirectory and toolchain. Do not copy credentials into the worktree or change dependency versions during preparation.

Preparation runs under the host's shared heavy-work lock before implementation, QA authorship and verification. It is a host command, not an LLM-selected action or acceptance evidence. It must be safe to rerun. A failure blocks the task before model implementation and does not consume a code-repair round. Changing this command changes the configuration binding, so pause and replan already accepted work before resuming.

## Adapt checks and browser QA

Command entries are executable/argument objects, not shell strings. For a repository that actually defines these scripts, for example:

```json
"commands": {
  "types": { "executable": "npm", "args": ["run", "typecheck"] },
  "test": { "executable": "npm", "args": ["test"] },
  "journeys": { "executable": "node", "args": ["scripts/delivery-journeys.mjs"] }
}
```

Do not copy these names unless they exist. Commands execute in the owned worktree. Include a package-manager version strategy supported by the application repository. Plans refer to these command IDs.

UI changes need QA-authored tests for the accepted journeys, including loading, empty and error states. Authenticated behavior needs real non-production authentication and isolated test data. Configure the authentication source locally; do not transfer a browser profile or test identity from another workspace. Relevant mutation tests must assert authoritative outcomes. Configure chain restrictions only for projects that need them.

A plain successful test command does not prove browser journeys. Journey commands emit the exact structured stdout report in [operations](operations.md#verification-report-protocol), using the candidate/environment supplied by the controller. Logs go to stderr. Missing, skipped or stale required evidence blocks acceptance.

## Validate and install without activation

Use the selected profile consistently:

```sh
node dist/cli.js doctor --config /absolute/private/workspace.json --live
node dist/cli.js conform --config /absolute/private/workspace.json --profile codex
node dist/cli.js evaluate --config /absolute/private/workspace.json --profile codex
node dist/cli.js install --config /absolute/private/workspace.json
```

Conformance and evaluation make bounded native model calls and consume your provider quota. Their private receipts bind the release, models and runtime executable. Conformance additionally binds the host. Behavior evaluation does not enforce a host ID; it requires matching release/runtime inputs and intact raw evidence. Do not copy someone else's receipts to claim this machine passed. `doctor` without `--live` does not verify remote identity.

Keep `stateDirectory/behavior` and `stateDirectory/conformance` as real, private directories for each workspace. The controller rejects linked directories and linked profile receipts before dispatch or proof generation. Never point them at a shared mutable evaluation cache. To migrate an existing setup, pause and drain the workspace first, then copy the complete proof directory and all referenced artifacts into independent files. Do not copy only the profile JSON. Validate the copy against the destination's actual configured runtime and role policy before resuming; if incompatible, regenerate locally with `evaluate` or `conform`. A complete compatible copy preserves evidence, but does not grant permission to reuse another organization's private data.


Installation writes a manifest-owned command, namespaced skills/rules and an inactive launch agent. It preserves unrelated instructions and does not edit shell startup files. Add the returned command directory to your PATH yourself or use the returned absolute command path.

The included source-use receipt records owner authorization for this derived release. It is not an employer's approval to send application code to an AI provider, nor a new license to redistribute underlying books or documents. Source changes require a new review and release.

## Run the first ticket

Reconcile existing owners, sessions, branches and PRs first. Establish one active controller/ownership store. Confirm required checks and development-merge authority. Select one bounded ticket with known acceptance behavior.

```sh
delivery activate --config /absolute/private/workspace.json
delivery manage --config /absolute/private/workspace.json --project <configured-id> --issue <issue-id>
delivery status --config /absolute/private/workspace.json
```

Activation also enables five-minute intake when a managed installation exists. Keeping `automaticOthers` false limits this pilot to explicit starts. A managed initiative must publish/read back its plan, obtain independent challenge and human approval of that exact revision, implement, independently review, execute required QA, check current CI, merge within authority and confirm the remote outcome before completion.

Complete one real ticket, then two independent concurrent initiatives before enabling routine automatic intake. The test suite and model fixtures alone do not prove this operational milestone.

## Everyday use and upgrades

Use `shape-linear-ticket` in a focused discussion session. “Create a ticket” publishes only. “Create and start it” requests an explicit handoff. Give the portfolio manager the concise outcome, priority, dependencies and issue link.

```sh
delivery manual --config /absolute/private/workspace.json --project <configured-id> --issue <issue-id> --action reserve
delivery manual --config /absolute/private/workspace.json --project <configured-id> --issue <issue-id> --action release
delivery pause --config /absolute/private/workspace.json
```

Manual takeover must confirm previous execution stopped before you edit its worktree. Release does not resume cancelled work. Pause stops new intake; it does not promise running processes have terminated. Use `cancel --initiative <id>` for owned cancellation.

For upgrades, first use the currently installed `delivery pause --config ...` and wait for owned invocations to finish. Build/check the new controller checkout, then run its `node dist/cli.js upgrade --config ...`. The new version refuses schema migration while the old workspace is active or owns processes. It preserves a private old-format database snapshot before migration, then backs up state/configuration and stages managed files. It leaves intake inactive for explicit revalidation/reactivation. Keep old backups until destination acceptance passes. See [operations](operations.md) for recovery and same-workspace host transfer.

## Troubleshooting

| Report | Next action |
| --- | --- |
| Invalid configuration | Complete the named template fields using destination facts |
| Identity mismatch | Correct this workspace's credential reference; do not switch to another employer's account |
| Missing model, capability or quota | Restore the selected runtime capability; do not silently change models |
| Source eligibility stale | Review the changed source/knowledge release; do not edit hashes to make it pass |
| No new automatic work | Check intake mode, assignee/scope, creator metadata, baseline and manual holds |
| Merge blocked | Inspect current CI, base, review requirements, scope and release authority |
| Uncertain mutation outcome | Let the controller reconcile the recorded operation; do not repeat it manually |

For process diagnostics, output only safe numeric metadata. Process titles and arguments can contain credentials even when a command appears to request only a process name.

## Portable manager entrypoint

After installation, use the shared `agent-delivery` skill from any supported client. It resolves the workspace with `delivery locate --root <repository>` and loads `delivery manager-guide`. Read [the manager workflow](engineering-manager.md) for exact-plan approval and continuation across days. Do not copy company-specific manager skills into this portable distribution or add another scheduler for the same work.
