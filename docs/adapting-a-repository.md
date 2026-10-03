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
| `docs/knowledge.md`, `docs/readiness.md` | Same names under `.agent-harness/docs/` |
| `templates/` | `.agent-harness/templates/` |
| `templates/PROJECT.md` | `.agent-harness/PROJECT.md`, only if absent |
| Each folder under `skills/` | `.agents/skills/` for Codex, `.claude/skills/` for Claude, or `.cursor/skills/` for Cursor |

Create `.agent-harness/initiatives/` for private notes. Keep private configuration and notes untracked using the repository's approved local exclusion mechanism; ignore rules do not protect files already tracked by Git. Preserve team-owned instructions and skills. For a client without skill discovery, point it directly to `.agent-harness/WORKFLOW.md` and `PROJECT.md`.

A manual copy does not create an installer ownership manifest. Update it by reviewing file differences, not by forcing the helper to overwrite unknown files.

## Project configuration and use

Installation places the workflow, roles, knowledge (including domain packs) and templates in `.agent-harness/` and every skill under the harness `skills/` directory in the selected client's repository skill directory. Preserve existing team instructions and unrelated settings. Do not overwrite local project decisions on upgrades; review any managed-file conflicts the installer reports.

Fill `.agent-harness/PROJECT.md` from this repository's sources: tracker scope, branch permissions, models, dependency setup, checks, QA environment and existing ownership. Reference credentials through the destination's normal tools; never copy them into the harness or portable upstream repository. Decide with the team which generic files may be committed; keep company-private configuration and execution notes local where required.

Check that the client discovers every installed skill, one per directory under the harness `skills/`. A client that cannot discover skills can read `.agent-harness/WORKFLOW.md` explicitly. Verify its actual native subagent/model controls; an installed skill does not manufacture missing capabilities.

Try one bounded initiative:

> Start the engineering manager for [ticket or description].

Each initiative/master ticket is a project and gets its own manager; multiple managers can share the repository. The manager chooses direct workers or separate owner sessions for complex workstreams. Approve the concrete plan, fan-out and intended session creation/coordination once. Let native delegates implement it, with independent review, applicable real QA and repository CI. Keep wider unattended intake off until the workflow is useful in this destination. Scheduled continuation is optional, explicitly authorized and native to the chosen client.

Read `knowledge/topics.json` to choose topics and `knowledge/guide.md` or `cards.json` for full card content. Domain packs are `knowledge/packs/*.json`, readable in `knowledge/packs/guide.md`. No script is required. If the optional selector was installed, it provides the same selection over core and pack cards:

```sh
node .agent-harness/scripts/select.mjs --index
node .agent-harness/scripts/select.mjs --list
node .agent-harness/scripts/select.mjs --topic state
node .agent-harness/scripts/select.mjs --pack NAME
node .agent-harness/scripts/select.mjs --card state-single-owner
```

Pack cards are labeled with their pack and status; [knowledge](knowledge.md) explains candidate and approved packs. The manager shares selected full card content and exceptions with workers and reviewers. Do not treat a topic match or read receipt as proof of engineering quality.

Existing controller users must follow [migration](migration.md) before starting a competing native owner.

## Isolated worktrees

Git does not copy this locally ignored harness when creating a worktree. Install it there before opening a fresh worker session:

```sh
node scripts/install.mjs --repo /absolute/path/to/worktree --client codex --project-from /absolute/path/to/configured-checkout
```

The helper verifies both checkouts belong to the same Git repository and copies the configured PROJECT.md only when absent. Existing project settings and notes remain untouched. This is a snapshot: the manager remains responsible for sharing later configuration changes. Alternatively, provide workers absolute paths to the original same-repository harness, role/skill and configuration. Keep one canonical initiative note; do not duplicate ownership records between worktrees.

## Operating skills

The installer copies every skill directory under the harness `skills/`; each `SKILL.md` description states when it applies:

- `engineering-manager`: initiative ownership, planning, delegation and integration.
- `engineering-knowledge`: selecting core and pack cards for planning, implementation and review.
- `verify-task`: source triangulation before non-trivial implementation.
- `shape-linear-ticket`: master tickets with acceptance criteria and open questions.
- `pr-audit`: independent read-only review, precise findings and repair handoff.
- `resolve-pr-comments`: verifying and resolving review feedback.
- `project-qa`: scoped browser/behavior verification and evidence reporting.
- `quality-gates`: discover and run the destination's actual checks without imposing a language or toolchain.
- `repo-bootstrap`: day-one setup of a new repository.

If the destination already has a skill directory with the same name as a harness skill, the installer refuses before writing anything. Rename the team skill, or install manually and record which skill wins.

Complete `.agent-harness/docs/readiness.md` for the intended task before calling the project ready. Installed documentation includes `.agent-harness/docs/knowledge.md` to distinguish the active guidance from historical evaluator records.
