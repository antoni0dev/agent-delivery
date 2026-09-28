# Migrate from the controller

The direct-native harness replaces the custom execution controller. Historical controller source belongs on an archived version/branch; it is not needed in the current installation. Preserve local databases, configuration, proof files, worktrees and execution history while migrating. They may be needed to recover unfinished work.

1. Inventory active initiatives, owned processes, scheduled jobs, branches, worktrees and PRs in the destination. Do not expose credentials or carry company material into the portable repository.
2. Pause the old controller's new dispatch using its existing controls. Disable only its owned recurring dispatch. Confirm each owned writer has finished or been cancelled and terminated before assigning that worktree to a native worker. Paused intake alone is not proof writers stopped.
3. Reconcile local state against tracker and GitHub outcomes. Capture each unfinished initiative's owner, approved scope, branch/PR, last checks, blockers and next action in a plain initiative note.
4. Install the lightweight harness for the chosen client and populate `PROJECT.md`. Preserve repository rules, existing team skills and current model preferences. Update old manager entrypoints so they read the shared workflow instead of invoking controller commands.
5. Hand each initiative/master ticket to one project manager. Multiple managers may share the repository after coordinating ownership; no portfolio singleton is required. Let each manager choose direct workers or fresh workstream owner sessions within approved native-session authority. Resume useful work already written; do not recreate tickets or PRs, reset unrelated checkouts, delete worktrees or repeat completed setup without evidence it is necessary.
6. Validate one small delivery with independent review, applicable QA and current CI. Expand parallelism based on actual host capacity. Remove obsolete namespaced launchers only after confirming nothing still needs them; archive recoverable local state before any eventual cleanup.

Changing clients later is a handoff: stop the prior client's writers, save the checkpoint, reconcile remote state and assign one new owner. It does not require shared runtime infrastructure or simultaneous clients.
