# Repository engineering setup

This file configures the repository environment. A managed project is an initiative or Linear master ticket; several initiative managers may share this repository.

Fill this file from the destination's existing instructions and approved decisions. Keep private details local according to repository policy. No secrets belong here. Unfilled authority grants mean no authority; they do not prevent scoped investigation or drafting.

## Scope and ownership

- Repository/root and permitted base branch:
- Tracker workspace/team/project and master ticket convention:
- Existing initiative notes, manager/owner session IDs and worktrees to reconcile:
- Where private initiative checkpoints belong:

## Client and models

- Selected native client:
- Manager model and effort for routine coordination:
- Planning and architecture challenge model and effort: use the configured route for the decision's scope and risk; preserve explicit user overrides rather than defaulting every task to the strongest model.
- Implementation model and effort:
- Fixture authoring and repair model and effort: follow the implementation route, separately from independent judgment.
- Independent review and QA models and effort:
- Native parallel-agent capability and practical concurrency:
- Per-slice resource budget, usage reporting capability and checkpoint cadence:
- If a requested model or capability is unavailable: report it; do not silently change provider or billing.

## Repository contracts

- Team instructions and applicable architecture/design sources:
- Dependency setup command and reuse strategy for isolated worktrees:
- Narrow tests and required final check commands:
- Development server, browser access, non-production environment and test identity references:
- Authentication and write-verification journeys relevant to this project:
- Additional constraints such as testnet requirements, if applicable:

## Standing authority

- Permitted ticket creation/updates and scope:
- Permitted branches, draft PR creation and development merges:
- Required human review and CI policies:
- Does merging the destination trigger production deployment? If yes, record separate release authority or block that merge.
- Approval: approve architecture, parallel scope and intended native session creation/coordination once, then execute within that authority. Record the explicit go and any native-tool or team-specific constraints in the initiative note.
- Production mutations/deployments and mainnet actions require separate explicit authority.

## Continuation and updates

- Native follow-ups: disabled until explicitly authorized and supported. If authorized, record cadence, target initiative(s), stop conditions and notification destination.
- Notifications: shipped work, blockers and decisions only unless requested otherwise.
- Finish/cancellation procedure: stop owned workers/follow-ups, preserve checkpoints and reconcile remote outcomes.
