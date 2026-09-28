# Adapt a repository

Choose the one native client you will use. The harness supplies shared guidance; it does not launch a different client behind the scenes.

The core is Markdown and JSON and has no runtime or operating-system requirement. Keep this repository's existing toolchain. Choose manual setup below, or use the optional helper if Node and Git are already available on your machine.

## Optional helper installation

From this checkout, preview installation and then apply it:

```sh
node scripts/install.mjs --repo /absolute/path/to/repository --client codex --dry-run
node scripts/install.mjs --repo /absolute/path/to/repository --client codex
```

Use `claude` or `cursor` for the other clients. These helpers have no third-party dependencies and are not installed into the application's package manifest. If the local Node cannot execute a helper, use manual setup rather than changing the project's Node version. No database, runtime service or package installation is needed for day-to-day guidance.

## Manual setup without Node

Copy the following generic files without replacing existing custom files:

| Source in this harness | Destination in your repository |
| --- | --- |
| `WORKFLOW.md`, `roles/`, `knowledge/` | Same names under `.agent-harness/` |
| `templates/initiative.md` | `.agent-harness/templates/initiative.md` |
| `templates/PROJECT.md` | `.agent-harness/PROJECT.md`, only if absent |
| Each folder under `skills/` | `.agents/skills/` for Codex, `.claude/skills/` for Claude, or `.cursor/skills/` for Cursor |

Create `.agent-harness/initiatives/` for private notes. Keep private configuration and notes untracked using the repository's approved local exclusion mechanism; ignore rules do not protect files already tracked by Git. Preserve team-owned instructions and skills. For a client without skill discovery, point it directly to `.agent-harness/WORKFLOW.md` and `PROJECT.md`.

A manual copy does not create an installer ownership manifest. Update it by reviewing file differences, not by forcing the helper to overwrite unknown files.

## Project configuration and use

Installation places the workflow, roles, knowledge and templates in `.agent-harness/` and the three skills in the selected client's repository skill directory. Preserve existing team instructions and unrelated settings. Do not overwrite local project decisions on upgrades; review any managed-file conflicts the installer reports.

Fill `.agent-harness/PROJECT.md` from this repository's sources: tracker scope, branch permissions, models, dependency setup, checks, QA environment and existing ownership. Reference credentials through the destination's normal tools; never copy them into the harness or portable upstream repository. Decide with the team which generic files may be committed; keep company-private configuration and execution notes local where required.

Check that the client discovers `engineering-manager`, `engineering-knowledge` and `shape-linear-ticket`. A client that cannot discover skills can read `.agent-harness/WORKFLOW.md` explicitly. Verify its actual native subagent/model controls; an installed skill does not manufacture missing capabilities.

Try one bounded initiative:

> Start the engineering manager for [ticket or description].

Each initiative/master ticket is a project and gets its own manager; multiple managers can share the repository. The manager chooses direct workers or separate owner sessions for complex workstreams. Approve the concrete plan, fan-out and intended session creation/coordination once. Let native delegates implement it, with independent review, applicable real QA and repository CI. Keep wider unattended intake off until the workflow is useful in this destination. Scheduled continuation is optional, explicitly authorized and native to the chosen client.

Read `knowledge/topics.json` to choose topics and `knowledge/guide.md` or `cards.json` for full card content. No script is required. If the optional selector was installed, it provides the same selection conveniently:

```sh
node .agent-harness/scripts/select.mjs --list
node .agent-harness/scripts/select.mjs --topic state
node .agent-harness/scripts/select.mjs --card state-single-owner
```

The manager shares selected full card content and exceptions with workers and reviewers. Do not treat a topic match or read receipt as proof of engineering quality.

Existing controller users must follow [migration](migration.md) before starting a competing native owner.
