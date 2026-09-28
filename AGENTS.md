# Portable engineering harness

This repository contains shared engineering guidance and procedures for native agent sessions. It does not own application delivery or run a controller.

- Preserve the knowledge library, topic index, coverage inventory and audit metadata. Do not rewrite source-derived cards to simplify the tooling.
- Keep one shared workflow. Client skills are thin entrypoints, and project-specific commands, model preferences and permissions remain in private project configuration.
- No database, scheduler, provider router, model-proof dispatch gates, or application credentials belong here.
- Use the selected tool's native agents with bounded tasks, independent review and repository-owned QA and release requirements.
- Installation only updates manifest-owned files. Preserve team instructions, custom skills, project settings and current work.
- Use Node built-ins for the small install, selection and validation helpers. Run npm run check after changes.
- Never include company configuration, tickets, credentials, execution history or raw private sources in transferable files.
- The archived controller remains available in Git history; do not revive its execution machinery as a dependency of this harness.
