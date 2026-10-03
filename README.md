# Agent delivery: portable engineering harness

Use one AI client to lead parallel engineering work. This repository supplies shared manager instructions, specialist roles, skills, 58 core engineering reference cards and domain knowledge packs. Your chosen client supplies the agents and tools.

Since v0.2 the harness has no custom controller, SQL database, runtime adapter, proof cache or background daemon. It does not require using several AI clients together. The earlier controller is historical software, not a prerequisite for this workflow.

The core is Markdown and JSON. It imposes no operating system, language, framework, package manager or application runtime version. Each repository keeps its own toolchain. Node-based helper scripts are optional; [manual setup](docs/adapting-a-repository.md#manual-setup-without-node) works without them.

## Daily use

After installing and filling in the repository's `.agent-harness/PROJECT.md`, say:

> Start the engineering manager for [initiative or Linear master ticket].

The manager checks existing ownership, investigates the request and proposes the architecture and parallel work. After your approval it delegates to native agents, integrates their work, obtains independent review and applicable QA, and delivers within the repository's permissions. You stay in the manager conversation.

A project means an initiative or Linear master ticket, not a repository. Several project managers can run simultaneously in the same repository. Each owns its initiative and chooses direct workers for bounded tasks or fresh owner sessions for complex workstreams. Owner sessions may coordinate their own workers and report back. A separate portfolio manager is optional. Each initiative keeps a short note linked from its master ticket.

## Setup

Follow [Adapt a repository](docs/adapting-a-repository.md). Install for the one client you use: Codex, Claude Code or Cursor. Keep company configuration and credentials in the destination, outside this portable repository.

Read [Migration](docs/migration.md) before replacing an existing controller installation. Preserve active work and stop its writers before handing ownership to native agents.

## What is shared

- [Workflow](WORKFLOW.md): planning, parallel execution, independent review, QA and delivery.
- `roles/`: focused responsibilities for initiative owners, workers, an investigator, the general reviewer with its contract and money lenses, and QA.
- `skills/`: manager, knowledge-selection, task verification, ticket-shaping, independent PR audit, review-comment resolution, scoped QA, repository-check and repository-bootstrap procedures; installation adds every skill under `skills/` for the chosen client.
- `knowledge/`: the complete 58-card core library, anti-patterns, examples, coverage inventory and historical audit metadata, plus domain knowledge packs in `knowledge/packs/` that agents select like core cards.
- `templates/`: repository configuration, risk routing, the review findings schema, resumable initiative notes, master tickets, split PRDs, technical specs, runbooks, release receipts and a catalog of executable checks.

The core knowledge release is preserved unchanged in this simplification. That preservation is not a fresh audit of every original source, and candidate packs are not covered by the historical audit. See [Knowledge](docs/knowledge.md) for what the records establish and their limits. No general redistribution license is granted by this repository.

This is an experimental harness. Native delegation, model controls, browser access and scheduled follow-ups depend on the chosen client and destination. Installation does not prove successful delivery or promise unattended work across days.
