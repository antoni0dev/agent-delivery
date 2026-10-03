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

## Tiers and flags

Every ticket gets a tier and two flags during planning, recorded in its initiative note. Risk routing checks the flags against the diff; a contradiction stops review until the owner corrects the flag and reruns what the corrected flag requires.

- Tier scale and who assigns it (for example S, M, L):
- `money` flag: the change touches amounts, prices, fees, balances, quotes, approvals, signing, addresses or submission. Money work is never the lowest tier.
- `ui` flag: the change alters user-visible behavior, layout or copy.

| Tier or flag | Planning depth | Audit effort and lenses | E2E required |
|---|---|---|---|
| S | | | |
| M | | | |
| L | | | |
| money | Independent plan challenge | Full effort with the `money` lens, kept through every repair round | |
| ui | | | Yes, before merge |

## Repository contracts

- Team instructions and applicable architecture/design sources:
- Dependency setup command and reuse strategy for isolated worktrees:
- Narrow tests and required final check commands:
- Required CI check name; does CI run on draft PRs?
- Development server, browser access, non-production environment and test identity references:
- Authentication and write-verification journeys relevant to this project:
- Contract regenerate and verify commands, and the provenance file they maintain:
- Mocked e2e command (production build, inert fixtures) and real-API e2e command (non-production):
- Critical test floor: journeys that must exist and run in CI:
- QA identities and wallets: references to where they are provisioned, never keys or seed phrases:
- Testnet chain IDs and forked-chain command:
- Additional constraints such as testnet requirements, if applicable:

## Risk routing

- Tracked routing file, if the table does not live in this section:

Paste the adapted table from `.agent-harness/templates/risk-routing.md` here, or name the tracked file that holds it above.

## Standing authority

- Permitted ticket creation/updates and scope:
- Permitted branches, draft PR creation and development merges:
- Required human review and CI policies:
- Human-merge policy for money-flagged changes, including address, signing and approval changes (paths, required reviewers; unfilled means every money-flagged change needs a human merge):
- Does merging the destination trigger production deployment? If yes, record separate release authority or block that merge.
- Release model (for example continuous on merge, release PR or tagged train) and release authority:
- Approval: approve architecture, parallel scope and intended native session creation/coordination once, then execute within that authority. Record the explicit go and any native-tool or team-specific constraints in the initiative note.
- Production mutations/deployments and mainnet actions require separate explicit authority.
- Mainnet and broadcast guard: how agents, tests and previews are prevented from signing or broadcasting on mainnet:

## Continuation and updates

- Native follow-ups: disabled until explicitly authorized and supported. If authorized, record cadence, target initiative(s), stop conditions and notification destination.
- Notifications: shipped work, blockers and decisions only unless requested otherwise.
- Finish/cancellation procedure: stop owned workers/follow-ups, preserve checkpoints and reconcile remote outcomes.
