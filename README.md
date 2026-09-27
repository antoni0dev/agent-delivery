# Agent delivery

Agent delivery is a local macOS controller for bounded engineering initiatives. It keeps workflow state in a workspace-scoped SQLite database, invokes one explicitly selected native runtime profile, and refuses live work until host, destination, knowledge, runtime, and authority checks pass.

The repository contains executable local contracts and deterministic tests. Native conformance and knowledge evaluation produce private, version-bound receipts on the execution host. Each destination still requires its own conformance and acceptance evidence before activation.

## Start here

For everyday use, read [One manager workflow across clients](docs/engineering-manager.md). Start with “Start the engineering manager for [issue]”; the shared procedure and configured execution profile supply the defaults.

Read [Adapt a repository](docs/adapting-a-repository.md) for installation, private configuration, tracker/GitHub credentials, repository checks, authenticated QA and the first pilot. Use [Private intake](docs/private-intake.md) for daily ticket handoffs and manual work.

This is a private engineering system undergoing operational pilots. Local tests, native Codex trials and tracker reads have been exercised. A real end-to-end delivery, cross-runtime delivery parity and a clean-machine rollout are not yet established. Claude Code and Cursor adapters are implemented but require their own successful trials and access before use.

The release includes 58 engineering reference cards and an audited source-coverage inventory. Raw documents, company configurations, credentials, execution history and previous Git history are excluded. Source-use approval is owner-attested, not an independent third-party rights determination. No general redistribution license is granted by this private repository.

## Requirements

- macOS with `launchd`
- Node 24 LTS, matching the range in `package.json`
- Git and the selected runtime CLI
- Environment or command-backed references for destination credentials
- Approved source eligibility for every export, plus reviewed complete knowledge coverage for a release export or activation

Runtime role models are fixed in `src/runtime/core.ts`. Profiles do not silently substitute another model. Codex planning and independent plan challenge use Astra at high effort. Model changes invalidate previous conformance and behavior proofs; rerun both before activation:

| Profile | Planning | Implementation | Review and browser verification |
|---|---|---|---|
| `codex` | `gpt-6-astra` at high effort | `gpt-5.6-sol` | `gpt-5.6-sol` |
| `claude-code` | `claude-fable-5-1` | `claude-opus-5-5` | `claude-opus-5-5` |
| `cursor` | `gpt-5.6-sol` with `claude-fable-5-1` plan challenge | `gpt-5.6-sol` | `gpt-5.6-sol` |

## Preflight

Build and verify the checkout before installing it:

```sh
npm ci
npm run check
node dist/cli.js init --config /absolute/path/workspace.json --root /absolute/path/repository
```

`init` writes a disabled template. It deliberately leaves authority, repository identity, project membership, required checks, and credential references incomplete. Fill those values from the destination's approved sources before loading the config.

Credential fields contain references only. Use environment variables such as `DELIVERY_LINEAR_TOKEN` and `DELIVERY_GITHUB_TOKEN`, or a configured command that prints exactly one secret value. Do not place tokens in the workspace config, launch agent, repository, export, or logs.

If a workspace already uses a routed Linear MCP server, configure `linear.mcp` with its executable and arguments instead of `linear.credential`. The controller verifies the live workspace and user through that connection, preserves its existing authentication, and does not try the other connection as a fallback.

Cursor supports an optional `runtimeCredentials.cursor` credential reference. When configured, its resolved key is forwarded to the native process. Without it, no API key is forwarded. Execution uses an isolated home directory, so do not assume the desktop login is inherited; verify authentication through conformance.

Run local checks first, then the selected runtime conformance:

```sh
delivery doctor --config /absolute/path/workspace.json
delivery conform --config /absolute/path/workspace.json --profile codex
```

`doctor --live` is an explicit live destination check. It may access configured providers, so use it only after verifying the workspace and credential scope.

## Activation and installation

Installation and activation are separate deliberate steps. A new host may install while its workspace is inactive:

```sh
delivery install --config /absolute/path/workspace.json
delivery activate --config /absolute/path/workspace.json
```

Installation runs the non-live doctor checks, stages and verifies a managed version, installs production Node dependencies, loads the native SQLite package, probes the staged CLI, writes a manifest-owned `~/.local/bin/delivery` command and namespaced runtime adapter fragments, and writes the workspace launch agent. An inactive workspace stays inactive and the launch agent remains disabled. Installation never changes shell startup files or global settings, so use the returned `commandFile` directly if `~/.local/bin` is not already on `PATH`.

Activation validates reviewed knowledge, source eligibility, behavior evidence, runtime conformance and authority. Local activation state records the host, exact configuration digest, selected runtime profile and conformance digest; the authority grant is bound through the configuration digest. If a managed installation exists, successful activation enables its five-minute `tick` job.

The launch agent contains absolute paths to the Node binary, installed CLI, workspace config and logs, plus a fixed minimal executable PATH. It contains no credentials or copied shell environment. Managed files are replaced only when the previous install manifest proves ownership and their digests have not changed. Existing unknown or locally edited files are preserved and installation stops.

See [docs/operations.md](docs/operations.md) for pause, upgrade, recovery, export, and verification report details.

## Portable export

```sh
delivery export --output /absolute/path/agent-delivery.tar.gz
```

Every export requires a current permitted-use eligibility receipt for the source set. `--draft` cannot bypass unresolved source permission. Release export also requires complete reviewed knowledge coverage. After eligibility is approved, `--draft` may create a filename ending in `.draft.tar.gz` and mark the archive manifest `draft-incomplete-knowledge`. A draft is not a release artifact.

Exports are rebuilt in a temporary directory from the allowlist. They include package metadata, exact TypeScript and formatter configuration, tests, runtime source and build output when present, eligible generic knowledge, documentation, and eligible ingestion scripts. A recipient can run `npm ci` and `npm run check` from the extracted source checkout. Exports exclude Git data, dependencies, worktrees, local configuration, host identity, run state, logs, raw private sources, private snapshots, and unlisted files. Symlinks, path traversal, binary assets without separate review, private paths, and configured private identifiers are rejected. `EXPORT-MANIFEST.json` is the explicit build and content manifest. The created archive is extracted and every entry and digest is reverified before delivery.

Set `DELIVERY_PRIVATE_IDENTIFIERS` to a comma-separated list of destination-specific names that must fail export scanning.

## Verification status

Code-level proof covers local state contracts, native runtime adapter parsing and cancellation, integration adapter idempotency, knowledge integrity, host identity, launch agent generation, managed-file ownership, staged dependency probes, failed-upgrade preservation, and export containment. Knowledge evaluation compares a minimal baseline with guided planning, implementation, and review. Its fixture results do not establish a universal productivity improvement.

These checks establish implementation behavior in controlled environments. Source permitted-use approval, native runtime conformance, live provider access, clean-machine installation, scheduler execution under launchd, destination acceptance, and an operational pilot remain separate milestones. The controller rejects missing or stale activation evidence. Host-specific trial results and unresolved prerequisites belong in private execution records.

Private label-free intake and focused ticket creation are described in [private intake](docs/private-intake.md). Existing configurations retain label mode until explicitly changed.
