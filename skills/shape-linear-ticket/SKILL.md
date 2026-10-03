---
name: shape-linear-ticket
description: Turn a focused discussion into a scoped Linear ticket or master initiative, preserving decisions and acceptance criteria. Use when the user asks to draft or create a ticket.
---

Read [project configuration](../../../.agent-harness/PROJECT.md) and the intake guidance in [WORKFLOW.md](../../../.agent-harness/WORKFLOW.md). Links target the installed layout; source templates are under root `templates/`.

Inspect the relevant repository and approved decision sources. Draft from `.agent-harness/templates/master-ticket.md`: a short action title, two to four plain sentences (what is wrong or missing, what changes, what proves it), observable acceptance checkboxes, a services-affected table, tier and flags, and links. Put architectural detail below the concise request.

Quote the original request verbatim in its own section; never trim or paraphrase it. Record each unresolved product or design decision in the open questions register with its owner and what it blocks; never invent behavior to close one.

Use only this repository's configured tracker connection and scope. Create or update tickets when authorized, checking for duplicates and concurrent edits first. Preserve concurrent human edits. Ticket creation alone does not delegate execution; hand it to an initiative owner only when explicitly requested or covered by standing authority.
