export const ticketShapingSkill = `---
name: shape-linear-ticket
description: Turn a focused product or engineering discussion into a scoped Linear ticket, with an optional explicit handoff to the configured delivery controller.
---

Keep detailed ticket shaping in the discussion session. Give the portfolio manager only the issue link, outcome, priority, dependencies, execution intent and unresolved decisions. Do not send a transcript or make the manager duplicate architecture planning.

1. Resolve the current repository, company workspace, tracker scope and human owner before reading or writing tracker data. Use the repository's routed integration. Inspect relevant existing issues and approved behavior before proposing a new ticket.
2. Capture the requested outcome, current problem, in-scope behavior, acceptance journeys, dependencies and authoritative product/design links. Separate facts from unresolved decisions. Resolve technical questions from repository evidence; ask only for product or scope choices the sources cannot answer.
3. Use a short action title and two to four plain sentences explaining what changes and what proves it. Put necessary acceptance detail and decisions below. Preserve the user's original intent. Architecture is completed and independently challenged by the initiative owner before implementation; do not invent an architecture just to fill a ticket.
4. A request to create a ticket authorizes that ticket, not implementation. Read back the created issue and retain its stable ID. If creation has an uncertain result, find the issue before retrying. Do not create labels or change team workflow settings.
5. A request to create and start a ticket authorizes explicit delivery handoff after publication. In a workspace configured with private intake, use:

   delivery run --config <workspace-config> --project <configured-project> --issue <issue-id> --profile <selected-runtime>

   Use the workspace's permitted profile, never a silent model/provider substitution. Do not start a second owner when an existing initiative, session, branch or PR already owns the issue. A paused or blocked controller means the ticket is created but execution is not started; report the specific prerequisite.
6. When the user says they will handle a ticket, reserve it privately:

   delivery manual --config <workspace-config> --project <configured-project> --issue <issue-id> --action reserve

   Wait for confirmed termination before editing an AI-owned worktree. If cancellation is awaiting remote reconciliation, report that unresolved handoff. Releasing with --action release removes the reservation but never resumes cancelled work automatically.

Creating only, creating and starting, and reserving for manual work are distinct intents. Do not infer implementation authorization from enthusiasm or a successful ticket creation. Self-created tickets require explicit handoff even when an AI published them using the user's account.

A bounded repository investigation or ticket-publication subagent can help when delegation is authorized. Give it only this workspace's context and a concrete scope. The discussion owner retains the product decisions; the initiative owner retains later architecture and delivery responsibility.
`;
