# Direct engineering management

Read `PROJECT.md` and the repository's own instructions first. Use one selected AI client and its native agents. Repository contracts and approved product/design decisions take precedence over generic guidance. Do not invoke the old delivery controller or restore its scheduling loops.

Use the repository's chosen operating environment, language, runtime versions, package manager and check commands. The harness does not set those requirements. Read the Markdown/JSON guidance directly when optional helper scripts are unavailable; do not change the application's toolchain to accommodate this harness.

A project means an initiative or Linear master ticket. The repository is its working environment. Multiple initiative managers may operate in the same repository; no portfolio-manager singleton is required. Add portfolio coordination only when the user wants it.

## Start and plan

1. Identify the initiative, requested outcome and existing owner, branches, PRs and worker sessions. Resume existing work rather than creating a competing owner. Do not start implementation, create tickets or publish PRs without scope and authority supplied by the user or project configuration.
2. Assign one accountable project manager per initiative. That manager owns its plan, delegation and integrated acceptance. Check other initiatives in the same repository for overlapping file ownership and host capacity before dispatch.
3. Inspect current code, tests, API contracts and approved product/design sources. Resolve source-answerable ambiguity yourself. Ask only for a remaining material scope, product or authority decision; do not invent behavior.
4. Select task-relevant cards from `knowledge/topics.json` and `knowledge/cards.json`. Read their full content, examples, anti-patterns, alternatives and exceptions. Apply a pattern only when the problem warrants it.
5. Use the destination's configured planning model and effort. Present the outcome, architecture, dependencies, task ownership, intended fan-out and verification plan. Obtain independent challenge for consequential architecture. Ask for approval once for this architecture, execution scope and intended delegation, unless already explicitly approved. The approved go covers planned native session creation and coordination messages within that initiative when the user explicitly authorized those actions. Respect native-tool requirements for explicit task creation or messaging and any stricter team rules; obtain only authorization still missing. Material changes return to the owner and, where they exceed approval, the user.

Publish the versioned plan and acceptance criteria on the Linear master ticket using its authorized integration. Preserve the original request and concurrent human edits. Link child tickets and the accepted plan from each owner session rather than paraphrasing away its constraints.

## Delegate and integrate

Use the same client's native delegation. Follow supported model controls and current user preferences; never silently switch providers or billing. If native parallel delegation is unavailable, report that limitation and proceed sequentially where possible.

The project manager chooses the simplest useful delegation: direct bounded subagents for small slices, fresh native owner sessions for complex or long-lived workstreams. Owner sessions may coordinate their own parallel workers and send concise outcome/blocker reports to the project manager. Do not require a Staff layer for every task. Bound nesting to project manager -> workstream owner session -> workers; workers do not recursively spawn more workers. Independent review and QA remain separate contexts.

Each delegate receives a bounded packet: outcome, owned files/worktree, interfaces and dependencies, selected card IDs and full relevant content, applicability rationale, resolved exceptions, required tests and completion criteria. Include plan and note links. Do not load the entire library into every worker.

Stay with active execution using native completion signals and bounded waits. Resolve actionable technical blockers and integrate returned work instead of ending the manager turn merely because delegation succeeded. When work must stop for a decision, access limit or unsupported background capability, save the checkpoint and report that stop explicitly.

Keep one writer per worktree. Coordinate across initiatives through their notes, recorded owners and existing worktrees, without a shared database. Parallelize independent slices; serialize overlapping ownership and integration. Configure capacity around actual host resources, not an arbitrary universal limit. Avoid repeating dependency setup or heavy builds unnecessarily. Preserve unrelated work.

Independently releasable slices can ship separately. Coupled slices need a combined candidate and parent acceptance before delivery. The initiative owner handles integration and architecture decisions; workers resolve ordinary implementation details locally.

## Review, QA and delivery

A fresh reviewer who did not implement the candidate examines changed code and affected consumers, with the same applicable card content and accepted exceptions. Review correctness, architecture, authorization, mutation safety, useful tests and unnecessary complexity. Classify findings as main-path, money or deferred. Verify claims before changing code. Review repair deltas; re-review integrated changes where necessary. After two unproductive repair rounds, report the concrete blocker instead of looping.

Run the repository's required checks on the actual candidate. A separate QA context verifies applicable accepted journeys, including loading, empty and error states. Changed authenticated UI needs real non-production authentication and authoritative outcome assertions. Test writes require dedicated identities/data and the correct non-production destination. Blockchain mutation tests use testnet. Report missing access and skipped coverage honestly; never substitute an authentication bypass for authenticated QA.

Before merging, confirm the approved scope, current candidate, independent review, applicable QA, current required CI, conflict status and destination authority. Respect required human reviews. Do not require rebasing solely because the target advanced when the branch merges cleanly, unless repository policy requires it. Production deployments, production mutations and mainnet actions require their own explicit authority. Confirm the remote result before reporting merged or completing the master ticket.

## Continue across sessions

Maintain a short initiative note using `templates/initiative.md`, or equivalent sections on the master ticket. Record the project manager, workstream owner session IDs, worker handles/worktrees, plan and selected cards, PRs, concise outcome reports, latest verified result, blockers and next action. Save checkpoints before handoff and at meaningful milestones, without recording secrets or dumping transcripts.

Across days, resume the recorded native sessions from that note where supported and reconcile remote state. If persistent owner sessions are unavailable, use bounded agents and explicit checkpoint handoffs rather than pretending the feature exists. A conversation alone does not run while idle. Native scheduled follow-ups are optional and require explicit user or standing project authorization plus supported client capabilities. Define their scope, cadence and stop conditions; reuse an existing follow-up instead of duplicating it. Stop at completion, cancellation, exhausted authority or a blocker requiring a decision. Notify only for shipped work, blockers or decisions unless requested otherwise. Do not promise continuous execution while the host or client is unavailable.
