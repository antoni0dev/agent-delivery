# One manager workflow across clients

After installation, say: **Start the engineering manager for this initiative: [issue].** The installed `agent-delivery` skill loads `delivery manager-guide`, the shared procedure shipped by this repository. Codex, Claude Code and Cursor use the same entrypoint content. Company-specific names may remain local aliases, but must not contain another copy of the workflow.

The conversational client is where you discuss priorities and approve plans. The execution profile selects the actual model processes. These are independent: a Claude or Cursor conversation can coordinate the configured Codex execution profile, provided the host has authorized Codex access. This does not run Astra through Claude's native runtime or change billing automatically. Native Claude and Cursor execution profiles still require their own conformance trials and explicit selection. Grok Bot remains unverified.

## Setup once per workspace

Follow [repository adaptation](adapting-a-repository.md). Installation registers each repository and its private configuration on this host. `delivery locate --root <repository>` resolves the registration, including registered Git worktrees. Unknown or ambiguous repositories require configuration; the manager does not guess. Team instructions and application files remain untouched.

New configurations default to private explicit intake with automatic pickup disabled. They use the Codex execution profile, whose planner and independent plan challenger use Astra high. Existing configurations retain their choices. Changing the runtime invalidates relevant capability evidence.

## One initiative

```sh
delivery manager-guide
delivery locate --root <repository>
delivery status --config <configuration>
delivery manage --config <configuration> --project <project> --issue <issue>
```

The controller publishes and independently challenges the plan, then waits for your approval. The manager shows its architecture, dependencies and proposed assignments. After you approve the exact proposal, the manager records that decision:

```sh
delivery approve-plan --config <configuration> --initiative <id> --digest <presented-plan-digest>
```

Approval queues continuation. The active workspace scheduler picks it up; `delivery tick --config <configuration>` also advances queued work. Approval does not bypass current configuration, admission or release checks. Changed plans require fresh approval. `delivery run` remains a lower-level command for already-authorized automatic execution and legacy integrations; the manager must use `manage` instead.

## Parallel work and continuity

The logical initiative owner persists in SQLite across bounded worker invocations. It is not a permanently running model or a guarantee that each worker appears as a sidebar conversation. Independent children can execute in separate worktrees within the configured capacity. Coupled children currently execute through a combined parent worktree, with aggregate acceptance; parallel coupled writers are not implemented.

The installed and activated macOS scheduler checks every five minutes. It continues approved work across days while the host is awake, connected and has access/quota. Reopening a chat is not required. Do not create another per-client dispatch scheduler. Chat-native notifications and cloud execution are not implied: configured desktop/Linear notifications report completion, blockers or decisions. Direct status requests can always read the same records from another client.

Legacy managers retain their existing work until an explicit handoff. Installing this release does not migrate seats or transfer an initiative between ownership stores. Cross-client execution parity, authenticated UI delivery and a completed destination pilot require live proof beyond the test suite.
