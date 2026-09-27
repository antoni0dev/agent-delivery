# Operations

## State and ownership

Each workspace config names one state directory. The controller stores `agent-delivery.sqlite` there and binds activation to one stable host UUID stored under the user's local Application Support directory. Portable archives never include either value.

The SQLite store is the authority for activation, initiative ownership, invocations, evidence, and external operation intent. The managed installation manifest is the authority for files the installer may replace. A file that is absent from that manifest, or whose current digest differs from it, is treated as user-owned and is not overwritten.

## Command lifecycle

All controller commands except `init`, `export`, and `help` require `--config`.

```text
delivery doctor --config <path> [--live]
delivery conform --config <path> --profile codex|claude-code|cursor
delivery evaluate --config <path> --profile codex|claude-code|cursor
delivery transfer-host --config <path> --to <host-id>
delivery activate --config <path>
delivery tick --config <path>
delivery run --config <path> --issue <id> --project <id> --profile <profile>
delivery status --config <path>
delivery pause --config <path>
delivery manual --config <path> --project <id> --issue <id> --action reserve|release
delivery cancel --config <path> --initiative <id>
delivery handoff --config <path> --initiative <id> --owner <id> --profile <profile>
delivery resume --config <path> --initiative <id>
delivery replan --config <path> --initiative <id>
delivery install --config <path>
delivery upgrade --config <path>
delivery export --output <path> [--draft]
```

Interactive `run` requires an explicit runtime profile. Scheduled intake uses the saved intake profile. Arguments are strict. Unknown options and extra positional values fail. Successful commands emit one compact JSON value on stdout. Failures emit a redacted JSON error on stderr and exit nonzero. The store closes in a `finally` path for every controller command.

`pause` stops admission and disables future launch agent starts without terminating the active controller. It does not claim that a running native process has terminated. `cancel` owns termination and confirmation for one initiative. `resume` reopens a nonterminal paused initiative through the controller's state rules. `replan` is an explicit operator revision after source, configuration, or scope changes. It preserves the prior request and plan event and refuses revision while existing children still need reconciliation.

Before pull request state is frozen, the controller prepares fresh QA through a separate writer. If the target base changes, the controller updates the branch by merging the fresh base and requires a new full review against that candidate.

## Installation

`install` is safe before activation, including on an inactive second host. Installation performs these steps:

1. Runs `doctor` without live provider access to probe the configured runtime, knowledge, repository remote, and Git identity.
2. Collects the portable allowlist and hashes each source file.
3. Copies files into a new staging directory and rechecks each hash.
4. Runs `npm ci --omit=dev`, loads `better-sqlite3` against an in-memory database, and runs the staged CLI `help` command.
5. Rechecks every manifest-owned source hash after dependency installation.
6. Atomically moves the staged version into the managed versions directory.
7. Updates namespaced adapter fragments and the executable `~/.local/bin/delivery` wrapper only after ownership checks pass.
8. Atomically selects the version in `current.json`.
9. Writes the workspace launch agent. It registers the agent only when the workspace is already active on this host with the same configuration digest.

An inactive install does not activate the workspace or scheduler. The adapter fragments only direct each runtime to the `delivery` CLI. Workflow policy remains in the controller, so clients do not accumulate duplicated rule sets. Installation never edits shell startup files, `PATH`, a global `AGENTS.md`, runtime authentication, Git identity, repository settings, or user credential files. If `~/.local/bin` is not already on `PATH`, invoke the absolute `commandFile` returned by install.

## Upgrade and recovery

`upgrade` first runs the same non-live doctor checks and verifies that any existing host and configuration binding matches the current host and config. It pauses intake and disables future scheduler starts before acquiring the workspace controller lock for backup, staging, and selection. A retry is allowed while the owning workspace remains inactive after an earlier failed upgrade. Upgrade refuses to continue while any invocation lacks confirmed termination. If an active controller still owns work, upgrade leaves intake paused and the previous version intact. Retry after that bounded work drains. There is no automatic mutation retry or forced process kill in upgrade.

After drain, upgrade writes `config.json`, `state.sqlite`, and `BACKUP-MANIFEST.json` into a private managed backup directory. The fixed names cannot collide even when the source files share a basename. The database uses its online backup API, and the manifest binds both backup digests. The new version is staged, native dependency and CLI probes run, source digests are reverified, and only then is the active version pointer replaced.

Any failure leaves the workspace inactive. If selection has not completed, `current.json` still points to the previous version. A newly created unselected version is removed. Correct the reported failure, confirm no runtime process remains, and rerun upgrade while it is paused. After a successful upgrade, explicitly run `delivery activate --config <path>` to bind conformance and configuration again and enable the scheduler. Unexpected launchctl permission or bootstrap failures are reported; only a verified not-loaded response is ignored.

