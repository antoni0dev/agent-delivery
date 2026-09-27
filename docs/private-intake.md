# Private ticket intake

New configurations use private explicit handoff with automatic intake disabled. The [shared manager](engineering-manager.md) presents a challenged plan for human approval before dispatching implementation. Existing label-mode configurations remain supported.

Set `linear.intake` to `{ "mode": "private", "automaticOthers": true }` to stop requiring a tracker label. Keep `readyLabel` for backward-compatible label mode. Omitting `intake` preserves existing label behavior. Set `automaticOthers` to false for explicit starts only.

| Intent | Result |
| --- | --- |
| Create a ticket | Publish only. Self-created issues never auto-start. |
| Create and start it | Publish, read back, then explicitly run the issue. |
| New assignment created by someone else | After the baseline, eligible newly observed assignments can start automatically. |
| I am handling this | Save a private reservation and stop existing controller-owned execution. |
| Release manual reservation | Remove the hold without automatically restarting cancelled work. |

The first successful complete scan establishes a baseline and dispatches none of that backlog. A configuration change creates a new baseline. Polling observes membership in the assigned scope; it does not reconstruct tracker assignment history. An issue observed before, removed, and later reassigned is not automatically re-admitted. Use an explicit start. Missing creator metadata blocks automatic admission for that issue. All project scans must succeed and have unambiguous repository ownership before intake mutates ownership.

Private mode does not relax scope, assignee, accepted-plan, independent review, browser verification, current CI or development-merge authority. Claiming and native/merge dispatch consult manual ownership. A parent or child manual reservation fences that initiative's shared owner. Work already dispatched remotely may require reconciliation before takeover is confirmed. Never edit a worktree while termination remains unconfirmed.

Run from the correct company context:

```sh
delivery manage --config <workspace-config> --project <project-id> --issue <issue-id>
delivery manual --config <workspace-config> --project <project-id> --issue <issue-id> --action reserve
delivery manual --config <workspace-config> --project <project-id> --issue <issue-id> --action release
```

A completed or cancelled initiative retains its history. Releasing a manual reservation does not erase it or authorize retrying old mutations. An issue already owned by another controller or interactive session needs an explicit ownership handoff before this controller starts it.

Use the installed `shape-linear-ticket` skill in a focused discussion session. Share only its compact handoff with the portfolio manager. The selected initiative owner validates, plans and independently challenges the eventual implementation.

# Rollout boundary

Install and configure while intake is inactive. Revalidate capability and knowledge behavior after model or release changes; old proofs cannot be relabeled. The current Codex profile uses Astra at high effort for planning and independent plan challenge, and Sol for implementation, code review and browser verification. Other profiles remain separately gated and are not fallback providers.

Before the first live run, reconcile legacy owners, confirm a dedicated non-production QA identity and the ticket's required journeys, verify strict required checks and destination authority, then activate for the selected ticket. Automatic intake begins with a baseline, not a backlog sweep. Existing company work remains with its existing owner until deliberately handed off.
