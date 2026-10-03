# Domain knowledge packs

Generated from `knowledge/packs/*.json`. Edit those sources and run `node scripts/render-knowledge-guide.mjs`; this readable guide is not a second knowledge authority. The core cards are in the [engineering decision guide](../guide.md).

A candidate pack is a usable decision aid that the historical 58-card audit does not cover. A pack becomes approved only after an independent semantic review recorded in its pull request. Repository conventions, approved product behavior and actual runtime contracts take precedence, and the examples are illustrative.

- **Chains, wallets, RPC and indexing** (`chain`, candidate): Multi-chain capability gating, wallet readiness and signing authority, RPC failure classification and failover, and indexer correctness (reorgs, resume points, block-time budgets, persisted chain facts), plus contract provenance and chain QA fixtures. Load it when a change touches chain selection, wallet or signer flows, chain reads, node routing or a block follower; nonce allocation, broadcast journaling and settlement receipts belong to a separate pack.
  - [Resolve chain capability exhaustively and assert at dispatch](#chain-capability-resolver-asserted-at-dispatch)
  - [Model wallet readiness as one status with recovery](#chain-wallet-readiness-status-union)
  - [Deduplicate idempotent account setup across tabs, never orders](#chain-cross-tab-dedupe-idempotent-setup-only)
  - [Enforce allow-only capability policy inside the signer](#chain-signer-allow-only-capability-policy)
  - [Revert only proven-orphaned blocks and forfeit gaps explicitly](#chain-reorg-pure-decisions-explicit-forfeit)
  - [Resume from the highest of independent lower bounds](#chain-resume-from-highest-lower-bound)
  - [Budget every per-block stage against the block clock](#chain-block-clock-is-the-budget)
  - [Prove immutable chain facts once and persist them](#chain-facts-proven-once-and-persisted)
  - [Classify RPC failures before retrying or caching them](#chain-rpc-errors-classified-before-retry)
  - [Trip breakers only between interchangeable providers](#chain-breakers-only-for-interchangeable-providers)
  - [Version contract artifacts and gate address changes](#chain-contract-artifact-provenance)
  - [Prove wallet and chain journeys with deterministic fixtures](#chain-wallet-and-chain-qa-fixtures)
  - [Treat the wallet as an untrusted, user-controlled boundary](#chain-wallet-untrusted-user-boundary)
- **API contracts and data boundaries** (`contracts`, candidate): Frontend and backend contract decisions: error envelopes, breaking-change gates for strict generated consumers, generated socket contracts, committed snapshots with provenance, boundary validator ownership, pagination cursors, wire money and time, and safe data evolution for renames, replays and backfills. Load it when a change touches an API or stream shape, codegen, a validator, persisted data or a data migration.
  - [Branch on stable error codes, display only sanitized messages](#contracts-error-envelope-stable-codes)
  - [Gate contract changes against the strictest generated consumer](#contracts-breaking-change-strict-consumers)
  - [Generate the socket contract and gate it twice](#contracts-generated-ws-contract-gates)
  - [Commit contract snapshots with verifiable provenance](#contracts-committed-snapshot-provenance)
  - [Name one validator per untrusted boundary](#contracts-boundary-validator-authority)
  - [Validate payloads strictly, envelopes tolerantly, unknowns loudly](#contracts-strict-payload-tolerant-envelope)
  - [Seal pagination cursors and publish page bounds](#contracts-sealed-cursors-page-bounds)
  - [Rename fields through a dual-name window](#contracts-dual-name-rename-window)
  - [Repair insert-triggered aggregates after replays deepest-first](#contracts-insert-views-replay-double-count)
  - [Make backfilled rows always lose to live rows](#contracts-backfills-lose-to-live)
  - [Compute each fact once, in one producer](#contracts-one-fact-one-producer)
  - [Make unsafe use of an API unrepresentable](#contracts-misuse-proof-apis)
  - [Keep money, time and estimates unambiguous on the wire](#contracts-wire-money-time-estimates)
- **Order and transaction execution** (`execution`, candidate): Submitting money-moving actions from client to server to chain: per-action operation identity, proof of non-dispatch, unknown and partial outcomes, account and auth fencing, backend idempotency claims, execution receipts, journaled broadcasts, nonces and observed settlement. Load it when planning, implementing or reviewing order, trade, transfer or withdrawal submission and the pipeline that executes it.
  - [Mint a fresh operation identity per deliberate action](#execution-fresh-identity-per-deliberate-action)
  - [Never gate dispatch on browser bookkeeping](#execution-no-browser-ledger-before-dispatch)
  - [Report a request as not sent only with proof](#execution-not-dispatched-needs-proof)
  - [Type unknown and partial outcomes explicitly](#execution-type-unknown-and-partial-outcomes)
  - [Fence each mutation to the account that started it](#execution-fence-mutations-to-account)
  - [Refresh authentication without replaying mutations](#execution-auth-refresh-never-replays-mutations)
  - [Read the backend idempotency contract before designing retries](#execution-read-backend-idempotency-contract-first)
  - [Review money mutations against every failure case](#execution-mutation-safety-review)
  - [Claim idempotency keys atomically and fail closed](#execution-atomic-idempotency-claim-fail-closed)
  - [Never fail the whole request after a side effect](#execution-no-whole-request-error-after-effect)
  - [Make outcome-unknown a terminal state with a timeout ladder](#execution-outcome-unknown-timeout-ladder)
  - [Write the execution receipt before the effect fires](#execution-durable-receipt-before-effect)
  - [Admit every request so clients reach a terminal state](#execution-admit-every-request-to-terminal-state)
  - [Journal the signed transaction before broadcasting it](#execution-journal-signed-bytes-before-broadcast)
  - [Settle only on an observed chain receipt](#execution-settle-on-observed-chain-receipt)
  - [Allocate nonces atomically and require two reads for death](#execution-nonce-allocation-and-dead-verdict)
  - [Ship new execution paths in shadow behind kill switches](#execution-shadow-mode-and-preflight-for-new-paths)
- **Money, precision, quotes and swaps** (`money`, candidate): Decision aids for how a DEX frontend and backend represent, compute, display and submit token amounts, and how quotes, slippage, approvals and swap execution bind to what the user signs. Load it when a change touches balances, prices, fees, amount inputs, quote or slippage handling, approvals, swap execution or token risk checks.
  - [Keep client money math in exact decimal strings](#money-exact-decimal-strings)
  - [Convert base units with each asset's own decimals](#money-base-units-from-asset-decimals)
  - [Round toward the bound that must hold](#money-rounding-direction-by-bound)
  - [Type backend money as a decimal string contract](#money-backend-decimal-wire-type)
  - [Carry provenance with every displayed money value](#money-value-provenance)
  - [Choose formatters by unit meaning, not appearance](#money-format-by-unit-meaning)
  - [Keep amount inputs as raw decimal strings](#money-amount-input-raw-string)
  - [Fix timestamp units by the wire they cross](#money-timestamp-units-by-wire)
  - [Bind each quote to its route, amount and expiry](#money-quote-binding-status-union)
  - [Reconfirm only when re-quoted terms materially worsen](#money-requote-material-tolerance)
  - [Separate recommended slippage from the accepted request range](#money-slippage-request-bounds)
  - [Quote, approve, re-quote, then spend the approval](#money-one-shot-approval-requote)
  - [Admit third-party swap calldata through one ordered guard](#money-aggregator-calldata-guard)
  - [Preflight every plan before it spends a nonce](#money-preflight-before-nonce)
  - [Classify swap failures in one closed taxonomy](#money-closed-swap-failure-taxonomy)
  - [Judge token sellability by what the sell reads](#money-adversarial-token-simulation)
- **Release, runtime and operations** (`operations`, candidate): Release and runtime decisions: tag-based roll-forward behind schema gates, honest readiness, alert runbooks and paging, edge rate limiting, independent data verification, enforcement ratchets, release authority, GitOps promotion, preview and deploy safety, supply-chain hardening, fail-safe CI selection and resilience budgets. Load it when a change touches release or deploy workflows, CI, probes, alerts, rate limits or failure handling.
  - [Roll forward only, behind a schema gate](#operations-roll-forward-schema-gated-release)
  - [Report readiness only when the service can work](#operations-honest-readiness-probes)
  - [Ship every alert with a runbook and permission level](#operations-alert-runbook-automation-level)
  - [Rate limit at the edge with explicit failure posture](#operations-edge-rate-limit-failure-posture)
  - [Verify data against independent sources on a schedule](#operations-independent-source-correctness)
  - [Ratchet rules you cannot deny outright](#operations-ratchet-unfixable-rules)
  - [Split release preparation from production authority](#operations-split-release-authority-provenance)
  - [Promote environments through Git and strict tag patterns](#operations-gitops-tag-pattern-promotion)
  - [Keep previews and deploys current, scoped and coupled](#operations-preview-deploy-safety)
  - [Harden dependency intake and the CI supply chain](#operations-supply-chain-baseline)
  - [Scope CI by diff but fail safe](#operations-fail-safe-diff-scoped-ci)
  - [Budget fault scenarios with explicit resilience thresholds](#operations-resilience-game-day-budgets)
- **Realtime streams, client and server** (`realtime`, candidate): Concrete refinements for live data across the server WebSocket layer, the bus and stream-processing layer behind it, and browser consumption: subscribe handshake ordering, egress backpressure, identity stamping, publish dedup, checkpoint and replay positions, frame ordering, single live writers, cross-tab socket brokering and gap recovery. Load it when a change touches a socket channel, a bus subject or consumer, a stream processor's sink or checkpoint, or a client cache fed by a stream.
  - [Open live coverage before the snapshot query](#realtime-live-coverage-before-snapshot)
  - [Hold data behind its ack and fence unsubscribes](#realtime-ack-gate-and-unsubscribe-fence)
  - [Bound socket egress and shed slow consumers](#realtime-bounded-socket-outbox-shedding)
  - [Take subscriber identity from the token, not filters](#realtime-identity-from-token-canonical-filters)
  - [Retry bus publishes only under a stable dedup id](#realtime-bus-publish-retry-dedup-id)
  - [Never let a stream position pass undone work](#realtime-stream-positions-never-skip-work)
  - [Treat broadcast lag as a gap, not noise](#realtime-broadcast-lag-is-a-gap)
  - [Define bus topology as typed, checked code](#realtime-bus-topology-typed-registry)
  - [Order live frames by row version, not timestamps](#realtime-version-ordered-frame-reducer)
  - [Keep one live writer per socket-owned cache](#realtime-one-live-writer-per-read-model)
  - [Apply live frames after snapshot and ack latches](#realtime-snapshot-and-ack-latch)
  - [Broker one physical socket across tabs with leases](#realtime-shared-worker-socket-broker)
  - [Validate socket payloads once at the transport](#realtime-validate-payloads-at-transport)
  - [Declare which stream health can block actions](#realtime-stream-health-action-authority)
  - [Poll only as a bounded backstop](#realtime-bounded-polling-backstop)
  - [Batch live renders by visibility and group](#realtime-visibility-aware-batching)
  - [Lease live resources by canonical query key](#realtime-resource-leases-by-query-key)
  - [Choose sequence resume or re-snapshot for gaps](#realtime-gap-recovery-resume-or-resnapshot)
- **Web trading app architecture (React / Next.js App Router)** (`web-app`, candidate): Framework-specific frontend architecture for data-heavy trading UIs: data region anatomy, route-based request priority, server hints, hydration-stable clocks, browser-only vendor reads, route identity, global read models, enforced module and design-system boundaries, and deterministic browser fixtures; load it when planning, implementing or reviewing loading, streaming, hydration, routing or test-fixture work. These cards apply to React 19 + Next.js App Router with React Query; adapt them for other stacks.
  - [Build each data region from four roles](#web-app-data-region-anatomy)
  - [Admit reads through route-specific priority buckets](#web-app-request-priority-buckets)
  - [Pass browser-owned scope to SSR as hints](#web-app-server-hint-cookies)
  - [Keep the server time reference through hydration](#web-app-hydration-stable-clock)
  - [Keep third-party venue reads in the browser](#web-app-third-party-reads-browser-only)
  - [Derive route identity from the page params prop](#web-app-route-identity-from-params)
  - [Evaluate client pages under server-only layouts](#web-app-client-pages-server-layouts)
  - [Render merged regions from the first ready source](#web-app-progressive-merged-readiness)
  - [Unmount hidden panels and return from cache](#web-app-render-only-visible)
  - [Promote data to global only with one owner](#web-app-global-read-models)
  - [Enforce module ownership with import-graph rules](#web-app-enforced-module-boundaries)
  - [Resolve UI concepts in a generated component map](#web-app-component-map-and-scanners)
  - [Make browser fixtures fail on hidden faults](#web-app-e2e-fixture-guards)
  - [Inject clock, id and socket factories](#web-app-injected-nondeterminism)

<a id="chain-capability-resolver-asserted-at-dispatch"></a>

## Resolve chain capability exhaustively and assert at dispatch

Chain kind decides how to read or sign; capability decides whether the product is open on that chain. Resolve capability in one resolver keyed by the full chain union (`satisfies Record<Chain, Resolver>`) that returns enabled, pending or disabled. Selectors read it, but every effect path re-asserts enabled at admission and inside the final write after any awaited read, since rollout state can change before dispatch. Pending blocks new actions on the chain but keeps persisted selections, and only disabled purges them; whether a pending chain stays visible is a product decision.

**Apply when:** A diff adds a chain, a rollout flag or per-chain toggle, or a mutation, signing or navigation path that takes a chain argument.

**Boundary notes:** Chains that never roll out gradually need only a static list typed by the union. The client assertion prevents accidental dispatch; the server still rejects disabled chains.

**Checks:** External chain values are parsed into the union first. The map has no `Partial` or default, so a new chain fails to compile until its status is decided. Admission, final write, retry, deep link and restored selection all gate on it. Status values are product-owned.

**Anti-pattern:** Gate only the selector or button, so a deep link, restored selection, queued retry or second tab dispatches on a chain the product has not enabled.

**Why it fails:** Other routes reach the effect path and write orders or settings on a disabled or mid-rollout chain; purging on pending wipes valid selections while the rollout decision loads.

**Bad example (illustrative):**

```text
if (isVisible(chain)) renderBuy(); later onSubmit: submitOrder(chain) with no re-check
```

**Better example (illustrative):**

```text
admit: assertEnabled(chain); write: await readAuthority(); assertEnabled(chain); return send()
```

**Legitimate exceptions:** Showing history on a disabled chain may be intended; that is a product decision, never a reason to skip the effect-path assertion.

**Verification scenario:** Disable a chain after the form renders and again while the write awaits its authority read; assert no request leaves. Load with status pending; the saved selection survives and returns once enabled.

**Automatable check:** Lint that capability maps use `satisfies Record<ChainUnion, ...>` without `Partial`; a grep gate that chain-taking effect entry points assert.

Pack: `chain` (candidate). Topics: `chain`, `variants`, `mutations`, `frontend`, `implementation`.

<a id="chain-wallet-readiness-status-union"></a>

## Model wallet readiness as one status with recovery

Derive trading readiness in one pure resolver returning a single status from a closed union, each paired with one recovery action: authenticate, retry, migrate, wait, or none when ready. Check prerequisites in a fixed order (session, selected wallet, wallet active, signing authorization, then setup state and chain address) and map any unrecognized backend state to failed with retry, never to ready. The same resolver drives the UI and is re-run on current data in the action handler before setup starts. Refines core card lifecycle-readiness-and-user-feedback.

**Apply when:** A trade, sign or setup control depends on several flags (authenticated, wallet loaded, authorized, migrated, address assigned) or a ticket adds one.

**Boundary notes:** One or two independent prerequisites can stay a direct branch. Status messages and action labels are product copy and must be sourced.

**Checks:** Statuses come from an `as const` array; consumers render the attached recovery, never recompute it. An attempt record (pending, failed, timed out) is scoped to its wallet. A failed read shows waiting only while an automatic retry runs. The handler refuses setup unless the freshly resolved status permits it.

**Anti-pattern:** Scatter checks like connected && authorized && !migrating across components, each deciding enablement and copy itself.

**Why it fails:** Surfaces disagree, so one enables trading while another says setup is required; an unknown migration state reads as ready and the user signs without authorization, or a disabled button offers no way forward.

**Bad example (illustrative):**

```text
<Button disabled={!authed || loading} /> beside a banner that derives its own message from different flags
```

**Better example (illustrative):**

```text
const r = resolveReadiness(inputs); render r.message; the button runs r.recovery; the handler re-resolves before acting
```

**Legitimate exceptions:** Display-only surfaces that never act may read one prerequisite directly. A state-machine library is unnecessary; a pure function over current query data suffices.

**Verification scenario:** Table-test the resolver, including an unknown migration state, a failed attempt for wallet A while B is selected, and a read error during retry. In the browser, switch wallets mid-setup; the recovery shown must belong to the selected wallet.

Pack: `chain` (candidate). Topics: `chain`, `state`, `lifecycle`, `frontend`, `implementation`.

<a id="chain-cross-tab-dedupe-idempotent-setup-only"></a>

## Deduplicate idempotent account setup across tabs, never orders

One-time account setup that the server already makes idempotent (wallet migration, authorization provisioning) may be deduplicated client-side with an in-process promise map keyed by account plus a non-blocking cross-tab lock (Web Locks `ifAvailable`). A tab that misses the lock neither waits nor retries: it reports deduplicated and polls authoritative account state until ready, failed or timed out. The lock only trims duplicate load; it is never the correctness mechanism and never guards orders, transfers or other money movement. Refines core card end-to-end-idempotency-and-integrity.

**Apply when:** Several tabs or mounts can fire the same first-run setup for one account, and the backend documents it as idempotent.

**Boundary notes:** Without the Web Locks API, just execute; server idempotency still holds. Orders and transfers use the existing in-flight state and server idempotency keys.

**Checks:** The closure re-checks the account is still current before sending. The map entry is deleted in `finally` only if it still holds the same promise. No tab queues behind the lock. The losing path reads server state rather than assuming success. Wait budgets shown to users are product decisions.

**Anti-pattern:** Use a cross-tab lock or singleton promise to block a second order submission, or treat the winning tab's success as proof for the others.

**Why it fails:** Locks are advisory, per browser profile and released on tab close, so they cannot stop another device, a crash retry or a replay, yet they silently drop a legitimate second identical order. A loser assuming success shows ready too early.

**Bad example (illustrative):**

```text
navigator.locks.request('submit-order', () => placeOrder(input))
```

**Better example (illustrative):**

```text
locks.request('setup:' + accountId, { ifAvailable: true }, (l) => (l ? runSetup() : 'deduplicated')), then poll account state
```

**Legitimate exceptions:** A single-tab app with an idempotent endpoint needs nothing extra. If setup is not idempotent server-side, fix that contract; a client lock cannot make it safe.

**Verification scenario:** Trigger setup in two tabs at once: one network request, both tabs reach ready from polled state. Close the winner mid-request: the other polls to ready or to the timed-out retry state with no automatic resend.

Pack: `chain` (candidate). Topics: `chain`, `mutations`, `distributed`, `frontend`, `implementation`.

<a id="chain-signer-allow-only-capability-policy"></a>

## Enforce allow-only capability policy inside the signer

When a service requests signatures without prompting the user, the user's wallet signs a capability token and the signer itself checks its policy (inline, or a signer-owned preset reference) after parsing and resolving each request. Policies are versioned, allow-only (a rule must match in full; omission forbids) and strictly parsed at mint, so an unknown field fails instead of widening scope; expiry is checked on every use. Withdrawals are separate: a short-lived challenge minted only after MFA and claimed atomically once by the business operation. Refines core card authorization-single-use-intents.

**Apply when:** Adding a signing route, token or session-key policy, transaction kind, or any flow signing without a user prompt.

**Boundary notes:** An empty rule allows everything, so review breadth, not syntax. Preset references let the signer change scope in a release, narrower or wider, without the user re-consenting, so preset edits are policy changes that need review; inline policies sign exact bytes.

**Checks:** A raw message that decodes as a transaction is judged as one. Uninspectable content (raw digests, unresolved lookup-table programs) needs explicit opt-in. Regexes are anchored and size- and memory-capped. The token's signing family comes from its signature, not a declared field. Missing MFA declines. Retiring allow-all legacy tokens backfills before the switch flips.

**Anti-pattern:** Check scope only in the calling API, or parse policy leniently, so the signer signs whatever arrives.

**Why it fails:** A compromised caller signs arbitrary transfers with stored user authority, a typo becomes allow-all, and a transaction disguised as an opaque message slips past a program allowlist.

**Bad example (illustrative):**

```text
api.policyAllows(req) && signer.sign(req.bytes), with policy parsed ignoring unknown keys
```

**Better example (illustrative):**

```text
signer: verify(token); action = resolve(req); policy.rules.some((r) => r.matches(action)) || reject()
```

**Legitimate exceptions:** Flows that prompt for every signature need no capability token. TTLs and MFA scope are security and product decisions to source, not defaults to invent.

**Verification scenario:** Mint with an unknown field (rejected), send a transaction as a raw message against a program allowlist (denied), create a second withdrawal from one MFA approval (refused at the claim) and use the challenge after its TTL (refused).

Pack: `chain` (candidate). Topics: `signing`, `authorization`, `security`, `backend`, `review`.

<a id="chain-reorg-pure-decisions-explicit-forfeit"></a>

## Revert only proven-orphaned blocks and forfeit gaps explicitly

Keep reorg handling a pure state machine over a bounded, parent-linked window of emitted blocks: each head yields one step (commit, ignore, fetch ancestor by hash, fetch canonical by number, apply a plan) and an I/O shell fetches and emits. Revert only blocks the node proves non-canonical; a head it cannot verify, from a lagging or rewound backend, is ignored, never turned into a speculative revert. Plans emit revert, then fill, then commit; a gap wider than the window is forfeited by restarting the window at the head and counting every skipped height.

**Apply when:** Building or changing a block follower, indexer or consumer turning heads into events, prices or balances.

**Boundary notes:** Verify a head below the window by number, never by walking parents, which would fabricate a full-window revert. Forfeit trades completeness for liveness; it suits a real-time feed with a separate backfill.

**Checks:** The core does no I/O and is unit-tested on synthetic chains. Duplicate heads and heads linking to the tip at the wrong height are ignored and logged. Deep reorgs are flagged and metered. Forfeited heights are counted per chain and cause, and alerted on. Consumers apply reverted spans idempotently. Window capacity exceeds the chain's expected reorg depth.

**Anti-pattern:** Revert whenever a head's parent differs from the tip, or serially refill an unbounded gap.

**Why it fails:** A lagging replica's mismatched heads wipe valid blocks and their derived balances; refilling a huge gap block by block keeps the engine permanently behind, so users trade on stale prices.

**Bad example (illustrative):**

```text
if (head.parentHash !== tip.hash) revertWindow(), never asking the node what is canonical
```

**Better example (illustrative):**

```text
step = tracker.onHead(h); the shell fetches what the step names, feeds it back, then applies revert, fill, commit
```

**Legitimate exceptions:** Consumers that read only finalized blocks need no reorg machinery. A gap-intolerant ledger must not forfeit; it halts and backfills instead.

**Verification scenario:** Feed a one-block reorg, a reorg deeper than the window, a rewound replica's head, a duplicate head and a gap wider than the window; assert exact steps, no revert for the unverifiable head and a forfeit count equal to the skipped heights.

Pack: `chain` (candidate). Topics: `chain`, `realtime`, `data`, `backend`, `implementation`.

<a id="chain-resume-from-highest-lower-bound"></a>

## Resume from the highest of independent lower bounds

On restart, resume from the maximum of independent lower bounds on what was already published, such as the checkpoint the publisher writes and the newest header still on the durable output stream, because either store can lag what consumers already applied. Each read is best effort: an unreadable source contributes nothing and boot never fails on its resume point. If no source answers, go live at the head, log why and export a cold-start gauge so the gap is visible. Refines core card stream-checkpoints-and-effects.

**Apply when:** A block follower, indexer or replayer restarts, is redeployed, or gains or changes a checkpoint store.

**Boundary notes:** Every candidate must be a true lower bound, written after publication was acknowledged, never an intent to publish. Going live at the head skips history, which suits a feed with a separate backfill.

**Checks:** Checkpoint writes follow publish acknowledgement. Stream retention outlasts a deploy cycle. The chosen source and height are logged and exported. The plan states whether consumers tolerate a replay, a boundary block normally or a whole span when a higher source is unreadable; if not, the resume point must be exact. Tests cover stream only, checkpoint only, each one higher, and both reads failing.

**Anti-pattern:** Trust only the checkpoint store, or block boot until every store is readable.

**Why it fails:** A checkpoint whose writes fell behind resumes below the stream and republishes blocks consumers already applied, double-counting volume or balance deltas; a boot that waits on a flaky store turns a storage hiccup into an indexing outage.

**Bad example (illustrative):**

```text
const from = (await kv.get(chain)) ?? crash('no checkpoint')
```

**Better example (illustrative):**

```text
const from = max(tryRead(checkpoint), tryRead(lastStreamHeader)); if none answered, go live at head and set coldStart to 1
```

**Legitimate exceptions:** A gap-intolerant pipeline (balances, accounting) should refuse a cold start and wait for an operator or a backfill. A system that commits publish and checkpoint in one transaction needs only that store.

**Verification scenario:** Seed checkpoint 40 with stream 70 (resume 70), checkpoint 90 with stream 70 (resume 90), then make both reads fail (process stays up, goes live at the head, cold-start gauge set).

Pack: `chain` (candidate). Topics: `chain`, `data`, `operations`, `backend`, `implementation`.

<a id="chain-block-clock-is-the-budget"></a>

## Budget every per-block stage against the block clock

A chain follower slower than the block interval never catches up; its lag only grows, so the block interval is a hard budget: every per-block stage (fetch, trace, decode, enrich, publish) is a histogram whose p99 sits under the fastest served chain's block time with headroom. The node is a metered budget too: a small constant number of requests per block (say block, receipts, traces), no per-transaction RPC, no refetch of data the block carried, and a written ceiling for anything extra. Queues are bounded and never lossy, with exported depth and source lag. Refines core card operations-load-and-tail-latency.

**Apply when:** Adding a stage or RPC call to a block path, putting a faster chain on a shared core, or reviewing indexer performance.

**Boundary notes:** Keep decode synchronous and I/O-free, with async at the edges (feed, enricher, publisher). Catch-up runs on its own budget and yields to the live path if it cannot close the gap.

**Checks:** p50, p99 and p99.9 per stage, never a mean. Per-node request counters by method. No unbounded channels. Lag and queue depth exported, with staleness paging. A load test at the fastest chain's block rate. Any per-transaction call in a diff is rejected or carries a written ceiling.

**Anti-pattern:** Add a per-transaction contract read or metadata lookup inside the block loop and judge it by mean latency.

**Why it fails:** Busy blocks multiply the calls, p99 crosses the block time, and lag compounds block after block under rate limits; users trade on prices and balances seconds or minutes stale.

**Bad example (illustrative):**

```text
for (const tx of block.txs) meta[tx.token] = await rpc.tokenInfo(tx.token)
```

**Better example (illustrative):**

```text
The block path reads proven metadata from a persistent cache and queues unknowns to a bounded enricher exporting its depth.
```

**Legitimate exceptions:** Off-path batch jobs need no block-clock budget, and when polling finalized data meets the freshness requirement, skip the streaming path.

**Verification scenario:** Replay recorded busy blocks at the fastest chain's block rate; assert every stage's p99 stays under the block time, RPC calls per block stay constant and queues stay bounded without drops.

**Automatable check:** CI bans unbounded channels and RPC calls in the decode module; alerts fire on source lag and per-stage p99.

Pack: `chain` (candidate). Topics: `chain`, `performance`, `operations`, `backend`, `review`.

<a id="chain-facts-proven-once-and-persisted"></a>

## Prove immutable chain facts once and persist them

An immutable fact about a contract, venue or token is proven once (derived from data at hand, else read from the chain once, else refused and counted), and a read-derived proof is persisted the moment it is made so no restart re-proves it. Persist generator inputs (factory, creation-code hash, deployer) and derive instances by formula instead of a table keyed by every instance address, and build proofs from executed bytes (code at an address, a trace), never a provider label or caller claim. Expiry on chain-observed data counts observed chain progress (blocks, slots, event time), not wall-clock time.

**Apply when:** A diff adds a map filled since boot, a cache keyed by pool or pair address, an allowlist learned from traffic, or a timeout on chain-observed data.

**Boundary notes:** Wall clock may drive a memory-only sweep of idle entries, never the decision that something expired. Clamp a source's event-time clock to wall clock plus a tolerance so one rogue future timestamp cannot expire everything.

**Checks:** Each proof has a persistent home keyed by the address it proves. Two producers of one fact share one proving function over one evidence type. Instance-level state is bounded by venue, not by trade count. A test pauses the feed past the window and confirms nothing expires.

**Anti-pattern:** Admit venues from fills seen since boot, or expire pending items on a wall-clock timer while the feed is gapped.

**Why it fails:** Every deploy forgets the proofs, so valid venues are refused until they trade again and users miss fills; per-instance tables grow with the chain; wall-clock expiry marks items expired during a feed outage even though they happened.

**Bad example (illustrative):**

```text
static seen = new Set<Address>(), filled from live fills and consulted by the guard
```

**Better example (illustrative):**

```text
proof = deriveOrReadOnce(addr); await store.put(proof.address, proof); instance = derive(factory, codeHash, tokens)
```

**Legitimate exceptions:** Mutable facts (owner, fee setting, proxy implementation) need a revalidation trigger, not lifetime caching. A small closed set can stay static config.

**Verification scenario:** Prove a venue, restart, and assert immediate admission with no chain read; pause the feed past the expiry window and assert nothing expires until observed slots advance.

Pack: `chain` (candidate). Topics: `chain`, `storage`, `data`, `backend`, `implementation`.

<a id="chain-rpc-errors-classified-before-retry"></a>

## Classify RPC failures before retrying or caching them

Every chain read classifies a failure as definitive, where the chain answered (revert, undecodable return, no code), or transient, where no answer arrived (transport error, timeout, throttle, node behind the pinned block, pruned state). Detect reverts by error code or revert envelope first and never infer a node condition from revert text, because a contract chooses its own revert string. Cache probe results as Value, Absent or Unknown, negative-cache only definitive misses, and leave transient failures Unknown to re-probe. Pack card chain-breakers-only-for-interchangeable-providers decides when a failure moves traffic.

**Apply when:** Adding a contract read or account query, a capability probe (does this contract expose X), a retry wrapper, an RPC fallback chain, or a cache of contract metadata.

**Boundary notes:** Retry block-not-reached on the same or another node; send state-unavailable to an archive-capable route. Pin reads to a block number when results must replay deterministically.

**Checks:** A revert whose text mimics a node error still classifies as a revert. Throttle, 5xx and transport errors are transient. Probe fields added later default to Unknown on old cache entries. Absent is written only on definitive evidence. Each fallback step has its own timeout. Error text is sanitized before logging, since RPC URLs often embed API keys.

**Anti-pattern:** Treat any call error as 'not supported' and cache it, or retry every error including reverts.

**Why it fails:** One rate-limit blip permanently bars a live token or pool, so users see missing balances and refused trades; retrying reverts burns the RPC budget; hostile revert text can steer a client into endless retries.

**Bad example (illustrative):**

```text
try { v = await call(addr) } catch { cache.set(addr, ABSENT) }
```

**Better example (illustrative):**

```text
catch (e) { if (isDefinitive(e)) cache.set(addr, Absent); else keep Unknown and retry with backoff }
```

**Legitimate exceptions:** Reads that are never cached or acted on can skip the tri-state. When the SDK already distinguishes these classes, use its classification instead of re-deriving it.

**Verification scenario:** Probe through a throttle, a lagging replica, a pruned-state error, a revert and a revert reading 'header not found'; expect transient, transient, archive route, Absent and Absent, with only the reverts negatively cached.

Pack: `chain` (candidate). Topics: `chain`, `errors`, `frontend`, `backend`, `implementation`.

<a id="chain-breakers-only-for-interchangeable-providers"></a>

## Trip breakers only between interchangeable providers

A circuit breaker helps only when another provider can answer the same request. Among ranked equivalent nodes, trip a node on no-usable-answer faults (transport failure, timeout while a later node could answer, 408, 429 or 5xx, a non-JSON proxy page, a throttle reply), probe it off the request path with backoff, and close it once it answers; a JSON-RPC answer about the request (revert, invalid params) never trips, and 'node lacks this block or state' resends elsewhere untripped. A provider that is the sole route for some requests gets no breaker: bound each call with a timeout and handle sustained faults via metrics and an explicit kill switch.

**Apply when:** Adding node failover, a provider pool, a breaker or retry routing across data or quote providers.

**Boundary notes:** When every node is tripped, try all in preference order rather than failing fast. Use the short per-attempt timeout only when a later candidate exists. A deadline the caller chose is not a provider fault.

**Checks:** The fault predicate names transport and HTTP classes and treats unknown transport errors as faults. Probes use an unmetered client, keeping a down node out of caller metrics. Trips and recoveries are counted per node. Methods a node cannot serve are routed by capability, not discovered by tripping.

**Anti-pattern:** Trip on any error, including reverts, or put a breaker in front of the only provider that can route some pairs.

**Why it fails:** Reverting user calls trip healthy nodes until nothing serves; a breaker on a sole route turns one transient failure into minutes of refusals, so trades fail outright instead of filling.

**Bad example (illustrative):**

```text
catch (e) { breaker.open(provider) }, even for reverts and for the only route
```

**Better example (illustrative):**

```text
if (isTransportFault(e) && pool.hasAlternative()) { trip(node); probeWithBackoff(node) } else return e
```

**Legitimate exceptions:** A lone self-hosted node needing overload protection wants load shedding, a different mechanism. Prefer an SDK failover transport that already does this.

**Verification scenario:** With two nodes, make the first time out, revert, answer 'header not found' and return 429; assert trip, revert returned untripped, resend untripped and trip. With one node, assert no breaker and the full client timeout.

Pack: `chain` (candidate). Topics: `chain`, `errors`, `operations`, `backend`, `implementation`.

<a id="chain-contract-artifact-provenance"></a>

## Version contract artifacts and gate address changes

Recommended practice: treat ABIs, indexer event schemas, token lists and per-chain address config as versioned artifacts with a recorded origin (deployment transaction or verified source) and a content hash checked in CI or at boot. Any change to an address, spender or router allowlist, chain ID mapping or token list routes to money review and a human merge, never auto-merge. Selecting an environment's address set is explicit and fails closed. Refines core card dependency-reproducibility.

**Apply when:** A diff touches a contract address, allowlist, chain ID table, ABI, event signature, token list or deployment file.

**Boundary notes:** Adopt incrementally: code owners and auto-merge exclusion on address files first, then hashes and boot checks. Test fixtures may be lighter but never share files with production config.

**Checks:** Each entry records chain ID, origin and the ABI hash it is used with. Critical contracts are checked against their on-chain code hash where feasible. An unset environment refuses to start instead of defaulting to development addresses. ABI or schema changes bump a version consumers check.

**Anti-pattern:** Edit a router or token address inline in a feature PR that auto-merges after green CI.

**Why it fails:** A typo, lookalike or malicious edit sends approvals and funds to the wrong contract while CI passes on the same constant; a defaulted environment points production at test contracts.

**Bad example (illustrative):**

```text
export const ROUTER = '<address>', changed inside a refactor PR and merged by a bot
```

**Better example (illustrative):**

```text
Manifest entry { address, chainId, origin, abiHash }, code-owned, hash-checked at boot, merged by a human after money review
```

**Legitimate exceptions:** Local development fixtures and ephemeral fork addresses need no provenance record. A reviewed, hashed config file is enough; do not build a registry service.

**Verification scenario:** Change one character of an address in a PR and confirm auto-merge is blocked pending money review and the boot hash check fails; start with no environment set and confirm the process refuses.

**Automatable check:** CI fails when address, ABI or token-list files change without a matching manifest hash; those paths carry code owners and an auto-merge exclusion.

Pack: `chain` (candidate). Topics: `contracts`, `security`, `frontend`, `backend`, `review`.

<a id="chain-wallet-and-chain-qa-fixtures"></a>

## Prove wallet and chain journeys with deterministic fixtures

Recommended practice: test in three tiers, namely an injected deterministic wallet provider (scripted accounts, chain ID, signatures, rejections) for inert browser fixtures, a local fork pinned at a block for contract journeys, and funded testnet identities for a few smoke runs. Script the failure journeys: user reject, chain switch mid-flow, insufficient allowance, pending, replaced, dropped, reorg and RPC failure. A mainnet broadcast guard refuses any script combining a mainnet RPC with key material. Refines core card tests-risk-observable-behavior.

**Apply when:** A change touches wallet connection, signing, approvals, chain switching or transaction status UI, or adds a script holding keys or RPC endpoints.

**Boundary notes:** Inert fixtures never sign real payloads or reach a real RPC. Testnet keys live in the CI secret store, never the repository.

**Checks:** The provider has a fixed chain ID and scripted per-method responses, and can emit account and chain change events. Each failure journey asserts visible state and request count. The guard resolves the chain ID rather than string-matching URLs. Fixtures fail on any unmocked network call.

**Anti-pattern:** Test signing only against a real wallet extension on mainnet, or run scripts that take a funded key and an arbitrary RPC URL.

**Why it fails:** Real-wallet tests are flaky and skip rejection and replacement paths, so users meet stuck or false-success states; one misconfigured URL makes a test script spend real mainnet funds.

**Bad example (illustrative):**

```text
Run the swap smoke script with RPC_URL set to a mainnet endpoint and PRIVATE_KEY set to a funded key
```

**Better example (illustrative):**

```text
fixture provider { chainId: FIXED, eth_sendTransaction: scripted('replaced') }; guard: if (isMainnet(await chainIdOf(rpc)) && hasKey) exit(1)
```

**Legitimate exceptions:** Read-only dashboards need only the inert tier. A rarely changed single flow may need one fork test, not a simulation lab.

**Verification scenario:** Run each journey asserting visible state and request count; run a script with a mainnet endpoint and a dummy key and assert it exits before sending.

**Automatable check:** A shared guard every key-loading script imports, plus a lint banning raw private-key environment reads elsewhere.

Pack: `chain` (candidate). Topics: `testing`, `chain`, `frontend`, `backend`, `implementation`.

<a id="chain-wallet-untrusted-user-boundary"></a>

## Treat the wallet as an untrusted, user-controlled boundary

Everything a wallet returns (accounts, chain ID, signatures, transaction hashes) is untrusted input: validate it, match it against the local intent (account, chain, recipient, amount) before acting, and let the server verify signatures. Separate read access (provider) from write authority (signer) so balances, chain ID and history render without a connected or unlocked signer. A dismissed or rejected prompt is a user cancel, not a failure to retry, and private keys, mnemonics, signed capability tokens and full transaction payloads never reach logs, analytics events or URLs.

**Apply when:** Adding wallet connect, sign or send flows, hooks that read chain state, or logging and analytics around wallet actions.

**Boundary notes:** Account or chain changes mid-flow (EIP-1193 accountsChanged and chainChanged) invalidate the pending intent; re-check before signing instead of signing for a stale selection. Feedback copy for a cancel is a product decision.

**Checks:** User rejection (EIP-1193 code 4001) maps to cancel, distinct from failures. Read-only hooks never request signer access. The signing payload is built from the validated intent and the chain ID is re-read at signing time. RPC fallback steps log which step answered, never the payload.

**Anti-pattern:** Retry automatically after the user closes the wallet prompt, or require a connected signer just to show a balance.

**Why it fails:** Auto-retry re-prompts a user who declined or signs on an account or chain they just left; signer-gated reads blank the portfolio whenever the wallet locks; logged payloads leak keys, tokens or user activity.

**Bad example (illustrative):**

```text
catch (e) { toast.error(e.message); retrySend(tx) }, which also runs when the user rejected
```

**Better example (illustrative):**

```text
if (isUserRejection(e)) return settleIdle(); if (wallet.chainId !== intent.chainId) return requireSwitch()
```

**Legitimate exceptions:** Backend-controlled embedded signers follow the server signing policy instead. Slippage, fee and quote defaults are product decisions owned elsewhere, not wallet-boundary rules.

**Verification scenario:** Using the deterministic provider, reject the prompt (idle, no retry), switch chain between review and sign (nothing signed until confirmed) and lock the wallet (balances still render).

Pack: `chain` (candidate). Topics: `chain`, `signing`, `security`, `frontend`, `implementation`.

<a id="contracts-error-envelope-stable-codes"></a>

## Branch on stable error codes, display only sanitized messages

Every error response carries one envelope: a stable SCREAMING_SNAKE_CASE code, a user-facing message and a sanitized flag. One server-side error enum owns each variant's code, HTTP status and sanitized bit, so each client-distinct condition gets its own code and the status names the real cause (maintenance or a down dependency is 503, not 403 or 500). Clients branch only on code and show message only when sanitized is exactly true.

**Apply when:** Adding a backend error variant, mapping a downstream or venue error, or writing frontend error handling, toasts or retry UI.

**Boundary notes:** Mark a variant unsanitized only when its text can carry content the backend did not author (deserializer, downstream or venue text); prefer curating it at the source. A legacy body without the flag is not displayable.

**Checks:** Each condition a client handles differently has its own code; status follows the condition (403 permission, 404 missing, 400 validation, 503 maintenance or dependency down); the frontend never parses, displays or logs unsanitized message text; socket error frames use the same envelope.

**Anti-pattern:** Collapse geo-block, maintenance and verification-required into one generic forbidden code, or match on message text to decide behavior.

**Why it fails:** The client cannot pick the right recovery (inform, retry, redirect), rewording a message silently changes logic, and raw upstream text can leak internals to users mid-incident.

**Bad example (illustrative):**

```text
if (err.message.includes('maintenance')) showRetry(); else toast(err.message)
```

**Better example (illustrative):**

```text
Map err.code to a recovery; show err.message only when err.sanitized === true, else the status fallback copy.
```

**Legitimate exceptions:** A temporary adapter may classify a legacy backend's diagnostic text until a code exists, if the raw text is never displayed and the shim has a removal owner. Fallback copy is a product decision.

**Verification scenario:** Return the same 4xx with sanitized true, false and absent, plus an unknown code: the curated message shows once, the fallback twice, and the unknown code takes only the generic path.

**Automatable check:** A backend test table asserts status, code and sanitized per variant; a lint forbids branching on the API error's message.

Pack: `contracts` (candidate). Topics: `contracts`, `errors`, `frontend`, `backend`, `implementation`.

<a id="contracts-breaking-change-strict-consumers"></a>

## Gate contract changes against the strictest generated consumer

CI diffs every committed contract artifact (REST spec and socket contract) against the base branch and fails on a break, using a rule table that models the strictest consumer: generated clients with closed enums and strict objects. Requests are input and responses are output, so adding an output enum value, a property on a closed output object or a union variant is breaking, as is removing or tightening anything a client sends. Refines core card encoding-reader-writer-compatibility.

**Apply when:** A PR changes a request or response type, an enum, a channel payload or filter, or an endpoint's auth or existence.

**Boundary notes:** Additive changes are safe only in the open direction: a new optional request field, or a new output field on an object no consumer validates strictly.

**Checks:** The diff walks only reachable operations, channels and envelopes; retirement is two steps (deprecate, keep at least one release, delete); a renamed input keeps accepting the old name as a deprecated alias; a deliberate break carries an acknowledgement label and coordinated client releases; consumer validators are really strict.

**Anti-pattern:** Treat 'only added a value' as backward compatible and ship a new status enum value before clients can parse it.

**Why it fails:** Deployed clients with closed enums reject the whole payload, so a live channel drops updates or breaks a view for every user until a new build loads.

**Bad example (illustrative):**

```text
Add status 'expired' to an output enum and merge because the diff only adds lines.
```

**Better example (illustrative):**

```text
Ship client handling first (or an explicit unknown branch), then add the value with the break acknowledged and the client release linked.
```

**Legitimate exceptions:** A lockstep change where every consumer ships in the same deploy can acknowledge the break deliberately. Deprecation length and which consumers count are release decisions.

**Verification scenario:** Run the checker on fixtures that add an output enum value, add a strict-object property, drop a deprecated operation and add an optional request field: the first two fail, the last two pass.

**Automatable check:** A required CI job compares base and head artifacts with the rule table and passes a break only when the acknowledgement label is present.

Pack: `contracts` (candidate). Topics: `contracts`, `release`, `backend`, `frontend`, `review`.

<a id="contracts-generated-ws-contract-gates"></a>

## Generate the socket contract and gate it twice

Publish the socket protocol as a generated, committed artifact: envelope schemas, a manifest binding each channel to its auth mode, envelope and payload schema, and payload JSON Schemas derived from the real wire types. Two CI gates keep it honest: a byte-for-byte regeneration test fails on drift, and a test asserts the manifest's channels equal the server's live subscription registry. Semantics a schema cannot express (merge key, sort, retention cap, primer and live overlap, always-null fields) go in the channel description inside the artifact.

**Apply when:** Adding or changing a channel, a payload type, a subscribe filter or a channel's auth mode.

**Boundary notes:** Each channel declares one payload shape; one serving a snapshot page and live updates declares an array and sends one-element arrays live. A channel with a disabled upstream stays registered and rejects subscribes, keeping the registry check exact.

**Checks:** The regenerated artifact lands in the same commit as the type change; fields the server stamps (caller identity) are excluded from the published filter; the description tells consumers how to merge without reading server code; units the schema cannot distinguish (ms and ns are both int64) get a source-level check.

**Anti-pattern:** Hand-maintain a document listing channels and payloads, or let consumers infer shapes from live frames.

**Why it fails:** The document rots silently; renamed fields and new channels ship unnoticed until frames fail validation in production, and merge rules guessed from samples corrupt live views.

**Bad example (illustrative):**

```text
Describe a new channel's payload in a wiki and tell clients to log frames to learn the fields.
```

**Better example (illustrative):**

```text
Derive the payload schema from the wire type, regenerate, and let the drift and registry tests fail until the artifact is committed.
```

**Legitimate exceptions:** Third-party sockets keep their own boundary schema. An experimental channel may skip client codegen only if the registry test lists it explicitly.

**Verification scenario:** Add a payload field without regenerating: the drift test fails. Register a channel with no manifest row: the registry test fails.

**Automatable check:** A snapshot test with an update switch, plus a registry-equality test in the required CI lane.

Pack: `contracts` (candidate). Topics: `contracts`, `realtime`, `backend`, `frontend`, `review`.

<a id="contracts-committed-snapshot-provenance"></a>

## Commit contract snapshots with verifiable provenance

Consumers generate clients from committed contract snapshots, never from a live endpoint at build time, and never hand-edit generated output. A committed provenance record holds the backend revision and a SHA-256 digest per artifact (REST spec, socket contract, whole generated tree); an offline verifier in required CI fails when any changes without matching provenance. Authenticated regeneration runs only when contract paths change or a label asks for it, is transactional (any failed step restores every snapshot), and fresh means regenerating produces no diff.

**Apply when:** Updating API types, consuming a new endpoint, touching generated files, or wiring codegen into CI.

**Boundary notes:** Generate runtime validation schemas only for an allowlist of components crossing an untrusted boundary; generated TypeScript types validate nothing at runtime.

**Checks:** Snapshot, generated tree and provenance change in one commit; the offline verifier needs no network or credentials and is never skipped for missing secrets; generation never falls back to stale artifacts; freshness compares working-tree hashes before and after regeneration, not HEAD, so merge commits work; path-filtered checks let main drift, so regenerate after merging main.

**Anti-pattern:** Patch a wrong generated type by hand, or let the build download the latest spec.

**Why it fails:** Hand edits vanish on the next run and hide the backend bug; build-time downloads make builds unreproducible and tie every deploy to another environment's uptime and unreviewed contract changes.

**Bad example (illustrative):**

```text
Edit the generated order type to make a field optional so the page compiles.
```

**Better example (illustrative):**

```text
Fix the backend type, regenerate from the authoritative contract, and commit snapshot, client and provenance together.
```

**Legitimate exceptions:** A degraded diagnostic mode may reuse committed artifacts, but it is not a supported generation path. A single-repo app may generate from source directly.

**Verification scenario:** Change one byte in the generated tree: the offline verifier fails. Fail the second download mid-run: both snapshots and the tree are restored.

**Automatable check:** Offline digest verification in the required lane; authenticated regeneration gated on contract paths or a label.

Pack: `contracts` (candidate). Topics: `contracts`, `types`, `frontend`, `testing`, `implementation`.

<a id="contracts-boundary-validator-authority"></a>

## Name one validator per untrusted boundary

Each boundary has exactly one runtime authority: app-owned persisted state uses schemas generated from its TypeScript source type, REST and socket payloads use schemas generated from the backend contract, cross-window messages use one strict shared schema, and third-party callbacks use a small boundary-owned schema. The schema proves structure only; migration, recovery, clamping, identity, origin and money policy stay explicit beside it. Refines core cards types-boundary-validation and storage-versioned-boundary.

**Apply when:** Adding persistence, a postMessage protocol or a new API consumer, or writing a handwritten type guard over an object shape.

**Boundary notes:** Primitives and closed scalar unions need no generated schema; internal unions already exhaustive in the type system need no runtime re-check.

**Checks:** No handwritten object-shape predicate duplicates a generated schema; persisted slices are read through loose candidate types (every field unknown) and validated per field, so one corrupt field resets itself while valid siblings survive; a projection derived from a generated schema never broadens fields beyond it without a documented compatibility reason; generated schemas are verified fresh in CI.

**Anti-pattern:** Write a bespoke isValidSettings guard and accept or reject the whole persisted blob at once.

**Why it fails:** The guard drifts from the type, and one malformed field wipes every saved preference or leaves initialization stuck.

**Bad example (illustrative):**

```text
if (!isSettings(JSON.parse(raw))) resetAllSettings()
```

**Better example (illustrative):**

```text
Parse raw into a candidate of unknown fields, validate each slice with its generated schema, keep valid siblings, then apply explicit migration policy.
```

**Legitimate exceptions:** Capability detection, redaction walkers and reference-sensitive cache reconciliation are procedural, not shape validation. What happens to unrecoverable stored user data is a product decision.

**Verification scenario:** Persist one corrupt slice beside one valid slice: the valid slice loads and the corrupt one resets; a cross-window message with an extra key is rejected.

**Automatable check:** A codegen freshness check over registered persisted types, and a lint flagging new handwritten object type guards outside boundary modules.

Pack: `contracts` (candidate). Topics: `boundaries`, `types`, `storage`, `frontend`, `implementation`.

<a id="contracts-strict-payload-tolerant-envelope"></a>

## Validate payloads strictly, envelopes tolerantly, unknowns loudly

A stream or REST consumer validates the payload with the generated strict schema and parses the envelope tolerantly (strip unknown keys, default missing acknowledgement fields), so protocol additions drop nothing while payload drift is caught. A rejected payload goes to the owning feature's contract-failure and recovery path; it is not a subscription error and never satisfies an acknowledgement. Unknown external discriminants (status, side, type) fail at the boundary, and a Record lookup keyed by a wire value asserts the key existed. Refines core card types-boundary-validation. Pack card realtime-validate-payloads-at-transport places this at the socket transport.

**Apply when:** Writing a stream adapter, a REST response mapper, or a label or handler map keyed by a backend enum.

**Boundary notes:** Fallbacks are fine for display, preferences, optional fields and query initial data, never for a required discriminant or required mapper field.

**Checks:** The transport separates unusable, ignored and valid frames; a contract failure emits an identifier-safe diagnostic and triggers the owner's declared recovery; only a valid ack frame for that subscription sets ack state; unknown enum members throw with context instead of rendering empty; validation runs once at ingress.

**Anti-pattern:** Treat a schema rejection as a subscription failure, or resolve an unknown side with an empty-string fallback.

**Why it fails:** Failing the subscription on one bad frame tears down a healthy stream, treating it as an ack can mark a scope live before its snapshot, and an empty label hides an order the UI no longer understands.

**Bad example (illustrative):**

```text
const sideText = SIDE_TEXT[row.side] || 'unknown'
```

**Better example (illustrative):**

```text
const sideText = mustExist(SIDE_TEXT[row.side], 'no text for side ' + row.side)
```

**Legitimate exceptions:** Third-party sockets keep their own boundary policy. An intentionally open enum with an explicit unknown branch is fine when the product defines how unknown renders.

**Verification scenario:** Inject an extra envelope key, a payload with an unknown enum member and a malformed JSON frame: the first applies, the second reaches the owner's failure path without acking, the third is dropped and counted.

**Automatable check:** A lint against nullish fallbacks on required discriminants, and a transport test asserting rejected payloads never change ack state.

Pack: `contracts` (candidate). Topics: `boundaries`, `realtime`, `contracts`, `frontend`, `review`.

<a id="contracts-sealed-cursors-page-bounds"></a>

## Seal pagination cursors and publish page bounds

List endpoints use keyset pagination with an opaque cursor carrying the sort key plus a unique tie-breaker. When a cursor encodes anything the response hides (another user's id, a signature, an internal offset), seal it with authenticated encryption under a per-deployment key and bind it to a fingerprint of the request scope (caller, filters, sort). The maximum page size is declared in the schema and equals the server clamp, so generated clients know the bound.

**Apply when:** Adding or changing a paginated list, an infinite-scroll consumer, or a cursor that encodes identifiers.

**Boundary notes:** A plain encoded cursor is fine when it holds only values the response already shows; sealing adds a key and a rotation story.

**Checks:** A malformed, tampered or scope-mismatched cursor returns a distinct invalid-cursor error telling the client to restart from the first page, never a silent restart; tie-breakers make the order total; rotating the key intentionally retires outstanding cursors; public stand-in ids are keyed hashes, not plain digests an attacker can enumerate; the client resets its pages once on that error instead of looping.

**Anti-pattern:** Decode a bad cursor as no cursor and serve page one, or accept a cursor after the user changed filters.

**Why it fails:** Infinite scroll silently duplicates or loops rows, and a forged or replayed cursor can read past the caller's scope or reveal identifiers the response hides.

**Bad example (illustrative):**

```text
cursor = base64(JSON({ userId, offset })); a decode failure falls back to offset 0
```

**Better example (illustrative):**

```text
cursor = seal({ ts, id, scope }); open failure or scope mismatch returns an invalid-cursor error and the client restarts once.
```

**Legitimate exceptions:** Small bounded lists can return everything with no cursor. Offset paging is acceptable for upstreams that only page by offset, behind the same strict decode.

**Verification scenario:** Tamper one byte, change a filter between pages and rotate the key: each returns the invalid-cursor error, and the client restarts once with no duplicate rows.

**Automatable check:** A contract test that every list endpoint's limit parameter declares a maximum equal to the server clamp.

Pack: `contracts` (candidate). Topics: `contracts`, `query`, `security`, `backend`, `implementation`.

<a id="contracts-dual-name-rename-window"></a>

## Rename fields through a dual-name window

When any consumer silently drops unknown fields (a skip-unknown ingestion queue, a stripping schema, a lenient mapper), a rename is a sequence: consumer and projection accept both names and write both, the producer cuts over, old data is backfilled, a soak proves nothing reads the old name, then the old name is removed. The window lets the producer roll forward or back at any moment with no gap. Apply schema steps dependency-first (storage, then intake, then projection) and reverse them for rollback.

**Apply when:** Renaming a field on a stream, a persisted record, a materialized projection or a response read by lenient consumers.

**Boundary notes:** For strict generated consumers a rename is an explicit breaking change instead; prefer add-new, deprecate-old.

**Checks:** The consumer side is live before the producer emits the new name; the projection writes both target fields, not only the new one; the missing leg arrives as a type default, so the merge picks the populated side; the soak is evidence-based; no single migration collapses all steps.

**Anti-pattern:** Assume full-state snapshots are re-emitted, so a skew window will self-heal.

**Why it fails:** Messages carrying the new name hit a consumer that ignores it, are acknowledged, and land as default zeros that supersede the last good row. Only re-emitted keys heal; dormant keys and per-interval facts stay wrong indefinitely, and the lost values never got past the wire.

**Bad example (illustrative):**

```text
One migration renames the column while the producer deploy goes out independently.
```

**Better example (illustrative):**

```text
Step 1 accept and write both names; step 2 producer cutover; step 3 backfill and soak; step 4 drop the old name.
```

**Legitimate exceptions:** A lockstep deploy with no queued or stored old-format data can rename directly. If history cannot be backfilled, document which periods keep only the old name.

**Verification scenario:** Run the producer with the old name, then the new name, then roll it back against the dual-name consumer: every row keeps its value under both names and no default zeros appear.

**Automatable check:** A migration lint rejecting removal of a field in the same change that adds its replacement.

Pack: `contracts` (candidate). Topics: `contracts`, `data`, `distributed`, `backend`, `planning`.

<a id="contracts-insert-views-replay-double-count"></a>

## Repair insert-triggered aggregates after replays deepest-first

Where materialized views fire on insert (insert-triggered columnar engines; refresh-based views recompute instead), they run before the base table's merge-time deduplication, so a replayed or re-delivered row collapses in the base table but stays double-counted in any summing aggregate built from it (for example views over a replacing merge-tree table). Views also never fire on delete. Treat every replay and backfill as aggregate-corrupting and repair the whole chain: drop the affected partitions deepest dependent first, then re-derive once with a statement that inserts only missing buckets.

**Apply when:** Replaying a stream, re-running a backfill, redelivering a consumer backlog, or adding a rollup fed by a deduplicating table.

**Boundary notes:** Steady state usually shows no duplicates; the risk follows replays, so the check belongs in incident and backfill runbooks, not the hot path.

**Checks:** Every downstream rollup in the chain is listed before repair; partitions are dropped from the deepest dependent upward so re-derivation does not add a second copy; the re-derive statement skips buckets already present and is safe to run twice; retention is checked, because once source rows expire the skip guard is blind and a repeat run doubles the next table; an audit compares each rollup with a direct aggregate of the base table.

**Anti-pattern:** Repair only the first rollup and re-run its backfill.

**Why it fails:** The re-run re-triggers every downstream view, adding a second copy to tables that sum states and turning one bad day into two, so charts and volume figures overstate activity.

**Bad example (illustrative):**

```text
Delete the suspect day from the minute rollup, then re-run the minute backfill.
```

**Better example (illustrative):**

```text
Drop the day from every rollup in the chain, deepest first, then run the insert-only-missing backfill once and let the chain refill behind it.
```

**Legitimate exceptions:** Aggregates with their own deduplication do not double count. Recomputing a small aggregate from scratch can be simpler than partition surgery.

**Verification scenario:** Replay a known range into a test chain: the rollup reads high against a direct base aggregate; after repair the two match and a second repair run changes nothing.

**Automatable check:** A scheduled query comparing each rollup window with a direct base-table aggregate within a tolerance.

Pack: `contracts` (candidate). Topics: `data`, `distributed`, `operations`, `backend`, `review`.

<a id="contracts-backfills-lose-to-live"></a>

## Make backfilled rows always lose to live rows

A backfill must never overwrite fresher live data. Stamp backfilled rows with the lowest legitimate version for their key (for example the bucket's own window time) so any live row for the same key wins deduplication, mark them as backfilled, and make reruns rewrite only their own rows. Large rewrites go through a shadow table fed by a dual-write view, a coverage check, then an atomic swap. Refines core card batch-replay-and-publication.

**Apply when:** Seeding history from before a pipeline went live, filling an ingestion gap, recomputing a derived column, or bulk-loading a version-deduplicated table.

**Boundary notes:** A source with its own monotonic version can carry that version instead; the invariant is that data written live after the backfill read must win.

**Checks:** The version scheme proves live wins for every overlapping key; the job is idempotent, has a dry run and exits non-zero on partial coverage; the shadow flow verifies distinct-key coverage against the source before swapping and drops the shadow on failure; shadow names are unique per run because swaps exchange names, not underlying replication paths; two backfills never target one destination at once; snapshot first when an irreversible swap must be undoable.

**Anti-pattern:** Stamp backfilled rows with the current time as their version.

**Why it fails:** The backfill outranks rows the live pipeline wrote after the backfill read its source, so users see stale prices, balances or candles until those keys happen to update again.

**Bad example (illustrative):**

```text
INSERT history into the live table with version = now() while ingestion runs.
```

**Better example (illustrative):**

```text
INSERT history with version = window_time and a backfill marker; live rows for the same bucket keep winning.
```

**Legitimate exceptions:** When ingestion is stopped and the backfill is the only writer, version ordering matters less, though reruns must stay idempotent. Coverage thresholds are an owner decision.

**Verification scenario:** Backfill a range where the live pipeline already wrote newer rows: the read model keeps the live values, and rerunning the backfill changes nothing.

**Automatable check:** A post-run assertion that no backfill-marked row outranks a live row for the same key.

Pack: `contracts` (candidate). Topics: `data`, `storage`, `operations`, `backend`, `implementation`.

<a id="contracts-one-fact-one-producer"></a>

## Compute each fact once, in one producer

A domain fact (a fill, a balance, a venue's identity, a PnL figure) is computed once by its owning producer and flows through the confirmed pipeline to every reader. Serving layers and screens read the published fact; they never reach into the producer's working state or recompute it with their own rules. A lookup table that decides something (which venues are decodable or allowed) lives in one place, and every guard reads that same value. Refines core card dataflow-source-and-projection-contract.

**Apply when:** A second service or component wants the same derived number, an endpoint wants to read engine state directly, or two code paths classify the same thing.

**Boundary notes:** Presentation (formatting, display-unit conversion) can stay with the reader. A cache of the published fact is fine; a second derivation is not.

**Checks:** Name the single producer and the path the fact travels; reject endpoints that read another service's internal state; every screen showing the same value reads the same source, not REST in one place and a live stream in another; downstream schema changes stay minimal.

**Anti-pattern:** Let the API compute a position total from raw engine state while the indexer publishes its own.

**Why it fails:** Two producers of one fact disagree on edge cases, users see different balances on two screens, and reconciliation code gets written to paper over a split authority.

**Bad example (illustrative):**

```text
The header balance sums REST positions while the portfolio table sums live-stream positions.
```

**Better example (illustrative):**

```text
Both read the one published positions model; the producer owns the sum.
```

**Legitimate exceptions:** An independent verifier deliberately recomputes facts from separate sources to detect drift; it reports and never serves. A migration may run two producers behind a comparison until cutover.

**Verification scenario:** Change the producer's rule in a test: every reader's displayed value changes together, and no reader holds its own copy of the rule.

**Automatable check:** A dependency rule forbidding the serving layer from importing producer internals.

Pack: `contracts` (candidate). Topics: `contracts`, `data`, `frontend`, `backend`, `planning`.

<a id="contracts-misuse-proof-apis"></a>

## Make unsafe use of an API unrepresentable

Assume the next caller follows the documented API and thinks about nothing else. Safety checks run inside the operation or at construction, never as a separate validate step the caller must remember; when operation B is legal only after check A, B accepts a type only A can produce. Never accept two arguments that must agree; derive one from the other. Verify what executes (the bytes, the parsed value), never a label or the caller's word.

**Apply when:** Designing a public function, constructor, submit path or guard, especially for orders, signatures, transfers or routing.

**Boundary notes:** Wire types and inert configuration tables can be plain public records when every field combination is valid.

**Checks:** Constructors validate and keep fields private; values are parsed at construction (addresses, amounts, timestamps), not lazily on the submit path where a failure is a lost trade; no accessor bypasses a guard, even one nothing calls yet; a value another party can write (a shared cache, a provider label) is not proof; an amount and its raw units are never passed separately.

**Anti-pattern:** submit(order, amount, decimals) plus a separate checkOrder(order) the caller is expected to run first.

**Why it fails:** The skippable check is eventually skipped, mismatched arguments encode the wrong size, and the failure surfaces as a rejected or wrong-sized trade instead of a construction error.

**Bad example (illustrative):**

```text
if (isValid(draft)) submit(draft, draft.amount, decimals)
```

**Better example (illustrative):**

```text
const order = parseOrder(draft); submit(order) // only parseOrder can produce the validated order type
```

**Legitimate exceptions:** Do not brand every primitive; reserve proof types for transitions that move money or authority. Helpers behind an already validated boundary need no re-check.

**Verification scenario:** Try to call the submit path with an unvalidated draft or mismatched units: it fails to compile or cannot be constructed, and the checking constructor is the only way in.

**Automatable check:** Type tests with expected compile errors proving the unchecked type cannot reach the submit function.

Pack: `contracts` (candidate). Topics: `types`, `boundaries`, `frontend`, `backend`, `implementation`.

<a id="contracts-wire-money-time-estimates"></a>

## Keep money, time and estimates unambiguous on the wire

Money crosses every boundary as a decimal string and stays exact end to end: no float conversion before validation, arithmetic or submission. Timestamps use one unit (milliseconds) on the wire, converted from storage-native units in a wire-type shim. Requested or quoted amounts and executed fills are separate fields, and a quoted output is labelled an estimate until the authoritative fill or receipt arrives. Refines pack cards money-exact-decimal-strings, money-backend-decimal-wire-type and money-timestamp-units-by-wire.

**Apply when:** Adding a money or time field to a response or payload, building a mutation payload, or showing expected versus received amounts.

**Boundary notes:** Display-only numbers (charts, sorting) may convert to float; they never flow back into payloads or exact math.

**Checks:** The schema declares money as a string; the frontend uses exact decimal helpers and validates syntax, sign and precision before converting to base units; a required money field fails at the mapper, never defaults to zero; a source-level unit check covers timestamps because a contract diff cannot tell ms from ns integers; the configured amount is never a sum of fills; settlement shows from an observed receipt, never from a send acknowledgement.

**Anti-pattern:** Build a minimum-output field with Number(amount) * (1 - slippage), or present a quote's output as the received amount.

**Why it fails:** Float rounding changes the submitted amount, a thousandfold unit slip never errors but corrupts silently, and users read an estimate as a guarantee.

**Bad example (illustrative):**

```text
minOut = Number(quote.out) * 0.99; toast('Received ' + quote.out)
```

**Better example (illustrative):**

```text
minOut = applyBps(quote.out, slippageBps) on decimal strings, rounded as pack card money-rounding-direction-by-bound specifies; show the output as estimated until the fill event reports the executed amount.
```

**Legitimate exceptions:** Integer minor units are an equally exact wire format when the contract declares them. Estimate copy, slippage and tolerance values are product decisions and must be sourced.

**Verification scenario:** Submit an amount beyond the float-safe range at maximum precision: the payload preserves every digit; a frame carrying a nanosecond timestamp is caught by the unit check before release.

**Automatable check:** A lint banning Number() and parseFloat() on money-typed values in payload builders, and a source check that wire timestamp fields use the millisecond type.

Pack: `contracts` (candidate). Topics: `money`, `contracts`, `frontend`, `backend`, `implementation`.

<a id="execution-fresh-identity-per-deliberate-action"></a>

## Mint a fresh operation identity per deliberate action

Every deliberate user submission is a new operation: create its operation id and idempotency key once, at the action site, before the first await, and carry both through the request and every outcome event. Reuse a key only to replay that same attempt where the backend contract makes the replay safe; never mint a new key to retry an attempt whose outcome is unknown. Identical-looking concurrent submissions are separate operations that settle independently. Refines core card end-to-end-idempotency-and-integrity.

**Apply when:** a diff changes the submit path of an order, trade, transfer or withdrawal, or where its idempotency key is created.

**Boundary notes:** Whether submissions may overlap is a product decision; record it. If product wants one at a time, use the control's existing in-flight state, never an intent-matching layer.

**Checks:** the key is minted in the event handler, not in render, a hook body or a module singleton; one action sends at most one request for its id; pending state and notifications are keyed by operation id; two identical concurrent submissions yield two keys and two independent settlements.

**Anti-pattern:** Derive the key from the order payload, keep one key in component state across submissions, or block a submission because an identical one is pending.

**Why it fails:** A content-derived or reused key makes the server replay the first result for a genuinely new order, silently dropping it; a new key on retry turns a lost response into a duplicate trade; an intent-matching guard rejects legitimate orders.

**Bad example (illustrative):**

```text
const key = hash(token, amount, side) // every identical order shares one key
```

**Better example (illustrative):**

```text
onSubmit: const op = { id: newId(), key: newKey() }; track(op.id); send(payload, op.key)
```

**Legitimate exceptions:** Calls the backend documents as naturally idempotent, such as setting an absolute preference, need no key. Resubmitting a failed leg is a new deliberate action and gets a new key.

**Verification scenario:** Where the recorded decision allows overlap, submit two identical orders while the first is held pending: two requests with distinct keys settle independently. Drop the first response: no second request is sent automatically.

**Automatable check:** Lint that the key factory runs only in event handlers or mutation call sites.

Pack: `execution` (candidate). Topics: `frontend`, `mutations`, `execution`, `implementation`, `review`.

<a id="execution-no-browser-ledger-before-dispatch"></a>

## Never gate dispatch on browser bookkeeping

Sending a money-moving request must not depend on a browser storage write, a hydration pass, a cross-tab Web Lock or a saved pending record. Validate the current request and account, send it once, handle its response, and show current state from authoritative reads and streams. Bounded, account-scoped notification dedupe and observation of acknowledged order ids may live in memory; they never authorize or block a trade and are never persisted.

**Apply when:** a diff persists pending trades, claims or recovery records in browser storage, or awaits storage, hydration or a lock before submitting.

**Boundary notes:** Preferences and authentication storage are outside this rule. Account fencing, amount validation and rejection handling remain required.

**Checks:** denied, full or corrupt storage and a missing Web Lock API still let a valid order go out; nothing retained after an ambiguous response blocks later deliberate submissions; in-memory dedupe is bounded and cleared on account change and reload; nothing replays a mutation after reload.

**Anti-pattern:** Write a pending-trade record before submitting and refuse to submit when the write fails, or keep a recovery ledger the user must clear.

**Why it fails:** The browser becomes a second authority that can veto a valid trade (private mode, quota, lock contention, corrupt JSON); a leftover ambiguous record blocks or confuses later submissions, and a resurrected one can replay a mutation after reload.

**Bad example (illustrative):**

```text
await storage.set(pendingKey, intent); if (!saved) throw trackingUnavailable() // never sent
```

**Better example (illustrative):**

```text
validate(intent, account); showOutcome(await submit(intent, key)) // reads and streams settle the view
```

**Legitimate exceptions:** A persisted cross-tab lock is at most a temporary stopgap for fail-open backend idempotency, with explicit owner acceptance and a removal ticket (see execution-read-backend-idempotency-contract-first). An in-memory critical section for a multi-step protective-order edit is not a persisted claim.

**Verification scenario:** Make storage throw, remove the Web Lock API and seed corrupt saved state: a valid order still dispatches exactly once. Lose the response and reload: nothing is resubmitted and the order appears from authoritative reads.

**Automatable check:** Flag storage or lock calls on submit paths before the network call.

Pack: `execution` (candidate). Topics: `frontend`, `storage`, `execution`, `planning`, `review`.

<a id="execution-not-dispatched-needs-proof"></a>

## Report a request as not sent only with proof

A failure is provably not dispatched only when it was thrown before the transport call began: URL or body serialization, a proactive session refresh, an account-guard check or a pre-dispatch assertion. Mark those errors at the throw site by object identity (for example a WeakSet), never with a shared request flag. Every failure at or after the network call is an unknown outcome unless the response proves rejection, and only marked errors may be shown as not sent with a plain retry. Refines core card distributed-invariants-and-failure.

**Apply when:** mutation error handling chooses between failed and may-have-been-submitted, telemetry classifies submit outcomes, or code clears pending state after an error.

**Boundary notes:** A definite server rejection (most 4xx) is also a known failure, but 401, 408 and 409 on submit are ambiguous, and 5xx or network errors are unknown. A pre-dispatch failure on a status lookup proves nothing about the order itself.

**Checks:** the marked region ends immediately before the network call; abort, network and response-parse errors are never marked; one rejection object shared by many callers (a coordinator's single refresh promise) is trusted only in the request's own pre-dispatch path; classification runs in submit context only; not-sent copy appears only for marked errors.

**Anti-pattern:** Treat any thrown error, timeout or 5xx as order failed and invite a resubmit.

**Why it fails:** The request may have reached the server and executed before the failure surfaced, so telling the user it failed invites a second, real order.

**Bad example (illustrative):**

```text
catch (e) { toast('Order failed, try again') }
```

**Better example (illustrative):**

```text
catch (e) { const outcome = classify(e) // not-sent only if marked pre-dispatch, rejected only on a definite status, else unknown }
```

**Legitimate exceptions:** Pure reads can be retried freely. A transport whose SDK reports a definitive not-accepted state may rely on that guarantee instead of its own marker.

**Verification scenario:** Throw from the session refresh and from body serialization: not sent, nothing on the wire. Abort mid-flight and return a 502: unknown outcome and no automatic retry.

**Automatable check:** Unit-test the classifier with errors from both sides of the fetch boundary.

Pack: `execution` (candidate). Topics: `frontend`, `errors`, `execution`, `implementation`.

<a id="execution-type-unknown-and-partial-outcomes"></a>

## Type unknown and partial outcomes explicitly

After a request is sent, a success response that fails contract validation is an unknown outcome: the order may exist, so the user is told to check orders before trying again, never that it failed. A multi-target submission (several wallets, legs or chains) normalizes to a discriminated result whose submitted or failed list is typed non-empty for its variant, with a retryable flag on every failed target. Refines core card mutations-confirmed-reconciliation.

**Apply when:** a mapper parses a create-order, transfer or batch response, or UI renders outcomes of a fan-out.

**Checks:** outcome count equals requested targets; each target appears exactly once and was requested; submitted outcomes carry an id unique within the response; failed outcomes carry a non-empty code and a boolean retryable; a group id is required exactly when the request fanned out; any violation raises a contract error that the UI renders as unknown and telemetry records as contract-unknown; retry is offered only on retryable failed targets, as a new action.

**Anti-pattern:** Coerce a malformed body into success or failure, collapse a mixed result into one notification, or default missing per-target fields.

**Why it fails:** A partly executed batch reported as failed invites resubmitting legs that already filled; reported as success, it hides failed legs the user still has to act on.

**Bad example (illustrative):**

```text
if (!res.orderId) throw new Error('Order failed')
```

**Better example (illustrative):**

```text
type Result = { kind: 'submitted'; submitted: NonEmpty<Sub>; failed: Fail[] } | { kind: 'failed'; failed: NonEmpty<Fail> }
```

**Legitimate exceptions:** A single-target endpoint with a strict generated schema needs only that validation. Unknown-outcome and partial-success copy is a product decision and must be sourced.

**Verification scenario:** Feed a 2xx body missing one target, one with a duplicate id, and a mixed two-target result: the first two render unknown, the third renders per target with retry only on the retryable failed leg.

Pack: `execution` (candidate). Topics: `frontend`, `types`, `errors`, `execution`, `implementation`.

<a id="execution-fence-mutations-to-account"></a>

## Fence each mutation to the account that started it

Capture an account guard (identity plus a monotonic generation) when the user starts a mutation, and assert it is still current immediately before the request leaves, including after any awaited pre-step such as a session refresh or signature. When the response returns for a guard that is no longer current, route success, error and settled callbacks to separate stale handlers so no notification, cache write or navigation lands in the new account.

**Apply when:** a mutation can be in flight across logout, login, account switch or wallet switch, or a pre-dispatch step awaits.

**Boundary notes:** The server still authorizes by session; this fence keeps the client from sending on behalf of, or displaying into, the wrong account. Stale outcomes still reach telemetry.

**Checks:** the guard is captured before the first await; capture fails closed while identity is unresolved or mid-transition; the pre-send assertion throws an error marked not dispatched; a post-response assertion runs before callbacks; stale error and settled handlers exist; the exposed data, error and pending flags hide stale operations.

**Anti-pattern:** Read the current account inside the success callback and write the result to whichever account is active.

**Why it fails:** A switch during flight sends the order from, or shows its result in, the wrong account; a stale 401 can start the new account's refresh or logout flow.

**Bad example (illustrative):**

```text
onSuccess: (res) => cache.set(['orders', currentAccount()], res)
```

**Better example (illustrative):**

```text
const guard = capture(); await refreshIfStale(); assertCurrent(guard); const res = await send(); guard.isCurrent() ? onSuccess(res) : onStale(res)
```

**Legitimate exceptions:** Account-independent public reads need no fence. A mutation that deliberately spans the user's own accounts fences on the owning session, not on the active view.

**Verification scenario:** Hold the response, switch accounts, release it: nothing lands in the new account and the stale handler fires. Switch during the pre-send refresh: no request is sent and the error is classified not dispatched.

Pack: `execution` (candidate). Topics: `frontend`, `authorization`, `mutations`, `lifecycle`, `implementation`.

<a id="execution-auth-refresh-never-replays-mutations"></a>

## Refresh authentication without replaying mutations

After a 401, refresh credentials and retry only idempotent reads; a mutation keeps its original 401, and the refresh only prepares the next deliberate attempt. Before a mutation, refresh proactively when the session is likely expired, then re-check the account guard. REST, socket, timers and visibility checks share one refresh owner and one in-flight promise; because single-use refresh tokens can rotate even when the refresh response is lost, a failed refresh is never replayed and the session is re-read instead.

**Apply when:** a diff touches an HTTP interceptor or mutator, the refresh coordinator, socket authentication or session timers.

**Checks:** retry-after-refresh is gated on the GET method, not on endpoint lists; auth endpoints are never retried; the proactive refresh runs inside the not-dispatched region; cross-tab refresh is coordinated; a refresh 401 counts as recovered only when a session re-read reports a fresh token for the same user; logout suppresses refresh; a mutation from a stale account keeps its error and triggers no refresh.

**Anti-pattern:** A generic interceptor that replays any failed request after refreshing tokens.

**Why it fails:** The first POST may have executed while its response was lost or rejected late, so replaying it trades twice; replaying a refresh whose token already rotated fails and signs the user out.

**Bad example (illustrative):**

```text
on 401: await refresh(); return fetch(originalRequest) // replays POSTs too
```

**Better example (illustrative):**

```text
on 401: await sharedRefresh(); if (req.method !== 'GET') throw original401; return fetch(req)
```

**Legitimate exceptions:** A mutation whose backend contract makes replay safe (payload-bound, fail-closed idempotency with the same key) may be replayed deliberately by its owner, never by a generic interceptor. Server-rendered reads that cannot write cookies leave refresh to the browser.

**Verification scenario:** Expire the access token and submit an order that gets 401: exactly one POST, one refresh and a surfaced error. Race two tabs through a refresh: one rotation wins and the other re-reads the session and stays signed in.

**Automatable check:** Transport unit test: for every non-GET method, a 401 never produces a second request.

Pack: `execution` (candidate). Topics: `frontend`, `security`, `mutations`, `implementation`, `review`.

<a id="execution-read-backend-idempotency-contract-first"></a>

## Read the backend idempotency contract before designing retries

Before designing any client retry, recovery or duplicate handling, establish the backend guarantee: is the key reserved before the handler runs, does a concurrent same-key request get 409, is the key bound to a payload hash, are finished results replayed, and does the store fail closed when unavailable? With a strict contract the client needs nothing beyond the key. With a weaker one, treat 409 and ambiguous results as unresolved, never auto-resubmit or mint a replacement key, reconcile through authoritative reads, and file the backend fix.

**Apply when:** a ticket asks for retry, recovery, resubmission or duplicate prevention on a money-moving endpoint, or a new endpoint accepts an idempotency header.

**Boundary notes:** A persisted cross-tab client lock or admission ledger is a workaround for fail-open, payload-unbound backend idempotency. Ask the backend owner for reserve-before-run, payload binding, fail-closed storage and an authoritative lookup instead of building one.

**Checks:** cite a source (code, spec or owner answer) for reservation timing, concurrent behavior, payload binding, store-down behavior, result persistence and replay window; note endpoints still on legacy best-effort middleware; client handling of 409 in-flight, 409 conflict and 503 matches the contract.

**Anti-pattern:** Assume an idempotency header means retries are safe, or build client locks to compensate for an unverified backend.

**Why it fails:** Fail-open middleware executes duplicates during a store outage; without payload binding a reused key replays an unrelated earlier response; client compensations cannot see other devices and become a second authority.

**Bad example (illustrative):**

```text
if (res.status === 409) resubmit(intent, newKey())
```

**Better example (illustrative):**

```text
if (res.status === 409) { markUnresolved(op); refetchOrders() } // never a fresh key
```

**Legitimate exceptions:** Naturally idempotent operations (absolute set, delete by id) need only their documented semantics. If the backend cannot change soon, an owner may accept a temporary client mitigation with a removal ticket.

**Verification scenario:** Against a dev backend, send one key twice concurrently, reuse a key with a changed body, and send while the store is down; compare the statuses with the documented contract.

Pack: `execution` (candidate). Topics: `frontend`, `backend`, `contracts`, `execution`, `planning`.

<a id="execution-mutation-safety-review"></a>

## Review money mutations against every failure case

Before approving a change to a money-moving mutation, walk it through one action firing twice, two concurrent triggers, success with a lost response, an auth refresh, transport replay (reconnect, reload, Strict Mode re-run) and an account switch mid-flight. A lost response is an unknown outcome, non-idempotent calls are never retried automatically, and the idempotency key is generated at the call site.

**Apply when:** a diff touches order, position, transfer, exchange or settlement code, mutation options, or transport retry settings.

**Checks:** mutation retry stays disabled for POST, PUT, PATCH and DELETE unless the backend documents idempotency; one action produces one request (no duplicate handlers, effect re-runs or form plus button submits); automatic triggers for the same operation share one coordinator; no raw fetch parallels a mutation hook on one endpoint; failures are surfaced and the trigger re-enabled; no silent early return drops a user action; logs carry operation and payload hash, never the raw payload; optimistic updates define patch, rollback and reconciliation.

**Anti-pattern:** Approve because the happy path and the existing unit tests pass.

**Why it fails:** Duplicate orders and phantom failures appear only under lost responses, retries and races, which happy-path tests never produce; the cost is a second real trade or a user who resubmits.

**Bad example (illustrative):**

```text
useMutation({ mutationFn: placeOrder, retry: 3 })
```

**Better example (illustrative):**

```text
useMutation({ mutationFn: placeOrder, retry: false }) with the key minted in the submit handler and unknown outcomes surfaced
```

**Legitimate exceptions:** Cosmetic or read-only edits in those areas need only confirmation that no mutation path changed. Never add a duplicate-submission blocker to satisfy this review; rely on the existing in-flight state and server idempotency.

**Verification scenario:** Run the order journey with the response dropped, with a forced 401 and with a mid-flight account switch; assert one request per action and the documented outcome state each time.

**Automatable check:** Lint mutation options for non-false retry and for idempotency keys created outside handlers.

Pack: `execution` (candidate). Topics: `frontend`, `mutations`, `execution`, `testing`, `review`.

<a id="execution-atomic-idempotency-claim-fail-closed"></a>

## Claim idempotency keys atomically and fail closed

Scope the key by user and endpoint, hash a canonical serialization of the parsed payload, and claim the key with a pending record through one atomic set-if-absent with expiry before the handler runs. The claim TTL must outlive any request, at least four times the request timeout, and a finished success is stored with its status and body for a bounded replay window. A losing claimant gets the stored result, 409 for a different payload or a still-pending claim (with Retry-After), and 503 when the store cannot answer. Refines core card end-to-end-idempotency-and-integrity. Pack card execution-read-backend-idempotency-contract-first is the client-side reading of this contract.

**Apply when:** a backend handler for orders, transfers or other consequential writes accepts an idempotency key, or a middleware is chosen to provide one.

**Boundary notes:** The payload hash binds the client key to its first payload; it is never the dedupe key, so identical genuine orders with different keys both execute. Require the key where a retry could repeat a fan-out.

**Checks:** a claim that expired between the lost race and the read counts as in flight, not free; only 2xx results are stored and an error releases the claim, so the handler must not error after a side effect (see execution-no-whole-request-error-after-effect); a failed result write is alerted, because the key becomes runnable again when the claim expires; the side effect and its result write run so neither a timeout nor a client disconnect can cancel them in between, because an unresolved pending claim becomes runnable again when it expires; replay returns the stored status and body verbatim.

**Anti-pattern:** Check-then-set in two calls, run the handler when the store is unreachable, or accept a key not bound to its payload.

**Why it fails:** Two concurrent retries both pass the check and both trade; failing open executes duplicates exactly during an outage; an unbound key replays an old response for a new order and silently drops it.

**Bad example (illustrative):**

```text
if (!(await store.get(k))) { await store.set(k, 'pending'); await run() }
```

**Better example (illustrative):**

```text
if (!(await store.setIfAbsent(k, { pending: true, hash }, claimTtl))) return replayOrConflict(k, hash)
```

**Legitimate exceptions:** Naturally idempotent writes need no claim store; retention windows are an operational decision to record.

**Verification scenario:** Send two same-key requests concurrently (one runs, one gets 409), repeat after completion (replayed), change the body (409), stop the store (503, nothing runs), and expire a claim mid-race (409, no second run).

Pack: `execution` (candidate). Topics: `backend`, `distributed`, `mutations`, `execution`, `implementation`.

<a id="execution-no-whole-request-error-after-effect"></a>

## Never fail the whole request after a side effect

Once the first effect of a request is published, such as an order sent or a leg executed, the handler only returns success: later failures become per-target outcomes in a 202 response, so the stored idempotent answer is terminal and replaying the key can never re-run executed legs. Every requested target gets an explicit outcome, including targets with nothing to do. Long fan-outs stop starting new work at an internal deadline below the request timeout and report the rest as retryable.

**Apply when:** a handler fans out across wallets, positions, chains or legs, or performs more than one side effect under one idempotency claim.

**Checks:** no error return or early exit after the first publish; the response carries requested and submitted counts and one outcome per target; failed outcomes state whether they are retryable; the stop deadline leaves margin under the request timeout and the claim TTL; retrying a failed leg is documented as a new request with a fresh key, while replaying the old key returns the original outcome; a request that fails before any effect may still error and release its claim.

**Anti-pattern:** Return 500 when the third of five legs fails after two have executed.

**Why it fails:** The error releases the idempotency claim, so a same-key retry re-executes the two legs that already traded, and the user sees a failure for trades that happened.

**Bad example (illustrative):**

```text
for (const leg of legs) await execute(leg) // throws on leg 3, request errors, key released
```

**Better example (illustrative):**

```text
for (const leg of legs) outcomes.push(await tryExecute(leg)); return { status: 202, outcomes }
```

**Legitimate exceptions:** A single-effect endpoint may return an error when its one effect definitely did not happen. Validation failures before any effect error normally.

**Verification scenario:** Fail the third leg of a five-leg request: 202 with two submitted and three failed outcomes. Replay the key: identical body and no new execution. Slow the legs past the internal deadline: the remainder is reported retryable before the request timeout.

Pack: `execution` (candidate). Topics: `backend`, `contracts`, `errors`, `execution`, `implementation`.

<a id="execution-outcome-unknown-timeout-ladder"></a>

## Make outcome-unknown a terminal state with a timeout ladder

When an executor hands work to a downstream engine and the reply can be lost, outcome-unknown is a terminal state reached through a ladder of timeouts. Each path's reply ceiling is about twice its worst legitimate path (submit bound plus confirmation window, doubled for queueing), and every ceiling is strictly below the window after which a reconcile sweep writes off unresolved work. Assert that ordering at compile time or startup so nobody raises a ceiling past the sweep.

**Apply when:** an order, execution or transfer waits on an asynchronous reply from a chain engine, solver or venue, or a periodic sweep resolves stuck records.

**Boundary notes:** If the reply lives only in process memory, a restart loses it and the sweep is the only safety net. What happens to a reservation (budget, balance hold) after an unknown outcome is a money-policy decision to record.

**Checks:** ceilings derive from documented engine bounds, not guesses; the ceiling-below-sweep relation is asserted; the sweep runs periodically, so it also covers work orphaned by a restart; user copy says the outcome is unknown and to verify before retrying (copy is a product decision); unknown is never relabeled failed or retried automatically.

**Anti-pattern:** A reply ceiling shorter than the engine's worst path, or a sweep that can act while the edge is still waiting.

**Why it fails:** A live swap is written off and reported failed, inviting a second trade; when the edge timeout and the sweep both compensate one execution, a reservation is released twice or a refund is issued for a trade that landed.

**Bad example (illustrative):**

```text
const replyTimeout = 30_000; const sweepWindow = 20_000 // the sweep wins the race
```

**Better example (illustrative):**

```text
const ceiling = 2 * (submitBound + confirmWindow); assert(ceiling < SWEEP_WINDOW)
```

**Legitimate exceptions:** A synchronous call whose response is the outcome needs only its request timeout and unknown-outcome handling. A path with an authoritative status lookup may resolve by lookup instead of a write-off.

**Verification scenario:** Delay an engine reply past its ceiling but under the sweep window: one outcome-unknown transition and one compensation. Restart the executor with work in flight: the sweep resolves it exactly once after the window.

Pack: `execution` (candidate). Topics: `backend`, `distributed`, `operations`, `execution`, `planning`.

<a id="execution-durable-receipt-before-effect"></a>

## Write the execution receipt before the effect fires

Give each execution a receipt row keyed by a deterministic trigger key (schedule slice, token, triggering trade), unique per order, and insert it with insert-or-do-nothing immediately before the effect goes on the wire. One inserted row means this attempt owns the effect; a conflict means it already fired, so abort with nothing sent and leave the other attempt's row untouched. Run every check that can abort without sending (budget, identity resolution) before the insert so an aborted attempt never burns the key. Refines core card stream-checkpoints-and-effects.

**Apply when:** a trigger, schedule, limit or standing order executes trades on redeliverable events or across restarts.

**Boundary notes:** An in-memory already-fired set is a cache in front of the receipt, never the authority: a miss costs a conflict round trip, never a double buy. A budget read followed by a claim is safe unlocked only with a single sequential claimant; parallel claimants need a lock or a database-side guard.

**Checks:** stage order (checks, receipt, send) is documented as an invariant; an unknown spend or failed read skips the execution, so a restart can miss a buy but never double one; every inserted row ends succeeded or failed, unknown included via the sweep, or it pins the order and holds budget; in-flight rows count toward spend.

**Anti-pattern:** Send the swap and then record the execution, or claim the receipt before a check that can still abort.

**Why it fails:** A crash between send and record re-fires on redelivery and buys twice; a receipt claimed before an aborting check blocks that trigger forever, a missed trade that never retries.

**Bad example (illustrative):**

```text
await sendSwap(req); await db.insert(execution) // a crash in between re-fires
```

**Better example (illustrative):**

```text
checkBudget(); resolveIdentity(); if (!(await insertReceiptOnce(orderId, triggerKey))) return; sendSwap(req)
```

**Legitimate exceptions:** One-shot user submissions behind an atomic idempotency claim need no separate receipt table. Notifications that tolerate duplicates can skip it.

**Verification scenario:** Redeliver one trigger twice concurrently: one send and one conflict with nothing sent. Fail the budget read: no receipt and the next trigger can fire. Crash after the insert: the sweep resolves the row once.

Pack: `execution` (candidate). Topics: `backend`, `data`, `mutations`, `execution`, `implementation`.

<a id="execution-admit-every-request-to-terminal-state"></a>

## Admit every request so clients reach a terminal state

At the admission boundary of a durable workflow, insert the order row idempotently (insert-or-do-nothing on the request id) before creating any route state, and treat an already-admitted id as already seen. A request that cannot be planned, or fails a definitive validation, is admitted as an already-failed terminal record instead of being dropped, so the client always sees an end state. A transient dependency error (signer, database, state store) fails the admit itself so redelivery retries the whole admission.

**Apply when:** a consumer turns queued or redelivered requests into long-running routes, bridges, withdrawals or multi-step executions.

**Checks:** duplicate delivery is a no-op answered as already seen; the durable row exists before any step runs; plan and definitive validation errors become persisted failed states with a reason; transient errors propagate and the message is redelivered; one function drives both fresh admits and startup resume; the initial status publish is deduplicated; per-step transient retries are bounded and a non-transient error settles the route failed.

**Anti-pattern:** Log and drop an unplannable request, or acknowledge the message before the durable row is written.

**Why it fails:** A dropped request leaves the client spinning on pending with funds in an unknown place; acknowledging before persistence loses the request on a crash; failing permanently on a transient error abandons a valid transfer.

**Bad example (illustrative):**

```text
const plan = tryPlan(req); if (!plan) { log.warn('bad route'); ack(); return }
```

**Better example (illustrative):**

```text
const state = tryPlan(req) ?? failedState(req, reason); await insertOnce(rowFor(state)); if (!(await createRouteState(state))) return alreadySeen
```

**Legitimate exceptions:** Synchronous request-response handlers can return a validation error directly. A message that cannot be parsed at all may go to a dead-letter queue with an alert.

**Verification scenario:** Deliver one request id twice: one route. Deliver an unplannable request: a persisted failed state the client can read. Make the signer unreachable during admit: the message is redelivered and admitted once it recovers.

Pack: `execution` (candidate). Topics: `backend`, `distributed`, `lifecycle`, `execution`, `implementation`.

<a id="execution-journal-signed-bytes-before-broadcast"></a>

## Journal the signed transaction before broadcasting it

Persist what a broadcast will leave behind before sending it: for EVM the nonce, hash and raw signed bytes; for Solana the signature and last valid block height; for a venue action the signed payload and its nonce. Resuming is calling the step again: a journaled step checks for a receipt, re-sends the identical bytes (same hash, so nodes deduplicate) and rebuilds only once the original provably cannot land: its blockhash or deadline has expired by the chain's own clock and its signature or hash is absent. An "already processed" answer means it landed. A preflight rejection proves only that this one send was not forwarded; an earlier copy may still be live.

**Apply when:** a backend signs and broadcasts transactions or venue actions inside a workflow that can crash, restart or retry.

**Boundary notes:** Fail closed on the journal write before any broadcast whose replay the network does not deduplicate: a crash must resume from a recorded submission, never a fresh one. A signed, deadline-bound batch is signed once and never re-signed; the chain alone decides its fate.

**Checks:** the journal write precedes the send; the per-chain signing lock spans build, send and confirm; a not-landed Solana transaction whose blockhash can still confirm waits instead of rebuilding; a resumed EVM step re-polls for a receipt before any dead-nonce verdict (see execution-nonce-allocation-and-dead-verdict); the journal store is treated as sensitive and never exported to analytics.

**Anti-pattern:** On restart, rebuild and re-sign a step that shows as in progress.

**Why it fails:** If the first transaction landed or is still pending, a rebuilt one with a fresh blockhash or the next nonce is a second valid transfer of the user's funds.

**Bad example (illustrative):**

```text
onResume: const tx = sign(build(step)); send(tx)
```

**Better example (illustrative):**

```text
onResume: const j = journal[step]; if (j) return (await receipt(j.hash)) ?? rebroadcast(j.raw); else { const s = sign(build(step)); await persist(s); send(s.raw) }
```

**Legitimate exceptions:** Pure read or polling steps (attestation, fill status) need no journal; they re-check by id. A venue that rejects a reused nonce turns a byte-identical resend into a definite answer. A first and only attempt from a client that never resends may rebuild after a preflight rejection.

**Verification scenario:** Kill the worker after the journal write but before the send, and again after the send: each resume yields exactly one on-chain transaction. Expire a Solana blockhash with the signature absent: the resume rebuilds once. Answer a resend with blockhash-not-found from a lagging node while the original is live: no rebuild.

Pack: `execution` (candidate). Topics: `backend`, `chain`, `signing`, `execution`, `implementation`.

<a id="execution-settle-on-observed-chain-receipt"></a>

## Settle only on an observed chain receipt

A send that returns OK is not settlement: an accepted send with an unmoved nonce was never in the mempool. Confirm from the chain against a baseline captured before the send (block height lower bound, pre-send balance), require a successful receipt, measure the credited amount from transfer logs emitted by the expected token contract, summing inflows to and outflows from the recipient separately and netting them, and verify the intended state change happened. A net credit of zero or less is a fault, and downstream legs spend the measured amount, never a quoted or reported figure.

**Apply when:** a step advances a workflow, credits a user or sizes the next leg after a transaction or bridge fill.

**Checks:** the baseline is captured before sending; a reverted receipt fails the step; the credited amount derives purely from the receipt and ignores logs from any other emitter, so a resume re-derives the same value; a net credit of zero or less raises an error; the transaction hash is recorded before any amount check that can fail, so the record never denies a real transfer; delegations and approvals are verified by reading resulting state, since a mined transaction can be a silent no-op; replica lag after a receipt is bounded by a deadline.

**Anti-pattern:** Mark a step done when the RPC accepts the transaction or a provider reports a fill.

**Why it fails:** An accepted send may never be mined, a mined no-op changes nothing, and a fee-on-transfer token credits less than quoted; advancing on any of them moves the user's money downstream on funds that never arrived.

**Bad example (illustrative):**

```text
await rpc.send(tx); step.done = true; next.amountIn = quote.amountOut
```

**Better example (illustrative):**

```text
const r = await waitReceipt(hash); requireSuccess(r); const got = netCredit(r, token, recipient); if (got <= 0n) fail(); next.amountIn = got
```

**Legitimate exceptions:** A third-party status may signal progress or completion where no chain-observable credit exists, but amounts used downstream still come from chain reads. Reporting-only deltas may be approximate if documented.

**Verification scenario:** Simulate a send accepted but never mined, a reverted swap and a swap crediting zero: none advance the route. Replay the step after success: the same credited amount is re-derived.

Pack: `execution` (candidate). Topics: `backend`, `chain`, `money`, `execution`, `review`.

<a id="execution-nonce-allocation-and-dead-verdict"></a>

## Allocate nonces atomically and require two reads for death

Senders sharing a wallet keep per-wallet nonce state (next plus a sorted free list) updated by compare-and-set, reuse released nonces lowest first because a gap stalls every later transaction, and reseed from the chain's pending count when the state is absent. A stale read never lowers the next nonce: use the larger of the chain read and the last proven landing. Declare a broadcast dead only when two snapshots a fixed gap apart both show no receipt and a mined count past its nonce. Refines core card transactions-lost-updates-and-cas.

**Apply when:** several replicas or routes sign from one wallet, or a resume must decide whether a journaled transaction was displaced.

**Boundary notes:** Classify each send rejection by what it proves, and verify exact error strings for your node and client: too low means consumed, so resync forward without freeing; already known or underpriced means occupied, so discard the new send without freeing the nonce and keep waiting for the original's receipt, never marking it failed; a rejection proving the transaction never entered frees the nonce. A single writer can serialize build, send and confirm under one lock instead.

**Checks:** no client library caches a nonce advanced by a fill whose send never happened; an account nonce is consumed even by a mined revert, while an in-contract replay nonce is not; the dead verdict runs only after a bounded receipt re-poll; RPC behind a load balancer is assumed to lag.

**Anti-pattern:** Read the nonce once, increment locally per send, and treat one no-receipt, nonce-passed read as proof the transaction was dropped.

**Why it fails:** Two replicas sign one nonce and a trade is lost, or a freed but occupied nonce displaces a pending transfer; a lagging replica misreads a landed transaction as dropped and the resubmission spends the funds twice.

**Bad example (illustrative):**

```text
if (!(await receipt(h)) && (await minedCount(addr)) > n) resubmit()
```

**Better example (illustrative):**

```text
const dead = (await snapshot()) && (await sleep(gap), await snapshot()); dead ? markDisplaced() : keepWaiting()
```

**Legitimate exceptions:** User-signed wallet transactions use the wallet's own nonce management; blockhash-expiry chains use expiry instead.

**Verification scenario:** Run two replicas allocating for one wallet: no duplicate nonces and no lasting gaps. Serve a lagging replica on one of the two reads: no dead verdict.

Pack: `execution` (candidate). Topics: `backend`, `chain`, `distributed`, `execution`, `implementation`.

<a id="execution-shadow-mode-and-preflight-for-new-paths"></a>

## Ship new execution paths in shadow behind kill switches

A new execution path (third-party router, venue adapter or engine) gets a per-provider, per-engine mode of off, shadow or live. In shadow it is asked, guarded, metered and logged but never executes; off is the kill switch. Third-party calldata is simulated (gas estimate or call) before it takes a nonce, and a simulated revert falls back to the next plan instead of spending a nonce on a failing transaction. Pack cards money-aggregator-calldata-guard and money-preflight-before-nonce hold the detailed guard and preflight contracts.

**Apply when:** a change adds a provider, router, venue or executor that will move user funds, or widens which calldata may execute.

**Boundary notes:** The guard bounds blast radius, not price: allowlisted call target and approval spender, native value exactly the swap's native spend (zero for token-in), chain id echo, pinned output decimals, non-zero output, and a floor neither inverted nor looser than the request's slippage. Soak length and promotion criteria are owner decisions; record them.

**Checks:** default mode is off; shadow results are compared with the incumbent (improvement and rejection metrics); any guard rejection in shadow is an adapter bug that restarts the soak; upgradeable targets, unpinned contracts and unbounded approvals have a named owner's decision before live; rollout flips one provider on one chain first; the kill switch is exercised.

**Anti-pattern:** Enable a new provider live everywhere because its quotes looked better in staging.

**Why it fails:** Units bugs, malicious or upgraded contracts and reverting calldata reach real funds at full traffic; without a kill switch the only remedy is a deploy while losses accrue, and without simulation every revert burns gas and a nonce.

**Bad example (illustrative):**

```text
if (provider.quote > incumbent.quote) execute(provider.calldata)
```

**Better example (illustrative):**

```text
mode === 'live' && guard(plan) && (await simulate(plan)) ? execute(plan) : recordShadow(plan)
```

**Legitimate exceptions:** Adding a chain to an adapter already live under the same guard may use a shorter, owner-approved soak. Read-only integrations need no modes.

**Verification scenario:** In shadow, force a guard rejection and a simulated revert: neither executes and both are metered. Flip the kill switch under traffic: the provider leaves the next race without a deploy.

Pack: `execution` (candidate). Topics: `backend`, `release`, `chain`, `execution`, `planning`.

<a id="money-exact-decimal-strings"></a>

## Keep client money math in exact decimal strings

Token amounts, balances, execution prices, fees and min-outs stay decimal strings from the wire through validation, arithmetic and submission. Exact helpers work on a BigInt coefficient plus scale and return null on malformed input; null means invalid, never zero. Saturating subtraction (a remaining balance floored at zero) and a signed net (PnL) are separately named operations, and floats are only for display-only metrics such as charts and sort keys.

**Apply when:** a diff computes or submits amounts, balances, fees or min-out, or applies Number(), parseFloat(), unary plus or toFixed() to a wire amount.

**Boundary notes:** charts and percent badges may convert at the render edge, where float error cannot reach execution or accounting.

**Checks:** no wire amount passes through a float before validation, arithmetic or submission; every null becomes an explicit invalid or blocked state; signed results use the signed helper; division names precision and rounding; display numbers never reach payloads.

**Anti-pattern:** Compute a minimum output or remaining balance with floats and coerce failed parses to zero.

**Why it fails:** Doubles hold integers exactly only to 2^53 and most decimal fractions not at all; tiny values stringify as "1e-7", which strict decimal parsers reject. A min-out one base unit off can revert or leak value; a failed parse shown as 0 says the user holds nothing or lets an invalid amount through; a saturated PnL hides losses.

**Bad example (illustrative):**

```text
const minOut = Number(quotedOut) * (1 - slippage); const left = subtract(balance, amount) ?? '0'
```

**Better example (illustrative):**

```text
const minOut = floorFromBps({ raw: quotedOutRaw, bps }); if (left === null) render the invalid-amount state
```

**Legitimate exceptions:** A venue field published only as a JSON number converts once at the mapper and is labelled as such. Integer counts are not money.

**Verification scenario:** Feed amounts above 2^53 base units, 1e-7-scale values, malformed strings and a negative difference; verify exact payload strings, an explicit invalid state, a negative signed PnL and a remaining balance saturated at "0".

**Automatable check:** A lint rule banning Number(), parseFloat() and unary plus on wire amounts in money and mutation paths, with a reviewed opt-out list for display-only modules.

Pack: `money` (candidate). Topics: `money`, `types`, `frontend`, `implementation`, `review`.

<a id="money-base-units-from-asset-decimals"></a>

## Convert base units with each asset's own decimals

Human amounts and raw on-chain integers meet only at an explicit conversion that takes decimals from the asset's metadata for that chain, never from a constant. Reject input with more fractional digits than the asset holds before converting, because conversion truncates, and reject negative or out-of-range values instead of wrapping. Raw amounts travel as integer strings or 256-bit integers, and no interface accepts an amount and its raw units as two fields that must agree: derive one from the other.

**Apply when:** code builds calldata or transfers, reads raw balances or logs, maps a provider quote to base units, or adds a token or chain.

**Boundary notes:** where the backend owns conversion, the client sends the validated decimal string and derives no raw units.

**Checks:** decimals are keyed by chain and asset; excess fraction digits fail validation before conversion; conversion returns null on negative, malformed or overflowing input; raw values never narrow to 64-bit integers or floats; unknown output decimals refuse the quote; names state the unit (raw, wei, humanized).

**Anti-pattern:** Scale every token by 10^18, or cast a rescaled value into a 64-bit integer.

**Why it fails:** The same stablecoin can use 6 decimals on one chain and 18 on another, so a shared constant is off by 10^12. At 18 decimals, about 18.4 tokens already overflow an unsigned 64-bit integer (9.2 for signed), so a narrowing cast wraps or a rescale silently stops short and the transfer is mis-scaled.

**Bad example (illustrative):**

```text
const raw = BigInt(Math.round(Number(amount) * 1e18)).toString()
```

**Better example (illustrative):**

```text
if (fractionDigits(amount) > asset.decimals) return tooPrecise; const raw = toRawUnits({ value: amount, decimals: asset.decimals })
```

**Legitimate exceptions:** A protocol-fixed native decimal count can be a named constant in that chain's configuration. Analytics that never sign may store normalized decimals.

**Verification scenario:** Convert one amount for 6-, 9- and 18-decimal assets, an input one digit beyond the asset's decimals, a negative value and a value past 64 bits; verify exact integer strings, a validation error and refusals rather than wrapped values.

**Automatable check:** A lint gate flagging literals such as 1e18, 10 ** 18 or 10n ** 18n outside the asset-configuration module.

Pack: `money` (candidate). Topics: `money`, `chain`, `frontend`, `backend`, `implementation`.

<a id="money-rounding-direction-by-bound"></a>

## Round toward the bound that must hold

Every rounding at a wire, accounting or precision boundary names its direction, chosen by the invariant that must survive. Round toward zero when the result must not exceed a real ceiling (a held balance, a max fill) and away from zero when it must clear a lower bound (a venue minimum, a fee owed, a slippage budget derived from a guaranteed floor). Follow the backend contract where it defines rounding, and never inherit a library default such as half-up or banker's rounding at these boundaries.

**Apply when:** code truncates to asset or display precision for submission, fills a Max button, sizes an order to a minimum, derives slippage bps from two amounts, or converts between precisions.

**Boundary notes:** display-only rounding in a table cell can use the formatter's default because nothing is submitted.

**Checks:** each rounding call states floor or ceil and why; max fill starts from the exact balance minus any source-side fee (saturating) and floors; minimum sizing ceils; a derived slippage budget rounds up so the user's floor stays at or below the guaranteed floor; tests cover an exact value (unchanged either way) and one between steps.

**Anti-pattern:** Round a spend amount half-up, or convert it with a helper whose default rounds.

**Why it fails:** A max fill rounded up exceeds the balance and fails or reverts; a minimum rounded down lands just under the venue minimum and is rejected; a truncated slippage budget sets the user's floor above the guaranteed floor, so execution refuses it; two helpers that round differently yield different raw amounts for one input.

**Bad example (illustrative):**

```text
maxInput = roundHalfUp(balance, 6) // 1.9999996 becomes 2.000000, above the balance
```

**Better example (illustrative):**

```text
maxInput = floorTo(subtractSaturating(balance, sourceFee), inputDecimals); minSize = ceilTo(venueMinimum, sizeDecimals)
```

**Legitimate exceptions:** When the server re-validates and owns sizing, mirror its documented direction instead of choosing one. Flooring strands dust; whether dust is shown or swept is a product decision.

**Verification scenario:** Use a balance one sub-unit above a precision step, an exact value, and a minimum one sub-unit above a step; verify Max never exceeds the balance, minimum sizing clears the venue minimum, and exact values are unchanged.

Pack: `money` (candidate). Topics: `money`, `frontend`, `backend`, `implementation`, `review`.

<a id="money-backend-decimal-wire-type"></a>

## Type backend money as a decimal string contract

Backend money uses one shared decimal newtype, never binary floats: JSON carries it as a decimal string (schema type string, format decimal), and binary or analytical encodings use one fixed scale so readers agree on the mantissa. Arithmetic that can overflow or divide by zero is checked and returns an absent value; untrusted floats convert once through a fallible constructor. Where an analytics store has tighter bounds, saturate with a counter and a warning instead of wrapping, panicking or decoding to zero; an authoritative ledger rejects the write instead.

**Apply when:** adding a DTO, event or row field for a price, amount, fee or PnL, writing a percent or ratio helper, or changing a column's precision.

**Boundary notes:** counts, durations and basis points are integers, not decimals. Raw on-chain integers that overflow the decimal type stay integer strings or 256-bit integers.

**Checks:** the generated schema shows string/decimal for every money field; no money field is a float; percent helpers return absent for a zero denominator, a non-positive total and overflow; scale is capped before persistence; saturation increments an alerting metric; an out-of-range decode is an error, not zero; field docs name the unit.

**Anti-pattern:** Serialize money as a JSON number, or decode an out-of-range stored value as zero.

**Why it fails:** JSON numbers become doubles in clients and lose precision past 2^53. A silent zero turns a real balance into "empty" and passes downstream checks, and an unchecked overflow panics the service or wraps the value.

**Bad example (illustrative):**

```text
pub fee: f64 // 0.1 + 0.2 serializes as 0.30000000000000004
```

**Better example (illustrative):**

```text
pub fee: Decimal // serializes as the string "0.3"
```

**Legitimate exceptions:** A third-party API that only offers floats converts at ingress through a fallible conversion. Analytics may use floats once money math is done.

**Verification scenario:** Round-trip an 18-fraction-digit value through JSON and the binary encoding, divide by zero in a percent helper and write past the column bound; verify the string form, an absent result and saturation with the counter incremented.

**Automatable check:** Deny float arithmetic in money modules (for example clippy::float_arithmetic) and fail CI when the generated schema types a money-named field as number.

Pack: `money` (candidate). Topics: `money`, `types`, `storage`, `backend`, `implementation`.

<a id="money-value-provenance"></a>

## Carry provenance with every displayed money value

A displayed money value records its source: backend-authoritative, venue-reported, live-derived on the client (amount times a streaming price), or a client estimate. Balances, account value and PnL come from the authoritative source through one resolver per concept; a live-derived or estimated number is labelled as such and never silently replaces, or sums with, an authoritative one. Two displays of the same quantity read the same resolver, so they cannot disagree.

**Apply when:** a screen shows balances, account value, PnL or receive amounts, a diff adds amount-times-live-price math to an account-value surface, or one figure appears in two places.

**Boundary notes:** a quote's receive amount is legitimately an estimate; mark it rather than hide it. An execution result may carry the quoted output, not the settled fill, until the indexed fill arrives.

**Checks:** each money value has a declared source kind; a missing or malformed required authoritative field fails at the resolver, never falling back to zero or a derived value; totals combine one source kind or are labelled estimates; a mixed-source sum is a review finding.

**Anti-pattern:** Recompute account value from a streaming price where the authoritative total belongs, or fall back to it when the backend field is missing.

**Why it fails:** Client and server totals visibly disagree, users act on a number no system of record produced, and a missing field silently becomes a plausible but wrong balance.

**Bad example (illustrative):**

```text
const accountValue = backendTotal ?? holdings * livePrice
```

**Better example (illustrative):**

```text
const accountValue = resolveAccountValue(overview) // tagged backend; a missing field throws to the error state
```

**Legitimate exceptions:** An approved live ticker may be live-derived when its label says so. Informational estimates such as gas or ETA need no authoritative twin.

**Verification scenario:** Remove the authoritative field, move the live price, and render header and panel together; verify an error state instead of a derived fallback, an unchanged authoritative total and identical values in both places.

**Automatable check:** A ratchet script banning live-conversion helpers in account-value components, with an allowlist that fails CI on new violations and stale entries.

Pack: `money` (candidate). Topics: `money`, `state`, `frontend`, `planning`, `review`.

<a id="money-format-by-unit-meaning"></a>

## Choose formatters by unit meaning, not appearance

Pick the formatter from what the number means: an amount (balance, total, fee), a unit price (adaptive precision, with a subscripted zero count for tiny values), percent points (5 means 5%), a ratio (0.05 means 5%) or basis points (50 means 0.5%). Product money surfaces call named display presets (account value, PnL, fee, estimate) instead of raw currency formatters, so precision and compaction change in one place. Format only at render; formatted strings are never parsed back into domain values.

**Apply when:** a diff renders a price, amount, percentage, bps value or tiny token price, or calls a raw currency formatter inside a money component.

**Boundary notes:** an internal admin table can use the general formatter; the preset rule targets product money surfaces.

**Checks:** each percent call names its source unit (points, ratio or bps); unit prices use the price formatter, not a two-decimal currency formatter; tiny prices keep significant digits; compaction (K, M) never applies to inputs or to values a user must verify exactly; no formatted label flows into state or payloads.

**Anti-pattern:** Format a ratio with a percent-points formatter, or a sub-cent price with a two-decimal currency formatter.

**Why it fails:** A 5% ratio renders as 0.05%, a hundredfold error; a price of 0.00000417 renders as $0.00, so users cannot tell tokens apart or verify a fill; ad-hoc formatters drift until one value shows different precision on two screens.

**Bad example (illustrative):**

```text
formatMoney2dp(token.priceUsd) // "$0.00"; formatPoints(feeRatio) // 0.003 shows "0.003%"
```

**Better example (illustrative):**

```text
formatUnitPrice(token.priceUsd) // "$0.0₅417"; formatRatioPercent(feeRatio) // "0.3%"
```

**Legitimate exceptions:** Tight table cells may use compact variants of the same meaning-based formatter. Which preset a new surface uses is a design decision to source.

**Verification scenario:** Render 0.05 as a ratio, 5 as points, 50 as bps, a sub-micro price and a large total; verify 5%, 5%, 0.5%, a subscripted tiny price that keeps significant digits, and compaction only where approved.

**Automatable check:** A ratchet lint banning direct currency-formatter calls in product money paths (presets required), failing on new violations and on stale allowlist entries.

Pack: `money` (candidate). Topics: `money`, `components`, `frontend`, `implementation`, `review`.

<a id="money-amount-input-raw-string"></a>

## Keep amount inputs as raw decimal strings

An amount field owns a raw string, not a number: it preserves partial input ("0.", "1.0", "-"), normalizes the Unicode minus sign, caps fraction digits at the asset's decimals, and passes the validated string to submission unchanged, so the value the field shows is the value submitted. Which separators are accepted is a locale and product decision to source; ambiguous input, such as a comma followed by exactly three digits, is rejected with a reason rather than guessed. Formatted, grouped or compacted (10K) text is display output and never re-enters a payload. A Max button writes the exact balance string floored to input precision, never a formatted label.

**Apply when:** building or editing an amount, price or size input, a Max or percentage button, or the code that turns form state into a mutation payload.

**Boundary notes:** non-money numeric settings, such as an integer leverage step or a count, can use a numeric input.

**Checks:** the field stores the typed string; partial states keep the caret and value; fraction digits are capped to the asset's decimals at input time; the payload uses the raw validated string; Max subtracts any source-side fee with saturating math and floors; empty and invalid states block submission with a reason; compact notation is disabled for money inputs.

**Anti-pattern:** Bind the field to a number re-rendered from parseFloat, or fill it from the formatted balance label.

**Why it fails:** "1." collapses to "1" mid-typing and "0.10" loses its zero; Unicode-minus input from some keyboards becomes NaN, and a guessed separator turns a pasted 1,234 into 1.234, an amount a thousand times smaller; digits beyond the asset's precision are silently truncated at conversion; "1.2K" or "$1,234.56" either fails to parse or submits the wrong amount.

**Bad example (illustrative):**

```text
<input value={String(parseFloat(raw))} /> with onMax setting the amount to balanceLabel
```

**Better example (illustrative):**

```text
value={raw}; onChange keeps digits and one dot capped at asset decimals; onMax sets floorTo(exactBalance, inputDecimals)
```

**Legitimate exceptions:** Grouping while typing is acceptable only when the stored value stays canonical and the design calls for it. Integer-only assets drop the decimal point entirely.

**Verification scenario:** Type "0.", "1.0", a Unicode minus and digits past the asset's decimals, paste "1,234", then press Max on a fee-bearing source; verify stable editing, capped digits, the ambiguous paste rejected with a reason, the shown value equal to the payload string and a Max that never exceeds the balance.

Pack: `money` (candidate). Topics: `money`, `forms`, `frontend`, `implementation`.

<a id="money-timestamp-units-by-wire"></a>

## Fix timestamp units by the wire they cross

Each published contract fixes one timestamp unit, typed as a newtype rather than a bare integer or string: milliseconds for anything serialized to browsers over REST or WebSocket, because nanosecond epochs exceed JavaScript's safe integer range and lose precision silently, while internal streams may keep nanoseconds. Convert at the publishing boundary, never by widening a client field or narrowing an internal contract, and enforce the client half with a CI scan.

**Apply when:** adding or changing an instant on a client DTO, WebSocket payload or event row, comparing an expiry with the local clock, or consuming a feed with an undocumented unit.

**Boundary notes:** calendar dates, durations and bucket widths are not instants and need their own types.

**Checks:** client-facing instants use the millisecond type in the generated schema; expiry comparisons use the clock's unit; internal-to-client conversion lives in one boundary function; each scan exception records the field's current unit and reason; ordering-sensitive internal timestamps keep full precision.

**Anti-pattern:** Ship a nanosecond epoch as a JSON number, or compare a seconds-based expiry with a millisecond clock.

**Why it fails:** A nanosecond epoch near 1.8e18 cannot round-trip through a double, so distinct events collide or reorder. A seconds expiry always lies in the past against a millisecond clock, so every quote reads as expired, while a nanosecond expiry never expires.

**Bad example (illustrative):**

```text
expiresAt: i64 // nanoseconds on one route, seconds on another
```

**Better example (illustrative):**

```text
expiresAt: EpochMillis // converted once at the API boundary from the internal instant
```

**Legitimate exceptions:** A client needing sub-millisecond ordering gets an explicit sequence number or a string-encoded precise value, not a float. Fields that never reach the wire are out of scope.

**Verification scenario:** Pass a nanosecond instant through the boundary and parse it in the browser, then evaluate a quote expiring shortly; verify millisecond equality after the round trip and a correct valid-to-expired transition.

**Automatable check:** A CI scan flagging client DTO fields named like instants (suffix at, ts, time, date) unless typed with the millisecond newtype, with committed exceptions whose stale entries fail the build.

Pack: `money` (candidate). Topics: `types`, `boundaries`, `frontend`, `backend`, `review`.

<a id="money-quote-binding-status-union"></a>

## Bind each quote to its route, amount and expiry

A quote is usable only for the exact route and input amount it priced, and only before it expires; model it as a status union (disabled, fetching, valid, invalid, failed, superseded) resolved at render and again at submit. An expired or amount-mismatched quote is superseded and refetches, and one whose economic fields fail validation is invalid. Transport errors, 5xx, 408 and 429 stay fetching and retry the read, while a definite 4xx refusal is failed with its message. Refines core card queries-explicit-async-states.

**Apply when:** a form shows a receive amount, rate or fee from a quote endpoint, or a submit handler builds an order from a quote.

**Boundary notes:** how superseded, refresh cadence and expiry are shown is a product decision; rendering superseded like pending rather than as an error is the usual choice.

**Checks:** amounts compare as normalized decimals ("1.0" equals "1"); assets and route match; output and rate are positive; fees are non-negative; recommended slippage is an integer in range; expiry uses the clock's unit; submit re-resolves route and quote and blocks with a refetch on mismatch; the parser tolerates additive fields but rejects malformed required ones.

**Anti-pattern:** Keep the last successful quote on screen and submit it after the user edits the amount or switches route.

**Why it fails:** The order executes on terms the user never saw, or the server rejects it after a confusing confirmation; an error shown for a routine refetch trains users to ignore real errors; auto-retrying a 4xx refusal loops forever.

**Bad example (illustrative):**

```text
submit({ amount: form.amount, slippageBps: lastQuote.recommendedBps }) // amount and expiry never checked
```

**Better example (illustrative):**

```text
const status = resolveQuoteStatus({ quote, route, amount, error }); submit only when status.kind === 'valid' for this route and amount
```

**Legitimate exceptions:** An indicative price with no executable terms needs no binding. When the server re-prices and enforces min-out atomically, the client binds the display but need not duplicate checks beyond the contract.

**Verification scenario:** Change the amount after a quote, let one expire, and return zero output, a 503 and a 422; verify superseded with refetch, invalid, fetching with retry, and failed with the server message, and that submit is blocked outside valid.

Pack: `money` (candidate). Topics: `quotes`, `money`, `query`, `frontend`, `implementation`.

<a id="money-requote-material-tolerance"></a>

## Reconfirm only when re-quoted terms materially worsen

When a quote refreshes between confirmation and dispatch, compare it with the terms the user last confirmed, in the user's worse direction: received amount down, total fee up, recommended slippage up. Equal or better terms dispatch, as does output or fee drift within a sourced bps tolerance; drift beyond it, any rise in recommended slippage, any change to the user's input or route, and any unparseable value force reconfirmation. Only user-visible totals count: a reshuffle between fee components under an unchanged total is ignored, and expiry or ETA changes alone never reopen confirmation.

**Apply when:** a flow re-quotes after confirmation, approval or signing, or shows a "price changed" dialog.

**Boundary notes:** the tolerance value is a product decision: source it, hold it as a named bps constant, and never invent it.

**Checks:** comparisons use exact decimals scaled by 10,000, never floats; the input must be equal after normalization; asset and route must match; unparseable values count as worsened; each later re-quote compares with the latest confirmed terms; tests cover drift below, at and beyond tolerance.

**Anti-pattern:** Require exact equality between approved and fresh quotes, or extend the tolerance to the user's own input amount.

**Why it fails:** Quotes drift by fractions of a basis point per fetch, so exact equality reopens confirmation almost every time and users accept it by reflex; tolerating an input change executes a different trade; passing on a parse failure dispatches unknown terms.

**Bad example (illustrative):**

```text
const reconfirm = Number(fresh.out) < Number(approved.out) * (1 - tol) // floats; input, route and fees never compared
```

**Better example (illustrative):**

```text
const reconfirm = !sameRoute || !decimalEqual(fresh.in, approved.in) || worse(out, 'down') || worse(fee, 'up') || fresh.bps > approved.bps
```

**Legitimate exceptions:** If the server binds execution to the confirmed terms (a min-out from the confirmed quote), rely on that. A flow with no gap between quote and dispatch needs no re-quote.

**Verification scenario:** Re-quote with output down just inside and just beyond tolerance, fee total up beyond tolerance, fee components reshuffled under one total, a changed input and an unparseable fee; verify dispatch, reconfirm, reconfirm, dispatch, reconfirm, reconfirm.

Pack: `money` (candidate). Topics: `quotes`, `money`, `mutations`, `frontend`, `implementation`.

<a id="money-slippage-request-bounds"></a>

## Separate recommended slippage from the accepted request range

Slippage is an integer count of basis points, held in named constants that mirror the server's accepted request range. A recommendation outside that range, such as zero for a direct transfer with no swap leg, may be shown but never sent: omit the field or reject per the contract. Min-out comes from the quoted raw output and accepted bps in exact integer math with bps clamped so subtraction cannot wrap; a zero floor is no protection. Depth-walk estimates are display-only and return null, never 0, when the book cannot fill the size.

**Apply when:** building a slippage control or default, applying slippage to a quote, validating a request's slippage, or showing estimated price impact.

**Boundary notes:** default slippage, the user-selectable maximum and impact warnings are product decisions to source. The server stays the validator.

**Checks:** bounds live beside the request contract and are imported, not retyped; builders reject non-integer or out-of-range bps and omit a zero recommendation; min-out is typed or constructed so zero cannot reach the signer and never exceeds the quote; bps above 10,000 is refused or clamped first; a null estimate shows as not available and never feeds a payload.

**Anti-pattern:** Send the quote's recommended bps verbatim, or show 0% estimated slippage when the book cannot fill the size.

**Why it fails:** A zero or above-maximum value is rejected after the user confirmed; bps above 10,000 wraps fixed-width unsigned subtraction or goes negative; a zero min-out accepts any fill; "0%" on thin depth invites a trade that moves the price far more than shown.

**Bad example (illustrative):**

```text
req.slippageBps = quote.recommendedBps; minOut = quoted * (10000n - bps) / 10000n // bps unchecked
```

**Better example (illustrative):**

```text
if (rec !== 0) req.slippageBps = assertInRange(rec, MIN_BPS, MAX_BPS); minOut = floorFromBps(quoted, min(bps, 10000n)) // refuse 0n
```

**Legitimate exceptions:** Venues that take a limit price instead of bps follow their own contract.

**Verification scenario:** Build requests from recommendations of zero, the minimum, the maximum and maximum plus one, apply 10,001 bps, and estimate a size larger than the book; verify omission, acceptance, acceptance, rejection, no wrap and "not available".

Pack: `money` (candidate). Topics: `quotes`, `money`, `frontend`, `backend`, `implementation`.

<a id="money-one-shot-approval-requote"></a>

## Quote, approve, re-quote, then spend the approval

When the submitting request consumes a one-shot approval (signature, passkey, second factor or permit), quote before asking for it, re-quote after it, and reconfirm on material change before spending it. A later failure enters the existing explicit recovery path, never a silent re-approval or resubmission. The server binds the approval to the confirmed intent (amount, route, recipient and the confirmed floor or tolerance), not to one exact quote, so a fresh quote within tolerance can spend it; binding the exact quote means re-approval on every re-quote, a product decision, and allowance scope (exact or unlimited) is a security and product decision, not a code default. Refines core card authorization-single-use-intents. Pack card money-requote-material-tolerance defines the material-change test.

**Apply when:** a flow collects an approval and then submits a withdrawal, swap or transfer, or a third party gains allowance over user funds.

**Boundary notes:** if the signature already covers amount, recipient and min-out, the signed min-out is the bound floor: a fresh quote at or above it spends the signature, and a worse one needs reconfirmation and a new signature.

**Checks:** the terms shown at approval are the terms bound server-side; the post-approval re-quote uses the sourced tolerance against confirmed terms; a failed re-quote fails before dispatch; no error path calls approve again; the backend checks each request against the bound intent and exposes consumption or revocation; allowance amount and spender are recorded owner decisions.

**Anti-pattern:** On submission failure, prompt for a new approval and resubmit, or grant unlimited allowance to save a transaction.

**Why it fails:** The first approval may already back a published order, so resubmitting can move funds twice; an unbound approval can be spent by a racing request on other terms; unlimited allowance to an upgradeable or redeployable contract exposes every token sold through it.

**Bad example (illustrative):**

```text
catch { await requestApproval(); await submit(payload) }
```

**Better example (illustrative):**

```text
await approve(terms); const fresh = await requote(); if (worsened(confirmed, fresh)) return reconfirm(fresh); await submitOnce(fresh)
```

**Legitimate exceptions:** When the server scopes an approval to one request fingerprint with a short expiry, client re-quoting is a UX courtesy, not the safety control.

**Verification scenario:** Approve, then return a worse re-quote, a failing re-quote and a submit error; verify reconfirmation, failure before dispatch and one submission with no second approval prompt; server-side, verify an approval replayed with other terms is rejected.

Pack: `money` (candidate). Topics: `authorization`, `quotes`, `frontend`, `backend`, `planning`.

<a id="money-aggregator-calldata-guard"></a>

## Admit third-party swap calldata through one ordered guard

Aggregator calldata is untrusted until one admission function, the only path to an executable plan, accepts it after fixed-order checks where the first failure wins. It bounds blast radius (what is called and approved, how much native value moves, how far the provider's numbers may go), not price; a ceiling against an in-house quote catches unit bugs. A swap paying anyone but the trader stays in-house: no guard can prove who third-party calldata pays. Refines core card types-boundary-validation. The floor checks cover the floor the provider reports; enforcing the floor that actually executes needs calldata decoding or an on-chain check of the amount received, otherwise record the remaining price risk.

**Apply when:** integrating an aggregator or solver that returns calldata, a spender or a min-out, or adding a provider or chain.

**Boundary notes:** calldata your own router builds needs input validation, not this guard. Run new providers in shadow (priced, metered, never executed) until refusals read zero.

**Checks:** in order: slippage at most 10,000 bps; target allowlisted; no spender for native-in, a vouched one for token-in; any extra call a zero-value approve of a route token to an accepted spender; native value exactly the swap's native spend (zero for token-in); chain echo matches; output decimals known; output non-zero; floor not above quote; no overflow; echoed floor at least quote less requested slippage. Refusals feed an alerting must-be-zero counter.

**Anti-pattern:** Execute the best-quoting provider's calldata, trusting its own spender, value and min-out fields.

**Why it fails:** A buggy or compromised provider can name any spender, attach native value or quote in the wrong units so an absurd quote wins; one unchecked field drains an allowance or sells at any price.

**Bad example (illustrative):**

```text
if (ext.quotedOut > own.quotedOut) send({ to: ext.to, data: ext.data, value: ext.value })
```

**Better example (illustrative):**

```text
plan = guard.check(ext, request, allowlist) // or a named refusal; refuse quotedOut > ceiling * ownQuote; preflight(plan)
```

**Legitimate exceptions:** An unpinnable router that redeploys, an upgradeable-proxy allowlist or unlimited approvals each need an explicit owner decision.

**Verification scenario:** Feed one plan per failure (unlisted target, spender on native-in, extra value, wrong chain, unknown decimals, zero output, inverted or loose floor, quote far above in-house); verify each named refusal and that none reaches signing.

Pack: `money` (candidate). Topics: `execution`, `security`, `contracts`, `backend`, `review`.

<a id="money-preflight-before-nonce"></a>

## Preflight every plan before it spends a nonce

Estimate gas or simulate each candidate transaction before allocating a nonce, from the real signer and including any approve the batch carries, so the estimate sees the allowance it grants; an approve sent separately needs a state override or a mined approval before estimating. A plan that would revert, or whose resized gas budget the wallet cannot fund, hands the swap to the next ranked plan, which proves its own headroom and carries its own approval; only an exhausted list fails. Submit with the larger of the plan's budget and the estimate plus a configured margin.

**Apply when:** an executor signs swaps or transfers on an EVM chain, especially with external calldata, batched approve-and-trade, or provider-supplied gas numbers.

**Boundary notes:** a relayer or SDK that already simulates and charges only on success replaces this step. Preflight binds the block it ran at: it narrows revert risk, never removes it.

**Checks:** the estimate runs before nonce allocation and is not capped from above; fallbacks never reuse the winner's estimate or approval; after a preflight revert the balance is re-read, so a sibling order's spend reports insufficient balance rather than quote unavailable; a floor revert caught in preflight is slippage with no transaction; fallback counters record attempts.

**Anti-pattern:** Sign and broadcast the provider's transaction with its own gas number and discover the revert on chain.

**Why it fails:** A reverting transaction still consumes the nonce, burns gas and fails an order another plan could have filled; provider estimates under-size fee-on-transfer tokens, which then revert as an opaque transfer failure, not out-of-gas.

**Bad example (illustrative):**

```text
const nonce = next(); sign({ ...plan.tx, gas: plan.gas, nonce }); broadcast()
```

**Better example (illustrative):**

```text
for each ranked plan: est = estimate(batch(plan)); skip on revert or if max(plan.gas, est + margin) is unfundable; then take a nonce, sign and stop
```

**Legitimate exceptions:** Where simulation is unavailable or too slow, record an explicit risk acceptance.

**Verification scenario:** Make the winner revert in preflight, the runner-up unfundable, and a sibling order spend the balance between read and preflight; verify fallback order, no nonce consumed by a reverting plan, and the insufficient-balance classification.

Pack: `money` (candidate). Topics: `execution`, `chain`, `backend`, `implementation`.

<a id="money-closed-swap-failure-taxonomy"></a>

## Classify swap failures in one closed taxonomy

Map every execution failure, at one sanitizing boundary, into a closed set of kinds with structured facts: insufficient balance, insufficient gas (required, available), no route, quote unavailable, build failed, bad request, slippage exceeded, reverted (transaction, reason), token tax above slippage, other. One function marks the permanent subset that can never succeed on the same terms, which closes the order; the rest stays retryable, and a transaction id is present if and only if something landed on chain. Refines core card distributed-invariants-and-failure.

**Apply when:** an executor, order service or client handles swap outcomes, schedules retries or shows failure reasons.

**Boundary notes:** copy per kind is a product decision; a single-path flow with two outcomes needs no elaborate enum.

**Checks:** permanence is one exhaustive function whose membership is sourced lifecycle policy (for example insufficient balance or gas, bad request and tax above slippage close the order; slippage and reverts retry); a landed revert is classified from its return data (known floor-check errors mean slippage); error text is sanitized once; new kinds evolve compatibly (legacy text kept, unknown kinds read as other).

**Anti-pattern:** Retry every failure, or close the order on any revert, by matching substrings of error text.

**Why it fails:** Retrying a permanent failure burns fees and spams the user; closing on a transient slippage revert cancels an order that would fill next block; string matching breaks when a dependency rewords an error; a landed failure without its transaction id hides gas paid.

**Bad example (illustrative):**

```text
if (err.message.includes('revert')) closeOrder(order)
```

**Better example (illustrative):**

```text
const kind = classify(err); closesOrder(kind) ? close(order, kind) : retryLater(order, kind)
```

**Legitimate exceptions:** Submitted-but-unconfirmed outcomes are not failures; they stay unknown until reconciled.

**Verification scenario:** Produce each kind, including preflight slippage (no transaction id) and landed slippage (with one), an unknown revert selector and an unknown future wire kind; verify permanence, id presence, classification and decoding.

**Automatable check:** An exhaustive match (no wildcard arm) for permanence and a round-trip test over legacy and unknown payloads.

Pack: `money` (candidate). Topics: `execution`, `errors`, `backend`, `implementation`, `review`.

<a id="money-adversarial-token-simulation"></a>

## Judge token sellability by what the sell reads

Decide whether a token can be exited by executing buy, approve and sell from the real signing wallet against state pinned to one block, not by finding an owner. The durable signal is the sell path's storage read set minus what the buy and approve wrote: any remaining slot is a lever someone can flip, whoever holds it. It covers only the branches the probe executed, so a check gated on trade size or caller stays invisible: probe at several sizes and from several callers, and treat the read set as a floor, never proof of safety. Unresolved results are a score input, not a pass, and new gates run in shadow (consulted and metered, refusing nothing) until measured.

**Apply when:** building or changing honeypot or sell-tax detection, token risk scores, or pre-trade simulation that gates or labels trades.

**Boundary notes:** static analysis narrows candidates and explains findings; execution decides. A venue quoter is no evidence of zero tax when a hook or contract sets the price; compute expected output from pool state.

**Checks:** every read names one block through a pinned handle (no mixed heights); the sell runs from the signing address; levers report slot and value; pool depth is read before the reference buy; time-gate probes advance timestamp and block number together; a read budget and deadline bound each run; "unresolved" and "clean" score differently.

**Anti-pattern:** Mark a token safe because it has no standard owner, the simulator found nothing, or the quoter reports zero tax.

**Why it fails:** Admin checks can be hard-coded, obfuscated or held in another contract; a contract can detect the simulator and behave; an empty pool round-trips the probe's own coin at high retention; mixed block heights simulate a state that never existed. Users buy positions they cannot exit.

**Bad example (illustrative):**

```text
const safe = owner() === ZERO_ADDRESS && simulateSell({ from: randomAddress, block: 'latest' }).ok
```

**Better example (illustrative):**

```text
const levers = sellReads(pinned, signer).minus(writes(buy, approve)); score({ levers, depth, unresolved })
```

**Legitimate exceptions:** A simulation binds its block; an owner can arm a trap after inclusion, so it reduces risk rather than removing it.

**Verification scenario:** Run fixtures for a plain token, a toggle-gated sell, a hard-coded admin, a time-gated sell, a size-gated sell, a blocklisted signer and an empty pool; verify levers on gated tokens, refusal for the blocklisted signer, a depth flag, and an "unresolved" score distinct from "clean".

Pack: `money` (candidate). Topics: `security`, `contracts`, `chain`, `backend`, `review`.

<a id="operations-roll-forward-schema-gated-release"></a>

## Roll forward only, behind a schema gate

Production deploys only the highest release tag on the main line, and each job re-checks that after approval, so a stale run approved late ships nothing. Rollback is a revert on main plus a new, higher patch release, because re-pushing an old tag does not re-promote under a newest-build image policy. A release whose code needs a migration is blocked until production records it as applied, and automatic DDL is limited to additive, reversible operations that never auto-revert. Refines core card operations-recovery-and-change.

**Apply when:** Cutting a release, planning a rollback, shipping code that needs a new column or table, or automating migrations.

**Boundary notes:** Code rollback never undoes DDL. Destructive or rewriting migrations (drop, truncate, rename, type change, shorter retention, mutations) stay operator-driven with a written plan.

**Checks:** The gate reads production's migration ledger and fails closed on an unreadable answer; a per-release override names migrations deliberately left unapplied; new migration numbers must exceed the base branch's highest, catching collisions and stale PRs; automated DDL is idempotent, serialized, stops on first failure and writes an audit row; failures alert a human who decides on any down migration.

**Anti-pattern:** Re-tag an old version to roll back, or let the pipeline run down migrations automatically on failure.

**Why it fails:** The re-tag is ignored, leaving production on the bad build, and a context-free revert can recreate the wrong schema and break ingestion again.

**Bad example (illustrative):**

```text
On deploy failure: run every down migration, then re-push the previous tag.
```

**Better example (illustrative):**

```text
Merge a revert, cut the next patch tag, and let a human choose any schema revert from the incident evidence.
```

**Legitimate exceptions:** A hosting platform may instantly promote a known-good build during an incident; follow with a normal revert release so Git and production converge.

**Verification scenario:** Cut a release needing an unapplied migration: the gate blocks it; apply it and re-run: it ships. Approve an older tag's run after a newer tag exists: it ships nothing.

**Automatable check:** A release preflight comparing added migrations with the production ledger, and a CI check that new migration numbers exceed the base maximum.

Pack: `operations` (candidate). Topics: `release`, `operations`, `data`, `backend`, `planning`.

<a id="operations-honest-readiness-probes"></a>

## Report readiness only when the service can work

Readiness means this instance can do its job now: false until boot catch-up finishes, required inputs are primed and every listener and consumer is bound; false again when its input feed stalls or shutdown begins, so load balancers drain first. Liveness is separate and one-way: trip it only for a local, unrecoverable wedge, such as a dead worker or a loop making no progress while input is available. Dependency failures and upstream outages surface through readiness and request errors, never liveness, so one outage does not restart every replica at once. Probes read in-memory flags that a service-owned loop computes.

**Apply when:** Adding a service or consumer, a long startup phase, or a dependency the service cannot work without.

**Boundary notes:** The same honesty applies to client live-data health: measure freshness by frames or heartbeats received, not value changes (a quiet market sends no new prices), and disable actions needing live authority while stale.

**Checks:** The probe server binds before long staging work, so a download is not mistaken for a dead process; ready is never set while a listener or consumer bind can still fail; staleness is computed off the probe path; metrics use their own port; consumer idle heartbeats and reopen behavior are set deliberately so a stalled pull consumer surfaces instead of sitting silent; shutdown handles SIGTERM.

**Anti-pattern:** Mark ready as soon as the process starts, ping dependencies inside the probe handler, or fail liveness because a dependency is down.

**Why it fails:** Traffic reaches an instance that is still catching up or deaf, users get stale data while health is green, and dependency-driven probes turn a blip into a restart storm across every replica.

**Bad example (illustrative):**

```text
ready = true at boot; the liveness handler fails whenever a database ping times out
```

**Better example (illustrative):**

```text
Start the probe first, mark ready after catch-up and binds, flip readiness from a staleness loop, and fail liveness only on a local wedge.
```

**Legitimate exceptions:** A stateless request service with no warm-up may mark ready once its listener binds and report dependency failures as request errors, if documented. Stall thresholds are ops decisions.

**Verification scenario:** Silence the feed past the threshold: readiness flips false and recovers without a restart; stop a dependency: no pod restarts; wedge a worker: liveness trips; boot with a long catch-up: no restart.

**Automatable check:** A lint banning SIGINT-only signal helpers, and an integration test asserting ready stays false until catch-up ends.

Pack: `operations` (candidate). Topics: `operations`, `lifecycle`, `backend`, `frontend`, `implementation`.

<a id="operations-alert-runbook-automation-level"></a>

## Ship every alert with a runbook and permission level

An alert rule ships with a human runbook link, a stable runbook slug, a severity and an automation permission: safe (an agent may run the listed remediation), unsafe (diagnose and report only) or none (informational). Anything missing from the registry defaults to unsafe. Routing is a tree where only production plus critical reaches the pager, so an alert missing its environment label can never page; lint required labels so that failure is not silent.

**Apply when:** Adding or changing an alert, wiring automated diagnosis or remediation, or adding a telemetry dimension.

**Boundary notes:** Start new alerts as unsafe and promote to safe only after watching real firings.

**Checks:** Each rule has summary, description, runbook link and slug; the runbook covers likely causes, diagnosis, remediation, verification and escalation; the pager path requires the production label and critical severity; alert dimensions are fixed low-cardinality enums with no account ids, addresses, amounts or free-form error text; silences carry owner, reason, scope, expiry and a change reference and restore automatically; every rule names an owner and an escalation path.

**Anti-pattern:** Page on any error count, or let an agent restart and replay without a written remediation.

**Why it fails:** On-call learns to ignore noisy pages until a real money incident is missed, and an over-permitted agent can deepen an incident, for example by replaying a backlog that double counts.

**Bad example (illustrative):**

```text
Rule: errors > 0 pages on-call; no runbook; the agent may remediate anything.
```

**Better example (illustrative):**

```text
Confirmed production integrity failures page with a runbook; warnings go to a visible channel; remediation stays unsafe until trusted.
```

**Legitimate exceptions:** Informational dashboards need no runbook. Thresholds, severity definitions and who gets paged are owner decisions; do not invent them.

**Verification scenario:** Fire a test alert without the production label: it never pages. Fire one missing from the registry: automation only diagnoses.

**Automatable check:** A CI lint that every alert rule carries environment and severity labels, a slug present in the automation registry and a resolvable runbook link.

Pack: `operations` (candidate). Topics: `operations`, `errors`, `backend`, `frontend`, `planning`.

<a id="operations-edge-rate-limit-failure-posture"></a>

## Rate limit at the edge with explicit failure posture

Count requests with a sliding two-window estimate (current count plus the previous window weighted by its remaining share), which smooths the double burst a fixed window allows at its boundary. Key anonymous traffic by the client IP from the rightmost forwarded-for entry your own ingress appended, never the leftmost, and key money-moving categories per user. Decide and document failure posture per control for when the shared counter store is down: rate limiting usually fails open so a store outage does not stop all traffic, while new authentication fails closed. Whether a money-moving category fails closed is an owner or money-policy decision to source; a common choice fails closed only for actions that pay out.

**Apply when:** Adding an endpoint category, touching proxy or IP extraction, adding a maintenance switch, or handling 429s in a client.

**Boundary notes:** Maintenance behavior is a product decision; a common choice blocks writes only (503), keeps reads up so balances and charts stay visible, and leaves its admin path writable so it can be turned off.

**Checks:** Credential-accepting routes get the tightest cap; trusted internal services skip per-IP caps only with a verified service credential; responses carry limit, remaining, reset and Retry-After; the trusted hop count matches the real proxy chain; clients honor Retry-After, bound read retries and never auto-retry a mutation.

**Anti-pattern:** Take the first X-Forwarded-For entry as the client IP.

**Why it fails:** Any caller can pick their own bucket by sending a forged header, defeating brute-force and abuse limits, while a limiter that fails closed on a cache blip takes the whole API down.

**Bad example (illustrative):**

```text
ip = headers['x-forwarded-for'].split(',')[0]
```

**Better example (illustrative):**

```text
ip = the rightmost entry our ingress appended (else the socket peer); orders and withdrawals keyed per user.
```

**Legitimate exceptions:** Behind several trusted proxies, take the entry at the trusted hop count from the right. Caps per category are ops and product decisions; source them.

**Verification scenario:** Send a forged leftmost header: the bucket follows the real hop. Stop the counter store: reads pass, a new login fails, and each money-moving category follows its documented posture.

**Automatable check:** Unit tests for IP extraction with forged headers, plus a regression test replaying the header-spoof bypass.

Pack: `operations` (candidate). Topics: `security`, `operations`, `backend`, `frontend`, `implementation`.

<a id="operations-independent-source-correctness"></a>

## Verify data against independent sources on a schedule

A scheduled checker compares published data with independent sources (the chain itself, two or more external providers) and with self-consistency recomputations such as candles re-aggregated from trades. A field fails only when the independent sources agree with each other but disagree with you; a single external source can at most warn. The exit contract separates check failed from could not run, and a missing dependency reports skip, never a silent pass. Refines core card operations-audit-and-restore.

**Apply when:** Publishing derived market, position or balance data, adding a decoder for a new protocol, or wiring a scheduled data-quality job.

**Boundary notes:** Never compare against a proxy of the same provider; that is circular evidence. Self-consistency checks catch pipeline bugs, not shared upstream errors.

**Checks:** Exit 0 for pass with warnings allowed, 1 for a failure, 2 for could not execute; each check reports measured value, tolerance and offending samples; a canary pushes recent real transactions through the stateless decoder and fails when a protocol yields zero events across its sample (format drift); tolerances document known definitional differences; results reach a visible channel and a stored artifact.

**Anti-pattern:** Alert whenever one provider disagrees, or treat a crashed checker as a pass.

**Why it fails:** One flaky provider cries wolf until alerts are ignored, and a crash that looks green hides a decoder that silently stopped indexing a venue, so users miss trades and balances drift.

**Bad example (illustrative):**

```text
if abs(ours - providerA) > tol then fail; on exception exit 0
```

**Better example (illustrative):**

```text
Fail only if providerA and providerB agree and both differ from ours; a missing dependency is SKIP; a crash exits 2.
```

**Legitimate exceptions:** Fields with no independent source get self-consistency checks only. Tolerances, cohorts and schedules are owner decisions.

**Verification scenario:** Feed fixtures where one provider is wrong (warn), both agree against you (fail), and the node is unreachable (skip, exit 2).

**Automatable check:** A scheduled CI job enforcing the exit contract, posting a digest and uploading the full report.

Pack: `operations` (candidate). Topics: `operations`, `data`, `testing`, `backend`, `planning`.

<a id="operations-ratchet-unfixable-rules"></a>

## Ratchet rules you cannot deny outright

A rule that already has violations would be switched off on day one if made a hard error, so turn its count into a committed ceiling (or floor) that may only improve. The gate fails when a ceiling rises or a floor falls, names the metric, and re-baselining is an explicit commit that says why. The per-site allowlist variant fails on new violations and on stale entries, so fixed debt must leave the list. Refines core card tests-risk-observable-behavior.

**Apply when:** Introducing a lint or architecture rule into an existing codebase, or reviewing a PR that edits a baseline or allowlist.

**Boundary notes:** A rule that is clean today goes straight to deny, and each rule lives in exactly one enforcement layer (compiler, ratchet, gate, hook, review) rather than repeated as a weaker reminder.

**Checks:** The baseline is committed and moves only through the update command; counts read non-test source only; allowlist matching counts duplicates, so a second identical violation is still new; a stale entry fails with the sync command to run; rules with no existing debt, such as holding a lock across an await or a SIGINT-only shutdown helper, are denied outright.

**Anti-pattern:** Add the rule as a warning nobody reads, or let the allowlist only grow.

**Why it fails:** Warnings become noise, debt compounds, and an append-only allowlist hides regressions behind historical entries.

**Bad example (illustrative):**

```text
Append the new violation to the allowlist in the same PR that introduces it.
```

**Better example (illustrative):**

```text
Fix the new site; when migrating an old one, delete its allowlist entry so the stale-entry check passes.
```

**Legitimate exceptions:** A deliberate re-baseline after a large refactor is fine when the commit explains it. Judgment-heavy rules can stay in review with examples.

**Verification scenario:** Add one new violation: the gate fails naming it. Fix an allowlisted site without editing the list: the gate fails on the stale entry.

**Automatable check:** A script comparing the current violation multiset with the committed allowlist, failing on new and stale entries alike.

Pack: `operations` (candidate). Topics: `review`, `testing`, `modules`, `frontend`, `backend`.

<a id="operations-split-release-authority-provenance"></a>

## Split release preparation from production authority

An engineer prepares a reviewable release PR that changes only version and changelog; after merge, a designated release manager creates an immutable version tag on that PR's exact merge SHA, never the moving tip of main. Before deploy credentials are used, a validator checks tag format, tagger identity, the merged release PR and the exact SHA. Tags are never moved or deleted. A failed rollout may re-run the same run only while that tag is still the intended production version; once a newer release has shipped, rollback is a revert plus a new patch release, because re-running an older tag puts old code back. See pack card operations-roll-forward-schema-gated-release.

**Apply when:** Designing release workflows, cutting a patch, handling a failed production deploy, or editing release documentation.

**Boundary notes:** Patch branches are cut from the deployed tag and receive reviewed cherry-picks of squash commits; release metadata commits never cross between lines.

**Checks:** Only the release manager can create tags and nobody can update or delete them; preparation fails closed on unprotected or mismatched branches; every surface of a multi-surface release deploys the same SHA; each gate the release doc claims maps to an existing workflow job, because docs that still describe a removed validator give false assurance.

**Anti-pattern:** Tag whatever main points to after the release PR merges, or re-tag a version after a hotfix.

**Why it fails:** Unreviewed commits ride into production under a reviewed version, and a moved tag destroys provenance so nobody can say which code ran.

**Bad example (illustrative):**

```text
git tag v1.4.0 origin/main; later git tag -f v1.4.0 after a hotfix
```

**Better example (illustrative):**

```text
Tag v1.4.0 at the release PR merge SHA; for a bad release, revert on main and tag v1.4.1.
```

**Legitimate exceptions:** A single-maintainer project may combine roles if the tag still pins an exact reviewed SHA. Who holds release authority is an organizational decision.

**Verification scenario:** Push a tag as a non-manager and try to move an existing tag: both are rejected; a tag on a non-release SHA fails validation before any deploy step; re-running an older tag's deploy after a newer release shipped is refused.

**Automatable check:** A pre-deploy job validating tag format, tagger identity and merge SHA, plus a docs check that referenced workflow files exist.

Pack: `operations` (candidate). Topics: `release`, `security`, `frontend`, `backend`, `planning`.

<a id="operations-gitops-tag-pattern-promotion"></a>

## Promote environments through Git and strict tag patterns

Cluster state lives in Git and a controller syncs it with self-heal (manual drift is reverted) and prune (resources deleted from Git are removed). Dev auto-tracks build tags matching a strict main-build pattern (timestamp plus commit SHA); production accepts only strict release tags, so promotion means cutting a reviewed release, not editing the cluster. Dependency order such as storage, then secrets, then apps is declared as explicit sync waves.

**Apply when:** Adding a service to the cluster, changing image update policy, pinning a version during an incident, or debugging why a deploy did not happen.

**Boundary notes:** Under a newest-build policy the updater picks the most recently built matching image, not the highest tag, so rollback means a new, higher release.

**Checks:** Tag patterns are anchored and environment-exclusive, so a dev tag can never match production; release images also carry the commit SHA for traceability; an incident pin is a reviewed change or a documented updater pause with an owner and end condition, reverted afterwards; configuration changes go through PR review; secrets come from the external secret store, never from manifests.

**Anti-pattern:** Edit the production workload in the cluster by hand to swap an image.

**Why it fails:** Self-heal silently reverts it, or with self-heal off Git stops describing production, so the next sync undoes the fix mid-incident and nobody can audit what ran.

**Bad example (illustrative):**

```text
Set the production image to a latest tag directly with the cluster CLI.
```

**Better example (illustrative):**

```text
Cut the release tag, or merge a reviewed change pinning the exact tag, and let the controller sync.
```

**Legitimate exceptions:** Hosts outside the controller follow their own reviewed deploy path. Pause automation only with an owner and an end condition.

**Verification scenario:** Push a dev-pattern tag: only dev updates. Push a malformed tag: nothing updates. Hand-edit a production object: it reverts on the next sync.

**Automatable check:** A policy test asserting every updater tag pattern is anchored and environment-exclusive.

Pack: `operations` (candidate). Topics: `release`, `operations`, `backend`, `planning`.

<a id="operations-preview-deploy-safety"></a>

## Keep previews and deploys current, scoped and coupled

Previews that need deploy credentials run only for trusted PRs: same repository and not from a bot; skipping drafts is a cost filter, not a trust signal. Fork and bot PRs get no secret-backed preview. For trusted PRs, building in an unprivileged job and deploying the artifact from a separate privileged job adds defense in depth. Checking the PR file list through the API before checkout is a cost control that skips docs- or tests-only previews, not a security boundary; treat a truncated file list as needing a preview. A main-branch deploy re-checks that main has not moved before build, deploy and alias, and stops if it has. Surfaces that must match (an app and a separately deployed sign-in app) are coupled through a published build ref, and the deploy refuses on mismatch.

**Apply when:** Editing CI or CD workflows, adding a deploy target, or adding a second surface with a version dependency.

**Boundary notes:** The CI build used for browser tests embeds mocks and test endpoints and is never the deployable artifact; the deployable build is made against the real environment and smoke-tested without rebuilding.

**Checks:** Untrusted PRs never reach a job or environment holding secrets, and trusted previews build without deploy secrets in scope where possible; validation checkouts do not persist credentials; required production build variables fail the build when missing; build output is validated before deploy; preview concurrency is per PR and production is serialized; smoke tests hit real routes after deploy.

**Anti-pattern:** Build untrusted PR code inside a job that holds deploy tokens, or deploy whatever commit the run started with.

**Why it fails:** A malicious or careless PR can exfiltrate tokens, and an older run can overwrite a newer deploy and point a shared alias at stale code.

**Bad example (illustrative):**

```text
On every pull_request event, forks included, check out the PR head and build it with the deploy token in the environment.
```

**Better example (illustrative):**

```text
Gate secret-holding previews to same-repository, non-bot PRs, skip docs-only diffs via the API, and re-check the main SHA before deploy and alias.
```

**Legitimate exceptions:** A repository whose contributors all have write access may build and deploy previews in one trusted job, provided fork and bot PRs never reach it. Which paths count as safe to skip is a team decision.

**Verification scenario:** Open a PR from a fork: no job holding deploy secrets runs its code. Merge two PRs in quick succession: the first run skips its deploy or alias once main moves.

**Automatable check:** A workflow lint asserting that jobs holding deploy secrets are gated to trusted PR sources and that main deploys re-check the ref before aliasing.

Pack: `operations` (candidate). Topics: `release`, `security`, `web-app`, `frontend`, `implementation`.

<a id="operations-supply-chain-baseline"></a>

## Harden dependency intake and the CI supply chain

When a PR changes the dependency surface, validate its exact head in an isolated checkout with an uncached immutable install, lockfile checksum enforcement and lifecycle scripts disabled. Refuse to resolve package versions younger than a minimum age, and give the dependency bot the same cooldown plus grouped updates. Pin CI actions and downloaded tools by commit SHA or checksum, scan the PR commit range for secrets with a justified allowlist, and require code-owner review for workflows, scripts and dependency files. Refines core card dependency-reproducibility.

**Apply when:** Adding or updating a dependency, editing CI workflows, adding a tool download, or touching lockfiles or package-manager configuration.

**Boundary notes:** The age gate works at resolution time; a lockfile that already pins a young version is not re-judged, which is why the bot cooldown exists. Emergency exceptions are explicit and code-owner reviewed.

**Checks:** Dependency-surface detection includes renamed paths and treats a truncated file list as changed; the secret scanner redacts output and each allowlist entry is scoped to a rule and path with a written reason; ownership rules put the strictest workflow rule last so it wins over broader dependency patterns; the age gate and bot cooldown agree.

**Anti-pattern:** Run a cached install with lifecycle scripts enabled on PR code, or reference actions by mutable tag.

**Why it fails:** A compromised package or action runs arbitrary code with CI secrets before anyone reviews it, and a mutable tag can be repointed after review.

**Bad example (illustrative):**

```text
uses: some/action@v3, and every PR runs a cached install with scripts on
```

**Better example (illustrative):**

```text
uses: some/action@<full commit sha>; dependency PRs run an immutable, scripts-off install in an isolated checkout.
```

**Legitimate exceptions:** Packages that truly need install scripts are allowed individually after review. Minimum age and cooldown length are owner policy values.

**Verification scenario:** Open a PR adding a version published yesterday: resolution fails. Open a PR touching a workflow: it cannot merge without the workflow owner.

**Automatable check:** A workflow lint rejecting non-SHA action references, and a CI step scanning base..head for secrets.

Pack: `operations` (candidate). Topics: `security`, `release`, `modules`, `frontend`, `review`.

<a id="operations-fail-safe-diff-scoped-ci"></a>

## Scope CI by diff but fail safe

Diff-based selection may skip work only for an explicit allowlist of safe paths: anything unknown runs, CI and test-infrastructure changes run everything, and a diff that cannot be resolved is an error, not a skip. A mandatory floor of critical tests (auth refresh, socket auth, idempotency keys, order admission and recovery) runs on every change. Money operations live in a registry that maps each one to its source files, request variants, idempotency policy and journeys asserting exact mutation counts.

**Apply when:** Adding test selection, adding a money operation, moving files on a critical path, or reviewing why a check was skipped.

**Boundary notes:** Deletes, renames and dependency or config changes force the full suite, because affected-test analysis cannot see removed edges.

**Checks:** Renames count both paths; every registry path resolves to an existing file, so a stale mapping fails a test; every outcome (terminal, partial, ambiguous, stale account) has evidence or an explicit gap with an owner; browser journeys assert exactly one mutation per deliberate action plus the final recoverable state; release receipts bind evidence to the exact release SHA with artifact digests.

**Anti-pattern:** Run end-to-end tests only when the diff touches a hand-maintained list of risky folders.

**Why it fails:** New critical code outside the list ships untested and a moved file silently drops out of coverage, so a duplicate or missing order reaches production.

**Bad example (illustrative):**

```text
run_e2e = changed paths match the risky-folders list
```

**Better example (illustrative):**

```text
run_e2e = not (every changed path matches the safe allowlist); the critical floor always runs.
```

**Legitimate exceptions:** Docs-only PRs can skip browser suites. A codebase without money-moving operations needs the floor but not the operation registry. Do not grow the floor for cosmetic coverage; it exists for regressions that lose money or lock users out.

**Verification scenario:** Change a file outside any known pattern: selection runs. Rename a registry-mapped file: the mapping test fails. Pass an invalid diff range: the selector errors.

**Automatable check:** Selector unit tests over path fixtures, plus a registry test asserting every mapped source exists.

Pack: `operations` (candidate). Topics: `testing`, `money`, `release`, `frontend`, `planning`.

<a id="operations-resilience-game-day-budgets"></a>

## Budget fault scenarios with explicit resilience thresholds

Define client fault scenarios as data: each has a load profile, an abort criterion, an owner, a test anchor and numeric budgets for request amplification, request count, retries, mutation count (zero for read faults), peak and steady sockets, reconnect attempts, queued work, heap growth, diagnostic episodes and recovery time. Each run produces one receipt per scenario, and evaluation fails on a missing or duplicate receipt, the wrong environment, any exceeded budget, or a required degraded or recovered state that never became visible.

**Apply when:** Changing retry, reconnect, polling, socket sharing, visibility or offline handling, or claiming a resilience improvement.

**Boundary notes:** Typical scenarios: rate-limited reads, reconnect storms, multi-tab fan-out, rapid visibility changes, offline and online, malformed frame bursts, an unavailable data provider, and stale prices while a live quote is pending (how stale values are presented is a product decision).

**Checks:** Budgets sit tighter than the failure they guard (one socket per tab, zero mutations during read faults); diagnostics collapse into episodes by cooldown so a burst counts once; runs use a production build with deterministic mocks; stale data is never presented as live; recovery time runs from fault end to the visible recovered state.

**Anti-pattern:** Judge resilience by eyeballing one reconnect in a dev build.

**Why it fails:** Amplification and leaks appear only under repeated faults; a retry loop can multiply load during an outage, or a reconnect can resend an order, hurting users exactly when systems are stressed.

**Bad example (illustrative):**

```text
it('reconnects', () => { disconnect(); expect(connected).toBe(true) })
```

**Better example (illustrative):**

```text
Run the reconnect-storm scenario: three disconnects, one live socket, no request or queue growth, recovery within budget, zero mutations.
```

**Legitimate exceptions:** Budgets are engineering targets, not user-facing SLAs; derive them from measured baselines. Skip scenarios for faults the product cannot encounter.

**Verification scenario:** Introduce a duplicate-reconnect bug: the peak-socket and reconnect budgets fail the evaluation; remove it and the receipt passes.

**Automatable check:** A manifest validator plus a receipt evaluator in CI that fails on missing, duplicate or over-budget scenarios.

Pack: `operations` (candidate). Topics: `testing`, `realtime`, `performance`, `frontend`, `review`.

<a id="realtime-live-coverage-before-snapshot"></a>

## Open live coverage before the snapshot query

A server channel that answers subscribe with a snapshot must hold live coverage before it reads: open the upstream and wait until it holds its stream, register the subscriber's routing entry, then run the snapshot query. A change committed during the query then arrives live instead of falling into the gap. For append-only feeds, record the identities the snapshot delivered and drop live items already in it, so the history/live seam never doubles. For keyed state, live frames can reach the client before the snapshot, so the client orders rows by version (pack card realtime-version-ordered-frame-reducer) instead of letting the snapshot overwrite newer rows. Refines core card realtime-snapshot-delta-contract.

**Apply when:** a subscribe handler reads initial rows and then attaches to a bus subject or vendor stream, or an upstream opens on the first subscriber and closes on the last.

**Boundary notes:** the readiness wait runs on the socket's read loop, so bound it and count timeouts rather than stall every later frame, and decide what a timeout does: proceed without live coverage and say so, or fail the subscribe. Channels that send nothing at subscribe need no seam.

**Checks:** the ready signal fires only after the upstream stream exists; routing is registered before the query; a failed snapshot unregisters the subscriber and fails the subscribe, never leaving a feed without a seam; the seam uses the same identity the client merges on; the last unsubscribe tears the upstream down.

**Anti-pattern:** query the snapshot first, then register the subscriber or open the upstream.

**Why it fails:** rows committed between the read and the registration reach neither the snapshot nor the live tail, so the client shows a permanently incomplete list (a missing fill or order) with no error or gap signal.

**Bad example (illustrative):**

```text
rows = await db.recent(scope); send(rows); index.add(sub); upstream.ensureOpen()
```

**Better example (illustrative):**

```text
await upstream.ready(timeout); index.add(sub); rows = await db.recent(scope); seam[sub] = ids(rows); send(rows)
```

**Legitimate exceptions:** complete-state channels can skip the seam because the next frame replaces the model. A snapshot that carries a resumable log position replaces this ordering.

**Verification scenario:** delay the snapshot query, publish during the delay and assert the subscriber gets the row exactly once; withhold upstream readiness past the timeout and assert the timeout counter increments.

**Automatable check:** a channel harness test that publishes between subscribe start and snapshot completion for every snapshot channel.

Pack: `realtime` (candidate). Topics: `realtime`, `subscriptions`, `backend`, `implementation`.

<a id="realtime-ack-gate-and-unsubscribe-fence"></a>

## Hold data behind its ack and fence unsubscribes

A client can bind updates only after it reads the subscribe ack that names the subscription, so buffer each new subscription's updates (snapshot included) in a per-subscription gate until the ack is queued, then release them in order under the same lock. Queue the unsubscribe ack in the data lane behind that subscription's pending updates, so no update for an id follows the ack that unbound it. The client can then treat any update after an unsubscribe ack as desync. Refines core card realtime-subscription-lifecycle.

**Apply when:** the server assigns subscription ids in acks, many subscriptions share one socket, or a snapshot is sent during subscribe.

**Boundary notes:** the gate is bounded and never blocks the producer. Overflow policy is per channel: dropping the oldest frame is fine only when later frames supersede earlier ones per key; append-only or delta channels should fail the subscribe so the client resubscribes.

**Checks:** the gate exists before the channel can route to the subscriber; activation drains in order before direct delivery starts; an ack that cannot be queued on a closing socket does not activate the subscription; drops are counted; teardown closes the gate; the client ignores frames for ids it already released.

**Anti-pattern:** deliver updates as soon as the subscriber is registered and send every ack on the priority path.

**Why it fails:** the client gets updates for an id it has not learned, or after the unsubscribe ack that released it, and a reused scope applies the old subscription's rows.

**Bad example (illustrative):**

```text
registry.add(sub); route(update); outbox.control(unsubscribeAck)
```

**Better example (illustrative):**

```text
gate.buffer(update); outbox.control(subscribeAck); gate.release(); outbox.data(unsubscribeAck)
```

**Legitimate exceptions:** client-chosen subscription ids, or one subscription per socket, remove the need for the subscribe gate; the unsubscribe fence still applies whenever acks and data share a socket.

**Verification scenario:** publish a burst while the subscribe ack is pending and assert the ack precedes every update in order; queue updates, unsubscribe, and assert none arrives after the unsubscribe ack.

**Automatable check:** a randomized interleaving test asserting ack before data and no data after the unsubscribe ack.

Pack: `realtime` (candidate). Topics: `realtime`, `subscriptions`, `backend`, `frontend`, `implementation`.

<a id="realtime-bounded-socket-outbox-shedding"></a>

## Bound socket egress and shed slow consumers

Give each socket a bounded outbox with a small control lane (acks, errors, pongs) drained first and a larger data lane; producers push synchronously and never await a socket, so one slow client cannot delay fan-out to the rest. When a lane fills or one frame write passes its deadline, close the socket with a dedicated application close code and reason instead of buffering without limit or silently dropping frames. Clients treat that code as lost frames: reconnect, resubscribe and take a fresh snapshot.

**Apply when:** a WebSocket or SSE server fans one upstream out to many sockets, or a per-socket queue is unbounded or shared between replies and updates.

**Boundary notes:** size the control lane above the per-connection subscription limit so only an abusive client fills it. The close frame is best effort (a peer stuck past the deadline usually cannot read it), so shed regardless and count it. Give rollouts a distinct close reason so clients do not treat a deploy as a fault.

**Checks:** both lanes bounded and preallocated; pop order is pending close, then control, then data; a per-frame write deadline; shed reasons labelled in a metric; shutdown checked per frame so a stalled client cannot delay a rollout; the client maps the shed code to resubscribe and re-snapshot, never to trusting the old cache.

**Anti-pattern:** an unbounded per-socket queue, or a fan-out loop that awaits each socket's send.

**Why it fails:** one stalled browser grows server memory without bound or blocks the fan-out task, so every other client's prices and fills go stale; silently dropping frames instead leaves clients with wrong balances and no signal.

**Bad example (illustrative):**

```text
for (const socket of subscribers) await socket.send(frame)
```

**Better example (illustrative):**

```text
if (!outbox.enqueueData(frame)) outbox.close(slowConsumerCode, 'lane full')
```

**Legitimate exceptions:** a channel of pure latest-value frames may conflate per key instead of shedding; that is a declared per-channel policy, not the default.

**Verification scenario:** pause a client's reads, publish past the data bound and assert a slow-consumer close while a second client keeps receiving; then assert the paused client resubscribes and re-snapshots.

**Automatable check:** a review or lint gate rejecting unbounded queues and awaited sends in socket write paths.

Pack: `realtime` (candidate). Topics: `realtime`, `performance`, `backend`, `frontend`, `implementation`.

<a id="realtime-identity-from-token-canonical-filters"></a>

## Take subscriber identity from the token, not filters

User-scoped channels derive identity from the authenticated session: either discard the client filter and use the token's user id as the filter, or keep the client's filter and overwrite its user field with the server's value. Normalize every filter to a canonical form (parsed addresses, settled letter case, sorted and deduplicated lists, legacy spellings mapped) before the duplicate-subscription check and routing. The published filter schema omits server-stamped fields, so a client cannot even express them.

**Apply when:** a subscribe filter carries a user, wallet or account id; a filter accepts several spellings of the same target; a duplicate guard compares filters.

**Boundary notes:** stamping proves who is asking, not what they may see. Per-resource access checks (shared or delegated wallets) still run inside the channel.

**Checks:** user channels without claims are rejected before any channel state exists; the stamped-channel list is checked before any name-prefix rule so a stamped channel never loses its filter; canonicalization runs once, at subscribe; parse failures reach the client as a generic message while the raw parser error is only logged.

**Anti-pattern:** trust a user id sent in the subscribe filter, or compare raw filter JSON to detect duplicates.

**Why it fails:** any authenticated client can stream another user's balances or orders by editing one field, and two spellings of the same token pass the duplicate guard, so the client receives every update twice and double-applies non-idempotent effects.

**Bad example (illustrative):**

```text
subscribe(ordersChannel, { userId: message.filters.userId })
```

**Better example (illustrative):**

```text
filters = canonicalize({ ...message.filters, userId: session.userId })
```

**Legitimate exceptions:** public market channels have no identity to stamp. Service connections without user claims follow their own service authorization.

**Verification scenario:** subscribe to a user channel with another user's id in the filter and assert only the caller's rows arrive; subscribe twice with equivalent spellings and assert the second is rejected as already subscribed.

**Automatable check:** a contract test asserting every user-scoped channel's published filter schema omits the identity field and the subscribe path overwrites it.

Pack: `realtime` (candidate). Topics: `realtime`, `authorization`, `security`, `backend`, `review`.

<a id="realtime-bus-publish-retry-dedup-id"></a>

## Retry bus publishes only under a stable dedup id

A timed-out publish acknowledgement is ambiguous: the message may already be in the stream. Retry in place only when the event carries a deterministic dedup key derived from its identity, re-sent unchanged within the broker's dedup window; an event without one gets no automatic retry and surfaces the failure. Build message ids from route plus key with an injective escape, because keys taken from on-chain text (token names, symbols, URIs) can contain CR, LF and separators that header values reject. Refines core card end-to-end-idempotency-and-integrity.

**Apply when:** a producer pipelines publishes, retries on ack timeout, or builds message ids from external strings.

**Boundary notes:** a pipelined window gives up strict order on failure; strict ordering needs a window of one. A retry after the dedup window closes is a new message.

**Checks:** the key comes from event identity, never random per attempt nor a content hash that merges legitimate repeats; retries and backoff are bounded; a terminal failure poisons the handle so later publishes surface it; the escape also escapes its own escape character.

**Anti-pattern:** retry every failed publish, or interpolate raw on-chain strings into the message-id header.

**Why it fails:** retries without dedup double-write fills or deposits downstream; a raw CR or LF in a header can crash the publishing task, and a lossy escape maps two distinct events to one id so the second is dropped as a duplicate.

**Bad example (illustrative):**

```text
headers.messageId = route + ' ' + token.name; retryOnTimeout(publish)
```

**Better example (illustrative):**

```text
key = event.dedupKey(); key ? retrySameId(publish, escapeInjective(route, key)) : publishOnce(publish)
```

**Legitimate exceptions:** fire-and-forget subjects such as live ticks have no acknowledgement to retry and accept loss by declaration. A consumer that applies idempotently on its own key may tolerate duplicates, stated per stream.

**Verification scenario:** drop the first ack after the message lands, let the publisher retry and assert one stored message; publish two events whose keys differ only by a literal backslash-n versus a real newline and assert both are stored.

**Automatable check:** a unit test over the id builder asserting no CR or LF in output and injectivity over adversarial key pairs.

Pack: `realtime` (candidate). Topics: `distributed`, `mutations`, `realtime`, `backend`, `implementation`.

<a id="realtime-stream-positions-never-skip-work"></a>

## Never let a stream position pass undone work

A checkpoint watermark may advance only to the contiguous frontier of durably acknowledged outputs; acks resolve out of order, so fold them per partition and gate the commit on that frontier. A takeover replay opens at the lowest resume point among consumers sharing the source and filters, per consumer, events it already applied; live traffic is never filtered. Both choose overlap over loss, so effects deduplicate on source and sequence. Refines core card stream-checkpoints-and-effects.

**Apply when:** a stream processor emits to several outputs and checkpoints input positions, or projections with different resume points catch up on one source after a rebalance.

**Boundary notes:** give each output its own bounded queue and drain task so a blocked publish parks only that output; it then holds only its partitions' checkpoints, and replay re-sends the overlap.

**Checks:** the gate wait is bounded, after which the partition is skipped, latched unready and keeps its old watermark; state and position commit in one atomic write; replay starts at the minimum resume with a per-consumer filter; a resume older than retention raises a counter and a rebuild signal, never an ack through the gap; a failed catch-up keeps partitions out of the owned set.

**Anti-pattern:** advance the watermark when outputs are sent, or open a shared replay cursor at the most advanced consumer's resume point.

**Why it fails:** a crash after send but before ack skips outputs forever, and the lagging consumer silently loses the events between the two resume points: missing fills or balance changes with no error or counter.

**Bad example (illustrative):**

```text
publish(out); checkpoint(offset); replay.openAt(max(resumes))
```

**Better example (illustrative):**

```text
commit when contiguousAcked >= emittedCount; replay.openAt(min(resumes)).filter(e => e.seq > resume[target])
```

**Legitimate exceptions:** purely recomputable projections can rebuild instead of tracking per-output acks. A source with one consumer needs no resume filter.

**Verification scenario:** kill the process between output send and ack and assert replay re-emits the output once after dedup; replay one source for two consumers at different resume points and assert neither misses nor double-applies an event.

Pack: `realtime` (candidate). Topics: `data`, `distributed`, `realtime`, `backend`, `implementation`.

<a id="realtime-broadcast-lag-is-a-gap"></a>

## Treat broadcast lag as a gap, not noise

A bounded in-process broadcast channel drops messages for a slow receiver and only reports the count (tokio's broadcast returns Lagged(n)); those messages are gone. Every receiver needs an explicit lag arm whose action matches the stream's meaning: a latest-value feed counts and continues because the next value supersedes, while a feed of facts (fills, confirmations, order states) treats lag like a reconnect and re-reads authoritative state. Refines core card realtime-snapshot-delta-contract.

**Apply when:** a service fans an internal event stream out to tasks through a broadcast primitive, or a receive loop logs and continues, or exits, on a lag error.

**Boundary notes:** if a consumer can neither tolerate loss nor reconcile from an authority, a lossy broadcast is the wrong primitive; use a durable consumer with acknowledgements.

**Checks:** every receive site handles lag explicitly instead of a catch-all error arm; lag increments a labelled counter; fact consumers re-query authority on lag and on reconnect alike; capacity is sized from measured bursts and consumer latency; slow work is spawned off the receive loop so it keeps draining.

**Anti-pattern:** a loop that runs only while receive succeeds, or a fills consumer whose lag arm just logs and moves on.

**Why it fails:** the consumer either stops at the first lag with no error, or skips the missed fills, leaving a position watching a balance it no longer holds, a settlement never run, or a protective exit never triggered.

**Bad example (illustrative):**

```text
Err(Lagged(n)) => warn!(n) on a fills receiver
```

**Better example (illustrative):**

```text
Err(Lagged(_)) | Ok(Reconnected) => reconcile_from_authority().await
```

**Legitimate exceptions:** display-only latest-value feeds such as prices may count and continue. Test harnesses that publish past capacity must assert the lag rather than ignore it.

**Verification scenario:** fill the channel past capacity while the receiver is paused, then assert the fact consumer re-reads authority, ends in the correct state, and the lag counter increments.

**Automatable check:** a source scan in CI that flags broadcast receive sites without an explicit lag arm.

Pack: `realtime` (candidate). Topics: `realtime`, `errors`, `backend`, `review`.

<a id="realtime-bus-topology-typed-registry"></a>

## Define bus topology as typed, checked code

Declare every stream, subject, consumer, bucket and request route once in typed code: a stream as an exhaustive enum of its subjects (each variant carrying subject, payload type, codec and dedup key) and each consumer with an explicit filter and queue or fan-out distribution. Generate the machine-readable inventory and human catalog from that registry deterministically and fail CI on drift. A subject is bound in several places, so a rename moves producer route, stream subjects, consumer filters and sink bindings together. Refines core card encoding-reader-writer-compatibility.

**Apply when:** adding, renaming or splitting a subject, stream or consumer; hand-written filters or sink bindings; manually maintained topology docs.

**Boundary notes:** keep code names apart from wire names so code renames are free and wire renames deliberate. The drift check sees only the registry; bindings owned elsewhere (database ingestion queues, other repositories) need their own migration step.

**Checks:** sorted generator output; a check mode that writes nothing and fails on drift; no defaulted distribution; a rename plan listing every binding and the order (add new, move bindings, verify consumption, remove old); retention and discard policy reviewed first.

**Anti-pattern:** rename a subject in the producer and stream while a consumer filter or sink still names the old one.

**Why it fails:** a sink bound to the old subject can fail its subscription and stall the shared consumer; under discard-oldest retention the stalled backlog is then deleted, so a config slip becomes data loss.

**Bad example (illustrative):**

```text
stream.subjects = ['events.v2'] while the sink queue still lists 'events.v1'
```

**Better example (illustrative):**

```text
rename the registry variant, review the generated diff, migrate every filter and sink binding in one tracked change
```

**Legitimate exceptions:** a single-process prototype with one producer and one consumer may skip the catalog; the rename rule still applies.

**Verification scenario:** change a subject without regenerating and assert CI fails; in staging, rename one end to end and assert every consumer drains before the old subject is removed.

**Automatable check:** the generator's check mode in CI plus a script asserting every filter and sink binding names a declared subject.

Pack: `realtime` (candidate). Topics: `distributed`, `operations`, `realtime`, `backend`, `planning`.

<a id="realtime-version-ordered-frame-reducer"></a>

## Order live frames by row version, not timestamps

Apply each frame through a pure reducer keyed by a canonical identity: a frame with a lower version than the cached row is ignored, equal versions apply in arrival order when the contract allows distinct same-version frames, and merging two different identities throws. Timestamps such as updated-at (often second precision) and serve time are not versions: they never order or reject frames. A newer frame that changes quantities invalidates values derived from the older snapshot instead of carrying them forward. Refines core card realtime-snapshot-delta-contract.

**Apply when:** a cache merges a REST snapshot with socket rows for one entity, a reducer compares timestamps, or a merge spreads old fields under new ones.

**Boundary notes:** fall back to the current row field by field only for optional display metadata (name, image); accounting and price-derived values come from the newer frame or are recomputed.

**Checks:** the identity key normalizes chain-specific address case; the version source is documented in the wire contract; stale frames return the current object so references stay stable; derived values are recomputed from the frame's holdings and live price; serve time is observability only.

**Anti-pattern:** reject or order frames by updated-at, or spread a newer frame over cached derived values.

**Why it fails:** two real changes in the same second look like duplicates, so a fill disappears; or quantities advance while value and P&L stay frozen at the pre-trade valuation, showing the user a wrong position.

**Bad example (illustrative):**

```text
if (incoming.updatedAt <= current.updatedAt) return current
```

**Better example (illustrative):**

```text
if (incoming.version < current.version) return current; return { ...incoming, derived: recompute(incoming) }
```

**Legitimate exceptions:** a channel without row versions needs another documented order source, a sequence or an authoritative re-snapshot, never timestamps. Complete-snapshot channels replace the model atomically.

**Verification scenario:** deliver version 5 then 4 and assert 5 remains; deliver two distinct equal-version frames and assert both apply in order; deliver a newer quantity frame and assert derived values are recomputed.

**Automatable check:** a lint or review check flagging updated-at or serve-time comparisons inside stream reducers.

Pack: `realtime` (candidate). Topics: `realtime`, `cache`, `frontend`, `implementation`.

<a id="realtime-one-live-writer-per-read-model"></a>

## Keep one live writer per socket-owned cache

Before implementation, name the single authoritative live writer for each read model. Once a socket owns a query, disable mount, focus, reconnect, interval and mutation-triggered refetches for it; a late REST or socket result may be version-merged only to stop it regressing newer state. Enforce ownership with lint whose guarded and exempted paths must still exist: a guard on a deleted path protects nothing. Refines core card state-single-owner.

**Apply when:** a diff adds invalidate, refetch, setQueryData or polling on a stream-written key, a settle step invalidates a socket-owned entity, or lint config names owner paths.

**Boundary notes:** derived read models (history, charts) declare their own invalidation. A missing authoritative frame calls for telemetry and explicit recovery, not a hidden REST writer.

**Checks:** the PR lists every production writer to the key; settlement comes from the authoritative live event; the lint rule resolves aliased imports and intermediate variables, not only literal calls; CI fails when a guarded file, directory or glob matches nothing.

**Anti-pattern:** add a focus or reconnect refetch to fix staleness on a socket-owned cache, or leave a lint allowlist pointing at a writer module that was moved.

**Why it fails:** the REST response is older than frames already applied and overwrites them, so a just-bought position or fill flickers away; a guard scoped to a deleted path silently allows writes from anywhere.

**Bad example (illustrative):**

```text
useQuery({ queryKey: positionsKey, refetchOnWindowFocus: true }) plus invalidate(positionsKey) on settle
```

**Better example (illustrative):**

```text
one live owner writes positionsKey; refetchOnWindowFocus: false; settle from the live event
```

**Legitimate exceptions:** a read model with no reliable stream may poll under a bounded policy. A declared recovery that proves single ownership transfer and version ordering is allowed.

**Verification scenario:** hold a REST response, apply a newer frame, release the response and assert the frame survives; delete a guarded path on a test branch and assert the existence check fails.

**Automatable check:** an ESLint rule banning invalidation and writes on owned keys outside the owner, plus a script failing when any lint files, ignores or allowlist entry matches zero files.

Pack: `realtime` (candidate). Topics: `cache`, `realtime`, `query`, `frontend`, `review`.

<a id="realtime-snapshot-and-ack-latch"></a>

## Apply live frames after snapshot and ack latches

A client read model goes live only when two latches resolve: its REST snapshot is installed and the matching subscription ack has arrived. Start REST immediately instead of waiting for the ack, and declare per read model what happens to frames that arrive first: buffer them (bounded, scoped to the subscription epoch, applied after the snapshot through the version guard) or drop them. Fence every late REST response, ack and frame by route identity and account generation. Refines core card realtime-snapshot-delta-contract.

**Apply when:** a feature seeds from REST then applies socket frames for the same entities, or reconnects a route owning money-relevant state such as orders or balances.

**Boundary notes:** dropping early frames is safe only when every frame is a complete versioned row and a missed change heals on that row's next frame; anything else buffers. A snapshot without a stream position cannot be lined up exactly, so record a suspected gap.

**Checks:** latch state is per route and epoch; on reconnect the installed cache is retained, and where the declared policy needs repair, one exact reconciliation runs after the replacement ack, then buffered post-ack frames apply so newer stream state wins; focus, visibility and online events trigger nothing; no recovery path replays a mutation.

**Anti-pattern:** apply frames as soon as they arrive, before the snapshot lands, then let the snapshot replace the cache.

**Why it fails:** the snapshot, read earlier, overwrites newer frames, so a just-filled order shows as open or a closed position reappears; a frame from the previous account's subscription can also land in the new account's cache.

**Bad example (illustrative):**

```text
socket.onFrame(f => cache.apply(f)); cache.set(await fetchSnapshot())
```

**Better example (illustrative):**

```text
await Promise.all([snapshotInstalled, ackFor(epoch)]); buffered.filter(isNewerThanCache).forEach(apply)
```

**Legitimate exceptions:** complete-snapshot channels may let the first socket snapshot satisfy readiness through a shared coordinator. Routes whose frames self-heal need no reconnect reconciliation; do not add one.

**Verification scenario:** hold REST, deliver the ack and two frames, release REST and assert the declared policy; reconnect and assert at most one reconciliation, after the replacement ack.

Pack: `realtime` (candidate). Topics: `realtime`, `cache`, `lifecycle`, `frontend`, `implementation`.

<a id="realtime-shared-worker-socket-broker"></a>

## Broker one physical socket across tabs with leases

Run one physical socket per endpoint and scope in a SharedWorker that brokers subscriptions for every tab: each tab holds a renewable lease, its own subscription ids and a backlog capped by frame count and bytes. Queue subscribe requests by the best priority among their owners, FIFO on ties, with unsubscribes first and a cap on requests in flight. A tab that overflows its backlog or lets its lease lapse is detached and takes the normal recovery path, while other tabs keep their subscriptions. Refines core card realtime-subscription-lifecycle.

**Apply when:** several tabs open the same live endpoint, per-user or per-IP connection limits apply, or a worker transport or its message protocol changes.

**Boundary notes:** version the worker's name whenever its internal protocol changes; otherwise old and new tabs share one worker instance speaking different protocols. Keep a dedicated-worker or main-thread fallback where SharedWorker is unavailable.

**Checks:** only tab commands renew a lease, never upstream traffic; each tab acknowledges a batch before the next is sent; a grace period precedes releasing a server subscription; ack timeouts adapt to measured round trips; abandoned subscribes are remembered so a late success ack releases the orphaned server subscription; a retired tab handle cannot release its replacement's ownership.

**Anti-pattern:** each tab opens its own socket, or the worker drops frames for a slow tab to keep up.

**Why it fails:** tabs multiply connections past server limits and duplicate work; dropping deltas for one tab silently corrupts its balances, whereas detaching it forces a resubscribe and a fresh snapshot.

**Bad example (illustrative):**

```text
if (tab.queue.length > max) tab.queue.shift()
```

**Better example (illustrative):**

```text
if (tab.bytes + frameBytes > maxBytes) detach(tab, 'backlog-overflow')
```

**Legitimate exceptions:** a single-tab app, or a vendor SDK that already multiplexes its transport, needs no broker. Skip priority queues when subscribe volume is small.

**Verification scenario:** open two tabs on one subscription, freeze one past its lease and assert only its ownership is released; flood one tab past its byte cap and assert it is detached and recovers while the other keeps streaming.

Pack: `realtime` (candidate). Topics: `realtime`, `subscriptions`, `performance`, `frontend`, `implementation`.

<a id="realtime-validate-payloads-at-transport"></a>

## Validate socket payloads once at the transport

Parse each inbound frame once at the transport (in the worker, before fan-out to tabs) against schemas generated from the server's published channel contract: envelopes tolerantly, payloads strictly per channel. A payload that fails validation still reaches its owning feature as an explicit rejection, so that feature's contract-failure and recovery policy runs; it is not a subscription error and cannot consume an ack. Consumers then trust the typed value instead of re-validating. Refines core card types-boundary-validation. Pack card contracts-strict-payload-tolerant-envelope covers discriminants and REST mappers.

**Apply when:** adding a channel, regenerating channel types, writing a consumer that parses socket JSON itself, or changing what happens to a malformed frame.

**Boundary notes:** compatibility overlays, such as accepting an unknown failure variant so the renderer shows fallback copy, live at the same boundary and are explicit. Semantic checks such as supported chain or asset stay in the feature mapper.

**Checks:** the schema map derives from the generated contract with no hand-written copies; an update for a channel without a schema is reported as unusable, not dropped silently; oversized frames close the connection; rejected payloads emit telemetry and follow the owner's declared recovery; third-party transports keep their own boundary.

**Anti-pattern:** each feature calls JSON.parse and casts, or the transport swallows invalid payloads.

**Why it fails:** a cast lets a renamed field render as a zero or missing balance; swallowing hides contract drift, so the feature never recovers and the user sees frozen data presented as live.

**Bad example (illustrative):**

```text
const order = JSON.parse(raw).data as Order
```

**Better example (illustrative):**

```text
const result = schemas[channel].safeParse(frame.data); deliver(owner, result.success ? result.data : rejected)
```

**Legitimate exceptions:** third-party socket SDKs that validate natively keep their own boundary. Trusted in-process values need no re-parse.

**Verification scenario:** send a frame with a renamed required field and assert the owner receives a rejection, records telemetry and enters its recovery state, while other channels on the socket keep streaming.

**Automatable check:** a CI step asserting the generated channel schemas match the committed server contract.

Pack: `realtime` (candidate). Topics: `types`, `boundaries`, `realtime`, `frontend`, `implementation`.

<a id="realtime-stream-health-action-authority"></a>

## Declare which stream health can block actions

Keep a typed registry of the read models whose live health is authority for user actions, such as the balance and order streams a submit depends on, and derive gating from it through an exhaustive status-to-message map instead of ad hoc checks. Recovery that only refreshes existing data does not revoke action authority; a degraded authority stream does. Actions also wait until the socket has applied the latest credential refresh, so a submit never relies on a stream still bound to the old session. Refines core card lifecycle-readiness-and-user-feedback.

**Apply when:** a submit, cancel or transfer depends on live balances or order state; a channel joins the recovery set; auth refresh or reconnect logic changes.

**Boundary notes:** which actions block and the messages shown are product decisions and must be sourced. The registry makes the decision explicit and testable; it does not choose it.

**Checks:** the registry is an as-const list typed against authenticated channel names; every status has a mapping; the session check compares the latest successful refresh revision with the revision the socket applied; non-authority channels such as trades or history never block; disabled controls show the mapped reason.

**Anti-pattern:** block every action whenever any socket reconnects, or never block and let users submit against unconfirmed balances.

**Why it fails:** the first freezes trading on irrelevant channel blips; the second lets a user act on a balance or open order the stream has not confirmed, producing rejected or unintended trades.

**Bad example (illustrative):**

```text
disabled = !socket.connected
```

**Better example (illustrative):**

```text
disabled = blockMessage[statusOf(authorityChannels)] !== null || authRefreshSeq > socketAuthSeq
```

**Legitimate exceptions:** read-only views need no action authority. If server validation already rejects stale submissions safely, gating may be limited to messaging, which is a product decision.

**Verification scenario:** degrade the balance stream and assert submit is disabled with the mapped message; degrade a trades stream and assert submit stays enabled; complete an auth refresh before the socket re-authenticates and assert submit waits.

Pack: `realtime` (candidate). Topics: `realtime`, `lifecycle`, `execution`, `frontend`, `planning`.

<a id="realtime-bounded-polling-backstop"></a>

## Poll only as a bounded backstop

When REST polling backs up a stream, skip the request while the stream has delivered within its freshness window and serve the live cache; if the stream becomes fresh during the fetch, merge or prefer the live value so the late response cannot regress it. Every refetch interval goes through a shared helper that stops on non-retryable errors and terminal data, and slows down on transient errors while retained data stays visible. Enforce the helper with a lint rule. Refines core card realtime-subscription-lifecycle.

**Apply when:** a query sets a refetch interval, a stream may be absent or stale for some scopes, or a job, order or transfer is polled until it finishes.

**Boundary notes:** the freshness window and poll cadence are product and load decisions to source, not defaults. A socket-owned entity cache gets no polling at all.

**Checks:** the interval is false or an approved helper call; terminal errors such as auth or not-found stop polling; transient errors poll at a slower floor; lifecycle polling stops at a terminal state; freshness is tracked per canonical key and pruned; snapshot baseline markers are reference counted so one consumer's teardown cannot clear another's.

**Anti-pattern:** a fixed refetch interval on a query that also receives live frames, polling forever through auth failures.

**Why it fails:** polling replaces newer live state with older REST data, hammers the API from every open tab during an outage, and keeps a revoked session retrying indefinitely.

**Bad example (illustrative):**

```text
useQuery({ queryKey, queryFn, refetchInterval: 5_000 })
```

**Better example (illustrative):**

```text
useQuery({ queryKey, queryFn: () => fetchWithStreamBackstop(key), refetchInterval: pollWhileHealthy(cadence) })
```

**Legitimate exceptions:** read models with no stream may poll on their own cadence through the same helper. A refresh on explicit user action is not polling.

**Verification scenario:** with the stream fresh, advance timers and assert no REST call; return a non-retryable error and assert polling stops; return a transient error and assert the slower cadence with data still shown.

**Automatable check:** an ESLint rule requiring every refetchInterval to be false or an approved helper call.

Pack: `realtime` (candidate). Topics: `query`, `performance`, `realtime`, `frontend`, `implementation`.

<a id="realtime-visibility-aware-batching"></a>

## Batch live renders by visibility and group

Accumulate high-frequency frames in the cache owner and flush them to React on a batcher whose cadence follows context: the normal interval while visible, a slower one when hidden or the user is idle, deferred while a navigation transition is pending, and an immediate flush when the page becomes visible again. Batchers whose readers merge several sources share one timer group, so all members flush in one task and readers re-render once per group. Refines core card realtime-subscription-lifecycle.

**Apply when:** a stream updates faster than useful rendering (trades, tickers, ranked lists), several per-scope stores feed one merged view, or a hidden tab burns CPU applying frames.

**Boundary notes:** batching delays presentation, never data: the owner still applies every frame in order and actions read current state. Intervals are measured choices; do not batch low-rate channels.

**Checks:** cadence is resolved when a flush is scheduled; turning visible flushes pending work at once; destroy removes listeners and timers; grouped fires run inside one notification batch; deletions and terminal transitions are not coalesced away.

**Anti-pattern:** set React state per frame, or run one timer per store feeding the same merged list.

**Why it fails:** render cost dominates and the main thread stalls, adding input lag right when a user submits; hidden tabs waste battery; per-store timers re-render a merged view once per member.

**Bad example (illustrative):**

```text
socket.onFrame(f => setRows(rows => apply(rows, f)))
```

**Better example (illustrative):**

```text
owner.apply(frame); batcher.schedule() with a grouped timer that slows when hidden or idle
```

**Legitimate exceptions:** low-rate or user-initiated updates render directly. A terminal state that drives a confirmation flushes immediately.

**Verification scenario:** emit frames while hidden and assert flushes at the hidden cadence; switch to visible and assert an immediate flush; emit to three grouped stores and assert one render per group fire.

**Automatable check:** a render-count test asserting at most one commit per batch interval under a synthetic burst.

Pack: `realtime` (candidate). Topics: `performance`, `realtime`, `frontend`, `implementation`.

<a id="realtime-resource-leases-by-query-key"></a>

## Lease live resources by canonical query key

Identify each live resource by its canonical query key (endpoint, scope, parameters, source generation and, for private data, account identity) and let every consumer, whether sync component, reader or hover preload, acquire an internal lease on it. The first lease starts the snapshot and the live writer and later ones reuse them; after the final release a short grace period lets a re-acquire keep the snapshot and channel, and final disposal aborts pending work, unsubscribes, stops timers and removes unobserved cache entries. Refines core card realtime-subscription-lifecycle.

**Apply when:** intent preloading warms data a page will read, several components need the same stream, or teardown currently follows one component's unmount.

**Boundary notes:** account-scoped resources must define account and session invalidation before adopting grace, so a lease never carries one account's stream into another session. Snapshot and live merge rules stay in each adapter; the lease layer does not guess them.

**Checks:** components never create consumer ids or count readers; timed leases expire on their own; readers do not refetch on mount or focus over the writer; callbacks from retired subscription epochs are rejected; an explicit retry restarts the shared writer once for concurrent callers.

**Anti-pattern:** each hook opens its own subscription, or the first consumer to unmount tears the stream down.

**Why it fails:** duplicate writers race on one cache key, and the hover-to-page handoff cold-starts the stream, so the destination flashes loading or shows a stale snapshot.

**Bad example (illustrative):**

```text
useEffect(() => { const s = subscribe(key); return () => s.close() }, [key])
```

**Better example (illustrative):**

```text
useLiveLease(resource, input) leasing by canonical key, with grace before disposal
```

**Legitimate exceptions:** a single-consumer screen can own a plain subscription. Account- or filter-scoped writers may keep immediate teardown instead of grace.

**Verification scenario:** acquire from hover, mount the page during grace and assert one subscription and no refetch; release all and assert abort, unsubscribe and cache removal after grace; switch account and assert no lease survives.

Pack: `realtime` (candidate). Topics: `subscriptions`, `cache`, `realtime`, `frontend`, `implementation`.

<a id="realtime-gap-recovery-resume-or-resnapshot"></a>

## Choose sequence resume or re-snapshot for gaps

Decide per channel how a client recovers lost frames, and write it into the channel contract. Sequence numbers with a resume token detect gaps exactly and let a short disconnect resume, but the server must retain a bounded replay window and still re-snapshot past it. Re-snapshot with row versions keeps fan-out free of replay state and makes every reconnect correct, but cannot detect a frame lost mid-session and needs full-row frames plus versioned deletions. Refines core card realtime-snapshot-delta-contract.

**Apply when:** designing a channel, a reconnect or shedding path, or a heartbeat, especially when deltas over large models (order books, long lists) make snapshots expensive.

**Boundary notes:** give liveness to the client: it sends pings, counts any inbound frame as alive, and reconnects when a pong deadline passes with no traffic, without arming deadlines in hidden tabs where timers are throttled. The server answers pings and sheds peers it cannot write to.

**Checks:** the contract names the recovery model; with re-snapshot, every shed, heartbeat timeout and reconnect resubscribes and re-reads the base before the cache is trusted; with resume, a sequence gap or expired token falls back to a snapshot; a shared-worker socket owns one heartbeat for all tabs.

**Anti-pattern:** reconnect, resubscribe and keep applying deltas to the old cache as if nothing was lost.

**Why it fails:** frames sent during the outage or dropped by shedding are never applied, so balances and order states stay wrong while the UI presents them as live.

**Bad example (illustrative):**

```text
onReconnect: resubscribeAll() while the delta cache stays marked current
```

**Better example (illustrative):**

```text
onReconnect: resubscribe(); await ack; rebase(await snapshot()), or resume(lastSeq) where the contract supports it
```

**Legitimate exceptions:** complete-snapshot channels heal on the next frame. Low-value display feeds may accept staleness until their next update, by declaration.

**Verification scenario:** drop the connection mid-stream, publish during the outage, reconnect and assert the client converges to server state; stop pongs with no traffic and assert the client reconnects within the deadline.

Pack: `realtime` (candidate). Topics: `realtime`, `distributed`, `frontend`, `backend`, `planning`.

<a id="web-app-data-region-anatomy"></a>

## Build each data region from four roles

Each independently loading region has a runtime that assembles it, a browser-only sync owner for subscriptions, a data component that suspends on primary queries, and a surface rendering both loading (null data) and loaded states. Sync mounts outside the region's Suspense and error boundary, so a pending query, retry or render error never tears down a healthy socket. Regions are siblings, never nested; a development guard throws on nesting. The recovery key encodes the full query and subscription scope and only clears an error already shown.

**Apply when:** a region needs its own REST read or stream, a page waits on unrelated endpoints, or a diff adds a skeleton tree, a fetching surface or a subscription inside Suspense.

**Boundary notes:** These are roles, not files to scaffold: no stream means no sync. What the error fallback shows is a product decision.

**Checks:** sync renders nothing, never suspends and reads its own client state; the surface gets typed data, never readiness flags or a query key; null means loading and an empty collection means resolved-empty; real containers stay mounted with controls disabled and the region aria-busy; a recovery-key change on a healthy region causes no remount or resubscribe.

**Anti-pattern:** Subscribe inside the suspending data component, or return a separate skeleton tree while data is missing.

**Why it fails:** A retry or render error unmounts the subscription, so updates are missed during recovery; a parallel skeleton drifts from the real layout and shifts content; nested regions let one slow endpoint blank unrelated content.

**Bad example (illustrative):**

```text
if (!data) return <PanelSkeleton />, plus useEffect(() => subscribe(scope), []) inside the suspending component.
```

**Better example (illustrative):**

```text
<Region sync={<PanelSync id={id} />} loading={<PanelSurface data={null} />}><PanelData id={id} /></Region>
```

**Legitimate exceptions:** UI-only Suspense boundaries (lazy code, progressive stages) inside a region are not nested regions. A small static widget needs no split.

**Verification scenario:** Hold the primary request and assert the real surface renders with disabled controls and no shift on resolve; force a render error and assert the subscription count is unchanged and a scope change clears the error.

Pack: `web-app` (candidate). Topics: `frontend`, `components`, `realtime`, `errors`, `implementation`.

<a id="web-app-request-priority-buckets"></a>

## Admit reads through route-specific priority buckets

Classify each cold read and subscription by active route and consumer, not endpoint: critical (first useful view and its correctness dependencies; immediate, SSR-eligible), after-ready (a bounded queue once the primary view commits), on-demand (feature opened) and idle (behind other background work). One coordinator holds admission metadata only; the query cache stays the single data store, keyed without route or bucket. Admit before invoking a fetch or subscription; passing a running promise to a deferred region is too late. Critical subscriptions start without waiting for REST; pack card realtime-snapshot-and-ack-latch keeps that safe on the client.

**Apply when:** adopt once the app has several data-heavy routes whose secondary reads compete with the primary view, or one query is primary on one page and secondary on another.

**Checks:** intent promotes its dependencies and the last consumer closing cancels queued work; shared consumers join one pending request at the earliest priority; navigation reprioritizes, never cancels, shared work; account lifetime is separate from priority and account change retires old work first; critical subscriptions never wait for REST; socket send order follows the same priority without preempting in-flight acks; a stalled primary frees the queue only via a bounded deadline.

**Anti-pattern:** Release every deferred read in one post-hydration effect, or subscribe to a critical stream only after its REST snapshot resolves.

**Why it fails:** Secondary reads delay the view users came for; a gated critical stream misses updates during the round trip and shows stale prices; cancelling shared work on navigation triggers refetch storms.

**Bad example (illustrative):**

```text
useEffect(() => { loadTickers(); fetchHistory() }, []) on every route, with the price stream subscribed after its snapshot.
```

**Better example (illustrative):**

```text
Each read declares resource, consumer, bucket and reason; primary data signals readiness; after-ready work drains under a small concurrency budget.
```

**Legitimate exceptions:** A single data-heavy page rarely needs a coordinator. Mutations, authentication, identity cleanup and required balance or order-reconciliation owners bypass the queue.

**Verification scenario:** Hold the primary REST response and assert the critical subscribe frame went out and no secondary read started; release it and assert bounded secondary start, intent promotion and old-account cancellation.

Pack: `web-app` (candidate). Topics: `frontend`, `performance`, `query`, `realtime`, `planning`.

<a id="web-app-server-hint-cookies"></a>

## Pass browser-owned scope to SSR as hints

When the server must render a region whose scope lives in the browser (selected chains, filters, layout), persist one small versioned hint per feature in a cookie, validate it server-side, and fall back to the approved default for missing, malformed, oversized, old-version or other-identity values. In a React Server Components app such as Next.js App Router, the layout reads hints once per request through memoized readers and passes unawaited promises down; consumers use them only for SSR and the first hydration render, then browser state is authoritative. A hint shapes the first frame but never enables an action or grants access. Refines core card storage-versioned-boundary.

**Apply when:** a direct visit renders the wrong selection because the server cannot see local storage, or a diff writes isHydrated ? browserValue : serverValue.

**Boundary notes:** Add a hint only when the server needs browser-owned scope, never to carry data the browser can fetch.

**Checks:** typed key in a client-safe module, schema in a server-only one; one registered reader and one parameterless writer per hint, mounted once below the state providers; the writer never fetches and writes only after persisted state hydrates, so defaults never overwrite a valid cookie; both registries change together; persisted selections may use the hint as their store's server snapshot.

**Anti-pattern:** Write the cookie from pages or repeated components, or let a hinted value enable a trade action.

**Why it fails:** Competing writers and pre-hydration defaults overwrite the real selection, so the next visit renders the wrong scope; a stale or forged cookie enabling an action bypasses the authoritative balance or permission model.

**Bad example (illustrative):**

```text
useEffect(() => { document.cookie = 'chains=' + JSON.stringify(defaults) }, []) inside a page.
```

**Better example (illustrative):**

```text
One registered writer serializes the versioned hint after store hydration; the layout's cached reader validates it and hands a promise to the region.
```

**Legitimate exceptions:** Scopes that need server I/O (flags, derived query scopes) start in the layout of the route that uses them, not the shared registry.

**Verification scenario:** Send malformed, oversized, old-version and other-identity cookies and assert the default renders without errors; reload before store hydration and assert the cookie is unchanged.

Pack: `web-app` (candidate). Topics: `frontend`, `storage`, `boundaries`, `state`, `implementation`.

<a id="web-app-hydration-stable-clock"></a>

## Keep the server time reference through hydration

Relative ages and countdowns should render in server HTML and hydrate without a mismatch. Capture one request-scoped server time, pass it (or its promise) through context, and make it the server snapshot of an external-store clock, so each consumer's first client render reuses that exact reference before adopting the live clock. Live clocks are shared per interval, catch up immediately on the first subscriber and stop after the last. Refines core card react-external-store-snapshots.

**Apply when:** a diff renders ages, countdowns or expiries in server-rendered regions, calls Date.now() during render, or hides times behind a hydration flag or suppressHydrationWarning.

**Boundary notes:** Client-only widgets can read the live clock directly. The clock cannot repair mismatched data, identity or DOM structure.

**Checks:** the server snapshot returns the serialized reference, never a fresh Date.now(); the live snapshot is cached between ticks; each streamed Suspense consumer keeps the original reference even after a sibling hydrated, so no global hydrated flag chooses it; formatters take now as a parameter; the server clock is injectable through a validated fixture input.

**Anti-pattern:** Compute ages with Date.now() during render, or show placeholders until a global isHydrated flag flips.

**Why it fails:** Server and browser produce different strings, React reports a hydration mismatch and may discard the server HTML; placeholders hide available data; one global flag hands late-streaming regions the wrong snapshot.

**Bad example (illustrative):**

```text
<span>{formatRelativeAge(createdAt, Date.now())}</span> inside a server-rendered row.
```

**Better example (illustrative):**

```text
const now = useClock(intervalMs); formatRelativeAge(createdAt, now), with the request reference as the hook's server snapshot.
```

**Legitimate exceptions:** Values that must be exact at action time, such as quote or order expiry, come from the server or the action path, not the display clock.

**Verification scenario:** Render real server HTML and assert the age is visible before hydration; advance time, hydrate and assert no hydration error and an immediate live update; hold one Suspense consumer while a sibling ticks and assert it starts from the original reference.

Pack: `web-app` (candidate). Topics: `frontend`, `state`, `subscriptions`, `implementation`.

<a id="web-app-third-party-reads-browser-only"></a>

## Keep third-party venue reads in the browser

Data from endpoints you do not operate (venues, aggregators, external APIs) is fetched only in the browser after hydration, never during server rendering or through streamed query hydration. Server requests leave from a few shared hosting IPs, so every page view hits the vendor from the same addresses and gets rate limited, and vendor latency holds the HTML stream open. The region still renders its real surface with null data in the HTML, while surrounding first-party critical data keeps streaming.

**Apply when:** a server component, layout bootstrap or server-rendered suspense query calls an external API, or a diff adds query keys for a vendor.

**Boundary notes:** Placement is separate from priority: a vendor ticker still waits for its bucket, while a critical vendor balance starts once browser prerequisites allow.

**Checks:** the dehydration predicate refuses vendor queries by registered key root or meta flag even if a server render reaches them, and no opt-in overrides it; socket-owned account queries (never stale, no refetch) are excluded unless opted in, since a snapshot from before the subscription would never be repaired; a vendor addend in a first-party total renders the first-party part with the addend marked busy.

**Anti-pattern:** Prefetch a venue catalog in a server layout and stream it to the browser through query hydration.

**Why it fails:** Shared server IPs exhaust the vendor's rate limit for all users at once, pages wait on vendor latency, and one throttling episode blanks server-rendered prices.

**Bad example (illustrative):**

```text
await queryClient.prefetchQuery(venueMarketsQuery) inside a server layout.
```

**Better example (illustrative):**

```text
Render <MarketsSurface data={null} /> in the HTML, mount the vendor reader after hydration, and tag its query with a third-party key root.
```

**Legitimate exceptions:** Reads through a first-party proxy you operate, with its own cache and quota contract, are first-party server requests with their own priority.

**Verification scenario:** Log server-side outbound requests on a direct visit and assert none hit vendor hosts; assert the dehydrated payload has no vendor or socket-owned keys and the surface frame is in the HTML.

**Automatable check:** Unit-test the dehydration predicate with vendor key roots, meta flags, opt-ins and socket-owned keys.

Pack: `web-app` (candidate). Topics: `frontend`, `boundaries`, `query`, `performance`, `implementation`.

<a id="web-app-route-identity-from-params"></a>

## Derive route identity from the page params prop

A dynamic route reads its identity from the page-scoped params prop (unwrapped inside Suspense with the null-data surface as fallback), runs a strict feature-local resolver, and redirects or returns not-found during render for invalid input. The resolved identity enters the feature provider as an explicit initial value; the provider owns only in-session changes and back/forward restoration. Never derive it from URL-following hooks (useParams, usePathname): the framework keeps visited routes mounted but hidden, and those hooks make a hidden page react to another page's URL. Refines core card navigation-state-contracts.

**Apply when:** adding or changing a dynamic route, its resolver or generateMetadata, or a client component that reads the URL to pick its entity.

**Boundary notes:** URL-following hooks remain fine for active-only chrome such as navigation highlighting.

**Checks:** the resolver rejects empty, whitespace and dot segments, control and path characters, and framework placeholders (Next.js emits an opaque %%drp:...%% form) before any API call; parsers stay feature-local because entity ids differ in shape and recovery; page and generateMetadata share one route-local resolver returning a ready, redirect or invalid result; search params are read only in the region that needs them.

**Anti-pattern:** Read the entity id with useParams() in a provider and redirect when it does not resolve.

**Why it fails:** After navigation the hidden page re-renders with the new URL, fails to resolve and redirects the active tab; placeholders reach the API as ids.

**Bad example (illustrative):**

```text
const { id } = useParams(); if (!isKnownMarket(id)) router.replace('/markets')
```

**Better example (illustrative):**

```text
const { id } = use(params); const marketId = resolveMarketRouteId(safeDecode(id)); if (!marketId) redirect(marketsRoute)
```

**Legitimate exceptions:** Without hidden-route retention the hook hazard disappears, but strict shared resolution still applies.

**Verification scenario:** Open an entity page, navigate away and assert the hidden page issues no redirect or request; request placeholder and malformed segments and assert redirect or not-found, no API call and matching metadata.

**Automatable check:** Ban useParams and usePathname in route clients and entity providers via restricted imports.

Pack: `web-app` (candidate). Topics: `frontend`, `state`, `boundaries`, `types`, `implementation`.

<a id="web-app-client-pages-server-layouts"></a>

## Evaluate client pages under server-only layouts

Next.js 16 with Cache Components and partial prefetching (verify both are stable in your version) prefetches one reusable shell per route that carries session data but not URL data, unless runtime prefetching resolves params per URL. A server page reading params or searchParams thus needs a per-URL server render at navigation, while a client page reads URL data in the browser so one shell serves every URL of the route. So pages become top-level client components that compose regions and unwrap params inside Suspense, while layouts are the only server components and start metadata, hints and critical reads unawaited. Evaluate it as an architectural choice against your router version and route mix.

**Apply when:** planning routing for a Next.js 16 app with many dynamic routes, or reviewing a page that exports segment config, reads cookies or awaits params outside Suspense.

**Boundary notes:** Content, auth and admin routes with little in-app navigation can stay server pages.

**Checks:** pages export no segment config or metadata and contain no server components; params are unwrapped inside Suspense (a read outside any boundary blocks the shell prerender and fails the build); layouts await nothing at their root; deferred regions create no server promises; hard loads still stream critical first-party content.

**Anti-pattern:** Await params at the top of a server page that renders an entire trading workspace.

**Why it fails:** Every navigation waits on a dynamic server round trip, and switching entities of one route flashes loading for data the browser already holds.

**Bad example (illustrative):**

```text
export default async function Page({ params }) { const { id } = await params; return <Workspace id={id} /> }
```

**Better example (illustrative):**

```text
A 'use client' page wraps <RouteClient params={params} /> in Suspense with <WorkspaceSurface data={null} /> as fallback.
```

**Legitimate exceptions:** A route needing per-request server-only work in the page body, with no client equivalent, can stay server-rendered; record why.

**Verification scenario:** Navigate between two entities of one route and assert no dynamic route-payload request and no loading surface for cached data; on a hard load with hydration held, assert critical content is in the streamed HTML.

**Automatable check:** A build-time check that app pages start with 'use client' and export only a default component.

Pack: `web-app` (candidate). Topics: `frontend`, `planning`, `performance`, `composition`.

<a id="web-app-progressive-merged-readiness"></a>

## Render merged regions from the first ready source

When a region merges independent sources (one per chain, venue or market) and any single result is useful, start every admitted source query in parallel, including during SSR, and suspend only until the first succeeds; a successful empty result counts as ready, a failure does not. The data component merges the entries that exist and passes real data to the surface; later results and live updates flow through the same per-source cache entries. To stream later results as HTML, nest UI Suspense stages that each wait for one more settled source, with the populated surface as fallback.

**Apply when:** a grid or list combines per-source queries and one slow source holds back the rest, or a diff wraps every source in one all-or-nothing suspense call.

**Boundary notes:** Keep all-or-nothing suspense when the surface is meaningless without every result, such as a total that must include all addends.

**Checks:** one cache entry per reusable source, with no merged entry or store copy; ready sources stay visible while another loads or fails; failed sources retry locally without blanking others; enabling an already-cached source is instantly ready; stage structure is identical on server and client; what shows when every source failed follows approved product policy.

**Anti-pattern:** Seed missing sources with fake empty arrays to stop suspense, or await all sources before rendering.

**Why it fails:** Fake seeds show a confident empty market that was never fetched and hide the pending fetch; all-or-nothing waits let the slowest venue set time to first content for the whole page.

**Bad example (illustrative):**

```text
queryClient.setQueryData(sourceKey, []) for every source so the grid renders immediately.
```

**Better example (illustrative):**

```text
Throw a race of the pending source promises until one has data, then render the merge and let query observers deliver the rest.
```

**Legitimate exceptions:** Two or three fast co-located sources can share one boundary; staging is worth its cost when tail latency differs materially between sources.

**Verification scenario:** Delay one source, fail another and resolve a third with an empty list; assert the region renders the empty-but-ready result, retries the failure locally, and streams the delayed source into HTML when it resolves before hydration.

Pack: `web-app` (candidate). Topics: `frontend`, `query`, `components`, `performance`, `implementation`.

<a id="web-app-render-only-visible"></a>

## Unmount hidden panels and return from cache

Inactive tabs, closed panels, collapsed sections and drawers unmount when not shown instead of staying alive via force-mount, preserve-content tabs, display:none or hidden Activity boundaries. Instant return comes from the query cache and an admitted live owner: the region re-renders from cached entries and shows null-data surfaces only for scopes never loaded. The cost compounds where the router retains hidden routes (Next.js App Router keeps several visited routes mounted for back navigation), multiplying every hidden region. Refines core card react-performance-evidence.

**Apply when:** a diff adds force-mount, preserve-content, display:none toggles or hidden Activity around data-bearing UI, or a hidden route still asserts request demand or holds subscriptions.

**Boundary notes:** Scroll position or open state that must survive a switch is state, not DOM: store it in the feature's state and restore it on mount.

**Checks:** hidden pages mount nothing beyond visible regions, hold no subscriptions outside their sync owners and assert no request demand; reopening renders from cache without a loading flash; slow reopening is fixed through the query key or cache lifetime, not by pinning the tree.

**Anti-pattern:** Keep every tab mounted with display:none so switching back is instant.

**Why it fails:** DOM nodes, memory and render work accumulate per hidden panel and per retained route, degrading input latency on the active trading view, while hidden subscribers keep consuming bandwidth and CPU.

**Bad example (illustrative):**

```text
A preserve-content tab set wrapping five live data grids that each keep their own feed subscription.
```

**Better example (illustrative):**

```text
Render only the active tab; its data component reads the cached query while the feature's live owner keeps that cache current.
```

**Legitimate exceptions:** Measured expensive remounts (a heavy chart canvas, an embedded third-party frame, an unsent draft) may stay alive with a documented reason and memory budget.

**Verification scenario:** Open and close a panel repeatedly and navigate across retained routes; assert DOM node and subscription counts return to baseline and reopening shows cached data without a loading surface.

**Automatable check:** Lint force-mount props, preserve-content options and hidden Activity modes outside an allowlist.

Pack: `web-app` (candidate). Topics: `frontend`, `performance`, `components`, `lifecycle`, `review`.

<a id="web-app-global-read-models"></a>

## Promote data to global only with one owner

Global data is not data used in several places: it has exactly one owner mounted in the app layout, is cleaned up by account identity, and is exposed through a public non-fetching selector hook. Consumers subscribe to the existing entry without starting another request or socket; when it is not ready, only the dependent control shows a local pending or disabled state. New data is page or feature-specific by default. Refines core card state-location-and-provider-contracts.

**Apply when:** a second feature wants account balances, positions, the order lifecycle or a live reference price, or a diff copies query data into context or a client store to share it.

**Boundary notes:** Cache lifetime may span routes while network work follows active consumer demand; a mounted owner may stay dormant until needed.

**Checks:** promotion adds one layout owner, a canonical public read API, identity cleanup, an explicit demand contract and a test proving page consumers start no duplicate work; consumers never read another feature's raw cache key; a critical region needing the model awaits its server bootstrap through the public reader, reusing the layout's request and key; secondary data such as a trade button's balance check never suspends the main surface.

**Anti-pattern:** Mount the balance query and socket in each widget, or mirror the global entry into a feature context.

**Why it fails:** Duplicate owners multiply requests and subscriptions and disagree mid-update, so two widgets show different balances; copies outlive account switches and display the previous account's funds.

**Bad example (illustrative):**

```text
Each widget runs its own balance query plus socket subscription and copies the result into a context.
```

**Better example (illustrative):**

```text
One layout-mounted owner keeps the balances entry current; widgets call useAccountBalances() and disable only their trade action while it is pending.
```

**Legitimate exceptions:** Feature-derived state many descendants need, with one clear feature provider (such as a selected wallet), belongs in feature context.

**Verification scenario:** Mount three consumers on one route and assert one request and one subscription; switch accounts and assert old values disappear before new ones render; hold the global entry and assert only dependent controls are disabled.

Pack: `web-app` (candidate). Topics: `frontend`, `state`, `cache`, `providers`, `planning`.

<a id="web-app-enforced-module-boundaries"></a>

## Enforce module ownership with import-graph rules

Make ownership mechanical: generate an import-graph rule per pair of feature modules forbidding runtime imports of another module's internals outside a few named public entry points (barrel, server readers, light shell hooks, lazy wrappers); forbid runtime cycles and lower layers importing the app layer; and commit a known-violations baseline so only new violations fail. Restricted-import lint rules give each sensitive cache one sanctioned writer and keep vendor SDKs (error reporting, analytics, wallets) behind their facade. Refines core card modules-public-contracts. Pack card operations-ratchet-unfixable-rules covers the baseline mechanics.

**Apply when:** a diff deep-imports another module, writes a shared cache from a new place, imports a vendor SDK directly, or wraps a dependency.

**Boundary notes:** A facade must own a protocol, resource lifecycle, replacement boundary or the app's error and loading contract; never add a pass-through over a pure utility.

**Checks:** fixing a baselined violation removes its entry, so the baseline only shrinks; type-only cross-module imports are an explicit policy; the sanctioned writer is exempted narrowly; an ESLint flat-config override of no-restricted-imports replaces the base list, so exempted files restate unrelated restrictions; the check runs in CI.

**Anti-pattern:** Import another module's internal cache helper to patch its data, or wrap a date library in a pass-through module.

**Why it fails:** Two writers apply different rules to one cache entry, so positions or orders disagree across views; pass-through wrappers add indirection without owning a contract.

**Bad example (illustrative):**

```text
A trading component imports the portfolio module's internal page writer to patch a position row.
```

**Better example (illustrative):**

```text
Trading calls the portfolio module's public update operation, and a restricted-import rule blocks the internal writer everywhere else.
```

**Legitimate exceptions:** Tests may import their own module's internals; a new module may start with only an index entry.

**Verification scenario:** On a scratch branch add a deep import, a runtime cycle and a direct SDK import and assert each fails naming its rule; move a module's internal files and assert no consumer edits.

**Automatable check:** Generate pair rules from the module directory listing (for example in dependency-cruiser) and run them with the baseline in CI.

Pack: `web-app` (candidate). Topics: `frontend`, `modules`, `boundaries`, `cache`, `review`.

<a id="web-app-component-map-and-scanners"></a>

## Resolve UI concepts in a generated component map

Keep a generated component map with one row per UI concept: the component to use, design-tool node ids, variant or duplicate relations, and known copies to fold in. Before creating a component, look up the concept and extend the mapped component instead of adding a parallel one; designed but unbuilt concepts go in the shared kit, not a feature. The map generator's --check mode fails on a stale doc, a second row for a mapped concept or component without a declared variant or duplicate relation, or a mapped export that no longer exists. Ratcheting scanners hold hardcoded radius and animation values: a committed allowlist of legacy occurrences, new ones fail, stale entries are reported. Pack card operations-ratchet-unfixable-rules covers the allowlist mechanics.

**Apply when:** a diff adds a component file or non-trivial styled element, implements an unresolved design node, or copies a component into another module.

**Boundary notes:** Composing components already imported in the file or module, or changing an existing component's props and styles, needs no lookup. A page-specific component used once needs no row.

**Checks:** a new shared component adds its row in the same change; renames and deletions update the row; generated blocks are never hand-edited; environment values such as API base URLs resolve through one config module with a strict lint ban elsewhere; scanner allowlists never grow to land new code.

**Anti-pattern:** Build a second select or token-row component inside a feature because the shared one lacks a variant.

**Why it fails:** Parallel components drift in spacing, states and accessibility, design fixes land in one copy only, and agents can no longer tell which component is canonical.

**Bad example (illustrative):**

```text
Copy the shared select into a feature folder as MarketSelectV2 and change its padding.
```

**Better example (illustrative):**

```text
Grep the map for the concept, add a size variant to the mapped shared select, and update its row.
```

**Legitimate exceptions:** An early app without a design system can skip the map until duplicate clusters appear.

**Verification scenario:** Add a second row for a mapped concept and assert the check fails naming the row to edit; add a hardcoded radius and assert the scanner fails while allowlisted legacy entries pass.

**Automatable check:** Run the generator in --check mode and each scanner in the lint and CI jobs.

Pack: `web-app` (candidate). Topics: `frontend`, `components`, `review`, `implementation`.

<a id="web-app-e2e-fixture-guards"></a>

## Make browser fixtures fail on hidden faults

The base fixture turns silent faults into failures: it collects hydration-mismatch messages from page and console errors and asserts none at teardown, answers every unmocked API route with a 500 and records it so specs can assert none occurred, and navigates streaming routes with waitUntil commit since their documents stream past DOMContentLoaded. SSR reads bypass browser interception, so they hit a fixture API with hold, release and request-log controls. Socket fixtures derive from the generated channel registry, record unknown channels and malformed frames as violations, and offer per-subscription ack, error or hold.

**Apply when:** adding or changing a browser test for a streaming or live-data route, a mocked endpoint or a channel.

**Boundary notes:** Mocked runs use a production build, one server clock seed shared by build and serve, no observability uploads and dedicated ports. A separate real-API config runs with zero retries and dedicated QA identities.

**Checks:** no spec weakens the hydration or unhandled-route assertions; socket frames mimic production (server-assigned subscription ids, filters not echoed); worker-owned sockets use a real local server plus a connect-URL redirect, since page-level socket mocks cannot see workers; zero-retry lanes keep traces on failure.

**Anti-pattern:** Let unmocked requests reach the network or return an empty 200, and wait for the load event on streaming pages.

**Why it fails:** Tests pass on data the fixture never defined, hydration regressions ship unasserted, and load-based waits flake on long-streaming documents.

**Bad example (illustrative):**

```text
page.route('**/api/**', r => r.fulfill({ status: 200, body: '[]' })) followed by page.goto(url) awaiting load.
```

**Better example (illustrative):**

```text
Unmatched routes answer 500 and are recorded; specs end with expect(unhandledRequests).toEqual([]).
```

**Legitimate exceptions:** Real-API journeys deliberately hit live services; keep them few and identity-isolated.

**Verification scenario:** On a scratch branch add a hydration mismatch and an unmocked endpoint and assert the suite fails on both; hold the SSR primary read and assert the critical subscription was recorded first.

**Automatable check:** Export only the extended test object and lint specs against importing the raw runner.

Pack: `web-app` (candidate). Topics: `frontend`, `testing`, `realtime`, `review`.

<a id="web-app-injected-nondeterminism"></a>

## Inject clock, id and socket factories

Infrastructure classes that own time, identifiers or connections (socket brokers, schedulers, lease managers, retry controllers) take those sources as constructor parameters with production defaults: a socket factory, a now() function and an id generator. Tests pass fakes to drive acknowledgements, timeouts, lease expiry and reconnects deterministically without patching globals. Refines core card tests-risk-observable-behavior.

**Apply when:** a class reads Date.now(), generates random ids or opens sockets internally, and its timing or correlation behavior needs tests.

**Boundary notes:** Components and hooks can use the test runner's fake timers; constructor injection is for long-lived infrastructure with protocol state.

**Checks:** defaults leave production call sites unchanged; every time read goes through the injected clock, with no stray Date.now(); fake sockets expose open, inbound frames, close and sent-frame inspection; deterministic id sequences keep correlation assertions readable; protocol limits (lease, heartbeat, timeouts) are exported constants that tests import rather than copy.

**Anti-pattern:** Monkeypatch the global WebSocket constructor and sleep in real time to test reconnects and timeouts.

**Why it fails:** Tests turn slow and flaky, global patches leak between tests, and lease-expiry and acknowledgement-timeout branches stay effectively untested, so reconnect regressions that strand live prices ship.

**Bad example (illustrative):**

```text
globalThis.WebSocket = FakeSocket; await sleep(10_000); expect(reconnected).toBe(true)
```

**Better example (illustrative):**

```text
new ConnectionBroker(url => fakeSocket(url), () => clock.now, () => nextSequenceId()); advance the fake clock past the lease and assert only that client is released.
```

**Legitimate exceptions:** Do not add seams to code with no time, id or connection behavior worth testing; a default parameter is enough, not a dependency-injection framework.

**Verification scenario:** With a fake socket and clock, send a subscribe, withhold the ack past its timeout and assert the retry or close code; expire one client's lease and assert other clients keep their subscriptions.

Pack: `web-app` (candidate). Topics: `frontend`, `testing`, `realtime`, `implementation`.