Do not delete backup directories until the upgraded controller has completed destination acceptance. Restoring a backup is an operator action: keep the controller inactive, preserve the failed database for diagnosis, restore the matched config and database pair, then rerun `doctor` and `conform` before activation.

## Scheduler

The generated launch agent runs this exact shape every five minutes:

```text
<absolute-node> <absolute-installed-cli> tick --config <absolute-config>
```

It starts disabled. `activate` enables and registers it only when a managed installation already exists. `install` may register it only after proving the workspace is active. Logs go to the local user Logs directory. Tokens are resolved by the controller from the config's local credential references and are never written into the plist.

## Authentication

Credential references support two forms:

- `environment`: names one environment variable and reads its value at operation time.
- `command`: invokes one configured executable with fixed arguments and accepts one nonempty line from stdout.

The configured destination identity, repository remote, project membership, authority grant, and environment safety fields are validated before live mutations. Keep the launch environment minimal and grant each token only the actions recorded in the workspace authority block.

Controller-owned commits, base merges, and authenticated Git transport disable repository hooks. Configure required validation as explicit commands and CI checks.

An existing Git SSH host alias may remain in the repository remote when `ssh -G` resolves it to GitHub and the repository path matches the configured identity. Authenticated transport still uses the canonical HTTPS destination and the explicitly selected account.

Linear configuration selects exactly one of `credential` or `mcp`. The MCP option is a command object with `executable` and `args`; it runs in the configured repository through its existing workspace router. Every adapter verifies `get_workspace` and `get_user` before issue access. The supported hosted tools are `get_issue`, `list_issues`, `list_comments`, `save_comment`, `save_issue`, and `list_issue_statuses`. Native transport initialization and calls are bounded, stderr is suppressed, and mutation errors require marker or state readback before retry. No authentication cache or token is copied into this project.

Native Cursor accepts the optional `runtimeCredentials.cursor` reference. If absent, no API key is forwarded; this absence is not a configuration error. Execution uses an isolated home directory and does not forward an ambient API key. Authentication and capability must still succeed during conformance.

## Verification report protocol

Environment-backed journey evidence uses the schema enforced by `src/verification.ts`:

Configured commands emit exactly one report JSON object on stdout and send logs to stderr. The controller writes its own `command.json` receipt inside `DELIVERY_REPORT_DIRECTORY`. The controller supplies the exact candidate through `DELIVERY_CANDIDATE_HEAD` and the environment name through `DELIVERY_ENVIRONMENT`. The frozen task packet includes the command definitions and this protocol so QA-authored tests can produce the required evidence.

```json
{
  "head": "exact-candidate-sha",
  "environment": "configured-environment-name",
  "authentication": "none | fixture | real",
  "production": false,
  "mainnet": false,
  "tests": [
    {
      "requirementId": "stable-requirement-id",
      "status": "passed | failed | skipped",
      "assertions": 1,
      "proof": null,
      "chainId": null,
      "destinationVerified": false
    }
  ]
}
```

The report must target the exact candidate head and configured environment. Production and mainnet reports are rejected. Static requirements may be proved by a successful configured command exit. Unit, integration, browser, authenticated, and nonproduction-write journey requirements need a structured nonempty report with at least one passing result and a positive assertion count. Browser requirements use the same report contract in addition to their browser execution. Authenticated and nonproduction-write requirements need real authentication. A write also needs authoritative proof, destination verification, an explicitly enabled nonproduction mutation environment, and an allowed chain when the project declares chain restrictions.

The report proves only the requirements it contains. It does not prove model quality, full product coverage, scheduler reliability, or a live pilot unless those are independently declared requirements and executed in the approved environment.

## Export checks

A normal export fails while reviewed knowledge is incomplete. Every export, including `--draft`, fails while source permitted-use eligibility is missing, stale, or invalid. After eligibility approval, `--draft` produces a marked archive for inspection only. Before distributing a release archive:

1. Confirm the source set has a current permitted-use eligibility receipt.
2. Confirm knowledge verification reports complete with a current independent approval.
3. Set `DELIVERY_PRIVATE_IDENTIFIERS` for destination-specific names that must not transfer.
4. Create the archive outside the repository and outside any state directory.
5. Inspect `EXPORT-MANIFEST.json` and verify the reported archive digest through the receiving channel.

The source-checkout allowlist includes package metadata, `.mise.toml`, TypeScript configs, Biome config, `src`, `test`, eligible knowledge, documentation, scripts, and existing build output. It excludes private sources and local state. The exporter copies only those files into a fresh temporary tree, writes the explicit build and content manifest with per-file hashes, creates a tar.gz archive, rejects unsafe entry names, extracts it into a second fresh directory, and verifies the exact entry set and every digest before moving the archive to the requested output path. After extraction, `npm ci` followed by `npm run check` is the supported code verification sequence.
