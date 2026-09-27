# Engineering decision guide

Generated from `cards.json`. Edit that source and run `node scripts/render-knowledge-guide.mjs`; this readable guide is not a second knowledge authority.

Source file SHA-256: `7df8ca4561001b09351d4048379116ad79ea8aa40622fa676c97255ee564f37a`.

Use these as scoped decision aids. Repository conventions, approved product behavior and actual runtime contracts take precedence. The examples are illustrative, and an exception is not permission to weaken a required safety or authorization boundary.

- [Keep one mutable owner](#state-single-owner)
- [Use effects for external synchronization](#effects-external-sync)
- [Shape components around cohesive responsibility](#components-cohesive-ownership)
- [Use composition when consumers control structure](#components-composition-contracts)
- [Treat module boundaries as ownership contracts](#modules-public-contracts)
- [Validate unknown data at boundaries](#types-boundary-validation)
- [Render asynchronous states explicitly](#queries-explicit-async-states)
- [Make cache identity complete](#cache-identity-and-invalidation)
- [Reconcile mutations from confirmed results](#mutations-confirmed-reconciliation)
- [Define the snapshot and delta contract](#realtime-snapshot-delta-contract)
- [Treat persistence as a versioned boundary](#storage-versioned-boundary)
- [Design distributed work around invariants](#distributed-invariants-and-failure)
- [Choose replication and partitioning from access patterns](#distributed-replication-partitioning)
- [Match dataflow mode to latency and correction needs](#dataflow-batch-stream-choice)
- [Test behavior at the cheapest useful boundary](#tests-risk-observable-behavior)
- [Select patterns by pressure and cost](#patterns-costed-selection)
- [Keep render pure and identity stable](#react-render-purity-and-identity)
- [Use refs for imperative work after commit](#react-refs-and-commit-timing)
- [Preserve native semantics and accessible names](#ui-semantics-and-accessibility)
- [Contain rendering failures at useful boundaries](#component-error-boundaries)
- [Split loading at measured user boundaries](#lazy-loading-boundaries)
- [Make dependency resolution reproducible](#dependency-reproducibility)
- [Compose transformations when the dataflow stays visible](#functional-composition-pipelines)
- [Model navigation state by durability and shareability](#navigation-state-contracts)
- [Optimize React work from measurements](#react-performance-evidence)
- [Extract hooks around a clear capability](#custom-hooks-intent-boundaries)
- [Make UI branches explicit at their natural scale](#ui-branching-explicitness)
- [Keep layout and contextual styling ownership clear](#component-style-ownership)
- [Scale from workload shape and tail latency](#operations-load-and-tail-latency)
- [Make recovery and change executable](#operations-recovery-and-change)
- [Choose a data model from relationships and access paths](#data-model-access-patterns)
- [Treat indexes as maintained derived data](#storage-index-workload-tradeoffs)
- [Separate transactional and analytical workload needs](#data-transactional-versus-analytical)
- [Test both directions of schema evolution](#encoding-reader-writer-compatibility)
- [Specify session guarantees and failover loss](#replication-session-and-failover-guarantees)
- [Define conflict semantics beyond quorum arithmetic](#replication-conflict-and-quorum-contract)
- [Partition from key distribution and query shape](#partitioning-keys-indexes-and-rebalance)
- [Name the transaction guarantee by anomaly](#transactions-isolation-contract)
- [Prevent lost updates at the write boundary](#transactions-lost-updates-and-cas)
- [Protect predicates from write skew and phantoms](#transactions-write-skew-and-phantoms)
- [Choose serializable execution with its retry and contention costs](#transactions-serializable-costs)
- [Enforce lease generations at the protected resource](#distributed-leases-and-fencing)
- [Match ordering guarantees to the invariant](#consistency-ordering-and-coordination)
- [Separate consensus from atomic commit](#consensus-versus-atomic-commit)
- [Make batch outputs replayable and deliberately published](#batch-replay-and-publication)
- [Choose queues and replay logs by consumption semantics](#messaging-queue-versus-replay-log)
- [Derive projections from one committed source](#dataflow-source-and-projection-contract)
- [Define event time, lateness, and join state](#stream-event-time-and-joins)
- [Checkpoint state with position and bound external effects](#stream-checkpoints-and-effects)
- [Preserve request identity to the effect boundary](#end-to-end-idempotency-and-integrity)
- [Verify recovery and derived state with executable audits](#operations-audit-and-restore)
- [Define purpose, subjects, retention, and accountability](#data-privacy-purpose-and-retention)
- [Choose state ownership from authority and lifetime](#state-location-and-provider-contracts)
- [Correlate messages and consume approval safely](#authorization-single-use-intents)
- [Finish initialization explicitly and preserve user intent](#lifecycle-readiness-and-user-feedback)
- [Own live subscriptions and their recovery backstop](#realtime-subscription-lifecycle)
- [Connect external stores through a snapshot contract](#react-external-store-snapshots)
- [Learn a pattern by proving its effect](#practice-evidence-led-adoption)

<a id="state-single-owner"></a>

## Keep one mutable owner

Choose one authoritative owner for each mutable value. Compute projections at the point of use instead of copying them into another store or component. Lift state only when independent consumers need to coordinate writes or share a lifecycle. A render observes a fixed state snapshot; a setter queues a future render rather than changing that snapshot. Use the prior-state updater form when queued updates compose from the previous value, and replace object or array state immutably so React can observe the new identity.

**Apply when:** a value can be derived from props, query data, route state, or another field; multiple layers can write the same concept; a provider boundary is being designed.

**Boundary notes:** a draft intentionally diverges from a saved value, an undo buffer preserves history, or a local form needs an editable snapshot. Those are distinct states and should be named as such.

**Checks:** identify the writer, lifetime, reset event, and derivation. Verify that removing a mirror cannot lose user intent. Group related event updates deliberately, never read a setter as synchronous assignment, and do not mutate existing state objects. Do not introduce a global store merely to avoid passing data through one or two generic layers.

**Anti-pattern:** Duplicate an authoritative value in state and synchronize it after render.

**Why it fails:** The copies can disagree for a render, gain competing writers, or overwrite an unsaved edit.

**Bad example (illustrative):**

```text
const [total, setTotal] = useState(0); useEffect(() => setTotal(sum(items)), [items]);
```

**Better example (illustrative):**

```text
const total = sum(items); Keep a separately named draft only when the user can edit it independently.
```

**Legitimate exceptions:** An editable draft, undo history or deliberate snapshot is real additional state. Define its initialization and reset policy; do not replace a dirty draft whenever a server refresh arrives.

**Verification scenario:** Change the source inputs and check the displayed total immediately. For a draft, refresh the saved record and verify the approved dirty-edit behavior.

**Additional decision constraints:** Group fields that transition together and avoid redundant or deeply nested state when a stable identifier and derived lookup suffice. A form draft is distinct from the saved record; define when it resets and how concurrent saved-data refreshes affect unsaved edits.

Topics: `state`, `planning`, `review`.

<a id="effects-external-sync"></a>

## Use effects for external synchronization

An effect synchronizes React state with a system outside render, such as a subscription, timer, browser API, or imperative widget. User actions belong in event handlers, and values determined by current inputs belong in render-time derivation.

**Apply when:** setup and cleanup follow a component lifecycle, or an external resource must track a committed value.

**Boundary notes:** copying props into state, computing filtered data, or triggering a mutation because another state field changed. These obscure causality and add extra render cycles.

**Checks:** name the external system, make setup and cleanup symmetric, list every reactive input, and prove repeated setup is safe. Keep stable identities only when an external API requires them, rather than memoizing by default.

**Anti-pattern:** Use an effect as an indirect event handler or as a chain of derived-state updates.

**Why it fails:** The triggering user intent is lost among rerenders, dependencies and remounts; cleanup can be omitted for actual external resources.

**Bad example (illustrative):**

```text
onSubmit: setShouldSave(true); Effect watching shouldSave: save(form).
```

**Better example (illustrative):**

```text
onSubmit: validate and save the submitted values. For an external subscription, an effect connects and returns its matching disconnect.
```

**Legitimate exceptions:** An effect is appropriate when an external system must follow committed props or state. Prefer an existing framework loader or query abstraction for fetching when the repository already provides one.

**Verification scenario:** Submit once, rerender and remount: the action must not repeat. For a subscription, change its scope and verify the previous connection is released.

**Additional decision constraints:** Treat each effect as one independently removable synchronization process. Its dependency list describes the reactive values the code reads; change the code or ownership to change those dependencies rather than suppressing the dependency check. A raw fetch effect needs cancellation or a relevance check before applying a delayed response. Application initialization should have an explicit root owner: module-import side effects can run even if the intended component never mounts.

Separate values that must resynchronize the external resource from event behavior that only needs the latest value. Where the runtime supports an Effect Event or equivalent non-reactive event contract, use it within its documented scope; never use it to hide a dependency that should reconnect or resynchronize the resource. A prior-state updater can remove an unnecessary captured-state read without suppressing dependencies.

Topics: `effects`, `state`, `implementation`, `review`.

<a id="components-cohesive-ownership"></a>

## Shape components around cohesive responsibility

A domain component should own the data and actions that define its behavior when that ownership remains local and testable. Generic presentation components receive explicit values and callbacks. Split a component when parts change for different reasons, not to satisfy an arbitrary line count.

**Apply when:** a domain component only forwards hook results through several layers, or a reusable visual primitive is mixed with domain decisions.

**Boundary notes:** moving every hook into leaf components can duplicate requests or hide ordering constraints. A coordinating parent remains appropriate when siblings must share one transaction or state machine.

**Checks:** trace data ownership, error handling, and mutation authority. Confirm the split gives each piece a clear contract and does not create pass-through wrappers.

**Anti-pattern:** Split solely by line count, or move every query into leaves regardless of coordinated ownership.

**Why it fails:** Indirection can increase while one user operation becomes distributed across components with inconsistent loading or mutation decisions.

**Bad example (illustrative):**

```text
A parent passes every field through WrapperA and WrapperB, neither of which owns behavior.
```

**Better example (illustrative):**

```text
A feature component owns its feature query and actions; a reusable Row receives the display values and callbacks it needs.
```

**Legitimate exceptions:** A parent coordinating sibling selection, a shared transaction or one state machine is a legitimate owner. A small cohesive component needs no extraction.

**Verification scenario:** Change a presentation primitive without changing feature policy; verify coordinated siblings still share the intended operation and error boundary.

Topics: `components`, `state`, `planning`, `implementation`.

<a id="components-composition-contracts"></a>

## Use composition when consumers control structure

Compound components, slots, and render functions are useful when callers need to arrange related UI while the implementation keeps shared behavior and accessibility rules. Prefer ordinary props for a small, stable set of variations.

**Apply when:** child parts share context, callers need layout freedom, or state and accessibility must stay coordinated across a family of elements.

**Boundary notes:** a component with two simple variants does not need a miniature framework. Context also should not hide required data that could be a clear prop on a generic primitive.

**Checks:** define valid nesting, missing-provider behavior, keyboard and focus contracts, and which layer owns state. Ensure the API makes invalid combinations difficult to express.

**Anti-pattern:** Add a large collection of configuration flags for independently arranged parts, or introduce compound components for two fixed variations.

**Why it fails:** Flag combinations become invalid or the API adds ceremony without buying any layout or behavior flexibility.

**Bad example (illustrative):**

```text
Panel({showHeader, hideTitle, footerMode, alternateFooter, nestedBody, ...many layout flags}).
```

**Better example (illustrative):**

```text
Compose named header/body/footer slots when consumers need arrangement freedom, while a common owner maintains focus and shared state.
```

**Legitimate exceptions:** Ordinary props are clearer for a small stable API. Compound parts need a documented provider and nesting contract; composition must not hide required domain data.

**Verification scenario:** Try supported rearrangements and invalid nesting. Verify keyboard interaction, focus restoration and one shared state owner.

**Additional decision constraints:** When delegating props, define which layer owns controlled value, disabled state, event handlers and accessibility attributes. Spreading delegated props after an owned handler can silently replace behavior. Do not pass a guessed native prop into a custom primitive: verify its actual public API and behavior.

Topics: `components`, `composition`, `planning`.

<a id="modules-public-contracts"></a>

## Treat module boundaries as ownership contracts

A module exposes a small public surface and keeps storage, transport, and rendering details private. Dependencies should point toward stable domain contracts. Move genuinely shared concepts to a neutral owner instead of reaching into another feature's internals.

**Apply when:** features import private files from each other, circular dependencies appear, or changing one integration forces unrelated consumers to change.

**Boundary notes:** extracting a shared module for a single speculative reuse adds indirection without creating a real contract. Local duplication can be cheaper until the shared concept is proven.

**Checks:** name the owner, public entry point, dependency direction, and replacement boundary. Verify that tests use the public API and that internal file layout can change without consumer edits.

**Anti-pattern:** Import another feature's internal implementation because it is convenient today.

**Why it fails:** Changing that feature's internals breaks unrelated consumers and may create cyclic ownership.

**Bad example (illustrative):**

```text
Feature B imports feature-a/internal/cache-implementation rather than a supported contract.
```

**Better example (illustrative):**

```text
Expose the intended domain operation from feature A, or move a proven shared concept into a neutral module with explicit consumers.
```

**Legitimate exceptions:** Do not create a shared platform for hypothetical reuse. A local implementation can remain local until another real consumer needs the same contract.

**Verification scenario:** Reorganize internal files without changing public consumers. Use the repository's dependency check to detect forbidden imports and cycles.

Topics: `modules`, `boundaries`, `planning`, `review`.

<a id="types-boundary-validation"></a>

## Validate unknown data at boundaries

Static types describe values after validation. Parse network responses, persisted data, messages, and untyped library output before they enter the domain. Model meaningful variants with discriminated unions and derive unions from runtime registries when both must stay aligned.

**Apply when:** data crosses a process, storage, version, plugin, or trust boundary.

**Boundary notes:** repeated defensive fallbacks inside already-typed code hide contract violations. Type assertions transfer risk without proving anything.

**Checks:** reject unknown discriminants with context, distinguish missing from invalid, and keep validation near ingress. Test malformed, future-version, and partially missing inputs. Do not add optional chaining to values whose type says they exist.

**Anti-pattern:** Assert that untrusted JSON is the current domain type, then scatter defaults through consumers.

**Why it fails:** A compile-time claim neither validates runtime shape nor distinguishes corruption from a valid empty result.

**Bad example (illustrative):**

```text
const record = JSON.parse(raw) as DomainRecord;
```

**Better example (illustrative):**

```text
Parse unknown input at ingress with the repository's schema, then pass a validated discriminated value through typed code.
```

**Legitimate exceptions:** A schema does not replace domain authorization or semantic checks. Trusted internal values do not need repeated parsing and defensive defaults at every access.

**Verification scenario:** Send a malformed field, unknown discriminant and future schema version through the actual boundary. Verify useful rejection and no fabricated domain values.

Topics: `types`, `boundaries`, `implementation`, `review`.

<a id="queries-explicit-async-states"></a>

## Render asynchronous states explicitly

Loading, error, empty, and success are different user states. Preserve that distinction through the query layer and render each state deliberately. Background refresh may keep usable data visible while reporting a non-blocking refresh state. When a query depends on prerequisites, keep execution disabled until every required value exists, then derive the complete cache key from those values and run only while the gate is enabled.

**Apply when:** a screen depends on remote data or an asynchronous computation, including a request that depends on another result or user selection.

**Boundary notes:** an empty collection is not a safe substitute for loading, failure, or waiting for prerequisites. A retained result during refresh is appropriate only when its scope and identity still match the request.

**Checks:** define prerequisite waiting, initial load, retry, empty success, stale data, and background failure behavior. Verify the execution gate and cache key use the same identity inputs, and that access or account changes cannot display data from the previous scope.

**Anti-pattern:** Convert pending, unavailable or failed data to an apparently successful empty result.

**Why it fails:** The screen tells the user no records exist when it has not established that fact; dependent requests may also run without their identity inputs.

**Bad example (illustrative):**

```text
const rows = query.data ?? []; render Empty when rows.length === 0, regardless of query state.
```

**Better example (illustrative):**

```text
Represent prerequisite waiting, first load, error and successful empty data separately. Enable a dependent query only with the same complete identity used in its key.
```

**Legitimate exceptions:** Retaining previously loaded data during a background refresh can be correct within the same identity scope. A disabled query is not necessarily actively loading.

**Verification scenario:** Exercise missing prerequisites, first response, empty success, failure and account change. Never show a previous account's result as the new account's data.

A bounded or filtered list is not proof that an omitted entity does not exist. For an explicitly selected or watched entity outside that list, use the approved authoritative lookup or complete query scope. Keep an asserting data hook inside a subtree that has already established success; do not bypass loading and failure by asserting in an ungated caller.

Topics: `query`, `components`, `implementation`, `review`.

<a id="cache-identity-and-invalidation"></a>

## Make cache identity complete

A cache key must contain every input that can change the returned value, including identity, tenant or account scope, filters, pagination, locale, and version when relevant. Invalidation follows the ownership of the changed server fact.

**Apply when:** remote data is reused, prefetched, paginated, or updated after a mutation.

**Boundary notes:** adding timestamps to keys defeats reuse, while broad invalidation can create load spikes and hide unclear ownership. Local component state does not need a server cache.

**Checks:** compare the key with the request and authorization context, define freshness and garbage-collection expectations, and list which successful mutations invalidate or update each query. Verify logout and scope changes clear or separate sensitive entries.

**Anti-pattern:** Key a scoped response only by resource ID, or invalidate every cache after every mutation.

**Why it fails:** Different requests collide, sensitive data can cross identities, and broad refetches hide unclear ownership while increasing load.

**Bad example (illustrative):**

```text
key = [resourceId] although the request also depends on accountId and filter.
```

**Better example (illustrative):**

```text
key = [resourceType, accountId, resourceId, filter]; update or invalidate the entries whose authoritative server fact actually changed.
```

**Legitimate exceptions:** An account-independent public resource should not acquire an account key without a real identity difference. Equivalent filter objects need canonical semantics.

**Verification scenario:** Read the same resource under two accounts and two filters; then mutate one record and verify the affected views refresh without unrelated cache churn.

**Additional decision constraints:** For a logical move between related cached collections, preserve the complete domain invariant: removing from one view is not proof the destination view was updated. Shared-key cache behavior belongs to one query/cache owner; verify library option scope before supplying conflicting structural-sharing or reconciliation behavior from different observers.

Topics: `cache`, `query`, `boundaries`, `implementation`.

<a id="mutations-confirmed-reconciliation"></a>

## Reconcile mutations from confirmed results

Validate user input before submission, expose the in-flight state, and update cached views from the confirmed server result or targeted invalidation. Use optimistic updates only when the operation is predictably reversible and the temporary state materially improves the interaction.

**Apply when:** a user action changes remote state.

**Boundary notes:** money movement, irreversible actions, conflict-prone edits, and server-assigned values often need confirmation before display. A second client ledger is usually harder to keep correct than the server-backed cache.

**Checks:** define duplicate-click behavior, error recovery, invalidation, and settlement. For optimistic changes, capture rollback data, handle overlapping mutations, and reconcile on completion.

**Anti-pattern:** Invent a final successful record or optimistically apply an irreversible operation before confirmation.

**Why it fails:** The UI claims an outcome the server may reject, and a second client ledger creates another mutable authority.

**Bad example (illustrative):**

```text
Show a finalized transfer with a locally generated final identifier immediately after dispatch.
```

**Better example (illustrative):**

```text
Show the existing in-flight state, use the confirmed server identity/result, and update or invalidate affected cached views.
```

**Legitimate exceptions:** An approved reversible interaction can benefit from an optimistic preview. It needs rollback and overlap handling; an unknown result must not be converted into either success or failure.

**Verification scenario:** Exercise success, rejection and response loss. Verify displayed final values come from authoritative confirmation and retry uses the existing operation contract.

**Additional decision constraints:** Do not automatically retry a non-idempotent logical action unless its stable operation identity reaches an authoritative atomic deduplication boundary. Distinguish replaying a transport message from authorizing another effect. A live event is not a sufficient sole terminal-recovery path when it can be lost: use the existing authoritative result/status or bounded refetch contract. Equivalent operation variants need symmetric settlement, invalidation and recovery. Unknown outcomes remain unknown until reconciled; compensation or user-visible retry behavior requires approved product policy.

Topics: `mutations`, `cache`, `forms`, `implementation`, `review`.

<a id="realtime-snapshot-delta-contract"></a>

## Define the snapshot and delta contract

A live view needs an authoritative snapshot, a clear delta identity, and ordering or version semantics. Apply events idempotently, scope them to the active session, and recover from gaps with a fresh snapshot rather than guessing missing state.

**Apply when:** WebSocket, server-sent event, change-data, or polling channels update shared data.

**Boundary notes:** a low-frequency status that tolerates delay may be simpler and safer with periodic refetch. Do not add a live channel merely because the backend exposes one.

**Checks:** define subscribe and unsubscribe ownership, reconnect behavior, duplicate and out-of-order handling, authorization changes, deletion semantics, and the point at which cached data is considered stale.

**Anti-pattern:** Apply every received event to whichever screen is currently mounted without a scope or ordering contract.

**Why it fails:** A late old-session event, duplicate or missing delta can corrupt a new view or make incomplete data appear current.

**Bad example (illustrative):**

```text
On any socket message: append payload to the current list.
```

**Better example (illustrative):**

```text
Bind the subscription to its scope; apply the declared event identity/version rules; recover a proven gap from an authoritative snapshot.
```

**Legitimate exceptions:** Use SDK or server guarantees when they already provide ordering and recovery. Do not add a competing client reconciliation system. Infrequent data may only need polling.

**Verification scenario:** Reconnect, switch scope, deliver a duplicate and test a documented gap. Verify cleanup, deletion handling and truthful stale/current state.

**Additional decision constraints:** A guard should reject updates proven invalid under the stream contract, not every update for a currently unknown local entity. Otherwise the first valid creation event can never populate the view. Reconnect may require dropping an obsolete buffered generation and letting a fresh authoritative snapshot win; use the existing transport/SDK guarantee rather than inventing a second reconciliation system.

Topics: `realtime`, `cache`, `distributed`, `planning`, `implementation`.

<a id="storage-versioned-boundary"></a>

## Treat persistence as a versioned boundary

Persist the smallest durable representation and validate it on read. Include a version when the shape can evolve, migrate deliberately, and keep volatile or derivable data out of storage. Storage adapters should expose domain operations rather than leaking serialization details.

**Apply when:** state must survive reloads, process restarts, offline periods, or schema changes.

**Boundary notes:** query caches, secrets, short-lived UI state, and values cheaply recomputed from authoritative data often should not be persisted.

**Checks:** define ownership, key namespace, expiry, corruption behavior, migration, deletion, multi-tab coordination, and privacy. Ensure initialization resolves for valid, missing, invalid, and inaccessible storage.

**Anti-pattern:** Persist a complete runtime object and assume every future read has the same valid shape.

**Why it fails:** Old or corrupt data can break initialization, expose secrets, or freeze the UI in a hydration state that never resolves.

**Bad example (illustrative):**

```text
JSON.parse(stored) is assigned directly to current state; a read error leaves ready=false forever.
```

**Better example (illustrative):**

```text
Persist the minimum durable versioned shape. Validate and migrate supported versions; settle initialization on missing, corrupt and inaccessible storage according to the approved policy.
```

**Legitimate exceptions:** Not every value needs persistence. Do not silently erase unsent user work when it fails validation; recovery behavior is a product decision.

**Verification scenario:** Load valid, old, future, corrupt and unavailable storage. Every path must reach an explicit usable or recoverable state.

Topics: `storage`, `types`, `boundaries`, `implementation`.

<a id="distributed-invariants-and-failure"></a>

## Design distributed work around invariants

Networked operations can be delayed, duplicated, reordered, or partially completed. Start from the invariant that must remain true, then choose idempotency, transactions, coordination, or compensation according to the failure cost and system boundary.

**Apply when:** work crosses processes, databases, queues, or external providers.

**Boundary notes:** local in-memory transformations do not need distributed coordination. Stronger guarantees also carry latency and availability costs that may not serve the product requirement.

**Checks:** name the authoritative record, retry owner, idempotency scope, timeout meaning, partial-failure outcome, and observability. Distinguish an unknown result from a confirmed failure.

**Anti-pattern:** Treat a timeout as proof that a remote mutation never happened.

**Why it fails:** The operation can commit remotely before its response is lost, so a blind retry can repeat its effect.

**Bad example (illustrative):**

```text
Request times out; create a new operation and dispatch the same consequential write again.
```

**Better example (illustrative):**

```text
Preserve the logical operation identity, read back authoritative state, and reconcile an unknown outcome before retrying a mutation.
```

**Legitimate exceptions:** Pure reads and idempotent operations can have bounded retry policies. A local pure transformation needs no distributed coordinator.

**Verification scenario:** Inject failure before dispatch and after remote commit. Verify one intended effect and distinct confirmed-failure versus unknown-outcome states.

Topics: `distributed`, `boundaries`, `planning`, `review`.

<a id="distributed-replication-partitioning"></a>

## Choose replication and partitioning from access patterns

Replication improves availability and read scale but introduces lag and conflict choices. Partitioning improves scale by dividing ownership but makes cross-partition operations and hot keys more expensive. Select keys from observed access and growth patterns.

**Apply when:** one node or database boundary cannot meet availability, throughput, locality, or recovery needs.

**Boundary notes:** adding replicas or shards before measuring the bottleneck creates operational complexity without a demonstrated benefit.

**Checks:** define read consistency, failover, conflict resolution, rebalance, hot-key behavior, backup recovery, and cross-partition query costs. Test failure and recovery, not only steady-state throughput.

**Anti-pattern:** Add replicas or shards before identifying the limiting resource and consistency requirement.

**Why it fails:** The system gains replication lag, cross-owner coordination and recovery work without removing the measured bottleneck.

**Bad example (illustrative):**

```text
Shard every table because traffic might eventually grow.
```

**Better example (illustrative):**

```text
Measure the workload and bottleneck first; choose a partition or replica strategy only for the demonstrated capacity, locality or recovery need.
```

**Legitimate exceptions:** A clear contractual locality or availability requirement can justify distribution before throughput saturation. Replication and partitioning solve different problems.

**Verification scenario:** Measure the target workload, hot-key distribution, failover behavior and data loss boundary; verify the proposed split improves the actual constraint.

Topics: `distributed`, `data`, `planning`.

<a id="dataflow-batch-stream-choice"></a>

## Match dataflow mode to latency and correction needs

Batch processing offers bounded input and straightforward replay. Stream processing reduces latency but requires event-time, ordering, checkpoint, and correction semantics. A durable log can connect both when consumers need independent replay.

**Apply when:** deriving indexes, analytics, notifications, search views, or materialized projections from changing records.

**Boundary notes:** a synchronous request is preferable when the caller needs an immediate authoritative result and the operation fits one ownership boundary.

**Checks:** define event identity, schema evolution, replay, late data, backfill, duplicate handling, and how derived views are rebuilt. Keep the source record separate from projections.

**Anti-pattern:** Use streaming merely because an event infrastructure exists, or use batch despite an explicit low-latency requirement.

**Why it fails:** Complexity or stale results are introduced without serving the accepted latency and correction contract.

**Bad example (illustrative):**

```text
A daily report gains a continuously maintained stateful pipeline with no freshness requirement.
```

**Better example (illustrative):**

```text
Use a bounded replayable batch for daily output; use a stream when latency warrants it and define lateness, replay and corrections.
```

**Legitimate exceptions:** A synchronous operation can remain in one transaction when the caller needs an immediate authoritative result. Hybrid paths require explicit ownership of shared outputs.

**Verification scenario:** Test freshness, replay and corrected input against the accepted outcome, including what users see while a derived view catches up.

Topics: `distributed`, `data`, `realtime`, `planning`.

<a id="tests-risk-observable-behavior"></a>

## Test behavior at the cheapest useful boundary

A test earns its cost by detecting a realistic regression. Pure transformations and state machines fit unit tests; boundary adapters need contract tests; a few critical journeys need integration or browser coverage. Assert observable outcomes instead of internal call order.

**Apply when:** behavior contains branching, money or permission risk, serialization, concurrency, recovery, or a previously observed failure.

**Boundary notes:** tests that repeat type checks, mirror implementation details, or only confirm static text often create noise without protecting behavior.

**Checks:** state the regression each test prevents, control time and randomness, isolate external systems behind stable fixtures, and include failure and cancellation where they change the outcome. Remove flaky timing guesses in favor of observable completion.

**Anti-pattern:** Assert that the implementation called a helper rather than that the user-visible outcome is correct.

**Why it fails:** Refactoring breaks harmless tests while the real regression can still ship; timing sleeps make results nondeterministic.

**Bad example (illustrative):**

```text
Assert helper was called twice, or sleep for an arbitrary delay and assume the request completed.
```

**Better example (illustrative):**

```text
Assert the observable state after a controlled response or explicit completion signal, with a regression scenario tied to a real requirement.
```

**Legitimate exceptions:** Call counts can be the actual contract for deduplication or resource ownership. Mock infrastructure at a boundary; do not mock the behavior being proved.

**Verification scenario:** Demonstrate that the known incorrect behavior fails the test and a valid alternative implementation passes it.

**Additional decision constraints:** Repeated deterministic architecture rules should become the narrowest suitable type, lint, dependency, dead-code or build check. Automate mechanical findings and deterministic autofixes; keep semantic architecture and product judgment in review. Run the repository quality command appropriate to the changed surface and inspect its resulting diff rather than treating autofix success as acceptance.

Topics: `testing`, `review`, `implementation`.

<a id="patterns-costed-selection"></a>

## Select patterns by pressure and cost

Use the smallest design that makes current variation, ownership, and failure behavior clear. A registry or resolver becomes valuable when several stable variants implement the same operations and exhaustive coverage matters. Keep direct code when the variation is small or still changing shape.

**Apply when:** choosing a provider, state machine, adapter, resolver, registry, or shared abstraction.

**Boundary notes:** wrapping every library, extracting every repeated line, or building for hypothetical variants adds navigation and maintenance cost. Repetition can be evidence to observe before it becomes an abstraction.

**Checks:** list the concrete variants, shared operations, expected growth, replacement boundary, and failure modes. Compare the abstraction's ongoing cost with the duplication or coupling it removes.

**Anti-pattern:** Introduce a resolver, provider hierarchy or framework before stable variation creates a concrete need.

**Why it fails:** Extra concepts and navigation cost exceed the coupling or duplication removed.

**Bad example (illustrative):**

```text
Wrap two unrelated functions behind a generic plug-in interface for imagined future backends.
```

**Better example (illustrative):**

```text
Keep direct code for small variation. Use exhaustive dispatch when several stable variants share the same operations and missing-case detection has practical value.
```

**Legitimate exceptions:** A security or compatibility boundary can justify an adapter even for one implementation. Variant count alone is not an architectural rule.

**Verification scenario:** Add the next real variant on paper and compare changed files, invalid states and debugging paths under the direct and abstracted designs.

**Additional decision constraints:** Diagnose complexity as change amplification, cognitive load and hidden dependencies. Prioritize the cost in frequently changed surfaces rather than optimizing a rarely touched implementation for an abstract cleanliness score. A useful abstraction hides meaningful complexity behind a small stable interface; a pass-through wrapper may hide nothing.

Topics: `planning`, `review`, `variants`, `modules`.

<a id="react-render-purity-and-identity"></a>

## Keep render pure and identity stable

Rendering computes UI from current inputs. Do not mutate refs, external objects, subscriptions, or other components during render. Put interaction-caused work in event handlers and lifecycle synchronization after commit. Stable list keys and component positions preserve the intended identity across insertion, removal, sorting, and conditional branches.

**Apply when:** rendering a mutable list, resetting component state, or touching a ref or external object from component code.

**Boundary notes:** generating a fresh key during render forces replacement rather than stability. An index key is safe only for a truly fixed list whose items never reorder, insert, or delete.

**Checks:** keys are unique among siblings and stable for the same entity, render is repeatable, and every mutation has an explicit event or commit-time owner.

**Anti-pattern:** Mutate an external value during render or assign a fresh key to each render of the same entity.

**Why it fails:** Repeated or abandoned rendering can produce side effects, while changing keys remounts components and loses local user state.

**Bad example (illustrative):**

```text
items.map(item => <Row key={randomId()} item={item} />)
```

**Better example (illustrative):**

```text
items.map(item => <Row key={item.id} item={item} />); perform external work in its event or committed lifecycle owner.
```

**Legitimate exceptions:** An intentional identity change can reset a subtree. A fixed positional list can use positional identity only when insertion, removal and reordering truly cannot occur.

**Verification scenario:** Edit a row and reorder the list: state must follow the entity. Repeated rendering must not publish an external effect.

Topics: `components`, `state`, `effects`, `review`.

<a id="react-refs-and-commit-timing"></a>

## Use refs for imperative work after commit

A ref stores information outside rendering or points to an imperative resource. Read or write it from events, effects, or ref callbacks, not while rendering. A deterministic one-time lazy initialization can be safe when it creates no external effect and always yields the same component-owned object. When code must observe DOM created by a state update, prefer a layout or effect boundary; force a synchronous commit only for a proven integration timing requirement.

**Apply when:** focusing, scrolling, measuring, controlling a non-React widget, or maintaining a keyed collection of DOM nodes.

**Boundary notes:** visible data belongs in state. A synchronous flush can reduce batching and should not become the default fix for ordering confusion.

**Checks:** handle null and removal in ref callbacks, keep imperative scope local, prove the DOM timing requirement, and test repeated mount and cleanup.

**Anti-pattern:** Expect ref mutation to update visible UI, or read newly requested DOM before React has committed it.

**Why it fails:** Refs do not schedule rendering and state setters do not synchronously replace the DOM.

**Bad example (illustrative):**

```text
setExpanded(true); immediately measure the not-yet-mounted details node.
```

**Better example (illustrative):**

```text
Measure the committed node through the appropriate ref or layout lifecycle; use state for data that determines rendered output.
```

**Legitimate exceptions:** Deterministic one-time ref initialization can be valid. A forced synchronous commit needs a demonstrated imperative integration requirement, not a general ordering workaround.

**Verification scenario:** Test initial mount, update and removal; verify null handling and the exact committed DOM measured, without relying on arbitrary delays.

Topics: `components`, `effects`, `implementation`, `review`.

<a id="ui-semantics-and-accessibility"></a>

## Preserve native semantics and accessible names

Choose elements by behavior: buttons perform actions, links navigate, labels identify controls, and form semantics support keyboard submission and validation. Visual-only icons and status indicators need an accessible name or nearby hidden text. Polymorphic components must preserve the semantics and required attributes of the selected element.

**Apply when:** building controls, forms, icon buttons, navigation, dialogs, or a polymorphic primitive.

**Boundary notes:** visual styling does not change an element's role. A disabled control can also hide why an action is unavailable, so provide understandable feedback when users need it.

**Checks:** keyboard operation, focus order, accessible name, label association, state announcement, and element-specific required attributes.

**Anti-pattern:** Choose an element only for appearance and add click handling without its native interaction contract.

**Why it fails:** Keyboard users and assistive technology may be unable to identify or activate the control.

**Bad example (illustrative):**

```text
A clickable div containing only an unlabeled decorative icon performs a destructive action.
```

**Better example (illustrative):**

```text
Use a button with an accessible action name for the action, a link for navigation, and associated labels for form controls.
```

**Legitimate exceptions:** A custom widget may need explicit roles and keyboard behavior when native elements cannot express its approved interaction. Styling alone is not that justification.

**Verification scenario:** Operate the journey without a mouse; inspect accessible name, focus order, announced state and recovery focus.

Topics: `components`, `accessibility`, `review`.

<a id="component-error-boundaries"></a>

## Contain rendering failures at useful boundaries

An error boundary limits the UI affected by a render failure and presents a recovery path appropriate to that region. Place boundaries around independently useful routes, panels, or integrations, and record enough context to diagnose the failure.

**Apply when:** one subtree can fail without making the entire application unusable, including lazy-loaded or third-party UI.

**Boundary notes:** boundaries do not catch every asynchronous event or server failure, and a single root fallback gives poor isolation. Do not expose sensitive diagnostic details to users.

**Checks:** fallback usefulness, retry or navigation path, reset trigger, logging, nested-boundary behavior, and accessibility of the failure state.

**Anti-pattern:** Assume one root boundary catches every failure, including asynchronous event-handler failures.

**Why it fails:** An unrelated panel can take down the whole screen, while a failed event promise bypasses the supposed recovery UI.

**Bad example (illustrative):**

```text
A dashboard has only a root fallback; a failed save promise is left to that boundary.
```

**Better example (illustrative):**

```text
Bound independently useful render regions and handle save rejection in the mutation path that owns the operation.
```

**Legitimate exceptions:** Boundary placement should match recovery scope, not every component. Async, server-rendering and event errors need the mechanisms appropriate to their actual boundary.

**Verification scenario:** Cause a render failure in one panel and a rejected user action separately. Verify useful regions survive and each failure reaches its intended recovery UI.

Topics: `components`, `errors`, `implementation`, `review`.

<a id="lazy-loading-boundaries"></a>

## Split loading at measured user boundaries

Lazy loading can reduce initial transfer and evaluation by deferring code that is not needed for the current journey. Put the asynchronous boundary around a route or independently reached feature, provide a stable loading fallback, and pair load failure with an error boundary and retry path.

**Apply when:** bundle analysis shows a meaningful initial cost for code used later or rarely.

**Boundary notes:** splitting tiny or immediately co-used modules adds requests and fallback churn. A fallback should not replace already useful content during routine background work.

**Checks:** measured initial and subsequent latency, preloading strategy, server-render and hydration behavior, failure recovery, focus continuity, and layout stability.

**Anti-pattern:** Split every small component without measuring the initial cost or subsequent loading behavior.

**Why it fails:** Request waterfalls, fallback churn and repeated loading can outweigh a smaller first bundle.

**Bad example (illustrative):**

```text
Lazy-load every field in a form that users open together.
```

**Better example (illustrative):**

```text
Defer one measured, rarely reached feature behind a stable loading boundary and a load-failure recovery path.
```

**Legitimate exceptions:** Eager loading or preloading is appropriate for highly likely next actions or tightly coupled UI. Splitting is not automatically a performance win.

**Verification scenario:** Measure cold entry and opening the deferred feature. Exercise chunk failure, retry, layout stability and focus continuity.

Topics: `components`, `performance`, `planning`, `implementation`.

<a id="dependency-reproducibility"></a>

## Make dependency resolution reproducible

Commit and enforce one lockfile so clean environments resolve the same dependency graph. Update dependencies intentionally in bounded changes, review release and security impact, and verify the resulting graph in continuous integration.

**Apply when:** builds, tests, or generated artifacts depend on third-party packages.

**Boundary notes:** exact versions written everywhere do not replace a valid lockfile, and indefinite pinning prevents needed fixes. Broad automatic upgrades make regressions harder to isolate.

**Checks:** frozen install in CI, runtime and package-manager versions, lockfile review, transitive changes, rollback path, and periodic supported-version updates.

**Anti-pattern:** Treat exact direct versions as a substitute for a lockfile, or rewrite the dependency graph incidentally during unrelated work.

**Why it fails:** Transitive resolution and toolchain differences can change behavior without a reviewable source change.

**Bad example (illustrative):**

```text
CI resolves dependencies afresh while developers commit results from different package-manager versions.
```

**Better example (illustrative):**

```text
Use the repository lockfile and pinned toolchain with a frozen install; isolate intentional upgrades and inspect their transitive impact.
```

**Legitimate exceptions:** Reproducibility does not mean permanent version freeze. Security and compatibility updates still need a deliberate, verified path.

**Verification scenario:** Install from a clean checkout with the supported toolchain, then compare the graph and run the behavior affected by an upgrade.

Topics: `modules`, `testing`, `operations`, `review`.

<a id="functional-composition-pipelines"></a>

## Compose transformations when the dataflow stays visible

A typed pipeline can make a sequence of pure transformations read in execution order while preserving the output type of each step as the input to the next. Use named stages when they carry domain meaning and expose failure explicitly.

**Apply when:** several reusable transformations form one linear flow and intermediate types clarify the contract.

**Boundary notes:** one or two ordinary method calls are often clearer. Pipelines that hide branching, side effects, async cancellation, or error policy make control flow harder to inspect.

**Checks:** each stage is independently named or obvious, types connect without assertions, errors remain visible, and debugging can identify the failing stage.

**Anti-pattern:** Hide branching, failure handling or external mutations inside an apparently pure transformation chain.

**Why it fails:** Readers cannot tell where effects occur or which stage owns an error or cancellation.

**Bad example (illustrative):**

```text
pipe(parse, maybeSendNetworkRequest, mutateGlobalState, format) looks like value transformation.
```

**Better example (illustrative):**

```text
Compose named pure transformations; keep the asynchronous operation and its error policy visible in the calling workflow.
```

**Legitimate exceptions:** Ordinary method chaining or two direct calls can be clearer. A pipeline should earn its abstraction through a visible dataflow and compatible types.

**Verification scenario:** Inject an invalid intermediate value and identify the failing boundary. Test pure stages independently and prove the pipeline introduces no hidden external writes.

Topics: `types`, `data`, `implementation`.

<a id="navigation-state-contracts"></a>

## Model navigation state by durability and shareability

Choose URL state for destinations users should refresh, bookmark, share, or revisit through browser history. In-memory view state fits contained flows that intentionally disappear on reload. Typed destination registries can couple each destination with its valid payload and make invalid navigation calls fail early.

**Apply when:** designing a route, modal flow, wizard, desktop view stack, or extension panel.

**Boundary notes:** hiding durable product state only in memory breaks deep links and recovery. Encoding sensitive or large ephemeral payloads in a URL creates different risks.

**Checks:** refresh, back and forward, direct entry, persistence, payload validation, authorization, and unknown destination behavior.

**Anti-pattern:** Keep a shareable destination only in memory, or place sensitive transient payloads in a URL.

**Why it fails:** Refresh and browser history lose the destination, or logs and copied links expose data outside its intended lifetime.

**Bad example (illustrative):**

```text
A selected report is held only in a component boolean, so a shared link opens an unrelated default screen.
```

**Better example (illustrative):**

```text
Put the stable report identifier in the route and validate it on direct entry; keep an unsaved private draft in its appropriate local owner.
```

**Legitimate exceptions:** A disposable modal or contained wizard may intentionally use in-memory view state. Whether refresh preserves draft progress is a product requirement.

**Verification scenario:** Directly open, refresh, share and navigate back through the route; verify authorization and the approved reset or persistence behavior.

**Additional decision constraints:** When a route and local view state must stay aligned, define both directions: user interaction updates the route through the navigation owner, and direct entry/back/forward update the displayed view. Avoid two effects that independently try to overwrite each other.

Topics: `components`, `state`, `types`, `planning`.

<a id="react-performance-evidence"></a>

## Optimize React work from measurements

Keep calculations inline until profiling shows a material cost or an external API requires stable identity. Improve ownership and component boundaries before adding caches. Compiler-supported environments can remove much manual memoization, but lifecycle and integration contracts still need explicit stable identities where required.

**Apply when:** an observed interaction misses its performance target and profiling identifies repeated render or calculation work.

**Boundary notes:** memoizing every object, function, or component adds invalidation complexity and can cost more than recalculation. Hiding a mounted tree may preserve state but also preserves resource usage.

**Checks:** reproduce the slow interaction, measure before and after, include cache invalidation inputs, and remove memoization that no longer changes the result.

**Anti-pattern:** Add or remove memoization throughout an application based only on a blanket rule.

**Why it fails:** Extra caches can cost more than recomputation; removing an existing identity guarantee can change integration behavior.

**Bad example (illustrative):**

```text
Wrap every calculation in memoization, or delete all existing memoization because a compiler is present.
```

**Better example (illustrative):**

```text
Profile the slow interaction, verify compiler coverage, improve ownership first, and make one measured optimization with complete invalidation inputs.
```

**Legitimate exceptions:** Manual memoization may remain useful in uncompiled code or a documented integration contract. A cache is not a substitute for correctness or an effect lifecycle.

**Verification scenario:** Compare representative before/after timings and confirm subscriptions, effect frequency and behavior remain correct after the optimization.

Topics: `components`, `performance`, `review`.

<a id="custom-hooks-intent-boundaries"></a>

## Extract hooks around a clear capability

A custom hook packages stateful behavior or an external synchronization contract behind an intent-revealing API. It shares logic, not state: separate callers remain separate unless the hook connects them to the same external owner. Ordinary hooks must run from a React component or custom hook at stable top-level positions, never conditionally, in a loop, or inside a nested callback. A runtime may document a narrowly named exception for a particular primitive; treat that as version-specific rather than relaxing ordinary hook placement. Keep small local state inline when extraction would only rename primitive calls.

**Apply when:** components repeat a lifecycle, browser integration, query orchestration, or cohesive state transition protocol.

**Boundary notes:** a generic hook that accepts arbitrary callbacks and configuration may conceal dependencies rather than simplify them. Naming an ordinary function with a hook prefix does not make conditional hook calls valid.

**Checks:** name the capability, keep hook execution pure and top-level, expose reactive inputs, constrain effects, define cleanup, and test callers with independent state.

**Anti-pattern:** Assume two callers share state merely because both call the same custom hook.

**Why it fails:** Extracting hook code shares a recipe, not a state instance; independent callers can drift apart.

**Bad example (illustrative):**

```text
Header and editor each call useSelection(), which internally creates its own useState, yet are expected to share one selection.
```

**Better example (illustrative):**

```text
Keep independent hooks for independent instances; put genuinely shared selection in one approved owner and expose that owner through the hook.
```

**Legitimate exceptions:** A hook connected to the same external store can share state. Ordinary hooks still require stable call order; exceptions for specifically documented primitives do not generalize.

**Verification scenario:** Render two callers and check the intended independent/shared behavior. Change branches across renders and verify hook order and cleanup remain valid.

A runtime variant must not choose between calls to ordinary hooks conditionally. Use the established top-level hook composition with explicit enablement, or separate variant components whose own hook order stays stable. A shared return type does not make conditional hook execution valid.

Topics: `components`, `effects`, `modules`, `implementation`.

<a id="ui-branching-explicitness"></a>

## Make UI branches explicit at their natural scale

Use a direct boolean branch for one simple choice, a typed mapping when several stable states select values or views, and a state machine when transitions and invalid combinations matter. Booleanize short-circuit guards when a numeric zero or empty value could render accidentally.

**Apply when:** JSX contains nested conditions, parallel flags can contradict each other, or variants pair rendering with behavior.

**Boundary notes:** a registry for two obvious branches adds indirection, while a chain of flags cannot express transition rules. Early returns help readability but must preserve loading and error states.

**Checks:** enumerate states, reject unknown variants, keep behavior with its view entry, verify transition ownership, and test each meaningful branch.

**Anti-pattern:** Represent mutually exclusive states with unrelated booleans or accidentally render a numeric short-circuit value.

**Why it fails:** Impossible combinations become expressible and a zero can appear as visible text instead of hiding content.

**Bad example (illustrative):**

```text
isLoading=true and isError=true and hasData=false are interpreted independently; count && <Results /> renders 0.
```

**Better example (illustrative):**

```text
Use the repository's explicit state representation and deliberate branches; use count > 0 for a numeric visibility condition.
```

**Legitimate exceptions:** Two independent booleans are correct when both combinations are meaningful. A direct if or conditional expression can be clearer than a registry for a tiny branch.

**Verification scenario:** Enumerate meaningful states and transitions, including zero, missing prerequisites and background refresh; reject impossible combinations at their owner.

Distinguish membership filters from ranking or sorting. A ranking operation should not silently remove entries unless that is its approved contract. Empty-result controls and reset behavior follow approved product semantics.

Topics: `components`, `state`, `types`, `implementation`, `review`.

<a id="component-style-ownership"></a>

## Keep layout and contextual styling ownership clear

A reusable component owns its internal visual contract, while its parent layout owns spacing and placement among siblings. Expose deliberate style hooks or compose a specialized wrapper for approved variants rather than reaching through another component's boundary with unrelated selectors.

**Apply when:** the same primitive appears in several layouts or contextual styling starts crossing component files.

**Boundary notes:** forcing every one-off visual into a global variant bloats the primitive API. Absolute positioning and stacking are appropriate inside a component that owns a controlled positioning context.

**Checks:** identify the layout owner, variant owner, stacking context, responsive behavior, theme token, and whether a local composition is clearer than another prop.

**Anti-pattern:** Make a reusable child impose page-level placement or reach into its private markup from unrelated parent selectors.

**Why it fails:** The component cannot move between layouts safely, and internal markup changes break external styling.

**Bad example (illustrative):**

```text
A generic Card owns a page-specific left margin; a distant stylesheet targets its third nested child.
```

**Better example (illustrative):**

```text
Let the layout own spacing between siblings and the Card own its internals; expose only deliberate visual variants.
```

**Legitimate exceptions:** Absolute positioning is appropriate within an owned positioning context. A one-off composition does not always deserve a global design-system prop.

**Verification scenario:** Reuse the primitive in two layouts and resize both; change its internal markup without changing unrelated selectors or token choices.

Topics: `components`, `composition`, `modules`, `review`.

<a id="operations-load-and-tail-latency"></a>

## Scale from workload shape and tail latency

Characterize request mix, fan-out, skew, and offered load before choosing compute-on-read, precomputation-on-write, or a hybrid for high-fan-out entities. Measure client-observed median and tail latency under representative load because a fan-out request inherits slow dependencies and queueing.

**Apply when:** capacity, caching, denormalization, or distribution is being chosen for growth.

**Boundary notes:** average latency hides outliers, and distributing state before one node is insufficient adds coordination cost. Extreme percentile work needs a service objective, not vanity optimization.

**Checks:** load parameters, hot entities, queue depth, dependency fan-out, percentile target, degradation behavior, and headroom.

**Anti-pattern:** Size a system from average response time while ignoring request fan-out, skew and queued work.

**Why it fails:** A small slow tail or hot entity can dominate the user journey even when the average looks acceptable.

**Bad example (illustrative):**

```text
Average latency is 40 ms, so a request waiting for 100 independent dependencies is assumed to be fast.
```

**Better example (illustrative):**

```text
Model the actual fan-out and offered load, measure client-observed percentiles, and find the saturated or highly skewed resource.
```

**Legitimate exceptions:** Tail optimization needs a service objective and representative traffic. Do not build a distributed system to improve an irrelevant synthetic percentile.

**Verification scenario:** Load a representative skewed workload, include dependency delays and queue depth, and compare the end-user percentile against the stated objective.

Topics: `operations`, `distributed`, `performance`, `planning`.

<a id="operations-recovery-and-change"></a>

## Make recovery and change executable

Hardware redundancy does not correct correlated software, configuration, or operator faults. Design staged rollout, rollback, restore or recompute, and routine maintenance as observable workflows. Recovery evidence comes from exercising the restored system and checking invariants.

**Apply when:** a service stores durable data or changes production behavior.

**Boundary notes:** a successful backup write is not proof of recovery, and maximizing availability without a safe rollback can prolong damage.

**Checks:** ownership, runbook, restore objective, data validation, rollback compatibility, staged exposure, alerting, and a recent recovery exercise.

**Anti-pattern:** Equate redundant hardware or a successful backup operation with recoverability from a bad deployment.

**Why it fails:** Correlated software or configuration errors can affect every replica, and an unread backup may be unusable.

**Bad example (illustrative):**

```text
All replicas received the same incompatible migration; the runbook only says restart a node.
```

**Better example (illustrative):**

```text
Define staged exposure, compatible rollback or forward repair, and a restore/recompute procedure that checks the recovered data.
```

**Legitimate exceptions:** Some schema changes are intentionally forward-only. In that case document and test the approved recovery path rather than claiming rollback exists.

**Verification scenario:** Exercise a representative failed rollout and restore in a non-production environment; verify data invariants and recovery time.

Topics: `operations`, `testing`, `planning`, `review`.

<a id="data-model-access-patterns"></a>

## Choose a data model from relationships and access paths

Documents suit cohesive aggregates usually read together. Relations suit evolving access paths and many-to-many joins. Variable-depth relationship traversal can justify a graph model. Schema-on-read moves validation to consumers rather than removing schema.

**Apply when:** selecting a primary representation or translating between service and storage models.

**Boundary notes:** documents chosen only to avoid migrations can create application-side joins and consistency work. A graph adds little for a simple keyed aggregate.

**Checks:** read and write paths, relationship cardinality, locality, update granularity, validation owner, query evolution, and migration strategy.

**Anti-pattern:** Choose a document or graph store solely to avoid schema work or because its model appears flexible.

**Why it fails:** Joins, integrity checks and migration responsibilities reappear in less visible application code.

**Bad example (illustrative):**

```text
An evolving many-to-many model is embedded into documents and updated through scattered manual copies.
```

**Better example (illustrative):**

```text
Start from relationships and access paths; choose cohesive documents, relational joins or variable-depth graph traversal according to those needs.
```

**Legitimate exceptions:** Denormalized duplication can be appropriate for a measured read path when one authority and an update/rebuild contract are explicit.

**Verification scenario:** Walk through a relationship change, a new query and a partial update; identify where each invariant is enforced and how old data evolves.

Topics: `data`, `storage`, `planning`, `review`.

<a id="storage-index-workload-tradeoffs"></a>

## Treat indexes as maintained derived data

Indexes accelerate chosen reads at the cost of writes, space, rebuilds, and operational work. Hash lookup serves exact keys, sorted structures serve ranges, log-structured storage favors sequential writes with compaction costs, and in-place trees trade different recovery and locking behavior.

**Apply when:** choosing or adding an index or storage engine.

**Boundary notes:** an index for every query amplifies writes. In-memory serving still needs a durability and restart contract.

**Checks:** exact versus range reads, write and read amplification, absent-key behavior, tombstones, checksums, compaction bandwidth and temporary disk, tail latency during maintenance, and rebuild procedure.

**Anti-pattern:** Add an index for every read without accounting for its maintained state and maintenance costs.

**Why it fails:** Write amplification, storage and compaction can worsen the actual latency target or exhaust headroom.

**Bad example (illustrative):**

```text
Add several overlapping indexes to speed one rare report on a write-heavy table.
```

**Better example (illustrative):**

```text
Measure query selectivity and workload; choose the minimum useful indexes and verify write cost, rebuild and maintenance behavior.
```

**Legitimate exceptions:** A critical low-frequency query can still justify an index. The decision is its service requirement and cost, not frequency alone.

**Verification scenario:** Compare exact/range access, write throughput, tail latency during compaction or rebuild, and temporary disk requirements.

Topics: `storage`, `data`, `performance`, `planning`, `review`.

<a id="data-transactional-versus-analytical"></a>

## Separate transactional and analytical workload needs

Point reads and updates differ from wide scans and aggregates. Column-oriented projection and compression can help analytical scans while making mutation more expensive. Isolate analytical work from latency-sensitive transactions when contention matters.

**Apply when:** operational queries, reporting, and large aggregates compete for the same resources.

**Boundary notes:** duplicating data into an analytical store adds freshness and pipeline responsibilities. A materialized aggregate helps known reads but increases write maintenance.

**Checks:** projection, scan volume, update rate, freshness requirement, workload isolation, backfill, and cutover or rebuild.

**Anti-pattern:** Run unbounded analytical scans through the same constrained resources as latency-sensitive transactions.

**Why it fails:** The scan competes for CPU, memory, cache and I/O, causing unpredictable transactional latency.

**Bad example (illustrative):**

```text
A dashboard repeatedly scans all historical rows on the primary database during peak writes.
```

**Better example (illustrative):**

```text
Use an appropriately indexed bounded query, materialized aggregate or isolated analytical projection according to measured cost and required freshness.
```

**Legitimate exceptions:** A small occasional scan may fit the existing database. A second store adds a synchronization and recovery obligation that must be justified.

**Verification scenario:** Run reporting and transactional load together; measure freshness and tail latency, then exercise projection rebuild if a separate read model is chosen.

Topics: `data`, `storage`, `planning`.

<a id="encoding-reader-writer-compatibility"></a>

## Test both directions of schema evolution

Mixed deployments and durable old records require new readers with old writers and old readers with new writers. Preserve stable field identities, never reuse removed tags, add fields with compatible defaults, and retain unknown data through read-modify-write when the format requires it.

**Apply when:** data persists across versions or crosses services, queues, plugins, or client releases.

**Boundary notes:** matching current producer and consumer types proves only one moment. Language-object deserialization also creates version, language, and security coupling.

**Checks:** compatibility matrix, writer schema availability, absence versus default, numeric precision, unknown fields, rolling upgrade, queued old messages, and rollback.

**Anti-pattern:** Test only the newest producer with the newest consumer and assume a rolling deployment is compatible.

**Why it fails:** Old messages, stored records and old binaries can remain active while the new schema is already being written.

**Bad example (illustrative):**

```text
Reuse a deleted numeric field tag for a different meaning after upgrading the current service.
```

**Better example (illustrative):**

```text
Keep field identities stable and test old-reader/new-writer plus new-reader/old-writer behavior, including rollback and queued records.
```

**Legitimate exceptions:** A coordinated breaking change is possible when all participants and old data are explicitly migrated or version-separated. Defaults must preserve approved meaning.

**Verification scenario:** Run the compatibility matrix with absent and unknown fields, large numeric values and read-modify-write round trips.

Topics: `types`, `storage`, `boundaries`, `implementation`, `review`.

<a id="replication-session-and-failover-guarantees"></a>

## Specify session guarantees and failover loss

Synchronous replication trades latency and availability for replicated durability. Asynchronous failover can lose acknowledged but unreplicated writes and needs an old-leader fencing and rejoin path. Define read-your-writes, monotonic reads, and causal-prefix reads separately because routing and progress barriers solve different guarantees.

**Apply when:** followers serve reads or a leader can fail over.

**Boundary notes:** arbitrary sticky-session timeouts do not prove read-your-writes, especially across devices. An elected leader alone does not make arbitrary replica reads current.

**Checks:** acknowledgement boundary, bootstrap snapshot plus log position, lag, session progress token, cross-device behavior, failover loss, and rejoin fencing.

**Anti-pattern:** Assume an elected leader makes follower reads current or that a fixed sticky-routing delay proves read-your-writes.

**Why it fails:** Replication delay and failover can exceed the guessed delay or lose writes outside the acknowledged durability boundary.

**Bad example (illustrative):**

```text
Read from a random follower one second after a write because replication is usually fast.
```

**Better example (illustrative):**

```text
Define the session guarantee and route through an authority or progress barrier that can prove the required write has been applied.
```

**Legitimate exceptions:** Stale reads can be acceptable when the product explicitly tolerates them. Synchronous replication strengthens a stated boundary at latency and availability cost.

**Verification scenario:** Delay a replica, switch devices and fail over; verify the promised read guarantee and acknowledged-write loss policy.

Topics: `distributed`, `data`, `realtime`, `planning`, `review`.

<a id="replication-conflict-and-quorum-contract"></a>

## Define conflict semantics beyond quorum arithmetic

Multi-writer and offline operation create asynchronous conflicts. Route an aggregate to one owner when feasible; otherwise retain concurrent versions and use a domain-approved convergent merge. Causal context distinguishes overwrite from concurrency, and tombstones preserve removals during merge.

**Apply when:** writes can reach more than one leader or leaderless replicas.

**Boundary notes:** last-write-wins discards data and is suitable only when loss is approved. Overlapping read and write counts alone do not prove linearizability under partial writes, replacement, or sloppy placement.

**Checks:** version context, merge owner, removal semantics, read repair, background anti-entropy, cold-key convergence, partial-write handling, and accepted loss.

**Anti-pattern:** Assume overlapping read/write counts make all operations linearizable, or resolve every concurrent update by the latest wall-clock timestamp.

**Why it fails:** Partial writes, sloppy placement and clock uncertainty can violate the assumed visibility; last-write-wins may silently discard a legitimate update.

**Bad example (illustrative):**

```text
Two offline edits are merged by whichever client clock reports the later time.
```

**Better example (illustrative):**

```text
Prefer one aggregate owner where feasible; otherwise preserve causal context and use a domain-approved convergent merge or explicit conflict resolution.
```

**Legitimate exceptions:** Lossy overwrite can be acceptable for a deliberately last-value-wins field. That permission does not transfer to balances, counters or arbitrary user edits.

**Verification scenario:** Run concurrent writes, partial acknowledgements and a replica replacement; verify accepted loss, removal semantics and convergence of cold as well as hot keys.

Topics: `distributed`, `data`, `planning`, `review`.

<a id="partitioning-keys-indexes-and-rebalance"></a>

## Partition from key distribution and query shape

Range keys preserve scans but can concentrate sequential writes. Hashing spreads distinct keys but loses locality and cannot split one hot key. Local secondary indexes keep writes local and scatter reads; global term indexes target reads while adding distributed write maintenance.

**Apply when:** data or traffic must be divided across owners.

**Boundary notes:** more shards do not improve one dominant hot key or global joins. Salting a key moves complexity into read aggregation and must fit operation semantics.

**Checks:** skew, range needs, hot-key mitigation, index placement, resize algorithm, rebalance bandwidth, overload prevention, routing metadata ownership, and update propagation.

**Anti-pattern:** Expect hashing more partitions to solve one overwhelmingly hot key, or change the partition-count formula without a migration.

**Why it fails:** One key remains owned by one partition and a new modulo can remap most data while readers still use the old routing.

**Bad example (illustrative):**

```text
Shard by hash(customerId), then increase the shard count to fix one dominant customer.
```

**Better example (illustrative):**

```text
Measure skew and query locality; choose a domain-compatible hot-key strategy and a deliberate routing/rebalance protocol.
```

**Legitimate exceptions:** Salting helps only if the operation can split and later aggregate correctly. Ordered range access and global indexes impose different costs from keyed lookup.

**Verification scenario:** Exercise a skewed workload and rebalance under traffic; verify no key is lost, doubly owned or routed through stale metadata.

Topics: `distributed`, `data`, `planning`, `review`.

<a id="transactions-isolation-contract"></a>

## Name the transaction guarantee by anomaly

Atomic rollback, application invariants, isolation, and durability are distinct. Isolation labels vary across engines, so state which anomalies the chosen level prevents. Read committed blocks dirty reads and writes but does not give a consistent multi-query snapshot; snapshot isolation is not automatically serializable.

**Apply when:** several reads or writes must preserve an invariant under concurrency.

**Boundary notes:** a transaction cannot protect an external effect or another store outside its boundary without an additional protocol.

**Checks:** dirty read and write, non-repeatable read, lost update, write skew, phantom, retry behavior, durability boundary, and external side effects.

**Anti-pattern:** Treat a transaction label as proof that every application invariant is protected.

**Why it fails:** Atomic rollback and isolation are different guarantees, and engines assign different behavior to similarly named levels.

**Bad example (illustrative):**

```text
A multi-query report assumes one consistent snapshot merely because its reads run in a read-committed transaction.
```

**Better example (illustrative):**

```text
Name the forbidden anomaly, choose the engine guarantee that prevents it, and keep the entire invariant within that boundary.
```

**Legitimate exceptions:** Read committed can be sufficient for operations whose invariants do not depend on a stable multi-query view. External effects remain outside a local database transaction.

**Verification scenario:** Run a concurrent schedule that would violate the actual invariant and confirm the documented blocking, visibility or abort behavior.

Topics: `distributed`, `data`, `mutations`, `planning`, `review`.

<a id="transactions-lost-updates-and-cas"></a>

## Prevent lost updates at the write boundary

A read-modify-write cycle can overwrite a concurrent change. Prefer an atomic relative update, explicit lock, or an atomic compare-and-set or version condition. Verify the affected result and retry the whole read, compute, and write against fresh state.

**Apply when:** a new value depends on the value previously read.

**Boundary notes:** a stale snapshot WHERE condition is not necessarily a correct current-value comparison, and conflict detection depends on the engine and isolation level. Single-key atomicity cannot protect a cross-row predicate.

**Checks:** atomic evaluation, result inspection, bounded retry, fresh reread, contention behavior, idempotent external work, and engine-specific proof.

**Anti-pattern:** Read a value, calculate locally and unconditionally overwrite a concurrent writer's update.

**Why it fails:** Each individual write can be atomic while the read-compute-write sequence still loses an update.

**Bad example (illustrative):**

```text
Two workers read count=5; each writes count=6, losing one increment.
```

**Better example (illustrative):**

```text
Use an atomic relative increment or a verified version comparison. On conflict, reread and recompute the whole attempt.
```

**Legitimate exceptions:** A user-authorized absolute replacement is a different operation from incrementing a prior value. Single-row comparison does not protect a cross-row capacity predicate.

**Verification scenario:** Force both workers to read before either writes; verify the final count or explicit conflict and ensure retries do not repeat external effects.

Topics: `distributed`, `data`, `mutations`, `implementation`, `review`.

<a id="transactions-write-skew-and-phantoms"></a>

## Protect predicates from write skew and phantoms

Two transactions can each observe a valid predicate, update different rows, and jointly violate the invariant without overwriting each other. Protect the complete predicate with serializable isolation or correct predicate, range, or common-guard locking.

**Apply when:** an invariant depends on a count, absence, range, capacity, or multiple records.

**Boundary notes:** locking only rows that currently exist misses a concurrent insert into an empty result. Atomic updates to separate keys do not protect their combined constraint.

**Checks:** encode the invariant, run concurrent compatible reads followed by incompatible writes, inspect insert phantoms, and verify abort or blocking behavior.

**Anti-pattern:** Protect an aggregate invariant by locking only currently matching rows or by comparing versions of separate written rows.

**Why it fails:** Concurrent inserts or disjoint writes can leave every individual row valid while their combined result violates the constraint.

**Bad example (illustrative):**

```text
Each reservation reads available capacity, locks its own new row and inserts, exceeding the shared limit.
```

**Better example (illustrative):**

```text
Protect the complete capacity predicate with proven serializable execution or a common guard that every relevant writer locks.
```

**Legitimate exceptions:** A database constraint that directly expresses the invariant may be simpler. Locking an empty result does not necessarily lock the absence of future matches.

**Verification scenario:** Coordinate competing reads before their inserts, including the empty-set case; verify one aborts or waits rather than both committing an invalid aggregate.

Topics: `distributed`, `data`, `mutations`, `planning`, `review`.

<a id="transactions-serializable-costs"></a>

## Choose serializable execution with its retry and contention costs

Serial execution is simple for short local work. Two-phase locking can block, deadlock, and amplify tails; serializable snapshot approaches detect dangerous dependencies and abort. Keep transactions short and define whole-transaction retry boundaries.

**Apply when:** invariants require serializable behavior and the expected contention fits the system.

**Boundary notes:** serializability does not fix races outside the transaction boundary, and blindly retrying can duplicate external side effects.

**Checks:** contention, deadlock or abort rate, retry ownership, partition coordination, transaction duration, tail latency, and external-effect placement.

**Anti-pattern:** Retry only the last SQL statement after a transaction failure, or retry a transaction that already performed an external effect.

**Why it fails:** The old reads no longer support the decision, and repeated attempts can repeat an effect outside the database rollback boundary.

**Bad example (illustrative):**

```text
Read eligibility, send a notification, encounter serialization failure, then resend while retrying only the write.
```

**Better example (illustrative):**

```text
Retry the complete read-decide-write transaction from fresh state with a bounded policy; place external effects behind an appropriate committed record and deduplication contract.
```

**Legitimate exceptions:** An operation already known to be safely idempotent may tolerate repetition. Serializable execution still needs a contention and latency budget.

**Verification scenario:** Force a serialization failure and check fresh rereads, bounded attempts, one intended effect, and acceptable tail latency under contention.

Topics: `distributed`, `data`, `performance`, `planning`, `review`.

<a id="distributed-leases-and-fencing"></a>

## Enforce lease generations at the protected resource

A paused worker can resume after its lease expires and after a successor starts. Give each ownership generation a monotonically increasing fencing token, carry it with writes, and have the protected resource reject tokens older than one already accepted.

**Apply when:** leases, locks, or leader election authorize work that can outlive a pause or network delay.

**Boundary notes:** checking lease validity before a pause does not prove current authority. A token that the storage service ignores provides no fencing, and a local timestamp is not a generation authority.

**Checks:** token issuer monotonicity, downstream enforcement, failover, delayed old writes, renewal failure, and the scope each token protects.

**Anti-pattern:** Assume a worker remains authorized because it checked a lease before it paused.

**Why it fails:** The worker can resume after a successor acquired ownership and still issue stale writes.

**Bad example (illustrative):**

```text
Worker with token 7 resumes after the protected store has accepted token 8; the store blindly applies its write.
```

**Better example (illustrative):**

```text
Issue monotonically increasing ownership generations and have the protected resource atomically reject writes older than its accepted generation.
```

**Legitimate exceptions:** Fencing protects ordering at the resource; it is not universal instantaneous revocation or duplicate-operation suppression. A single-process owner may not need a distributed lease.

**Verification scenario:** Accept a new-generation write, then deliver a delayed old-generation write. Verify rejection at the actual resource rather than only in the old worker.

Topics: `distributed`, `boundaries`, `mutations`, `planning`, `review`.

<a id="consistency-ordering-and-coordination"></a>

## Match ordering guarantees to the invariant

Serializability orders transactions as a serial history. Linearizability also respects real-time completion of individual operations. Causal ordering preserves dependencies while allowing concurrency. A sequence number does not by itself prove that all earlier messages arrived.

**Apply when:** reads, uniqueness, leadership, or replicated updates require a stated consistency guarantee.

**Boundary notes:** the pick-any-two interpretation of network partitions is too coarse for design. Writes in one ordered log do not make arbitrary replica reads linearizable without an authority or read barrier.

**Checks:** operation scope, real-time requirement, dependency tracking, missing-message detection, partition behavior, read barrier, and constrained-key authority.

**Anti-pattern:** Conflate serializable transactions, real-time linearizability and causal ordering, or infer completeness from a sequence number.

**Why it fails:** A system can satisfy one ordering contract while still serving an older read or missing an earlier event required by another contract.

**Bad example (illustrative):**

```text
Receive sequence 12 and assume 1 through 11 were applied; call a follower read linearizable because writes use an ordered log.
```

**Better example (illustrative):**

```text
State the operation scope and required guarantee; use the corresponding read barrier, dependency tracking or gap detection supplied by the system.
```

**Legitimate exceptions:** A product may tolerate stale but causally consistent reads. Stronger coordination is justified by a concrete invariant, not by a blanket consistency preference.

**Verification scenario:** Construct histories that distinguish the required guarantee: real-time read-after-completion, causal dependency and a missing sequence.

Topics: `distributed`, `data`, `planning`, `review`.

<a id="consensus-versus-atomic-commit"></a>

## Separate consensus from atomic commit

In two-phase commit, durable prepare is a promise and a participant cannot unilaterally abort when the coordinator decision is unknown. Consensus establishes a fault-tolerant ordered decision among protocol members using terms and intersecting voting quorums. These solve different scopes.

**Apply when:** coordinating one decision across replicas or committing across heterogeneous participants.

**Boundary notes:** leader election alone does not strengthen every read. Two-phase locking is concurrency control, not two-phase commit. Coordination stores suit small ownership metadata rather than all runtime data.

**Checks:** in-doubt recovery, coordinator durability, locks held while uncertain, live-voter requirement, membership change protocol, election churn, and progress assumptions.

**Anti-pattern:** Treat leader election as a complete transaction or read-consistency protocol, or abort a prepared transaction solely because the decision timed out.

**Why it fails:** Agreement on leadership does not cover arbitrary effects, and a prepared participant may be bound to a commit decision it has not learned yet.

**Bad example (illustrative):**

```text
A participant promises to prepare, loses the coordinator connection and unilaterally rolls back while another participant commits.
```

**Better example (illustrative):**

```text
Recover the durable decision under the protocol's in-doubt rules; use consensus for its stated replicated decision scope and atomic commit for its participant scope.
```

**Legitimate exceptions:** A single database transaction may remove the need for distributed commit. Coordination stores are appropriate for small control metadata rather than bulk runtime data.

**Verification scenario:** Lose the coordinator after prepare and test durable decision recovery; separately test voter loss and membership change under the chosen consensus protocol.

Topics: `distributed`, `data`, `planning`, `review`.

<a id="batch-replay-and-publication"></a>

## Make batch outputs replayable and deliberately published

Immutable inputs, pure transformations, and separate outputs enable retry, comparison, and rebuild. Stage a complete dataset or index and switch readers deliberately. Prefer data-local joins and account for shuffle cost and hot-key skew.

**Apply when:** rebuilding indexes, analytics, exports, or other bounded derived data.

**Boundary notes:** per-record writes into an online system expose partial jobs and overload it. A distributed job can lose to one machine when the data fits because communication dominates.

**Checks:** deterministic inputs, side effects, restart point, output version, publication step, skew, intermediate durability, comparison, and rollback.

**Anti-pattern:** Expose partially written batch output directly to readers or rerun a supposedly deterministic job with hidden live inputs.

**Why it fails:** Users observe mixed versions, and a retry cannot reproduce or compare the prior result.

**Bad example (illustrative):**

```text
Overwrite the live search index row by row while the backfill is still running.
```

**Better example (illustrative):**

```text
Build a versioned output from fixed inputs, validate it, then switch readers deliberately and retain a defined rollback path.
```

**Legitimate exceptions:** Incremental publication can be correct when readers understand its consistency contract. Distributed execution is unnecessary when one machine meets the workload.

**Verification scenario:** Interrupt and rerun the job; compare complete outputs and verify readers see the approved version semantics during publication.

Topics: `data`, `distributed`, `testing`, `implementation`.

<a id="messaging-queue-versus-replay-log"></a>

## Choose queues and replay logs by consumption semantics

Work queues distribute independent messages and may redeliver or reorder. Retained partition logs support per-key order, replay, and independent consumers, while consumer parallelism is bounded by partitions and one slow record can stall a partition.

**Apply when:** selecting transport for background work or event distribution.

**Boundary notes:** broker acceptance is not business completion. Buffering without a bound moves overload into memory or disk, and retention eventually limits replay.

**Checks:** backpressure or drop policy, durability, acknowledgement boundary, order scope, redelivery, consumer lag versus retention, poison records, and recovery after a gap.

**Anti-pattern:** Acknowledge a message before its business effect is durable, or assume a work queue provides replay and global ordering.

**Why it fails:** A crash can lose work after acknowledgement, while redelivery and partition-local order require explicit consumer semantics.

**Bad example (illustrative):**

```text
A worker acknowledges receipt and crashes before recording the completed operation.
```

**Better example (illustrative):**

```text
Align acknowledgement with the durable effect boundary, tolerate redelivery, and choose a retained log only when independent replay or ordered consumption is needed.
```

**Legitimate exceptions:** Some telemetry intentionally permits loss with a defined policy. That decision does not authorize loss of consequential operations.

**Verification scenario:** Crash before and after effect commit, redeliver a message, delay one partition and exceed retention; verify the documented recovery and loss boundaries.

Topics: `data`, `distributed`, `realtime`, `planning`.

<a id="dataflow-source-and-projection-contract"></a>

## Derive projections from one committed source

Dual writes can diverge through partial failure and reordering. Derive views from one authoritative committed change stream. Bootstrap from a consistent snapshot and precise log position, and retain deletion markers long enough for consumers and compaction.

**Apply when:** maintaining search, cache, analytics, or materialized views beside a primary record.

**Boundary notes:** change-data capture describes mutations, while domain event sourcing records accepted facts; they are not interchangeable. Replay also carries history cost, read-your-writes lag, and deletion obligations.

**Checks:** source authority, snapshot offset, event identity, tombstones, backfill, old/new comparison, deliberate read cutover, gap recovery, and projection rebuild.

**Anti-pattern:** Dual-write the primary record and a derived index independently, assuming retries keep them synchronized.

**Why it fails:** One write can succeed while the other fails, and reordering can make the derived view older than the source.

**Bad example (illustrative):**

```text
Commit an order, then separately update search; the second operation times out and its result is unknown.
```

**Better example (illustrative):**

```text
Derive the projection from committed source changes using the existing durable change or outbox contract, with a precise snapshot/log bootstrap boundary.
```

**Legitimate exceptions:** A truly atomic shared transaction can keep two representations consistent. A small app should not invent a streaming platform when its database already supplies the needed boundary.

**Verification scenario:** Lose the projection update after primary commit, replay it, rebuild from a snapshot and test deletion; compare the recovered view to authoritative data.

**Additional decision constraints:** Separate freshness from integrity. A projection may be temporarily behind while still deriving correct facts; duplicate, contradictory or lost effects are integrity failures. Relaxing an invariant and repairing it later requires an explicit product and money-policy decision. A requested command can fail validation: publish an accepted domain fact only after acceptance, or explicitly model a tentative request followed by its confirmed/rejected outcome.

Topics: `data`, `realtime`, `cache`, `boundaries`, `planning`.

<a id="stream-event-time-and-joins"></a>

## Define event time, lateness, and join state

Event time differs from arrival and processing time. Closing a window is an assumption about lateness, not proof that no more events exist. Choose drop-with-metric, correction, or retraction from product requirements, and define window and join retention explicitly.

**Apply when:** aggregating, joining, or alerting over event streams.

**Boundary notes:** using the current dimension during replay can change historical results. Versioned dimensions preserve event-time meaning at the cost of retention and compaction constraints.

**Checks:** timestamp source and uncertainty, window type, watermark, late-event policy, join key, state eviction, replay determinism, and correction visibility.

**Anti-pattern:** Treat window closure as proof that no earlier event will arrive, or join historical events to today's dimension value during replay.

**Why it fails:** Late events are silently lost and recomputation can change history without an approved correction policy.

**Bad example (illustrative):**

```text
Replay last month's transactions using the current exchange-rate dimension.
```

**Better example (illustrative):**

```text
Define event-time semantics, versioned dimension lookup where required, retention and an explicit late-data correction or rejection policy.
```

**Legitimate exceptions:** Processing-time metrics can intentionally describe arrival behavior. Historical reconstruction and operational monitoring need not use the same time contract.

**Verification scenario:** Inject delayed and out-of-order events, then replay with changed dimension data. Verify deterministic meaning and visible correction behavior.

Topics: `data`, `realtime`, `distributed`, `planning`, `review`.

<a id="stream-checkpoints-and-effects"></a>

## Checkpoint state with position and bound external effects

Recovery must restore input position and operator state consistently. Framework exactly-once guarantees stop at their transaction boundary; an external effect needs transactional integration or idempotent deduplication with a stable operation identity.

**Apply when:** stream processing maintains state or triggers writes, notifications, or payments.

**Boundary notes:** checkpointing only offsets loses aggregation state. A replay that creates a new operation ID defeats deduplication, and successful processing does not prove an external effect occurred once.

**Checks:** checkpoint atomicity, state backend, replay ID stability, effect commit boundary, deduplication durability, failure injection, and recovery lag.

**Anti-pattern:** Checkpoint only the input position or assume a framework's exactly-once state guarantee includes an unrelated external API.

**Why it fails:** Restored state can disagree with restored position, and replay can repeat an effect beyond the framework's transaction.

**Bad example (illustrative):**

```text
Save offset 100 but restore an aggregate from offset 90; resend a payment after recovery with a new request ID.
```

**Better example (illustrative):**

```text
Checkpoint state and position consistently and preserve stable effect identity through a transactional sink or authoritative deduplication boundary.
```

**Legitimate exceptions:** Pure recomputable projections can use replay instead of per-event durable state. External guarantees must be verified at their actual boundary.

**Verification scenario:** Crash around state/position persistence and around the external commit; verify recovered aggregation and one intended effect.

Topics: `data`, `realtime`, `distributed`, `mutations`, `implementation`, `review`.

<a id="end-to-end-idempotency-and-integrity"></a>

## Preserve request identity to the effect boundary

Reliable transport or a database transaction does not suppress duplicate client operations. Carry a stable logical request ID through retries and participants, then enforce deduplication where the effect commits. Distinguish the same retry from a genuinely new identical action.

**Apply when:** timeouts or retries can repeat a consequential mutation.

**Boundary notes:** hashing request content merges legitimate repeated actions. Eventual compensation or repair requires a product-approved invariant and visible-state policy, especially for money movement.

**Checks:** ID creation and lifetime, atomic deduplication with the effect, failover, unknown outcomes, retention, downstream propagation, and user-visible retry semantics.

**Anti-pattern:** Generate a new logical request ID on retry, or deduplicate every request having identical content.

**Why it fails:** The first repeats an uncertain effect; the second suppresses legitimate separate actions that happen to look the same.

**Bad example (illustrative):**

```text
A timed-out submission is retried with a new ID; two intended identical purchases share a content-derived ID.
```

**Better example (illustrative):**

```text
Keep one operation ID for retries of the same intent, give new intent a new ID, and enforce deduplication atomically with the effect.
```

**Legitimate exceptions:** An existing SDK or server idempotency guarantee should be reused. The client should not invent a second ledger when it cannot authoritatively confirm settlement.

**Verification scenario:** Retry after a committed-but-lost response and separately submit two genuine identical intents. Verify one effect in the first case and two in the second.

**Additional decision constraints:** Temporary staleness does not authorize duplicate or contradictory effects. If integrity constraints are deliberately relaxed, the visible inconsistency, compensation and recovery contract must be approved explicitly. Single-use approvals also need authorization scope and atomic consumption/claim semantics, not just a random request identifier.

Topics: `distributed`, `mutations`, `boundaries`, `review`.

<a id="operations-audit-and-restore"></a>

## Verify recovery and derived state with executable audits

Restore backups and read the restored data, replay histories, and compare invariants or independently derived views. Make discrepancy detection, ownership, and repair observable. Append-only history helps investigation but does not create correctness by itself.

**Apply when:** durable records, projections, or migrations need recovery evidence.

**Boundary notes:** checksum equality alone may miss a violated domain invariant, and two implementations fed by the same flawed assumption are not independent evidence.

**Checks:** restore frequency, invariant queries, replay boundary, discrepancy threshold, repair path, audit retention, accountable owner, and proof from a recent run.

**Anti-pattern:** Call recovery verified because a backup checksum matches or two projections agree with each other.

**Why it fails:** The restored data can violate business invariants, and both projections can share the same faulty assumption.

**Bad example (illustrative):**

```text
A backup file passes its checksum, but no service has opened the restored database or checked record relationships.
```

**Better example (illustrative):**

```text
Restore and read the data, run domain invariant queries and compare independently grounded outcomes; assign discrepancies to a concrete repair owner.
```

**Legitimate exceptions:** Checksums remain useful for byte integrity. They simply prove a narrower property than functional or domain correctness.

**Verification scenario:** Run a recent restore with representative data and deliberately corrupted or inconsistent fixtures; verify detection and the approved repair path.

Topics: `operations`, `testing`, `data`, `review`.

<a id="data-privacy-purpose-and-retention"></a>

## Define purpose, subjects, retention, and accountability

For collected data, state the purpose, every affected subject including indirectly exposed people, access, retention, and deletion across logs, projections, and backups. Explain use clearly and preserve meaningful control, correction, or appeal where decisions affect people.

**Apply when:** collecting behavioral, identity, relationship, or high-impact decision data.

**Boundary notes:** retaining history forever because replay is useful ignores deletion duties. Privacy is control of disclosure and use, not only secrecy or a consent checkbox.

**Checks:** minimization, purpose compatibility, access review, retention enforcement, derived copies, backup deletion limits, bias and error review, accountable owner, and correction path.

**Anti-pattern:** Retain every event forever because it may help future analytics, or treat one consent flag as the complete privacy contract.

**Why it fails:** Logs, projections and backups can preserve data beyond its allowed purpose and expose people who never directly supplied it.

**Bad example (illustrative):**

```text
Delete a primary profile while leaving identifiable event payloads in searchable projections indefinitely.
```

**Better example (illustrative):**

```text
Map purposes, affected subjects, access and retention across primary and derived copies; implement the approved deletion and correction lifecycle.
```

**Legitimate exceptions:** An authorized retention obligation can limit immediate deletion from some stores. Record that constraint and control access rather than promising impossible erasure.

**Verification scenario:** Exercise a deletion or correction across actual copies and backups, verifying documented limits and accountable handling of failures.

Topics: `storage`, `data`, `boundaries`, `planning`, `review`.

<a id="state-location-and-provider-contracts"></a>

## Choose state ownership from authority and lifetime

**Apply when:** selecting a store, provider, query owner or reset boundary.

| Value | Default owner |
|---|---|
| Authoritative remote data | Existing server/query cache |
| Cross-cutting mutable client state | Explicit shared client owner |
| Mutable state shared inside one subtree | Narrow subtree owner/provider |
| Read-only dependency or configuration | Explicit injection/provider |
| Durable preference | Validated versioned storage boundary |
| Local interaction state | Local component or hook |
| Derived value | Computation from its authoritative inputs |

**Anti-pattern:** Copy remote query data into a global store merely because several components need it. Add providers according to convenience rather than dependency order.

**Why it fails:** Competing writers and reset lifetimes appear, while a fast-changing value can rerender unrelated consumers.

**Bad example (illustrative):**

```text
A screen effect mirrors the server list into a global store, and a child provider reads an authentication provider mounted below it.
```

**Better example (illustrative):**

```text
Consumers read the existing query owner; a subtree provider holds only shared local selection and is mounted beneath its required dependencies.
```

**Legitimate exceptions:** An editable snapshot or a server-state owner supplied by an existing SDK may have a different approved contract. Providers can compose existing data hooks, but must not create an unreviewed second fetch/cache authority.

**Verification scenario:** Draw provider dependencies and reset events, test a consumer outside its required provider, and switch account/scope. Required provider hooks fail clearly when the dependency is absent; optional providers expose an explicit optional contract.

Topics: `state`, `providers`, `boundaries`.

<a id="authorization-single-use-intents"></a>

## Correlate messages and consume approval safely

**Apply when:** an untrusted message or queued user confirmation crosses a process or UI lifecycle boundary and authorizes an effect.

**Anti-pattern:** Treat payload shape or a random ID as authorization, or read an approved action and delete it in a separate step to claim replay prevention.

**Why it fails:** A response can reach the wrong pending caller, two consumers can both read before deletion, and a crash can lose or duplicate the effect.

**Bad example (illustrative):**

```text
read(actionId); delete(actionId); execute(action). Two windows can both finish the read before either deletes.
```

**Better example (illustrative):**

```text
Validate sender/origin/session and payload scope, correlate the response with its pending request, and atomically claim or deduplicate the approved operation at the durable boundary. Bind approval to the subject and intended effect, with its approved expiry and one terminal outcome.
```

**Legitimate exceptions:** Reuse an existing authoritative SDK/server guarantee. Atomic claim alone does not prove exactly-once execution across a separate external effect. Preserve the same durable operation identity for recovery; an expired lease or missing callback is not authorization to repeat an unknown effect.

**Verification scenario:** Open two consumers concurrently, swap response IDs, change the approved payload, replay an expired approval and crash around effect commit. Verify one authorized intent, correct caller correlation and explicit duplicate, missing, stale and unknown-outcome handling.

Topics: `authorization`, `mutations`, `boundaries`, `distributed`.

<a id="lifecycle-readiness-and-user-feedback"></a>

## Finish initialization explicitly and preserve user intent

**Apply when:** storage hydration, initialization or a readiness condition controls an action or useful UI.

**Anti-pattern:** Return early on missing or invalid data without completing initialization, or silently drop a click because a guard is not ready.

**Why it fails:** Loading never ends or the interaction appears broken with no explanation or recovery route.

**Bad example (illustrative):**

```text
if (error || !savedState) return; setHydrated(true). A submit handler similarly returns without feedback.
```

**Better example (illustrative):**

```text
Complete each initialization path as valid, approved fallback, recoverable error or blocked. Reflect action readiness through the approved disabled reason or visible feedback.
```

**Legitimate exceptions:** Completion is not authorization or data validity. Required permissions and safety data fail closed; an elapsed timeout must not grant access or fabricate a balance. Optional preferences may use approved defaults. Do not erase unsent work just to clear loading.

**Verification scenario:** Exercise valid, missing, corrupt and inaccessible storage, plus a click before readiness. Every completed attempt has a truthful state and the approved recovery behavior; equivalent branches are checked together.

Topics: `state`, `storage`, `mutations`, `lifecycle`.

<a id="realtime-subscription-lifecycle"></a>

## Own live subscriptions and their recovery backstop

**Apply when:** multiple consumers share the same live scope, updates exceed useful rendering frequency, or a live connection can leave a view stale.

**Anti-pattern:** Open one identical network stream per leaf, keep it after the last subscriber leaves, or let only one operation variant recover when live events are lost.

**Why it fails:** Connections and cache work multiply, obsolete sessions survive, and equivalent user actions receive inconsistent final state.

**Bad example (illustrative):**

```text
Each row opens the same account stream; unmount forgets cleanup; only one completion branch invalidates the authoritative query.
```

**Better example (illustrative):**

```text
Use the existing scoped shared subscription owner when available. Reference-count identical shared streams and tear down at the last subscriber. Coalesce proven redundant presentation updates at a measured boundary and define authoritative snapshot/query recovery for every applicable terminal branch.
```

**Legitimate exceptions:** One consumer may need only a local subscription. Do not add batching or reference counting where an SDK already owns it. Coalescing must preserve noncommutative events, deletions and required intermediate transitions; it is not permission to drop raw business effects. Recovery cadence follows the accepted freshness contract.

**Verification scenario:** Mount two subscribers, remove one then both, reconnect with an old buffered generation and suppress a terminal event. Verify subscription count, teardown, snapshot precedence, bounded render/cache work and symmetric recovery.

Topics: `realtime`, `cache`, `performance`, `lifecycle`.

<a id="react-external-store-snapshots"></a>

## Connect external stores through a snapshot contract

**Apply when:** React renders state owned outside React and must remain coherent across subscription timing or server hydration.

**Anti-pattern:** Return a fresh snapshot object on every read, mutate the rendered snapshot in place, or wire an ad hoc effect that can miss an update between render and subscription.

**Why it fails:** Unchanged data appears changed, real changes may be invisible, or different consumers render inconsistent versions.

**Bad example (illustrative):**

```text
getSnapshot returns a new wrapper object even when the store has not changed.
```

**Better example (illustrative):**

```text
Provide an immutable snapshot with stable identity until data changes, a subscribe function with cleanup, and a matching server/hydration snapshot when applicable. Use the runtime-supported external-store primitive or the established library adapter.
```

**Legitimate exceptions:** Ordinary local React state needs no external store. A browser-only source may deliberately render on the client. This contract does not require a new global store.

**Verification scenario:** Read unchanged data twice, publish an update during subscription setup, unsubscribe and hydrate from a server snapshot. Check identity stability, notification, cleanup and initial consistency.

Topics: `effects`, `state`, `subscriptions`, `lifecycle`.

<a id="practice-evidence-led-adoption"></a>

## Learn a pattern by proving its effect

**Apply when:** introducing unfamiliar engineering guidance or deciding whether to promote a practice across a project.

**Anti-pattern:** Treat reading a guide or repeating its terminology as evidence that an engineer or agent can apply it.

**Why it fails:** The learner may recognize the label but miss the triggering problem, a valid exception or the observable regression.

**Bad example (illustrative):**

```text
Mark a pattern mastered because the learner can recite its definition.
```

**Better example (illustrative):**

```text
Implement a bounded example, review a planted defect and a valid alternative, explain the failure before and after, and preserve the resulting artifacts and checks.
```

**Legitimate exceptions:** Not every lesson needs a production migration. Use isolated exercises and then one proven real surface before broad adoption; do not create changes solely to exercise a fashionable pattern.

**Verification scenario:** Present a structurally similar but different task without the expected answer. Evaluate behavior, reasoning and false positives rather than vocabulary or rule-file length.

Topics: `learning`, `adoption`.
