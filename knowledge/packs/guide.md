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
  - [Persist execution state before the effect fires](#execution-durable-receipt-before-effect)
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
- **Perpetual exchange contracts and risk** (`perps`, candidate): Perpetual order intent, market increments, position accounting, risk authority, risk-reducing execution and the trading-interface failure modes around prices, margin, funding, order outcomes and protection orders.
  - [Bind every perpetual order field to confirmed intent](#perps-order-intent-binding)
  - [Quantize price and size from market metadata](#perps-market-quantization)
  - [Make reduce-only incapable of increasing exposure](#perps-reduce-only-never-increases-risk)
  - [Derive order state from versioned partial fills](#perps-partial-fill-order-state)
  - [Name the authority for index and mark prices](#perps-mark-index-oracle-authority)
  - [Calculate margin and liquidation conservatively](#perps-margin-liquidation-rounding)
  - [Accrue and settle funding from one ledger](#perps-funding-accrual-settlement)
  - [Bind position and margin mode to every action](#perps-position-mode-margin-scope)
  - [Treat cancel and replace as consequential mutations](#perps-cancel-replace-unknown-outcome)
  - [Keep risk-reducing actions available under degraded reads](#perps-risk-reducing-actions-availability)
  - [Bind every price to its role: mark, index, last, mid, executable](#perps-price-roles-not-interchangeable)
  - [Never coalesce a missing risk input to zero or a default](#perps-no-zero-fallback-in-risk-math)
  - [Show the venue liquidation price for positions and a labelled estimate before the trade](#perps-liquidation-price-is-an-estimate)
  - [An order acknowledgement is not an outcome: word results from status and fills](#perps-order-ack-is-not-outcome)
  - [Entry and attached protection are separate outcomes unless the venue groups them](#perps-bracket-legs-settle-independently)
  - [Replace position protection by placing first and cancelling second](#perps-protection-replace-place-before-cancel)
  - [Keep protective orders consistent with the position they protect](#perps-tpsl-lifecycle-follows-position)
  - [Derive trigger direction from side and intent, validated against the venue reference](#perps-trigger-direction-and-reference)
  - [Align prices and sizes to the venue step grid, not to a decimal count](#perps-step-grid-not-decimal-count)
  - [Validate, preview and submit the same wire-rounded order](#perps-validate-the-wire-rounded-order)
  - [Read tick, step, limits, fees and margin parameters from venue config](#perps-instrument-config-from-venue)
  - [Close a full position with the venue exact size, never a UI round trip](#perps-full-close-exact-size)
  - [Normalize position size to side plus absolute quantity at the boundary](#perps-signed-size-normalized-at-boundary)
  - [Keep one canonical size unit and convert once, at the order price](#perps-size-unit-one-canonical)
  - [Leverage and margin mode are venue-held settings, not ticket fields](#perps-leverage-and-margin-mode-are-venue-state)
  - [Size margin and Max from the venue worst-case model, never notional over leverage](#perps-margin-preview-worst-case)
  - [Net margin, max size and minimum notional against the exposure an order reduces](#perps-margin-nets-against-reducing-exposure)
  - [Treat equity, order margin and withdrawable collateral as three venue numbers](#perps-three-balances-not-one)
  - [Carry funding with its period, user-side direction and notional basis](#perps-funding-sign-period-and-notional)
  - [Name and source each PnL figure separately](#perps-pnl-components-not-interchangeable)
  - [Build market orders as bounded immediate-or-cancel limits priced once](#perps-market-order-is-a-protected-limit)
  - [After an ambiguous response, resend the exact signed bytes of a balance delta](#perps-retry-signed-delta-exact-bytes)
  - [Encode amounts and timestamps per operation and name the unit in the type](#perps-amount-and-time-units-per-operation)
  - [Classify cancel rejections and send modifies in the venue quantity contract](#perps-cancel-and-modify-outcomes)
  - [Model liquidation, deleveraging and settlement as their own fill kinds](#perps-forced-close-events-are-distinct)
  - [Gate order entry on venue mode flags, not on the underlying market hours](#perps-market-session-gates-from-venue-flags)
  - [Settle close-all per position, reduce-only and with no blind retry](#perps-close-all-per-target-outcomes)
  - [Resolve order variants through an exhaustive typed builder table](#perps-order-variants-exhaustive-builders)
  - [Key markets, positions and orders by a qualified market id](#perps-market-identity-is-venue-qualified)
  - [React to each rate-limit kind differently](#perps-rate-limit-kinds-need-different-reactions)
  - [Treat a delegated trading key as a scoped, expiring credential](#perps-delegated-trading-key-scope-and-expiry)
  - [Show the venue credit state, not the chain receipt, as deposit completion](#perps-deposit-credit-lags-chain-confirmation)
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
- **Trading terminal rendering, charts and order entry** (`terminal`, candidate): Order book state and synchronization, depth math, chart datafeeds and trading lines, staleness, order draft ownership, the submit path and measured performance work for a high-frequency trading interface.
  - [Keep the book outside React and publish at paint cadence](#terminal-book-store-and-paint-cadence)
  - [Sync the book by the channel's declared frame contract](#terminal-book-snapshot-delta-sync)
  - [Group and accumulate book levels with side-aware math](#terminal-book-grouping-and-depth-math)
  - [Place book rows by slot so level churn shifts no layout](#terminal-book-rows-stable-layout)
  - [Keep actionable live rows stable under the pointer](#terminal-live-rows-stable-under-pointer)
  - [Bridge chart history to live bars without rewinding the tip](#terminal-chart-history-live-bridge)
  - [Honor the chart datafeed's history, symbol and failure contract](#terminal-chart-datafeed-request-contract)
  - [Create the chart widget once and drive it through its API](#terminal-chart-widget-lifecycle)
  - [Treat chart order and position lines as a projection](#terminal-chart-trading-lines-are-projection)
  - [Return from a hidden tab with a snapshot, not a replay](#terminal-hidden-tab-resnapshot-not-replay)
  - [Make a frozen stream look stale](#terminal-frozen-stream-must-look-stale)
  - [Never queue risk and control events behind batching](#terminal-critical-events-bypass-batching)
  - [Fire fill and trigger notifications from events, once](#terminal-notifications-from-events-once)
  - [Live data revalidates the order draft, never rewrites it](#terminal-order-draft-ownership)
  - [A confirm step freezes intent and keeps risk figures live](#terminal-confirm-freezes-intent-live-risk)
  - [Keep the submit hot path short and its triggers exact](#terminal-submit-hot-path-and-hotkeys)
  - [Keep the trades tape bounded, ordered and deduplicated](#terminal-trades-tape-bounded-ordered)
  - [Measure before adding virtualization, workers or chunking](#terminal-measure-before-virtualize-or-workers)
  - [Never auto-prefetch a persistent link that redirects](#terminal-link-prefetch-storm-on-redirect)
  - [Bucket rolling time windows in query keys](#terminal-rolling-window-query-keys)
- **Web trading app architecture (React / Next.js App Router)** (`web-app`, candidate): Framework-specific frontend architecture for data-heavy trading UIs: data region anatomy, route-based request priority, server hints, hydration-stable clocks, browser-only vendor reads, route identity, global read models, enforced module and design-system boundaries, and deterministic browser fixtures; load it when planning, implementing or reviewing loading, streaming, hydration, routing or test-fixture work. These cards apply to React 19 + Next.js App Router with React Query; adapt them for other stacks.
  - [Build each data region from four roles](#web-app-data-region-anatomy)
  - [Admit reads through route-specific priority buckets](#web-app-request-priority-buckets)
  - [Pass browser-owned scope to SSR as hints](#web-app-server-hint-cookies)
  - [Keep the server time reference through hydration](#web-app-hydration-stable-clock)
  - [Place third-party reads by trust and delivery contract](#web-app-third-party-reads-browser-only)
  - [Derive route identity from the page params prop](#web-app-route-identity-from-params)
  - [Keep server pages until route needs prove otherwise](#web-app-client-pages-server-layouts)
  - [Render merged regions from the first ready source](#web-app-progressive-merged-readiness)
  - [Unmount hidden panels and return from cache](#web-app-render-only-visible)
  - [Promote data to global only with one owner](#web-app-global-read-models)
  - [Enforce module ownership with import-graph rules](#web-app-enforced-module-boundaries)
  - [Resolve UI concepts in a generated component map](#web-app-component-map-and-scanners)
  - [Make browser fixtures fail on hidden faults](#web-app-e2e-fixture-guards)
  - [Inject clock, id and socket factories](#web-app-injected-nondeterminism)
- **Browser and supply-chain security for trading frontends** (`websec`, candidate): Signed payload integrity, dependency and third-party script risk, strict content security policy and Trusted Types on pages that sign or move value.
  - [Confirm from the bytes being signed, and assume your own served script can lie](#websec-signed-payload-must-match-what-user-saw)
  - [Every bundled dependency runs with your origin's full authority](#websec-dependency-runs-as-your-origin)
  - [Do not let third-party code resolve its version at page load](#websec-no-runtime-resolved-third-party-code)
  - [Ship a nonce-based strict CSP with narrow connect-src and frame-ancestors](#websec-strict-csp-for-trading-pages)
  - [Treat external display strings as hostile and enforce Trusted Types on DOM sinks](#websec-trusted-types-for-untrusted-strings)
  - [Keep third-party scripts out of the main frame on routes that sign](#websec-third-party-script-isolation-on-trade-routes)

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

When a service requests signatures without prompting the user, the wallet signs a capability token whose normalized policy bytes or policy hash, audience, account, chain, version and expiry are bound into the signature. The signer parses and resolves every request and checks that policy itself. Policies are versioned and allow-only: a complete rule must match, omission forbids, an empty or constraint-free rule is rejected, and unknown fields fail at mint. A mutable preset may narrow existing authority, but any widening requires a newly consented token. Withdrawals are separate: a short-lived challenge minted only after MFA and claimed atomically once by the business operation. Refines core card authorization-single-use-intents.

**Apply when:** Adding a signing route, token or session-key policy, transaction kind, or any flow signing without a user prompt.

**Boundary notes:** Preset references bind a versioned content hash, not only a mutable name. A release may revoke or narrow a preset, but widening authority requires user consent and a new token. Inline policies sign their normalized bytes.

**Checks:** Empty policies and rules with no effective constraint are rejected; preset content hash and version are verified on every use; widening invalidates the old token; a raw message that decodes as a transaction is judged as one. Uninspectable content (raw digests, unresolved lookup-table programs) needs explicit opt-in. Regexes are anchored and size- and memory-capped. The token's signing family comes from its signature, not a declared field. Missing MFA declines. Retiring allow-all legacy tokens backfills before the switch flips.

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

**Verification scenario:** Mint with an unknown field or empty rule (rejected), widen a referenced preset without a new consent (old token rejected), narrow or revoke it (old authority cannot exceed the new scope), disguise a transaction as a raw message (denied), and replay one MFA withdrawal challenge (refused).

Pack: `chain` (candidate). Topics: `signing`, `authorization`, `security`, `backend`, `review`.

<a id="chain-reorg-pure-decisions-explicit-forfeit"></a>

## Revert only proven-orphaned blocks and forfeit gaps explicitly

Keep reorg handling a pure state machine over a bounded, parent-linked window of emitted blocks: each head yields one step (commit, ignore, fetch ancestor by hash, fetch canonical by number, apply a plan) and an I/O shell fetches and emits. Revert only blocks the node proves non-canonical; a head it cannot verify, from a lagging or rewound backend, is ignored, never turned into a speculative revert. Plans emit revert, then fill, then commit. A gap wider than the window may be forfeited only for an explicitly lossy non-authoritative feed with a separate verified backfill. Balances, collateral, settlement, accounting and other money authorities halt and backfill from a verified canonical checkpoint instead of skipping.

**Apply when:** Building or changing a block follower, indexer or consumer turning heads into events, prices or balances, after classifying whether its outputs are lossy display data or money authority.

**Boundary notes:** Verify a head below the window by number, never by walking parents, which would fabricate a full-window revert. Forfeit trades completeness for liveness; it suits a real-time feed with a separate backfill.

**Checks:** Checkpoints include chain or genesis identity, block number and hash, output sequence, finality tier and schema generation. The core does no I/O and is unit-tested on synthetic chains. Duplicate heads and heads linking to the tip at the wrong height are ignored and logged. Deep reorgs are flagged and metered. Forfeited heights are counted per chain and cause, and alerted on. Consumers apply reverted spans idempotently. Window capacity exceeds the chain's expected reorg depth.

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

On restart, consider independent lower bounds only after proving they belong to the expected chain or genesis, canonical block lineage, finality tier, output sequence and schema generation. Choose the highest compatible point already acknowledged by publication. A lossy display feed may go live at the head only under its documented backfill contract. Balances, collateral, settlement and accounting fail closed when no verified checkpoint answers and require operator recovery or backfill. Refines core card stream-checkpoints-and-effects.

**Apply when:** A block follower, indexer or replayer restarts, is redeployed, or gains or changes a checkpoint store.

**Boundary notes:** Every candidate must be a true lower bound, written after publication was acknowledged, never an intent to publish. Going live at the head skips history, which suits a feed with a separate backfill.

**Checks:** Checkpoint writes follow publish acknowledgement; every candidate carries block hash and chain identity and is checked against canonical lineage before height comparison. Stream retention outlasts a deploy cycle. The chosen source and height are logged and exported. The plan states whether consumers tolerate a replay, a boundary block normally or a whole span when a higher source is unreadable; if not, the resume point must be exact. Tests cover stream only, checkpoint only, each one higher, and both reads failing.

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

**Verification scenario:** Seed compatible checkpoint 40 with stream 70 (resume 70), checkpoint 90 with stream 70 (resume 90), then give the higher source an orphaned hash (reject it). Make both reads fail: a lossy feed starts at head with a gap record, while a money authority stays unready and requests backfill.

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

Every chain read distinguishes a successful value, adapter-proved capability absence, typed call rejection, and transient or unknown infrastructure failure. A generic revert or undecodable return proves only that this invocation failed; it does not prove the function or capability is absent. Definitive absence needs adapter-specific positive evidence such as no code at the pinned block or a trusted interface query returning false. Transient failures are those where no authoritative answer arrived (transport error, timeout, throttle, node behind the pinned block, pruned state). Detect reverts by error code or revert envelope first and never infer a node condition from revert text, because a contract chooses its own revert string. Cache probe results as Value, Absent or Unknown. Negative-cache only adapter-proved absence; keep arbitrary reverts, undecodable output and transient failures Unknown or as typed errors, keyed to the pinned block or code version where relevant. Pack card chain-breakers-only-for-interchangeable-providers decides when a failure moves traffic.

**Apply when:** Adding a contract read or account query, a capability probe (does this contract expose X), a retry wrapper, an RPC fallback chain, or a cache of contract metadata.

**Boundary notes:** Retry block-not-reached on the same or another node; send state-unavailable to an archive-capable route. Pin reads to a block number when results must replay deterministically.

**Checks:** A revert whose text mimics a node error still classifies as a call rejection, not Absent. Throttle, 5xx and transport errors are transient. Probe fields added later default to Unknown on old cache entries. Absent is written only on definitive evidence. Each fallback step has its own timeout. Error text is sanitized before logging, since RPC URLs often embed API keys.

**Anti-pattern:** Treat any call error as 'not supported' and cache it, or retry every error including reverts.

**Why it fails:** One rate-limit blip permanently bars a live token or pool, so users see missing balances and refused trades; retrying reverts burns the RPC budget; hostile revert text can steer a client into endless retries.

**Bad example (illustrative):**

```text
try { v = await call(addr) } catch { cache.set(addr, ABSENT) }
```

**Better example (illustrative):**

```text
catch (e) { if (adapterProvesAbsent(e, block)) cache.set(key, Absent); else return UnknownOrTypedError(e) }
```

**Legitimate exceptions:** Reads that are never cached or acted on can skip the tri-state. When the SDK already distinguishes these classes, use its classification instead of re-deriving it.

**Verification scenario:** Probe through a throttle, lagging replica, pruned-state error, arbitrary revert, undecodable return, no-code address and trusted interface false; only the last two capability proofs become Absent, while infrastructure failures retry or reroute and call failures remain Unknown or typed errors.

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

**Checks:** The diff walks only reachable operations, channels and envelopes; operation or required-field removal is always classified as breaking; retirement requires an explicit supported-client floor, usage evidence, migration and end-of-life policy, and coordinated release approval; a renamed input keeps accepting the old name as a deprecated alias; consumer validators are really strict.

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

**Legitimate exceptions:** A lockstep change where every consumer ships in the same deploy can acknowledge the break deliberately. A deprecated operation may be removed only through an approved version retirement contract; deprecation alone never makes deletion compatible.

**Verification scenario:** Run the checker on fixtures that add an output enum value, add a strict-object property, drop a deprecated operation and add an optional request field: the first three fail, and only the optional request field passes.

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

List endpoints use keyset pagination with an opaque cursor carrying an immutable sort tuple plus a unique tie-breaker. If the visible sort field can change or inserts can move ahead of the cursor, bind a snapshot revision or high-water mark and direction into the cursor. When a cursor encodes anything the response hides (another user's id, a signature, an internal offset), seal it with authenticated encryption under a per-deployment key and bind it to a fingerprint of the request scope (caller, filters, sort). The maximum page size is declared in the schema and equals the server clamp, so generated clients know the bound.

**Apply when:** Adding or changing a paginated list, an infinite-scroll consumer, or a cursor that encodes identifiers.

**Boundary notes:** A plain encoded cursor is fine when it holds only values the response already shows; sealing adds a key and a rotation story.

**Checks:** A malformed, tampered or scope-mismatched cursor returns a distinct invalid-cursor error telling the client to restart from the first page, never a silent restart; ordering is immutable for the pagination window or bound to a snapshot revision; tie-breakers make the order total; rotating the key intentionally retires outstanding cursors; public stand-in ids are keyed hashes, not plain digests an attacker can enumerate; the client resets its pages once on that error instead of looping.

**Anti-pattern:** Decode a bad cursor as no cursor and serve page one, or accept a cursor after the user changed filters.

**Why it fails:** Infinite scroll silently duplicates or loops rows, and a forged or replayed cursor can read past the caller's scope or reveal identifiers the response hides.

**Bad example (illustrative):**

```text
cursor = base64(JSON({ userId, offset })); a decode failure falls back to offset 0
```

**Better example (illustrative):**

```text
cursor = seal({ snapshot, immutableSort, id, direction, scope }); open or scope failure returns invalid-cursor and the client restarts once.
```

**Legitimate exceptions:** Small bounded lists can return everything with no cursor. Offset paging is acceptable for upstreams that only page by offset, behind the same strict decode.

**Verification scenario:** Tamper one byte, change a filter, insert ahead of the cursor, mutate a visible sort field and rotate the key; snapshot-bound pages have no duplicate or omitted rows, while invalid scope or key returns invalid-cursor and restarts once.

**Automatable check:** A contract test that every list endpoint's limit parameter declares a maximum equal to the server clamp.

Pack: `contracts` (candidate). Topics: `contracts`, `query`, `security`, `backend`, `implementation`.

<a id="contracts-dual-name-rename-window"></a>

## Rename fields through a dual-name window

When any consumer silently drops unknown fields, a rename is a sequence: consumer and projection accept both names with explicit presence metadata, the producer writes both, old data is backfilled, a soak proves nothing reads the old name, then the old name is removed. The window lets the producer roll forward or back at any moment with no gap. Apply schema steps dependency-first (storage, then intake, then projection) and reverse them for rollback.

**Apply when:** Renaming a field on a stream, a persisted record, a materialized projection or a response read by lenient consumers.

**Boundary notes:** For strict generated consumers a rename is an explicit breaking change instead; prefer add-new, deprecate-old.

**Checks:** The consumer side is live before the producer emits the new name; optional or has-bit wire types preserve absent, null and legitimate zero separately; the projection writes both target fields; precedence uses source version and explicit presence, and conflicting both-present values fail or alert; the soak is evidence-based; no single migration collapses all steps.

**Anti-pattern:** Assume full-state snapshots are re-emitted, so a skew window will self-heal.

**Why it fails:** Messages carrying the new name hit a consumer that ignores it, or deserialization erases absence into a default zero that cannot be distinguished from a legitimate value and supersedes the last good row. Only re-emitted keys heal; dormant keys and per-interval facts stay wrong indefinitely, and the lost values never got past the wire.

**Bad example (illustrative):**

```text
One migration renames the column while the producer deploy goes out independently.
```

**Better example (illustrative):**

```text
Step 1 accept explicit old/new presence and write both; step 2 dual-write producer; step 3 backfill and soak; step 4 retire the old field under the version policy.
```

**Legitimate exceptions:** A lockstep deploy with no queued or stored old-format data can rename directly. If history cannot be backfilled, document which periods keep only the old name.

**Verification scenario:** Run absent, null, legitimate zero, both-present-equal, both-present-conflicting, old-then-new, new-then-old and rollback fixtures; verify deterministic precedence, conflict reporting and no fabricated zero.

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

After a request is sent, a success response that fails contract validation is an unknown outcome: the order may exist, so the user is told to check orders before trying again, never that it failed. A multi-target submission normalizes to one discriminated outcome per requested target: submitted or confirmed, definitely rejected, proved not-started, or unknown with its original operation and reconciliation handle. Retryability applies only to definitely rejected or proved not-started targets under the contract; unknown is never offered a fresh-key retry. Refines core card mutations-confirmed-reconciliation.

**Apply when:** a mapper parses a create-order, transfer or batch response, or UI renders outcomes of a fan-out.

**Checks:** outcome count equals requested targets; each target appears exactly once; submitted outcomes carry a unique id; rejected outcomes carry a stable code and sourced retry policy; not-started includes dispatch proof; unknown carries the stable operation id and lookup path; group id is required exactly for fan-out; any schema violation makes affected targets unknown; fresh action is offered only for proved not-started or definite rejection.

**Anti-pattern:** Coerce a malformed body into success or failure, collapse a mixed result into one notification, or default missing per-target fields.

**Why it fails:** A partly executed batch reported as failed invites resubmitting legs that already filled; reported as success, it hides failed legs the user still has to act on.

**Bad example (illustrative):**

```text
if (!res.orderId) throw new Error('Order failed')
```

**Better example (illustrative):**

```text
type TargetOutcome = Submitted | Rejected | NotStarted | Unknown; type Result = { groupId: string; outcomes: NonEmpty<TargetOutcome> }
```

**Legitimate exceptions:** A single-target endpoint with a strict generated schema needs only that validation. Unknown-outcome and partial-success copy is a product decision and must be sourced.

**Verification scenario:** Feed missing target, duplicate id, committed-response-lost, definite rejection and internal-deadline remainder; verify affected unknown keeps its original id, rejection follows sourced policy, not-started alone can use a fresh approved action, and no submitted or unknown target is resent.

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

After a 401, refresh credentials and retry only idempotent reads. A mutation keeps its original 401 and remains unresolved unless the service contract proves authentication rejects before every possible effect. Refreshing credentials never authorizes a new operation identity. Reconcile the original operation first, or deliberately replay the same stable key only under an authoritative idempotency contract. Before a mutation, refresh proactively when the session is likely expired, then re-check the account guard. REST, socket, timers and visibility checks share one refresh owner and one in-flight promise; because single-use refresh tokens can rotate even when the refresh response is lost, a failed refresh is never replayed and the session is re-read instead.

**Apply when:** a diff touches an HTTP interceptor or mutator, the refresh coordinator, socket authentication or session timers.

**Checks:** retry-after-refresh is gated on the GET method, not endpoint lists; auth endpoints are never retried; proactive refresh runs inside the not-dispatched region; cross-tab refresh is coordinated; a failed refresh is resolved by session re-read; logout suppresses refresh; a mutation 401 never creates a new key or new attempt until its original outcome is authoritatively rejected or reconciled.

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

**Verification scenario:** Expire the access token and return a pre-effect 401 and an ambiguous post-dispatch 401: exactly one POST in each case, the proved rejection may be retried deliberately, and the ambiguous operation stays unresolved with no fresh key. Race two tabs through a refresh: one rotation wins and the other re-reads the session and stays signed in.

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

Scope the key by user and endpoint, hash a canonical serialization of the parsed payload, and create one durable operation record before the handler can publish an effect. The record moves through claimed, dispatched or unknown, and terminal states. It never becomes runnable solely because a TTL elapsed. The downstream effect accepts the same stable operation identity and deduplicates it, or the effect and operation state share one atomic commit boundary. A losing claimant gets the durable result, 409 for different intent or an unresolved claim, and 503 when the authority cannot answer. Refines core card end-to-end-idempotency-and-integrity. Pack card execution-read-backend-idempotency-contract-first is the client-side reading of this contract.

**Apply when:** a backend handler for orders, transfers or other consequential writes accepts an idempotency key, or a middleware is chosen to provide one.

**Boundary notes:** The payload hash binds the client key to its first payload; it is never the dedupe key, so identical genuine orders with different keys both execute. Require the key where a retry could repeat a fan-out.

**Checks:** the operation record survives process and request deadlines; same key plus changed intent conflicts; concurrent first attempts have one winner; a crash before dispatch resumes the claimed operation; a crash after dispatch leaves it unknown until authoritative reconciliation; no error or expiry releases a possibly dispatched operation for fresh execution; replay returns the durable status and body verbatim; retention outlives the provider reconciliation and client replay horizon.

**Anti-pattern:** Check-then-set in two calls, let an unresolved claim expire back to runnable, run when the authority is unreachable, or accept a key not bound to its intent.

**Why it fails:** Two concurrent retries both pass the check and both trade; failing open executes duplicates exactly during an outage; an unbound key replays an old response for a new order and silently drops it.

**Bad example (illustrative):**

```text
if (!(await store.get(k))) { await store.set(k, 'pending'); await run() }
```

**Better example (illustrative):**

```text
op = await claimOnce(scope, key, intentHash); if (!op.won) return replayConflictOrPending(op); await dispatchWithStableId(op.id)
```

**Legitimate exceptions:** Naturally idempotent writes need no claim store; retention windows are an operational decision to record.

**Verification scenario:** Send two same-key requests concurrently, crash before dispatch, crash after provider acceptance but before result persistence, replay after every configured TTL and change the body; verify one provider effect, safe resume before dispatch, unknown plus reconciliation after dispatch, durable replay and changed-intent conflict.

Pack: `execution` (candidate). Topics: `backend`, `distributed`, `mutations`, `execution`, `implementation`.

<a id="execution-no-whole-request-error-after-effect"></a>

## Never fail the whole request after a side effect

Once any target may have published an effect, persist and return one outcome per requested target: not-started with proof, submitted or confirmed, definitely rejected, or unknown. The batch response itself is durable and replayable, so replaying its key never re-runs a target. A fresh-key follow-up is allowed only for a target proved not dispatched and under an approved retry policy. Unknown targets keep their original operation identity and reconcile authoritatively. Long fan-outs stop starting work at an internal deadline and mark the remainder not-started, not generically failed.

**Apply when:** a handler fans out across wallets, positions, chains or legs, or performs more than one side effect under one idempotency claim.

**Checks:** no error return or early exit after first publish; the response has exactly one typed outcome per target; unknown is distinct from rejected and not-started; only proved not-started work may receive a fresh operation under approved policy; unknown retains its identity and reconciliation handle; replay returns the identical batch response; internal deadline leaves untouched targets explicitly not-started.

**Anti-pattern:** Return 500 when the third of five legs fails after two have executed.

**Why it fails:** The error releases the idempotency claim, so a same-key retry re-executes the two legs that already traded, and the user sees a failure for trades that happened.

**Bad example (illustrative):**

```text
for (const leg of legs) await execute(leg) // throws on leg 3, request errors, key released
```

**Better example (illustrative):**

```text
outcomes[target] = await executeOrClassify(target, stableId); persistBatch(outcomes); return { status: 202, outcomes }
```

**Legitimate exceptions:** A single-effect endpoint may return an error when its one effect definitely did not happen. Validation failures before any effect error normally.

**Verification scenario:** Lose one committed response, definitely reject another and cross the internal deadline before two targets start; verify submitted or unknown, rejected and not-started remain distinct, batch replay sends nothing, and only the proved not-started target can begin under a fresh approved operation.

Pack: `execution` (candidate). Topics: `backend`, `contracts`, `errors`, `execution`, `implementation`.

<a id="execution-outcome-unknown-timeout-ladder"></a>

## Make outcome-unknown a terminal state with a timeout ladder

When an executor hands work to a downstream engine and the reply can be lost, outcome-unknown is a durable unresolved state reached through a ladder of timeouts. A clock proves only that the reply window ended. It never proves that the effect failed and never authorizes a refund, reservation release, replacement order or other compensation. Resolution requires an authoritative status lookup, a provider idempotency result, chain-specific impossibility proof, or explicit human adjudication.

**Apply when:** an order, execution or transfer waits on an asynchronous reply from a chain engine, solver or venue, or a periodic sweep resolves stuck records.

**Boundary notes:** If the reply lives only in process memory, a restart loses it and the sweep is the only safety net. What happens to a reservation (budget, balance hold) after an unknown outcome is a money-policy decision to record.

**Checks:** ceilings derive from documented engine bounds; the sweep discovers orphaned unresolved work after restart but performs only authoritative reconciliation; user copy says the outcome is unknown and blocks a fresh attempt until policy permits it; unknown is never relabeled failed, retried or compensated from elapsed time alone; late success and late rejection each have idempotent settlement.

**Anti-pattern:** Treat a reply ceiling or reconciliation deadline as proof of failure and compensate while the original can still settle.

**Why it fails:** A live swap is written off and reported failed, inviting a second trade; when the edge timeout and the sweep both compensate one execution, a reservation is released twice or a refund is issued for a trade that landed.

**Bad example (illustrative):**

```text
const replyTimeout = 30_000; const sweepWindow = 20_000 // the sweep wins the race
```

**Better example (illustrative):**

```text
after replyCeiling: markUnknown(op); sweep: lookupAuthoritative(op) ?? keepUnknown(op)
```

**Legitimate exceptions:** A synchronous call whose response is the outcome needs only its request timeout and unknown-outcome handling. A path with an authoritative status lookup may resolve by lookup instead of a write-off.

**Verification scenario:** Delay acceptance past the reply ceiling, restart the executor and later deliver success, rejection and no authoritative answer; verify no compensation from time alone, one settlement for each proved outcome and a durable unknown record plus escalation for the unresolved case.

Pack: `execution` (candidate). Topics: `backend`, `distributed`, `operations`, `execution`, `planning`.

<a id="execution-durable-receipt-before-effect"></a>

## Persist execution state before the effect fires

Give each execution a durable row keyed by a deterministic trigger key, unique per order, before the effect can go on the wire. The row distinguishes claimed, dispatched, unknown and terminal states. A conflict means another attempt owns or completed the trigger, not that the effect necessarily fired. The owner resumes a claimed-but-unsent row and reconciles a dispatched or unknown row. Use a transactional outbox or the same stable downstream idempotency identity so a crash on either side of dispatch cannot lose or duplicate the effect. Refines core card stream-checkpoints-and-effects.

**Apply when:** a trigger, schedule, limit or standing order executes trades on redeliverable events or across restarts.

**Boundary notes:** An in-memory already-fired set is a cache in front of the receipt, never the authority: a miss costs a conflict round trip, never a double buy. A budget read followed by a claim is safe unlocked only with a single sequential claimant; parallel claimants need a lock or a database-side guard.

**Checks:** stage order (abortable checks, claim, durable dispatch intent, send, authoritative outcome) is documented; a claimed row can resume sending under the same downstream identity; a dispatched row never sends again without authoritative proof that the provider rejected it before effect; every row ends terminal or remains explicitly unknown with an operator path; in-flight and unknown rows count toward spend.

**Anti-pattern:** Send before durable state exists, or treat a claim row as proof that sending already occurred.

**Why it fails:** A crash between send and record re-fires and trades twice; a crash between claim and send leaves a row that a conflict-only resume mistakes for an already-fired effect, so a protective order never executes.

**Bad example (illustrative):**

```text
await sendSwap(req); await db.insert(execution) // a crash in between re-fires
```

**Better example (illustrative):**

```text
op = await claimTrigger(orderId, triggerKey); if (op.claimed) await dispatchWithStableId(op.id); else await resumeOrReconcile(op)
```

**Legitimate exceptions:** One-shot submissions need no separate receipt only when the authoritative idempotency operation and downstream effect share the required crash-safe contract. Notifications that tolerate duplicates can skip it.

**Verification scenario:** Redeliver one trigger twice concurrently, crash after claim before send and crash after provider acceptance before acknowledgement; verify one stable provider identity, safe resume of the unsent claim and reconciliation without a second effect.

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

A send that returns OK is not settlement, and an accepted transaction that one RPC cannot see remains unknown. Confirm inclusion from a successful receipt, then wait for the chain-specific safe or finalized policy before an irreversible downstream leg or durable user credit. Bind the receipt to its canonical block hash and reconcile reorgs. Measure credited amount from expected-contract logs by netting recipient inflows and outflows, verify resulting state, and size downstream work from the finalized measured amount rather than a quote.

**Apply when:** a step advances a workflow, credits a user or sizes the next leg after a transaction or bridge fill.

**Checks:** the baseline and transaction hash are persisted before confirmation; a reverted receipt fails the step; inclusion and finality are distinct statuses; canonical block hash and chain-specific confirmation tier are stored; reorged inclusion returns to unresolved and repairs projections; credited amount ignores other emitters and is re-derived on resume; a net credit of zero or less fails; approvals are verified from resulting state; an RPC nonce or missing local mempool entry never proves rejection.

**Anti-pattern:** Mark a step done when the RPC accepts the transaction or a provider reports a fill.

**Why it fails:** An accepted send may never be mined, a receipt can be reorganized out before finality, a mined no-op changes nothing, and a fee-on-transfer token credits less than quoted; advancing moves money downstream on funds that are absent or not yet canonical.

**Bad example (illustrative):**

```text
await rpc.send(tx); step.done = true; next.amountIn = quote.amountOut
```

**Better example (illustrative):**

```text
const r = await waitFinalizedReceipt(hash, policy); requireCanonicalSuccess(r); const got = netCredit(r, token, recipient); next.amountIn = requirePositive(got)
```

**Legitimate exceptions:** A third-party status may signal progress or completion where no chain-observable credit exists, but amounts used downstream still come from chain reads. Reporting-only deltas may be approximate if documented.

**Verification scenario:** Simulate accepted-but-unseen, included-then-reorged, reverted, zero-credit and finalized-success transactions: only finalized canonical success advances, and replay re-derives the same credited amount.

Pack: `execution` (candidate). Topics: `backend`, `chain`, `money`, `execution`, `review`.

<a id="execution-nonce-allocation-and-dead-verdict"></a>

## Allocate nonces atomically and require two reads for death

Senders sharing a wallet keep per-wallet nonce state (next plus a sorted free list) updated by compare-and-set, reuse released nonces lowest first because a gap stalls every later transaction, and reseed from the chain's pending count when the state is absent. A stale read never lowers the next nonce: use the larger of the chain read and the last proven landing. Declare a broadcast displaced only after authoritative evidence shows a different transaction consumed the nonce in a canonical block that reached the chain-specific safe or finalized policy, while the original hash has no canonical receipt. Two separated reads help detect lag but are never finality proof. Refines core card transactions-lost-updates-and-cas.

**Apply when:** several replicas or routes sign from one wallet, or a resume must decide whether a journaled transaction was displaced.

**Boundary notes:** Classify each send rejection by what it proves, and verify exact error strings for your node and client: too low means consumed, so resync forward without freeing; already known or underpriced means occupied, so discard the new send without freeing the nonce and keep waiting for the original's receipt, never marking it failed; a rejection proving the transaction never entered frees the nonce. A single writer can serialize build, send and confirm under one lock instead.

**Checks:** no client library caches a nonce advanced by a fill whose send never happened; account nonce consumption is bound to canonical block hash and finality tier; known competing hashes are tracked; the verdict survives a reorg test; the original receipt is re-polled after finality; RPC behind a load balancer is assumed to lag.

**Anti-pattern:** Read the nonce once, increment locally per send, and treat one no-receipt, nonce-passed read as proof the transaction was dropped.

**Why it fails:** Two replicas sign one nonce and a trade is lost, or a freed but occupied nonce displaces a pending transfer; a lagging replica misreads a landed transaction as dropped and the resubmission spends the funds twice.

**Bad example (illustrative):**

```text
if (!(await receipt(h)) && (await minedCount(addr)) > n) resubmit()
```

**Better example (illustrative):**

```text
proof = await finalizedNonceConsumer(address, nonce); proof.otherHash && !canonicalReceipt(original) ? markDisplaced(proof) : keepUnknown()
```

**Legitimate exceptions:** User-signed wallet transactions use the wallet's own nonce management; blockhash-expiry chains use expiry instead.

**Verification scenario:** Run two allocators with no duplicate nonces; serve lagging reads and a pre-finality competing transaction that is later reorganized out: no displaced verdict. Finalize a competing hash at the nonce: one displaced verdict bound to its canonical block.

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

An amount or price field owns a raw string, not a number: it preserves partial input ("0.", "1.0", "-"), normalizes the Unicode minus sign, and parses without floating point. Validation then applies both asset precision and the market contract: tick size, lot step, minimum size, minimum notional and price bands. Any quantization direction is explicit, and the exact normalized value shown for confirmation is the value submitted. Which separators are accepted is a locale and product decision to source; ambiguous input, such as a comma followed by exactly three digits, is rejected with a reason rather than guessed. Formatted, grouped or compacted (10K) text is display output and never re-enters a payload. A Max button writes the exact balance string floored to input precision, never a formatted label.

**Apply when:** building or editing an amount, price or size input, a Max or percentage button, or the code that turns form state into a mutation payload.

**Boundary notes:** non-money numeric settings, such as an integer leverage step or a count, can use a numeric input.

**Checks:** the field stores the typed string; partial states keep caret and value; fraction digits respect asset precision; market metadata supplies tick, lot, minimum size, minimum notional and price bands; invalid increments are rejected or quantized in a named direction before confirmation; the confirmed normalized value equals the payload; Max subtracts source-side fees with saturating math and floors; empty and invalid states block with a reason; compact notation is disabled.

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

**Verification scenario:** Type partial values, Unicode minus and excess digits; paste an ambiguous separator; enter prices between ticks, sizes between lot steps, below-minimum size and below-minimum notional; verify explicit rejection or sourced quantization, confirmation equal to payload, and Max never above balance.

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

A quote is usable only for the exact route and input amount it priced, and only before it expires; model it as a status union (disabled, fetching, valid, invalid, failed, superseded) resolved at render and again at submit. An expired or amount-mismatched quote is superseded and refetches, and one whose economic fields fail validation is invalid. Transport errors, 5xx, 408 and 429 stay fetching and retry the read. A definite 4xx refusal is failed by stable error code; display its server message only when the error envelope marks `sanitized` exactly true, otherwise use approved fallback copy. Refines core card queries-explicit-async-states.

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

**Verification scenario:** Change amount, expire a quote, return zero output, 503, sanitized 422 and unsanitized 422; verify superseded with refetch, invalid, fetching with retry, curated message only for sanitized refusal, fallback for unsanitized refusal, and submit blocked outside valid.

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

Aggregator calldata is untrusted until one admission function, the only path to an executable plan, accepts it after fixed-order checks where the first failure wins. It bounds blast radius (what is called and approved, how much native value moves, how far the provider's numbers may go), not price; a ceiling against an in-house quote catches unit bugs. The guard decodes the supported calldata shape and proves the chain-specific target, input asset, exact input amount, output asset, recipient, minimum output and deadline all equal or safely enforce the user-confirmed intent. If any intent field cannot be decoded and enforced before signing, the plan is non-executable and stays in shadow or in-house. Provider metadata alone never proves what its calldata executes. Refines core card types-boundary-validation.

**Apply when:** integrating an aggregator or solver that returns calldata, a spender or a min-out, or adding a provider or chain.

**Boundary notes:** calldata your own router builds needs input validation, not this guard. Run new providers in shadow (priced, metered, never executed) until refusals read zero.

**Checks:** in order: supported selector and calldata decoder; decoded chain target matches the intent registry; input asset and exact amount match; output asset matches; recipient equals the intended account; deadline has not changed or expired; decoded minimum output meets the confirmed floor; slippage at most 10,000 bps; target allowlisted; no spender for native-in, a vouched one for token-in; any extra call a zero-value approve of a route token to an accepted spender; native value exactly the swap's native spend (zero for token-in); chain echo matches; output decimals known; output non-zero; floor not above quote; no overflow; echoed floor at least quote less requested slippage. Refusals feed an alerting must-be-zero counter.

**Anti-pattern:** Execute the best-quoting provider's calldata, trusting its own spender, value and min-out fields.

**Why it fails:** A buggy or compromised provider can name any spender, attach native value or quote in the wrong units so an absurd quote wins; one unchecked field drains an allowance or sells at any price.

**Bad example (illustrative):**

```text
if (ext.quotedOut > own.quotedOut) send({ to: ext.to, data: ext.data, value: ext.value })
```

**Better example (illustrative):**

```text
decoded = decodeSupportedCall(ext.data); requireExactIntent(decoded, intent, chainRegistry); plan = guard.check(decoded, ext, allowlist); preflight(plan)
```

**Legitimate exceptions:** An unpinnable router that redeploys, an upgradeable-proxy allowlist or unlimited approvals each need an explicit owner decision.

**Verification scenario:** Feed unsupported selector, undecodable field, wrong chain target, input asset or amount, output asset, recipient, deadline or floor, plus mismatched provider metadata, spender and value; verify every plan is refused before signing.

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

An alert rule ships with a human runbook link, stable slug, severity and alert-level automation posture: safe (the registered bounded remediation may run automatically), unsafe (diagnosis may run but mitigation needs explicit incident authority) or none (detection and escalation only). Anything missing from the registry defaults to unsafe. Each runbook step separately declares read-only, explicit-authority or human-only execution; alert posture never widens step authority. Routing is a tree where only production plus critical reaches the pager, so an alert missing its environment label can never page; lint required labels so that failure is not silent.

**Apply when:** Adding or changing an alert, wiring automated diagnosis or remediation, or adding a telemetry dimension.

**Boundary notes:** Start new alerts as unsafe and promote to safe only after watching real firings.

**Checks:** Each rule has summary, description, runbook link, slug and default posture; the runbook gives every step an execution authority and covers likely causes, diagnosis, remediation, post-mitigation verification and escalation; the pager path requires the production label and critical severity; alert dimensions are fixed low-cardinality enums with no account ids, addresses, amounts or free-form error text; silences carry owner, reason, scope, expiry and a change reference and restore automatically; every rule names an owner and an escalation path.

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

A scheduled checker first names whether a field has one canonical authority or only peer sources. A finalized canonical chain or authoritative venue mismatch fails directly under its documented finality and definition rules. Where no unique authority exists, compare two or more genuinely independent peers and fail only when they agree against you. Self-consistency recomputations such as candles re-aggregated from trades provide a separate signal. The exit contract separates check failed from could not run, and a missing dependency reports skip, never a silent pass. Refines core card operations-audit-and-restore.

**Apply when:** Publishing derived market, position or balance data, adding a decoder for a new protocol, or wiring a scheduled data-quality job.

**Boundary notes:** Never compare against a proxy of the same provider; that is circular evidence. Self-consistency checks catch pipeline bugs, not shared upstream errors.

**Checks:** Each field names canonical or peer mode; canonical checks record finality and source identity; peer checks require independence; exit 0 is pass with warnings allowed, 1 is failure, 2 could not execute; each check reports measured value, tolerance and offending samples; a canary pushes recent real transactions through the stateless decoder and fails when a protocol yields zero events across its sample (format drift); tolerances document known definitional differences; results reach a visible channel and a stored artifact.

**Anti-pattern:** Alert whenever one provider disagrees, or treat a crashed checker as a pass.

**Why it fails:** One flaky provider cries wolf until alerts are ignored, and a crash that looks green hides a decoder that silently stopped indexing a venue, so users miss trades and balances drift.

**Bad example (illustrative):**

```text
if abs(ours - providerA) > tol then fail; on exception exit 0
```

**Better example (illustrative):**

```text
A finalized canonical mismatch fails directly; without a canonical source, providerA and providerB must agree against ours; missing dependency is SKIP and crash exits 2.
```

**Legitimate exceptions:** Fields with no independent source get self-consistency checks only. Tolerances, cohorts and schedules are owner decisions.

**Verification scenario:** Feed a finalized canonical mismatch (fail), one wrong peer (warn), two independent peers agreeing against you (fail), and an unreachable required source (skip, exit 2).

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

<a id="perps-order-intent-binding"></a>

## Bind every perpetual order field to confirmed intent

A perpetual order is one intent containing market, account, side, signed size, price or trigger, order type, time in force, reduce-only, post-only, leverage, margin mode, position mode, client order identity and expiry. The review screen and the submitted or signed payload resolve from the same validated command. A quote, preview or fee refresh may update derived display values, but it cannot change any intent field after confirmation without a new confirmation.

**Apply when:** adding or changing market, limit, stop, take-profit, close, reduce or conditional order submission.

**Boundary notes:** Defaults for time in force, leverage, margin mode and close behavior are product decisions. Backend support for a field does not authorize a client default.

**Checks:** every displayed field maps to one payload field; omitted versus explicit false is preserved; account and market scope come from the current session; client order identity is stable for the attempt; expiry and trigger basis are explicit; unknown order variants fail at the boundary.

**Anti-pattern:** Build the payload from mutable form stores after the user confirmed a separate summary object.

**Why it fails:** A late state update can submit a different side, size, leverage or reduce-only value, turning a close into new exposure or changing liquidation risk.

**Bad example (illustrative):**

```text
confirm(summary); later submit({ ...formStore, clientOrderId: newId() })
```

**Better example (illustrative):**

```text
command = validateAndFreeze(form); confirm(command); submit(command, stableOperationId)
```

**Legitimate exceptions:** A server-generated field may be absent from the client command when the contract proves it cannot alter economic intent.

**Verification scenario:** Change every field after the confirmation view mounts, switch account and market, and deliver a late preview; assert the payload either remains exactly the confirmed command or requires reconfirmation.

Pack: `perps` (candidate). Topics: `frontend`, `money`, `execution`, `review`, `perps`.

<a id="perps-market-quantization"></a>

## Quantize price and size from market metadata

Validate price and size with the market's versioned tick size, lot step, minimum size, minimum notional and price bands in exact decimal or integer units. Asset decimals only bound representation; they do not define valid orders. Reject off-increment input by default. If product approves quantization, name the direction for each order type and show the quantized value before confirmation. The submitted value is the confirmed quantized value.

**Apply when:** building price or size inputs, Max controls, order builders, market metadata mappers or validation errors.

**Boundary notes:** Rounding direction can change execution likelihood and risk. It is a product and venue-contract decision, not a generic formatter choice.

**Checks:** metadata identity and version match the selected market; no float conversion reaches validation; price and size increments are checked independently; minimum notional uses the contract's price basis; changed metadata invalidates the draft or revalidates visibly; backend rejection maps to a stable validation code.

**Anti-pattern:** Accept any value within base-asset decimals and silently round it while constructing the request.

**Why it fails:** Ordinary orders are rejected, or a silently rounded price or size differs from what the trader reviewed and can increase exposure.

**Bad example (illustrative):**

```text
size = floorToDecimals(raw, baseDecimals); submit(size)
```

**Better example (illustrative):**

```text
parsed = exact(raw); validateStep(parsed, lotStep); confirm(parsed); submit(parsed)
```

**Legitimate exceptions:** A venue that accepts arbitrary precision and quantizes server-side still needs the server's returned normalized value shown before a consequential follow-up.

**Verification scenario:** Test values on, below and between ticks and lot steps, minimum size and notional boundaries, stale metadata and a market switch; assert exact rejection or approved visible quantization.

Pack: `perps` (candidate). Topics: `frontend`, `money`, `types`, `implementation`, `perps`.

<a id="perps-reduce-only-never-increases-risk"></a>

## Make reduce-only incapable of increasing exposure

Reduce-only and close actions are enforced by the execution authority, not only by the UI. They bind account, market, position side and maximum reducible quantity, and can reduce to zero but never open, add to or flip a position. Concurrent fills and position changes are rechecked atomically at acceptance. A client may cap a draft to the latest visible position for usability, but the server remains the invariant owner.

**Apply when:** implementing close, reduce-only, stop-loss, take-profit, liquidation protection or order amendment.

**Boundary notes:** Hedge mode may hold independent long and short positions. The command must identify the exact position side rather than infer it from net exposure.

**Checks:** reduce-only survives every mapper and adapter; partial fills decrement remaining reducible quantity; a position closed elsewhere makes the remainder cancel or reject; an opposite-side change cannot turn the order into opening exposure; cancel and close remain available during read-stream degradation under the approved action policy.

**Anti-pattern:** Hide the buy or sell button based on current position and trust the submitted side to remain reducing.

**Why it fails:** Stale state or a concurrent fill can make the same side increase or flip exposure, exactly when the user intended to lower risk.

**Bad example (illustrative):**

```text
if (position.size > 0) submitSell(size) without reduceOnly
```

**Better example (illustrative):**

```text
submit({ positionId, side, size, reduceOnly: true }); authority rechecks reducible size atomically
```

**Legitimate exceptions:** A venue without reduce-only support needs an explicit product decision and cannot present the action as guaranteed risk reduction.

**Verification scenario:** Race a close with another fill, close the position from another device, use hedge mode and over-size the close; verify no execution increases or flips exposure.

Pack: `perps` (candidate). Topics: `frontend`, `money`, `execution`, `review`, `perps`.

<a id="perps-partial-fill-order-state"></a>

## Derive order state from versioned partial fills

An order read model carries original quantity, cumulative filled quantity, remaining quantity, average fill price, fee totals and a version or sequence from the authoritative venue or engine. Apply snapshots, fills, amendments, cancels and terminal events through one pure reducer. Duplicate or older events are idempotent, cumulative fields never move backward, and terminal state does not discard late authoritative fills that occurred before cancellation took effect.

**Apply when:** merging REST orders with live fills, showing progress, calculating remaining size, or reconciling cancel and replace.

**Boundary notes:** Event time is display metadata unless the contract declares it as the order source. Use venue sequence, row version or authoritative cumulative totals for ordering.

**Checks:** fill identity deduplicates; cumulative quantity and fees use exact units; average price is recomputed or taken from one authority; cancel-requested is distinct from cancelled; partially-filled terminal variants remain representable; account and market identity fence every event.

**Anti-pattern:** Treat the first fill as filled, or let a cancel acknowledgement erase a fill that arrives later.

**Why it fails:** Traders see wrong remaining exposure, PnL and fees, and may submit another order to compensate for quantity that already filled.

**Bad example (illustrative):**

```text
onFill: order.status = 'filled'; onCancel: order.filled = 0
```

**Better example (illustrative):**

```text
reduceOrder(current, versionedEvent) preserves cumulative fills and derives status from filled versus total
```

**Legitimate exceptions:** A complete versioned order row can replace the model atomically, while still rejecting older versions.

**Verification scenario:** Deliver duplicate fills, fill then cancel out of order, partial fill then replace, and a late pre-cancel fill; assert exact cumulative quantity, fees, remaining size and terminal state.

Pack: `perps` (candidate). Topics: `frontend`, `realtime`, `execution`, `implementation`, `perps`.

<a id="perps-mark-index-oracle-authority"></a>

## Name the authority for index and mark prices

Document the source and formula for index price, mark price and any oracle inputs, including venue set, weights, outlier rules, update cadence, staleness threshold, fallback and version. The mark used for margin, unrealized PnL and liquidation is an authoritative risk value, not a convenient ticker. Clients display its provenance and freshness but do not reconstruct a competing risk mark from public prices.

**Apply when:** adding a market, oracle, price stream, PnL display, margin check, liquidation calculation or fallback provider.

**Boundary notes:** Product may show a separate last trade or indicative price. Labels must distinguish it from the risk mark.

**Checks:** every price has unit, timestamp, version and source kind; stale or invalid inputs produce a typed unavailable or degraded state; fallbacks cannot silently loosen risk; the same authoritative mark feeds margin, liquidation and account risk; historical corrections have an audit path.

**Anti-pattern:** Fall back from a missing mark to last trade price or a client-computed average without changing state or label.

**Why it fails:** Margin and liquidation diverge between systems, users see impossible PnL, and a manipulated or stale venue price can change collateral requirements.

**Bad example (illustrative):**

```text
mark = backendMark ?? average(publicTickers)
```

**Better example (illustrative):**

```text
risk = resolveMark(authoritativeInputs); if unavailable, enter the approved degraded-risk state
```

**Legitimate exceptions:** A clearly labelled chart overlay may use a client-derived comparison price that never reaches risk or execution.

**Verification scenario:** Stale one source, inject an outlier, remove quorum and switch fallback versions; assert the documented mark or explicit degraded state appears consistently in margin, PnL and liquidation.

Pack: `perps` (candidate). Topics: `backend`, `money`, `data`, `planning`, `perps`.

<a id="perps-margin-liquidation-rounding"></a>

## Calculate margin and liquidation conservatively

Initial margin, maintenance margin, available margin, liquidation price and risk-tier transitions use one authoritative exact arithmetic library with explicit units and rounding. Liability and required margin round toward more risk; available collateral rounds toward less available value. The calculation names cross versus isolated scope, position side, contract multiplier, fee reserve, funding liability and tier schedule. Clients consume the authoritative result and may explain inputs, but do not invent a second liquidation formula.

**Apply when:** changing leverage, collateral, margin modes, risk tiers, liquidation displays or order admission.

**Boundary notes:** Formulas and rounding are venue and product contracts. Record versioned examples before implementation.

**Checks:** zero, negative and overflow cases are typed; every tier boundary has tests on both sides; cross-margin aggregation names included assets and haircuts; isolated calculations cannot read unrelated collateral; fee and funding reserves are included once; display precision cannot flow back into admission.

**Anti-pattern:** Compute liquidation price in the browser from rounded position and balance labels.

**Why it fails:** The displayed threshold disagrees with the engine, a one-unit rounding error can admit excess risk, and cross or isolated funds can be counted in the wrong scope.

**Bad example (illustrative):**

```text
liq = Number(entry) - Number(balance) / Number(size)
```

**Better example (illustrative):**

```text
result = riskEngine.calculate(versionedExactInputs); client renders result with formula version
```

**Legitimate exceptions:** Educational estimates may be client-computed only when labelled approximate and never used for admission or alerts.

**Verification scenario:** Test long and short, cross and isolated, every tier edge, tiny collateral, funding owed and credited, fee reserve, overflow and rounding boundaries against authoritative vectors.

Pack: `perps` (candidate). Topics: `backend`, `money`, `data`, `implementation`, `perps`.

<a id="perps-funding-accrual-settlement"></a>

## Accrue and settle funding from one ledger

Funding rate, interval, index and settlement use one versioned ledger authority. Accrual is exact over the position quantity and documented price basis, with sign conventions tested for long and short. Position changes split accrual at the authoritative event boundary so closed quantity is not charged for a later interval. Replays and corrections are idempotent ledger entries, never destructive overwrites, and account equity and realized PnL consume the same settled facts.

**Apply when:** implementing funding rates, countdowns, position history, account equity, settlement jobs or corrections.

**Boundary notes:** A displayed next funding estimate is not settled funding. Label estimates and keep them out of authoritative PnL.

**Checks:** interval identity is unique; late or duplicate jobs do not double charge; long and short signs are symmetric; partial close and position flip split accrual correctly; rate and price basis carry units and versions; corrections preserve an audit trail; settlement failure leaves a resumable state.

**Anti-pattern:** Recompute historical funding from the latest position size or overwrite the previous total when a job retries.

**Why it fails:** Users are charged twice or for exposure they no longer held, equity diverges from the ledger, and a correction cannot be audited.

**Bad example (illustrative):**

```text
account.funding += currentSize * rate whenever the timer fires
```

**Better example (illustrative):**

```text
appendFundingOnce(account, positionVersion, intervalId, exactAccrual)
```

**Legitimate exceptions:** A fully external venue may provide authoritative funding ledger entries; ingest and reconcile them rather than recreating the formula.

**Verification scenario:** Retry one interval, partially close before settlement, flip side, correct a published rate and restart the job; verify one auditable entry per segment and exact equity reconciliation.

Pack: `perps` (candidate). Topics: `backend`, `money`, `data`, `implementation`, `perps`.

<a id="perps-position-mode-margin-scope"></a>

## Bind position and margin mode to every action

One-way versus hedge position mode and cross versus isolated margin mode are explicit account or market state with versioned transition rules. Every order, close, collateral change and leverage update binds the expected mode and exact position identity. A mode change is rejected while incompatible orders or positions exist unless the product contract defines an atomic migration. Account switches clear every draft and cached risk projection before another action becomes available.

**Apply when:** adding hedge mode, isolated margin, leverage editing, collateral transfer or position selection.

**Boundary notes:** Which transitions are allowed and whether open orders block them are product and risk decisions.

**Checks:** long and short position ids remain distinct in hedge mode; a close identifies the intended side; isolated collateral cannot leak into cross available margin; mode version conflicts return a stable error and refresh; drafts reset on account or mode change; URLs and local storage do not become authority for mode.

**Anti-pattern:** Infer mode from the number of positions, or submit a close by market symbol alone.

**Why it fails:** The wrong side closes, collateral is counted twice, or a stale draft created under one mode opens exposure under another.

**Bad example (illustrative):**

```text
close({ market, size }) and let the server infer which position
```

**Better example (illustrative):**

```text
close({ accountId, positionId, side, size, modeVersion, reduceOnly: true })
```

**Legitimate exceptions:** A venue supporting only one immutable mode can omit the field after the boundary adapter proves that invariant.

**Verification scenario:** Switch account, change cross to isolated, enable hedge mode with both sides open and submit from a stale draft; verify reset or version conflict and no action reaches the wrong position.

Pack: `perps` (candidate). Topics: `frontend`, `money`, `state`, `review`, `perps`.

<a id="perps-cancel-replace-unknown-outcome"></a>

## Treat cancel and replace as consequential mutations

Cancel and replace use stable operation identities and authoritative order versions. A lost response is unknown: reconcile the original order and operation before another cancel or replacement. Replace is not assumed atomic unless the venue contract proves it. Where cancel then create are separate, expose the interval and never report the new order active before its acknowledgement. A replacement cannot bypass reduce-only, margin or price-band validation.

**Apply when:** implementing cancel, amend, replace, batch cancel, reconnect recovery or retry behavior.

**Boundary notes:** Risk-reducing cancel should remain reachable during read-stream degradation through the authoritative mutation path, but product policy owns the user message and fallback.

**Checks:** same key plus same intent replays; changed replacement intent conflicts; order version or expected state prevents stale amendment; partial fills between request and acceptance are handled; unknown outcome does not mint a new key; batch results are per order and terminally reconcilable.

**Anti-pattern:** On cancel timeout, submit a replacement with a fresh identity and assume the old order disappeared.

**Why it fails:** Both orders can remain live, doubling exposure, or a fill during the gap makes the replacement exceed the intended remaining size.

**Bad example (illustrative):**

```text
catch cancelTimeout { place(replacement, newKey()) }
```

**Better example (illustrative):**

```text
markUnknown(cancelOp); lookup(orderId); replay same key only under the documented contract
```

**Legitimate exceptions:** An exchange-native atomic amend with payload-bound idempotency can be one operation, but its exact semantics require contract tests.

**Verification scenario:** Lose cancel acknowledgement, partially fill during cancel, reject a stale order version and replay a replace response; verify no duplicate live order and correct remaining exposure.

Pack: `perps` (candidate). Topics: `backend`, `money`, `execution`, `implementation`, `perps`.

<a id="perps-risk-reducing-actions-availability"></a>

## Keep risk-reducing actions available under degraded reads

Define freshness requirements per action. Opening or increasing exposure may require fresh balances, positions and risk parameters. Classify cancellation by the order's economic intent: cancelling an exposure-increasing entry may reduce risk, while cancelling a protective reduce-only stop or take-profit can increase it. Closing, reducing and lowering leverage should remain reachable through the authoritative mutation contract when live reads degrade unless a recorded money policy proves stale state makes that specific action unsafe. Stream health informs the decision and messaging; it is not blanket authorization.

**Apply when:** gating controls on socket state, reconnect, auth refresh, stale queries or degraded backend health.

**Boundary notes:** Exact allowed actions and copy are product and risk decisions. The default safety question is whether blocking traps the user in exposure.

**Checks:** every action has a freshness policy; cancellation is classified from the target order's side, reduce-only flag and protective role; risk-increasing and risk-reducing actions are distinct; approved close and reduce-only paths do not depend on unrelated feeds; the server rechecks current state; degraded UI explains uncertainty without fabricating balances; recovery never replays a mutation.

**Anti-pattern:** Disable the whole trading surface whenever any socket reconnects.

**Why it fails:** A market-data or history blip prevents the user from cancelling or reducing a live position, increasing loss while the mutation backend may be healthy.

**Bad example (illustrative):**

```text
disabled = socket.status !== 'connected' for open, cancel and close
```

**Better example (illustrative):**

```text
policy = actionFreshnessPolicy.classify(action, targetOrderIntent); disabledReason = policy.evaluate(authoritativeHealth)
```

**Legitimate exceptions:** If the mutation itself depends on stale client-computed data, block it until the contract is redesigned or freshness is restored.

**Verification scenario:** Degrade each stream, then cancel an opening order, cancel a protective reduce-only stop, close and reduce; verify intent-specific sourced policy rather than treating every cancel as risk reduction.

Pack: `perps` (candidate). Topics: `frontend`, `money`, `realtime`, `planning`, `perps`.

<a id="perps-price-roles-not-interchangeable"></a>

## Bind every price to its role: mark, index, last, mid, executable

A perps screen holds several prices and none substitutes for another. Risk figures (unrealized PnL, equity, margin ratio, liquidation distance) read the price the venue margins on, normally mark. Trigger validation reads the trigger basis the venue documents or the order carries. The ticket estimate reads the book: best bid and ask plus a depth walk. Funding notional reads whichever price the venue documents. Tape and candles read last. Each role gets its own type, selector and freshness, and the label sits beside the number it explains.

**Apply when:** any code reads "the price" for PnL, margin, liquidation, trigger validation, ticket prefill, a chart series or the header ticker.

**Boundary notes:** which feed is authoritative for a given venue computation is covered by perps-mark-index-oracle-authority (see perps-mark-index-oracle-authority); this card is about not crossing roles inside the client.

**Checks:** no bare price parameter in risk modules; risk selectors do not import trade or book-mid selectors; a selector named for one role returns that feed; every trigger order carries and displays its trigger basis; the chart legend names its series; ticket prefill and fill estimates come from the book, never from mark.

**Anti-pattern:** One price hook reused for the header, position PnL, the liquidation warning and the stop preview, or a selector named after one role that returns another feed.

**Why it fails:** Venues build mark from an index plus a smoothed basis precisely so one thin-book print cannot liquidate anyone, so last and mark diverge most when it matters. PnL from last disagrees with the venue margin state and shows a position as safe while it is being liquidated. A chart plotting last while triggers use mark produces "price never touched my stop". A trigger validator on last misses a level mark has already crossed, which the venue rejects or fires at once. Prefilling a limit with mark gives an unexpectedly crossing or unfillable order, and mid is the book center, not a price anyone can trade at.

**Bad example (illustrative):**

```text
const pnl = size * (lastTradePrice - entry)
```

**Better example (illustrative):**

```text
const pnl = unrealizedPnl({ position, mark }) // mark: MarkPrice, a branded decimal string
```

**Legitimate exceptions:** A venue that defines mark as its oracle or index price, or exposes one price only: still name it by role. A venue that lets the user pick the trigger source per order: the ticket carries that choice explicitly. A compact ticker may show last alone if labelled.

**Verification scenario:** Fixture with last 100, mark 95 and a long entered at 98. PnL is negative, margin ratio and liquidation distance follow mark, a stop at 96 is flagged as already crossed on a mark-triggered venue, the ticket estimate follows the book, and the tape and chart still show last with a legend that says so.

**Automatable check:** Branded types per role so a PnL helper cannot accept last; an import rule keeping trade and book-mid selectors out of risk modules.

Pack: `perps` (candidate). Topics: `perps`, `money`, `types`, `frontend`, `review`.

<a id="perps-no-zero-fallback-in-risk-math"></a>

## Never coalesce a missing risk input to zero or a default

Every account and market input to risk math has three states: unknown (pending, stale or failed), known-none and known-value. Derivations propagate unknown: PnL, margin ratio, equity, liquidation estimate, Max size and margin coverage return a tagged result that names the missing input, and an aggregate is unavailable if any member is. Unknown is neither healthy nor insufficient. The UI renders a placeholder for that cell, keeps the rest of the row and table, and a submit path that needs the value stops before dispatch with a specific reason.

**Apply when:** computing PnL, margin ratio, equity, a liquidation estimate, Max size or a submit gate from a price, balance, position, leverage or instrument config that can be loading, missing, stale or failed.

**Boundary notes:** see queries-explicit-async-states for generic loading and error rendering; this card covers fallbacks inside risk arithmetic and gates.

**Checks:** no nullish or logical-or numeric default on account or price reads in risk, order and validation paths; coverage is true, false or null and no branch reads null as false; a venue answer of "cannot price now" is a ready state with a null value, a transport failure is failed or stale; per-cell reads degrade one cell and are counted in telemetry; a stale read keeps the last rows, marked stale.

**Anti-pattern:** Default a missing mark, balance, position or leverage inside the formula, or return "ratio 0, healthy" or "insufficient margin" from a hook whose inputs are still loading.

**Why it fails:** With price 0 a long shows a full-loss PnL and a short a huge profit, and the header total absorbs it. A margin ratio of 0 renders a green badge over an unknown state. A liquidation estimate built on balance 0 lands next to mark. A pending account read shown as flat breaks reduce-only validation and offers "add protection" on a protected position. An unread balance defaulted to zero refuses trades the account can afford. One stale feed inside an all-or-nothing join blanks every position row, and a swallowed sub-read makes the outage invisible.

**Bad example (illustrative):**

```text
const pnl = size * ((mark ?? 0) - entry); const covered = (available ?? 0) >= required
```

**Better example (illustrative):**

```text
const pnl = mark === undefined ? unavailable('mark') : size * (mark - entry) // covered: boolean | null
```

**Legitimate exceptions:** A true zero reported by the venue (flat position, empty balance, known non-positive budget) is data. A read feeding a money-moving gate may fail closed with a named reason.

**Verification scenario:** Delay one market price feed with two positions loaded: both rows render, the affected cells and the header total show a placeholder, nothing flashes negative, no liquidation warning fires and a degraded-read event is recorded. Fail the account read with a position open: no flat UI and no "insufficient margin".

**Automatable check:** Lint banning nullish and logical-or numeric defaults in risk, PnL and gate modules; property test that a selector never returns a finite number when a required input is undefined.

Pack: `perps` (candidate). Topics: `perps`, `money`, `state`, `frontend`, `review`.

<a id="perps-liquidation-price-is-an-estimate"></a>

## Show the venue liquidation price for positions and a labelled estimate before the trade

For open positions display the liquidation price the venue reports. Where the client must compute one, a single estimator implements the venue formula as a pure function over whole-account inputs and returns a typed result: a price, not liquidatable, or unavailable with a reason. Pre-trade figures are labelled estimates, recompute when any input changes, and are suppressed when the draft is unaffordable. Under cross margin the label says other positions and collateral move it.

**Apply when:** showing a liquidation price in the positions table, the order preview, a risk warning or a chart line. A risk warning reads the venue value; a client estimate never drives an alert.

**Boundary notes:** see perps-margin-liquidation-rounding for rounding direction; missing inputs follow perps-no-zero-fallback-in-risk-math.

**Checks:** one estimator module, no second formula elsewhere; the venue value wins when present; absent, non-positive or wrong-side results render a placeholder, never 0.00 or the previous level; partial stream frames merge field by field with the prior row instead of blanking it; a draft whose equity starts at or below maintenance shows unaffordable, not a price; a projection for an order opening from flat is anchored at the price the fill happens at (the limit for a resting order).

**Anti-pattern:** Apply the closed-form isolated formula (entry adjusted by one over leverage) to every position, compute it once at open, and format whatever comes out.

**Why it fails:** In cross margin the boundary depends on account equity: other positions, deposits, withdrawals, fees, funding, resting-order reservations and tiered maintenance rates all move it, so the per-position formula can be far off. A well-collateralized position has no liquidation price; a solver that floors at zero prints 0.00, which reads as a real level. A draft that starts under maintenance solves on the wrong side of the mark, so a long shows a liquidation price above its entry and reads as reassurance. A resting limit solved at the current mark can print a level above its own limit price.

**Bad example (illustrative):**

```text
const liq = entry * (1 - 1 / leverage)
```

**Better example (illustrative):**

```text
const liq = position.reportedLiqPrice ?? notReported // { kind: 'price' | 'not-liquidatable' | 'unavailable' }
```

**Legitimate exceptions:** Isolated margin with fixed collateral may use the venue isolated formula, labelled. A venue with a pre-trade simulation endpoint: use it.

**Verification scenario:** Cross account with two positions: move the other market mark, deposit collateral and apply funding, and the first position value updates each time. Add collateral until no level exists: the cell shows not liquidatable, not 0.00. A draft with margin equal to maintenance shows a placeholder. A resting buy at 80 with mark 86 from flat projects below 80.

**Automatable check:** Golden vectors from the venue worked examples; property test that a long projection is null or below its fill price and a short is null or above; grep for liquidation formulas outside the estimator.

Pack: `perps` (candidate). Topics: `perps`, `money`, `frontend`, `implementation`, `review`.

<a id="perps-order-ack-is-not-outcome"></a>

## An order acknowledgement is not an outcome: word results from status and fills

A successful submit response means the venue admitted the instruction. What happened to it arrives as order status and fill records. Resolve the submit to the first update for the returned id that settles its immediate phase: a terminal status for market, immediate-or-cancel and fill-or-kill orders, a resting or terminal status for orders that can rest (stream first, exact lookup as fallback). Model the order as status plus requested, filled and remaining quantity and average fill price, and change exposure only from fill or position events. Copy and analytics derive from one outcome object, and the execution price comes only from fills.

**Apply when:** building the submit path, toasts, sounds, activity or optimistic rows or close flows, and handling immediate-or-cancel, fill-or-kill and post-only results.

**Boundary notes:** see perps-partial-fill-order-state for quantity bookkeeping across partial fills.

**Checks:** the ack type carries no fill information; a fill notification can only be built from a fill record; terminal statuses map to copy through a Record with distinct filled, partial and unfilled results; an unknown status is kept raw, reported, shown generically and resolved by re-reading open orders, never by throwing in the parser or a not-filled-and-not-cancelled test; intent (open, reduce, close) is derived once and a close that fills short is worded as reduced; failed, proven no-effect and unproven are three different results.

**Anti-pattern:** Show "filled", play the fill sound, report the quoted price as the execution price or add a position when the request returns OK, and treat only transport errors as failures.

**Why it fails:** A resting order has zero exposure. An immediate-or-cancel order can fill part and cancel the rest, and a market order into a thin book is accepted and fills nothing; these are terminal statuses on an accepted order, not error responses. An order can end cancelled with exposure remaining, and "cancelled" hides a live position. A closing sell worded from side alone reads as opening exposure. Venues add terminal statuses over time: a throwing parser drops the frame that says the order is gone, while a negative check treats each new terminal status as working.

**Bad example (illustrative):**

```text
await placeOrder(order); toast('Order filled at ' + quotedPrice)
```

**Better example (illustrative):**

```text
const update = await settlingUpdate(ack.orderId); toast(messageFor(outcomeFrom({ update, intent })))
```

**Legitimate exceptions:** A venue whose submit response embeds the final order state or fills synchronously: the response is then fill evidence, read from its fill fields.

**Verification scenario:** Simulate accept then rest; immediate-or-cancel into an empty book; partial 4 of 10 then cancel; a full close that fills short; an update with a never-seen status. Assert copy and quantities, no position before a fill, the position kept after the cancel, "reduced" not "closed", one toast, no crash and telemetry for the unknown status.

**Automatable check:** Table test of the message resolver over status by filled quantity by intent.

Pack: `perps` (candidate). Topics: `perps`, `execution`, `mutations`, `frontend`, `review`.

<a id="perps-bracket-legs-settle-independently"></a>

## Entry and attached protection are separate outcomes unless the venue groups them

An entry with take-profit or stop-loss attached is several instructions. Prefer the venue native bracket or atomic group. Otherwise build and validate every leg before the entry leaves, send the entry, and place each reduce-only leg only once fill or position evidence shows exposure for it to protect. Where the venue has no native group, protection for a resting entry depends on this client observing the fill and is lost if the app closes first; whether to offer it, and how to say so, is a product decision to source, and the indicator never implies protection the venue does not hold. Settle each leg on its own as placed, failed or unknown, and report the overall result as success, partial or ambiguous with each leg named. Protection state shown on the position comes from the venue.

**Apply when:** the ticket attaches take-profit or stop-loss to an entry, the venue takes legs separately or returns per-leg statuses, or the position row shows a protection indicator.

**Boundary notes:** see perps-protection-replace-place-before-cancel for editing existing protection.

**Checks:** legs are validated before dispatch: opposite side, reduce-only, size above zero and at most the entry size after lot rounding, trigger on the correct side of the wire entry price; a leg failure never runs the whole-trade error handler; only the failed leg can be retried, and only by the user; an unknown leg is worded as "may have been placed"; the protection indicator follows the venue child state.

**Anti-pattern:** One mutation awaits the entry and then the protective orders, or fires them together, and reports a single success or failure.

**Why it fails:** When a leg throws, the entry has already executed. "Trade failed" makes the user resubmit and double the exposure while holding an unprotected position they do not know about. Native children are commonly placed only once the parent fills completely and are cancelled with a partially filled parent, so "stop set" over a dormant child leaves an unprotected partial position.

**Bad example (illustrative):**

```text
await Promise.all([place(entry), place(takeProfit), place(stopLoss)]); toast('Order placed')
```

**Better example (illustrative):**

```text
const legs = planLegs(entry); await place(entry); const outcomes = await placeEachOnExposure(legs) // placed | failed | unknown
```

**Legitimate exceptions:** A venue endpoint with all-or-nothing semantics for the whole group: one request and one outcome is correct.

**Verification scenario:** Rest the entry: no leg is sent and the indicator follows the sourced wording. Fill it and reject the stop-loss: no "trade failed", the position is visible, the message says entry filled, take-profit placed, stop-loss not placed with the reason, and the retry submits only the stop-loss. Drop the take-profit response: "may have been placed". Fill the entry 40 percent then cancel it on a venue that cancels children with the parent: the position shows no active protection.

**Automatable check:** Mutation contract test with scripted per-leg responses.

Pack: `perps` (candidate). Topics: `perps`, `execution`, `mutations`, `frontend`, `implementation`.

<a id="perps-protection-replace-place-before-cancel"></a>

## Replace position protection by placing first and cancelling second

Editing a take-profit or stop-loss must never leave the position with less protection than it had. Snapshot the legs being edited when the editor opens, place the replacement first, and cancel only the snapshotted legs, and only once the replacement outcome is a confirmed success. A partial or ambiguous placement keeps the old protection and returns an explicit cleanup state: not required, success or failed. Until the open-orders read is authoritative, protection is rendered as unknown and the add affordance is disabled.

**Apply when:** editing take-profit or stop-loss orders on an open position, rendering an "add protection" affordance, or dragging protection lines on the chart.

**Boundary notes:** the unknown-outcome handling of the two requests themselves is in perps-cancel-replace-unknown-outcome (see perps-cancel-replace-unknown-outcome).

**Checks:** request order is place then cancel; cancel targets only the ids snapshotted at open, never whatever the list holds later; no cancel is sent after a failed, timed-out or partial placement; "no protection" is never inferred from an empty, failed or unresolved orders read; the aggregate editor refuses when more than one leg of a kind exists and routes to a per-order view; a failed cleanup is shown, since two live triggers now exist.

**Anti-pattern:** Cancel the old protection and then place the new one, present it as one atomic save, and offer "add" whenever the orders list comes back empty.

**Why it fails:** If placement fails or its outcome is unknown after the cancel, the position is unprotected in a moving market and the UI still looks saved. If the orders read failed and the UI offers "add", the user stacks duplicate reduce-only triggers. If several take-profits with different sizes exist, a single-form edit silently replaces them with one. Cancelling by current list contents can remove a leg the user created in another session a moment earlier.

**Bad example (illustrative):**

```text
await cancel(oldLegs); await place(newLegs)
```

**Better example (illustrative):**

```text
const placed = await place(newLegs); if (placed.outcome === 'success') await cancel(snapshottedLegs)
```

**Legitimate exceptions:** A venue with an atomic modify or replace for trigger orders: use it. A venue that rejects a second reduce-only trigger beyond position size forces cancel-first: the edit is then two visible steps, the unprotected window is a product decision to source, and a failed second step says "stop removed, replacement failed".

**Verification scenario:** Time out the placement during an edit: no cancel is sent and the old lines remain. Fail the orders read: the add affordance is disabled and protection shows as unknown. Two take-profit orders on one position: the aggregate editor refuses and links to the per-order view. On a cancel-first venue, fail the create and assert the warning state.

**Automatable check:** Mutation test asserting request order and that the cancel payload contains only snapshotted ids.

Pack: `perps` (candidate). Topics: `perps`, `execution`, `mutations`, `frontend`, `implementation`.

<a id="perps-tpsl-lifecycle-follows-position"></a>

## Keep protective orders consistent with the position they protect

Whether a trigger is bound to a position or merely scoped to a market and account is venue contract: read it, do not assume it. Display what the venue reports. Where the venue documents that a reduce-only trigger is clamped to the position at fire time, treat its registered size as a ceiling; otherwise resize or flag it on every position change, because an unclamped trigger larger than the position flips it. Reconcile children on every position change and surface reduce-only triggers that outlive their position.

**Apply when:** showing or creating TP/SL for a position; partial close, add, reversal or liquidation; expected PnL at a trigger; deciding what to cancel on close.

**Boundary notes:** see perps-reduce-only-never-increases-risk for reduce-only semantics.

**Checks:** expected PnL at a trigger uses min(trigger size, absolute position size), measured from entry, from one helper shared by table, dialog and chart; on a clamping venue a partial close leaves triggers alone; only a full close retracts triggers, and only reduce-only ones, never pending entries; a child record that arrives before its parent waits in a bounded queue; stranded triggers are reduce-only triggers on markets with no open position, computed only when both the positions and triggers reads are current.

**Anti-pattern:** Treat TP/SL as independent fixed-size orders, assume a close or liquidation cleans them up, and drop child frames that arrive before the position.

**Why it fails:** A trigger placed on 0.010 still says 0.010 after 0.004 is closed by hand while only 0.006 can fire, so pricing the registered size overstates the outcome by the closed share. On a clamping venue, cancelling on a partial close strips protection it would have clamped, and a full close that also cancels opening-intent triggers silently removes pending entries. Where nothing cancels a trigger on close, a stranded stop later reduces a fresh position opened afterwards. Computing "stranded" from a stale positions read flags a new stop and offers to cancel it.

**Bad example (illustrative):**

```text
const pnlAtTrigger = trigger.quantity * (trigger.price - entry)
```

**Better example (illustrative):**

```text
const fireSize = min(trigger.quantity, abs(position.size)); if (!bothReadsCurrent) return [] // stranded list
```

**Legitimate exceptions:** Venues with position-bound triggers that resize and cancel automatically: display their state. Standalone trigger orders intentionally not bound to a position are plain orders.

**Verification scenario:** Trigger for 0.010 with the position reduced to 0.006: table, dialog and chart show the outcome for 0.006. On a clamping venue a partial close leaves triggers, elsewhere an oversize trigger is resized or flagged; a full close removes reduce-only triggers and keeps a pending stop-entry. Close a position holding a stop on a market-scoped venue: the stranded banner lists it. Set a stop while the positions poll is failing: no banner.

**Automatable check:** Reducer tests over permuted frame arrival orders reaching one final state; a stranded-join test returning empty for stale or pending inputs.

Pack: `perps` (candidate). Topics: `perps`, `realtime`, `state`, `frontend`, `review`.

<a id="perps-trigger-direction-and-reference"></a>

## Derive trigger direction from side and intent, validated against the venue reference

One planner owns the trigger rule table, keyed by context (new order or existing position), side and leg. It yields the fire direction and the reference price to validate against: the expected entry for a bracket on a new order, the venue trigger-basis price for an existing position. A trigger that would fire on arrival, equality included, is refused or warned per the venue rule. Labels for existing triggers come from stored order facts; a row is live, retired or unverified, never assumed.

**Apply when:** placing, validating, labelling or listing trigger orders, dragging bracket lines, or flipping the ticket side.

**Boundary notes:** see perps-price-roles-not-interchangeable for which feed a trigger evaluates on.

**Checks:** a long stop and a short take-profit fire as price falls, the other two as it rises, and a stop-entry inverts this; revalidation runs on side change, reference change and at submit; a stop-limit follows the venue triggered-limit contract; kind comes from the venue explicit type, else trigger condition plus side, never from comparing trigger with current price; reduce-only plus side labels "Close Long" or "Close Short"; a failed liveness read keeps the row flagged unverified, and "does not exist" on cancel removes the row without an error.

**Anti-pattern:** One rule ("stop below, take-profit above") everywhere, checked against any price at hand, with kind inferred from trigger versus mark.

**Why it fails:** An entry-based rule blocks a valid stop above entry on a profitable long, while a stop already through the trigger-basis price fires at once. A bracket checked against mark instead of its entry fires as soon as the position exists. Whether a triggered limit rests or executes immediate-or-cancel is venue contract: where it is immediate-or-cancel, a limit on the unfillable side of its trigger is refused; where it rests, a protective stop-limit warns that it may not fill in a fast move. Once price crosses a level, a price comparison relabels a stop-loss as a take-profit. Treating a failed liveness read as "gone" hides a live armed stop.

**Bad example (illustrative):**

```text
const kind = triggerPrice > markPrice ? 'TP' : 'SL'
```

**Better example (illustrative):**

```text
const firesOnFall = isStop === isLong; if (firesOnFall ? ref <= trigger : ref >= trigger) return reject('trigger')
```

**Legitimate exceptions:** A venue that accepts an already-crossed trigger as an immediate order: warning instead of blocking is a product decision.

**Verification scenario:** Long in profit: a stop above entry and below the trigger-basis price is accepted; one at or above it is refused. A long buy resting at 100 with mark 110: take-profit 105 is accepted against the entry although below mark, and take-profit 95 is refused. A sell stop-limit limited above its trigger: refused if triggered limits are immediate-or-cancel, warned if they rest. Move mark under a long stop before it fills: still labelled stop-loss. Fail the liveness read: the row stays, marked unverified.

**Automatable check:** Table-driven test over context by side by leg by intent, including equality.

Pack: `perps` (candidate). Topics: `perps`, `execution`, `forms`, `frontend`, `implementation`.

<a id="perps-step-grid-not-decimal-count"></a>

## Align prices and sizes to the venue step grid, not to a decimal count

A venue price or size rule is whatever its metadata says: a tick or lot step that need not be a power of ten, or a compound rule such as a significant-figure cap combined with a decimal cap. Encode the rule once in a venue-rule module. One snap primitive works on decimal strings or integer step counts, rounds in the direction the caller passes, reprints at the step own precision in the venue canonical string form, and returns null when the value cannot be represented. Chart price scale, input step, book grouping and validators all import it.

**Apply when:** aligning, validating, formatting or encoding any perp price or size, or converting an aligned value to raw units.

**Boundary notes:** see money-rounding-direction-by-bound for the direction of each bound; market-level quantization is in perps-market-quantization.

**Checks:** no decimal count derived from a step is used for alignment, only for display; no float division of value by step feeds a floor; a size derived from a cap never exceeds the cap after snapping; an unread, zero or non-numeric step means "cannot align", not pass-through; values are not serialized through number-to-string or fixed-decimal formatting before a unit parser; signed payloads use the string form the venue signing contract specifies, proven by a fixture whose hash matches a venue example.

**Anti-pattern:** Round to ceil(-log10(step)) decimals, floor value / step in floats, and encode with a fixed decimal count per market.

**Why it fails:** A 0.003 tick reports as three decimals, a finer grid than the venue enforces, so an "aligned" price is rejected. 0.00013 / 0.00001 evaluates to 12.999999999999998 and floors a whole step low. Snapping onto a non power-of-ten lot can land above a cap-derived size. Number-to-string switches to exponent form below 1e-6 and unit parsers throw, so every submit fails on a fine grid; reprinting at token decimals emits an off-grid binary expansion. Under a significant-figure rule the effective tick grows with price, so a fixed decimal count is rejected on high-priced markets and loses precision on micro-priced ones. Another string form changes a signed hash.

**Bad example (illustrative):**

```text
const aligned = Math.floor(price / tick) * tick; const wire = aligned.toFixed(2)
```

**Better example (illustrative):**

```text
const wire = snapToStep({ value: priceString, step: market.tick, direction: 'down' }) // null if unrepresentable
```

**Legitimate exceptions:** A venue that publishes only decimal precision and guarantees power-of-ten grids.

**Verification scenario:** Tick 0.003: price 1.0000 aligns to 0.999 or 1.002 by direction and never stays. Lot 0.0003 with cap 0.0014999999999999998 yields 0.0012. Tick 1e-7 encodes without throwing. A significant-figure fixture of documented valid and invalid prices passes or is rejected with a field error, and chart scale and input step follow the same rule.

**Automatable check:** Property test over non power-of-ten steps: result is a multiple of the step, respects direction and never exceeds a cap; lint for fixed-decimal formatting feeding a unit parser or an order builder.

Pack: `perps` (candidate). Topics: `perps`, `money`, `types`, `frontend`, `implementation`.

<a id="perps-validate-the-wire-rounded-order"></a>

## Validate, preview and submit the same wire-rounded order

One pure function turns the draft into the wire order: lot-rounded size, tick-rounded price, and the same for every sliced or laddered child and attached protection leg. Typed prices and sizes off the grid follow perps-market-quantization (rejected by default, or quantized in a product-approved direction); derived values (quote conversion, percent slider, ladder children, protection legs) are rounded in a named direction. Validation, the order summary (value, margin, fees) and submission all consume its output, so nothing is checked on a value other than the one sent. A rounded size of zero blocks the order, for the whole order or any child. A minimum shown to the user is the smallest input that still meets the rule after rounding.

**Apply when:** an order form turns user input into a wire size and price, including ladder children and protection legs.

**Boundary notes:** for the snap primitive see perps-step-grid-not-decimal-count; this card is about where its output is consumed.

**Checks:** rounding helpers are not called only inside the mutation; minimum size is evaluated on wire size, and minimum notional on wire size times the price basis the venue names for that rule (the limit price for limit orders unless documented otherwise); trigger-versus-entry comparisons use wire prices; every ladder child is checked on its own; the displayed minimum is rounded up to the next lot step and is itself submittable; each blocked case has a specific message before any request.

**Anti-pattern:** Validate the raw input (size above zero, value above the minimum, take-profit above entry) and round only inside the submit function.

**Why it fails:** A derived size floored to the lot step can become zero or drop under the minimum notional after it passed the form. Price is rounded to the tick, so a trigger strictly above the entry in raw form can equal it on the wire. The result is venue rejections after the form passed, zero-size ladder children, a "minimum order" threshold the rounded size cannot meet, and protection legs wire-equal to the entry. The summary also shows a value and margin the venue will not charge.

**Bad example (illustrative):**

```text
if (rawSize * price >= minNotional) submit(roundToLot(rawSize))
```

**Better example (illustrative):**

```text
const wire = toWireOrder(draft); if (gtZero(wire.size) && meetsMinNotional(wire)) submit(wire)
```

**Legitimate exceptions:** Display-only hints that never gate submission may use unrounded values. A venue that normalizes unrounded input server-side still needs the preview to show the normalized order.

**Verification scenario:** Enter a quote amount just under a lot boundary on a coarse-lot market, a ladder whose smallest child floors to zero, and a take-profit one sub-tick above a limit entry. Each is blocked with a specific message before any request. Type the displayed minimum: it submits. The summary value equals wire size times wire price.

**Automatable check:** Property test: for random drafts, "form validation passes" implies "venue rule predicate passes on the wire order"; lint for rounding helpers called only inside mutation functions.

Pack: `perps` (candidate). Topics: `perps`, `execution`, `forms`, `frontend`, `implementation`.

<a id="perps-instrument-config-from-venue"></a>

## Read tick, step, limits, fees and margin parameters from venue config

Tick and step rules, minimum size and notional, separate maximum notionals per order kind, price bands, leverage and maintenance tiers, fee tier, and per-side trade limits come from one typed, validated instrument and account read model, keyed by network and market. All rounding, validation, formatting and risk estimates derive from it. Missing or failed config shows that state and blocks the dependent region, never falling back to a constant. Where the venue reports a limit or a fee, use it; client estimates are labelled.

**Apply when:** formatting, rounding or validating prices, sizes, minimums and maximums, estimating fees, margin or liquidation, building leverage options, Max size or the chart price scale, or adding a listing.

**Checks:** no numeric risk, fee or precision literals; one validator returns a typed reason per rule (precision, significant figures, minimum and maximum notional, price band); inputs cap fraction digits from metadata; the tier function is implemented once and matches venue vectors on both sides of every boundary; available-to-trade and max size are read per market and side when reported; network is part of the cache key; config refreshes on reconnect and on a schedule.

**Anti-pattern:** A constants file with per-market decimals, max leverage and one maintenance rate, a default fee while the tier is unloaded, and two decimals when tick size is missing.

**Why it fails:** Parameters differ per market and network, and venues change tiers and caps by risk action. A baked table drifts, so previews are rejected or liquidation prices are off by a tier. Tiered maintenance follows the venue schedule: commonly notional times rate minus a deduction, which is continuous, while some venues apply the tier rate to the whole notional and jump at the boundary. A default precision truncates low-priced instruments to 0.00 or an off-tick order. A default fee misstates cost. Limits differ by market and by side once a position exists, so one account-level figure blocks valid orders or passes rejected ones.

**Bad example (illustrative):**

```text
const maxLeverage = MAX_LEVERAGE[symbol] ?? 20; const display = price.toFixed(2)
```

**Better example (illustrative):**

```text
const rules = instrumentRules(market); if (rules.status !== 'ready') return showConfigState(rules)
```

**Legitimate exceptions:** Display-only compaction of large numbers. A documented protocol constant versioned with a contract interface, asserted against config at startup.

**Verification scenario:** Swap the metadata fixture to a different tier table: leverage options, max size and liquidation preview change with no code change, and maintenance matches venue vectors on both sides of each tier boundary. An instrument with 4 quantity decimals and minimum notional 1 blocks 0.00001 for precision and 0.0001 at price 100 for notional. Remove config from the fixture: the ticket is disabled and nothing defaults.

**Automatable check:** Lint for numeric literals in risk, fee and precision modules; test that the chart price scale and minimum move reproduce the tick exactly (tick 0.003 as scale 1000 with minimum move 3).

Pack: `perps` (candidate). Topics: `perps`, `money`, `frontend`, `planning`, `implementation`.

<a id="perps-full-close-exact-size"></a>

## Close a full position with the venue exact size, never a UI round trip

A full close uses the venue close-position instruction when one exists, otherwise the exact position size string as the venue reported it, untouched. Full-close intent is detected from the selection, not from float equality. Partial closes floor to the lot step and are compared as decimals so they never exceed the held size. Every close path sends a reduce-only order on the opposite side, sized from the latest authoritative position, and reports a partial close as partial.

**Apply when:** building close dialogs with percent presets or a size input, close-all, a reduce-only Max button, reverse, or partial reduce.

**Boundary notes:** see perps-reduce-only-never-increases-risk for reduce-only rules; batch outcomes are in perps-close-all-per-target-outcomes.

**Checks:** no float conversion of position size inside close builders; a full close asserts the exact size is representable at lot precision and aborts before dispatch otherwise; a close-all batch aborts if any exact size would be truncated; presets below the minimum that the venue applies to reduce-only orders are disabled; where the venue exempts reduce-only orders, they stay enabled; a remainder below the minimum is blocked or promoted to a full close per a sourced product rule; every close payload builder sets reduce-only.

**Anti-pattern:** Compute the close size from the UI path: 100 percent slider to quote value at two decimals, divided by mark, floored to the lot, and sent as a plain opposite-side order.

**Why it fails:** Every step of the round trip loses precision. Landing a hair under leaves dust: a residual position that still holds margin, still shows in tables and may be under the minimum order size. Landing a hair over is rejected as a reduce-only violation or, without the flag, flips into a tiny opposite position. If the position changed while the request was in flight, an unflagged close opens new opposite exposure; with the flag the venue rejects or trims instead.

**Bad example (illustrative):**

```text
const size = floorToLot(sliderPct * Number(position.size))
```

**Better example (illustrative):**

```text
const size = isFullClose({ selection, position }) ? position.sizeExact : floorToLot(selection.base)
```

**Legitimate exceptions:** A venue action that closes a position without taking a size, or one that sweeps dust automatically. A deliberate reverse-position feature approved by product, implemented as its own explicit flow.

**Verification scenario:** A position whose 100 percent quote round trip floors one lot short: the payload size equals the exact position string and nothing remains. A position with more decimals than lot precision aborts before dispatch. 75 percent leaving a sub-minimum remainder follows the product rule. Close the position by a stop while the close request is in flight: the result is "nothing to close", not a new opposite position.

**Automatable check:** Property test that close(100 percent) equals the exact size string, floored partials never exceed size and the remainder is zero or meets the venue rule for reduce-only minimums; test that every close-path builder sets reduce-only.

Pack: `perps` (candidate). Topics: `perps`, `money`, `execution`, `frontend`, `implementation`.

<a id="perps-signed-size-normalized-at-boundary"></a>

## Normalize position size to side plus absolute quantity at the boundary

Venues report position size either signed (negative means short) or as a side plus a magnitude. Map once at the boundary to an explicit side and an absolute quantity held as an exact decimal. All UI math (comparisons, clamps, percentages, close size, reduce-only caps) uses the absolute quantity, and the payload builder reapplies sign or side from the side field. Every size-dependent behavior is tested for a long and a short of the same magnitude, and the results must mirror.

**Apply when:** the venue reports signed size or a separate side, and any code compares, clamps, takes a percentage of, or builds a close or reduce-only size from a position.

**Boundary notes:** validating the wire shape is in types-boundary-validation (see types-boundary-validation); this card covers the sign convention after it parses.

**Checks:** no signed size reaches a component or a form validator; user input, which is always unsigned, is compared only with the absolute quantity; the mapper rejects a size whose sign contradicts an explicit side field; zero size maps to flat, not to a long of zero; helpers that stay signed are isolated, named as signed and tested on both sides; direction-dependent rules (PnL color, trigger direction, close side) take side as an argument.

**Anti-pattern:** Mix signed position size with unsigned user input in comparisons and ratios, and test only longs.

**Why it fails:** For a short the signed size is negative, so any positive input exceeds it. A partial close snaps to 100 percent, percentages go negative, a reduce-only cap collapses to zero or below, and a clamp to position size turns a small reduce into a full close or a rejected order. The defect reproduces only on shorts, so long-only tests and a long-only manual check both pass and it ships. The reverse mistake, reapplying sign twice in the payload, turns a close into an add.

**Bad example (illustrative):**

```text
if (input > position.size) closeAll() // size is -3 for a short, so always true
```

**Better example (illustrative):**

```text
if (gt(input, position.absQty)) closeAll() // side reapplied only in the payload builder
```

**Legitimate exceptions:** Pure helpers defined on signed size, such as PnL as signed size times price change, may stay signed when they are isolated and tested on both sides.

**Verification scenario:** Run the close dialog, reduce-only cap, percent slider, PnL color and TP/SL direction cases for a long and a short of the same magnitude: every result mirrors. A partial close of 1 on a short of 3 sends a buy of 1, not a full close. A payload for a short close carries the correct side exactly once.

**Automatable check:** A parametrized test helper that requires both sides for every case; a branded signed-size type that cannot be compared with plain numbers or unsigned quantities.

Pack: `perps` (candidate). Topics: `perps`, `types`, `frontend`, `implementation`, `review`.

<a id="perps-size-unit-one-canonical"></a>

## Keep one canonical size unit and convert once, at the order price

The draft stores exactly what the user typed, tagged with its unit (base, quote, contracts, margin or percent). The other unit is derived at render and never stored. Conversion happens in one place, uses the price the order kind executes at (the limit price for limit kinds, the venue-defined reference for market kinds), and floors to the lot. Everything downstream reads base, or the unit the venue takes from instrument metadata, and the review line shows the quantity that will be sent.

**Apply when:** the size input offers base and quote units, a Max button, a percent slider or a unit toggle, the summary shows order value, or a second instrument family with a different size unit is integrated.

**Boundary notes:** see money-amount-input-raw-string for the raw typed string.

**Checks:** size is a tagged value, not a number plus a unit flag or two fields synced by effects; a price tick never rewrites the typed string; a missing conversion price makes the result unknown, not zero; Max and slider notches are sized in base first and then rendered in the active unit; a quote-typed value does not lose a lot to display rounding; minimum-size copy is stated in the unit being typed, rounded up; each market size unit and contract multiplier come from metadata.

**Anti-pattern:** Store base and quote amounts and sync them with effects, convert quote to base at the current mark for every order type, and re-round on each toggle.

**Why it fails:** For a limit order the quote amount buys size at the limit price, so converting at mark changes the order value as soon as the limit is away from the market, and the payload differs from the preview. Two synced fields drift and rewrite the input on every tick. A toggle that does not convert reads 100 quote as 100 base. Two-decimal quote display cannot express lot times price, so an aligned base size renders slightly low, reads back as less than itself and floors again: Max, every slider notch and the toggle each lose one whole lot. Some products size in quote units or integer contracts, so assuming base is wrong by a factor of the price.

**Bad example (illustrative):**

```text
const base = unit === 'quote' ? size / markPrice : size
```

**Better example (illustrative):**

```text
const base = 'quote' in size ? floorToLot(div(size.quote, pricingPrice(orderKind))) : floorToLot(size.base)
```

**Legitimate exceptions:** A venue that accepts quote-sized orders natively: send as typed. A single-venue linear-only terminal may fix the unit, but the type still names it.

**Verification scenario:** Limit buy at half the mark with 100 quote: the summary value is about 100 and base equals 100 divided by the limit. Tick the price both ways and toggle ten times: the typed string never changes without a toggle and never drifts upward. Max in quote units places the same lot count as Max in base units. Typing the figure shown in the minimum message clears the minimum.

**Automatable check:** Round-trip property test that converting an aligned base size to its quote display and back returns the same base; type check that size is a union.

Pack: `perps` (candidate). Topics: `perps`, `money`, `forms`, `frontend`, `implementation`.

<a id="perps-leverage-and-margin-mode-are-venue-state"></a>

## Leverage and margin mode are venue-held settings, not ticket fields

Read the resolved leverage and margin mode per account and market from the venue and render them through the read loading and error states. No sizing, Max or submit runs while they are unread. An unset value is its own state that resolves through the venue fallback chain, not a client default. Changing leverage or mode is its own confirmed mutation, never a step hidden inside order submit. What the setting means per market comes from venue metadata.

**Apply when:** building a leverage control, a cross or isolated toggle, add or remove margin, defaults for a newly opened market, leverage badges, or any preview and Max that depend on leverage.

**Checks:** no leverage in local state defaults or browser storage; one derivation returns stored value, live ceiling and effective value, with the stored cap clamped to the live ceiling and the ceiling rounded down; the stored sentinel for "no cap" is never used as a divisor; gating is on the first read, not on every background refetch; a same-value change sends nothing; controls hold until the write settles and the value is re-read, with no automatic retry; margin mode availability is an exhaustive Record over the venue mode union.

**Anti-pattern:** Local leverage state initialized to 1x, the maximum or the last market value, used as a preview multiplier and written silently during submit.

**Why it fails:** Venues resolve an unset setting from a fallback chain that can end at the market maximum and isolated mode, so the client shows 1x cross while the order opens at 20x with a liquidation price far closer than previewed. The live ceiling can follow a margin rate that rises with open interest, so a listed 20x market may offer 10x, and rounding the implied ceiling up offers a value the venue refuses. Sizing at the market ceiling while the account cap loads gives a Max the venue rejects. On cross margin the setting commonly decides only how much a new order reserves, while on isolated it moves liquidation, so one slider story misleads.

**Bad example (illustrative):**

```text
const [leverage, setLeverage] = useState(1) // sent with the next order
```

**Better example (illustrative):**

```text
const { effective, ceiling, isFirstRead } = useVenueLeverage(market) // effective is null until read
```

**Legitimate exceptions:** A venue where leverage is only an order parameter or a client sizing preference: it is a ticket field, still bounded by config. A documented fixed venue default that product has approved as the displayed value.

**Verification scenario:** Fresh account on a market with no explicit setting: the ticket shows the venue-resolved leverage and mode and estimates use it. Account capped at 2x on a 20x market: no Max until the cap loads, then Max at 2x. Stored 20x with a live ceiling of 10x puts the control at 10x. Picking the current value sends nothing.

**Automatable check:** Unit tests for unset, cap above ceiling and non-integer implied ceilings; assertion that no leverage write occurs inside order submit; lint for leverage keys in browser storage.

Pack: `perps` (candidate). Topics: `perps`, `state`, `mutations`, `frontend`, `planning`.

<a id="perps-margin-preview-worst-case"></a>

## Size margin and Max from the venue worst-case model, never notional over leverage

Required margin, buying power, Max and the submit gate come from one pure function that follows the venue margin contract, and the preview row, Max and gate all call it. Prefer the venue margin or max-size preview for the exact live draft; the local figure is a labelled estimate that may only over-reserve. The model counts margin already used by positions, collateral locked under resting orders, fees at the worst-case rate, the adverse gap between the order price and mark, leverage tier caps and a sourced buffer for price drift, and floors Max to the lot.

**Apply when:** computing margin required, available to trade, the Max button, a 100 percent slider notch or client-side insufficient-margin validation.

**Boundary notes:** see perps-margin-nets-against-reducing-exposure for netting against a reducing position; which balance counts as collateral is in perps-three-balances-not-one.

**Checks:** no division by leverage in margin code outside the owner function; undeposited wallet funds are not buying power; both placement conditions are modelled where the venue has them (the lock fits in unlocked collateral, and equity after the lock covers account-wide initial margin); resting orders are charged once; the local requirement is never below the venue preview; venue insufficient-margin and tier-cap rejections map to specific copy.

**Anti-pattern:** required = size * price / leverage checked against free collateral, and Max as balance times leverage over price.

**Why it fails:** Venues that reserve at placement charge initial margin at the committed price plus the distance to mark on the losing side, since filling there books that loss at once, so the simple formula understates exactly the orders nearest the limit and a size that passes locally is rejected. Venues margin the worst case across the position and all resting orders per side and cap leverage by notional tier on that worst case, so the slider 100 percent always fails for accounts with resting orders. Fees, impact and a price tick between click and match push a naive Max over the line, so Max "never works".

**Bad example (illustrative):**

```text
const maxSize = freeCollateral * leverage / price
```

**Better example (illustrative):**

```text
const max = venuePreview.isForLiveDraft ? venuePreview.maxSize : floorToLot(estimateMax({ account, draft, rules }))
```

**Legitimate exceptions:** A venue that margins only at fill, or isolated margin where the user chooses the margin amount: follow that contract. A venue that computes max server-side: display its value.

**Verification scenario:** A buy limit 5 percent above mark at 10x shows a requirement at or above the venue preview. An account with collateral fully locked under a resting buy ladder shows zero available despite equity headroom, and its Max is below collateral times leverage. Click Max and submit against a fixture venue with fees and a small adverse price move: accepted.

**Automatable check:** Property test that the local requirement is never below the venue preview for random drafts.

Pack: `perps` (candidate). Topics: `perps`, `money`, `frontend`, `implementation`, `review`.

<a id="perps-margin-nets-against-reducing-exposure"></a>

## Net margin, max size and minimum notional against the exposure an order reduces

An order on the opposite side of an open position reduces that position first. The reducing part is min(order size, absolute position size) when the side opposes the position, else zero. Only the opening part, max(order size - reducing size, 0), needs new margin, priced by the worst-case model in perps-margin-preview-worst-case; the maximum order size is the reducible size plus the worst-case Max for the opening part. A reduce-only order is capped at the held size and needs no new margin; whether it is exempt from minimum size and minimum notional is read from the venue contract, and perps-full-close-exact-size applies the same rule. Without a native flag the client check blocks oversize closes, but the action needs the product decision in perps-reduce-only-never-increases-risk and is never labelled as guaranteed reduce-only.

**Apply when:** code computes margin required, maximum size, a slider or Max button, minimum-notional gating, reduce-only validation or a close size.

**Boundary notes:** when the venue reports a per-side maximum trade size, gate on it and use the formula only for the preview.

**Checks:** the reducing size, including on a flip, is subtracted before the opening part is margined; reduce-only failures have distinct reasons (no position, wrong side, size above position); a close size is floored to the lot and never rounded up; non-positive leverage yields a blocked state, never NaN; without a native flag, reduce-only is unavailable for resting orders and the position is re-read before a close is sent.

**Anti-pattern:** Charge order value / leverage for every order, cap every order at available * leverage and assume closes face the opening-order minimums.

**Why it fails:** A trader with no free margin cannot reduce or close because the form reports insufficient margin. The Max button understates size, a flip overstates margin, and where the venue exempts closes, a remainder below the minimum notional can never be closed. Without a venue flag a close is just an opposite order: a resting one can fill after the position changed, and a close sized from a stale row or rounded up to the lot crosses zero into opposite exposure.

**Bad example (illustrative):**

```text
const needed = size * price / leverage; const max = available * leverage
```

**Better example (illustrative):**

```text
const opening = Math.max(size - reducingSize({ side, size, position }), 0); const needed = worstCaseMargin({ draft, size: opening })
```

**Legitimate exceptions:** A venue with a native reduce-only flag: forward the flag and let the venue clamp.

**Verification scenario:** Long 1.0 with zero free margin: sell 1.0 passes, sell 1.5 needs margin for 0.5 only, buy 0.1 is blocked. A reduce-only sell below the minimum notional follows the venue exemption rule. Reduce-only with no position reports no position, not a size error. A close reviewed at 1.0 after the position shrank to 0.4 elsewhere is refused, not sent for 1.0.

**Automatable check:** Table-driven tests over side, position sign and size including the flip, plus a property test that a close size never exceeds the held size.

Pack: `perps` (candidate). Topics: `perps`, `money`, `frontend`, `implementation`, `review`.

<a id="perps-three-balances-not-one"></a>

## Treat equity, order margin and withdrawable collateral as three venue numbers

Account value, margin available for new orders and collateral that can be withdrawn are three different figures with different deductions. Bind each surface to the figure the venue publishes for it and never derive one from another outside one documented mapper. Which ledger holds collateral depends on the account mode, so resolve the source through an exhaustive mode map. Whether a published figure already includes collateral locked by resting orders, or already applies the margin gate, is a venue fact to verify, not to assume.

**Apply when:** a diff shows account value, available margin, a health bar or a shortfall warning, or fills Max on an order, withdraw or transfer form.

**Checks:** each form reads its own venue field; one account-summary owner produces every figure from one snapshot; displayed account value does not drop when a resting order reserves margin; a requirement that counts resting orders is never compared against equity that excludes their locks; withdraw Max uses the tightest gate the venue enforces, with a product-sourced headroom on the price-sensitive term only; a flat account can withdraw its exact balance; an unknown account mode blocks with an explicit unavailable state; a missing balance row is unknown, not zero; health tone follows the venue status, not a local threshold.

**Anti-pattern:** Compute available = equity - initial margin once and use it for the order Max, the withdraw Max and the header.

**Why it fails:** Withdrawable can be cut by a reserve stricter than initial margin, by pending withdrawals and by requirements re-evaluated at processing time, so a derived Max produces a request the venue rejects every time. A published withdrawable view that excludes only order locks overstates the ceiling by the margin backing open positions. Equity that excludes order locks makes money look vanished when an order rests, and comparing it with a requirement that already counts those orders bills each order twice and warns on an account that fits. In a unified account mode the per-product field reads zero or stale.

**Bad example (illustrative):**

```text
const available = equity - initialMargin; orderMax = available; withdrawMax = available
```

**Better example (illustrative):**

```text
const summary = accountSummary(snapshot); orderMax = summary.orderMargin; withdrawMax = summary.withdrawCeiling
```

**Legitimate exceptions:** A venue that publishes only equity and margin with a documented formula: implement it once and label the result an estimate.

**Verification scenario:** Collateral 20, initial margin 5, withdrawal reserve 10: withdraw Max shows 10 and the order form shows the larger order margin. Place a resting order: account value is unchanged and available drops. With a position open, a withdrawal at Max passes a simulation and still passes after a small adverse mark move; flat, Max leaves zero. An unknown mode string blocks.

**Automatable check:** Fixture tests simulating a withdrawal at Max for flat, positioned and order-locked accounts, and a lint rule against subtracting margin from equity outside the summary mapper.

Pack: `perps` (candidate). Topics: `perps`, `money`, `frontend`, `implementation`, `review`.

<a id="perps-funding-sign-period-and-notional"></a>

## Carry funding with its period, user-side direction and notional basis

A funding rate is meaningless without the period it applies to, the settlement cadence, who pays, and the price used for the payment notional. The mapper emits a typed value: rate, calculation window, settlement interval, periodic or continuous settlement, next settlement from server time, and predicted or settled. One function converts a payment record to the account side (pay, receive or none) and normalizes zero; every consumer calls it. Window, interval, sign convention and notional price come from venue metadata, never from a constant.

**Apply when:** code shows a funding rate, countdown, annualized figure, funding per position or in history, an estimated payment or a total that includes funding.

**Boundary notes:** for funding inside PnL totals see perps-pnl-components-not-interchangeable.

**Checks:** the formatter accepts only the typed value and its label states the period; the per-interval rate is the window rate divided by window / interval taken from the market itself; annualization uses the real interval under an explicit label; color and copy follow the user effect, not the rate sign; the countdown is the next boundary from the shared server clock and is absent when funding never settled; the estimate uses the documented notional price.

**Anti-pattern:** Print the rate field as a bare percent, annualize with a fixed 3 x 365, color positive green and let each consumer read the raw sign of the payment record.

**Why it fails:** Venues compute a multi-hour rate but settle hourly at a fraction of it, or continuously, and interval counts differ between deployments, so a fixed denominator is plausibly wrong by 8x or more. A positive rate usually means longs pay shorts, so green tells a long the opposite of the truth. Payment records may be signed from the venue side rather than the account side, so folding in the raw sign subtracts funding received; a flat-account reconciliation exposes it as a gap of twice the funding.

**Bad example (illustrative):**

```text
label = (rate * 100) + "%"; apr = rate * 3 * 365; color = rate > 0 ? green : red
```

**Better example (illustrative):**

```text
const perInterval = funding.windowRate / (market.windowSec / market.intervalSec); const effect = fundingEffect({ record, side })
```

**Legitimate exceptions:** Continuous-funding venues show an accrual rate and no countdown. An undocumented period or sign is a question to ask, not a guess.

**Verification scenario:** Hourly settlement with a multi-hour formula rate of 0.08% over 8 intervals: the display shows 0.01% per hour and annualizes with 24 x 365. Positive rate: the long row shows pay, the short row receive; negative mirrors. A flat fixture account reconciles: equity change equals deposits plus fill PnL plus summed converted funding. A never-settled market shows no countdown.

**Automatable check:** The reconciliation test above, and a lint rule flagging literals 8, 24 and 365 in funding code outside the helper.

Pack: `perps` (candidate). Topics: `perps`, `money`, `frontend`, `implementation`, `review`.

<a id="perps-pnl-components-not-interchangeable"></a>

## Name and source each PnL figure separately

Price PnL, fees, funding, gross realized PnL, net PnL, unrealized PnL and return percentages are separate figures with separate sources. One mapper produces them per fill and per position with the source in the name, and no figure is derived from another unless the identity is exact. Prefer the venue-reported value and tag each number as venue-reported or client-derived. Whether a venue PnL field includes fees or funding is read from its documentation and proven by a reconciliation fixture.

**Apply when:** code renders position rows, account totals, trade history, performance or share cards, or derives entry price and PnL from fills.

**Boundary notes:** for provenance labelling in general see money-value-provenance.

**Checks:** per position on a linear contract sized in base units, unrealized PnL is signed size * (mark - entry); multiplied or inverse contracts use the venue formula, and the venue value wins when reported; funding sits in its own column; the amount and its percentage share one basis and so one sign; the return denominator is a product decision and the figure is null when margin is unknown; with no positions the total is known-none, rendered per the product rule and distinct from unknown; a derived entry price averages only fills that grow the absolute position and restarts at the flip fill price; fees are subtracted exactly once; per-bucket history amounts are accumulated explicitly; rows are priced from one snapshot.

**Anti-pattern:** Sum per-fill closed PnL and call it net, compute position PnL as equity minus collateral, or show a funding-inclusive percentage beside a price-only amount.

**Why it fails:** Per-fill realized PnL is commonly price PnL before fees and funding is a separate ledger, so the sum misses the balance by exactly those amounts. Equity folds in pending funding, so equity minus collateral reports accrued funding as price PnL. A percentage net of funding beside a gross amount can show positive dollars and a negative percent in one cell. Re-averaging entry on reductions drifts it until realized plus unrealized no longer sum to the account change.

**Bad example (illustrative):**

```text
const netPnl = fills.reduce((sum, fill) => sum + fill.closedPnl, 0)
```

**Better example (illustrative):**

```text
const row = mapFillPnl(fill); totals.gross += row.grossPnl; totals.fees += row.totalFee; totals.net += row.netPnl
```

**Legitimate exceptions:** A venue that publishes net PnL is used as is. With no account series, label the sum as realized before fees and funding. Funding-inclusive PnL, if product chooses it, is labelled and applied to amount and percentage alike.

**Verification scenario:** A fill with PnL 15 and total fee 0.26 shows net 14.74 and the daily total equals the sum of nets. Buy 1 at 100, buy 1 at 110, sell 1 at 120, sell 2 at 90: entry is 105, still 105, then 90 for the short of 1. A position with accrued funding and no price move shows PnL 0 and a non-zero funding cell. A flat account renders known-none, distinct from a loading one.

**Automatable check:** Mapper and reducer tests with the sequences above, plus a test that amount and percentage signs match.

Pack: `perps` (candidate). Topics: `perps`, `money`, `frontend`, `implementation`, `review`.

<a id="perps-market-order-is-a-protected-limit"></a>

## Build market orders as bounded immediate-or-cancel limits priced once

On an order-book venue a market order is an immediate-or-cancel limit at a bound: the reference price moved by the tolerance toward the costlier side and aligned to the tick. One resolver returns the price the order commits to, and the preview, margin, fees, liquidation estimate, confirm dialog and submitted payload all read it, so tolerance is applied exactly once. Dispatch requires a finite positive live reference. Depth inside the band is checked on the live book, again at confirm.

**Apply when:** code implements market orders, market closes or triggered-market orders, or shows estimated slippage, max spent or min received.

**Boundary notes:** for trigger side rules see perps-trigger-direction-and-reference; for generic tolerance bounds see money-slippage-request-bounds.

**Checks:** every market-style request carries a finite positive tick-valid price; the buy bound is above and the sell bound below the reference; max spent equals size times the committed price; the depth walk stops at the first level outside the band and the band equals the order tolerance; a book that has not arrived is unknown, not empty; insufficient visible depth shows unknown slippage, not zero; validation and the margin verdict are re-evaluated at confirm; a crossing limit is an advisory note, never a block; analytics notional uses the reference, not the bound.

**Anti-pattern:** Send a market order with no price or an extreme price, preview at the mid while submitting at a separately computed bound, or check depth only on the first click.

**Why it fails:** Without a bound the order sweeps a thin book; with a missing reference the bound is zero or NaN. The venue margins the order at its bound, so a mid-priced preview understates margin for orders nearest the gate. Applying a second tolerance prices the order at (1 + s)^2 times the reference, so order value and margin reserve run high by about another s and Max shrinks to match. A depth check run only at first click lets a confirm dialog left open send into a side that has since emptied.

**Bad example (illustrative):**

```text
place({ type: "market", size }); preview.value = size * mid
```

**Better example (illustrative):**

```text
const entry = committedPrice({ side, reference, tolerance, tick }); place({ tif: "ioc", price: entry, size })
```

**Legitimate exceptions:** A venue with a native market type that carries its own protection, or one that margins market orders at mark regardless of the bound. Where a capped book view hides real depth, use an uncapped depth source.

**Verification scenario:** Reference unavailable: no request and an explicit message. At 0.5% tolerance the buy bound is within one tick of mid * 1.005 and max spent equals size times the bound. Empty ask side: market buy blocked with a depth message, limit buy allowed. Depth removed while the confirm dialog is open: confirm sends nothing.

**Automatable check:** A builder test that bound / reference - 1 is within one tick of each tolerance, and a browser test that empties the fixture book between review and confirm and captures no write.

Pack: `perps` (candidate). Topics: `perps`, `execution`, `frontend`, `implementation`, `review`.

<a id="perps-retry-signed-delta-exact-bytes"></a>

## After an ambiguous response, resend the exact signed bytes of a balance delta

A signed request that moves value as a delta (an isolated-margin add or remove, an internal transfer, a withdrawal) is deduplicated by the venue on its signed payload, not on intent. After a timeout, a server error or a dropped connection, keep the serialized signed request for that attempt and retry only those bytes, honoring any retry-after hint. Re-signing creates a second independent delta. Model the result as applied, rejected or unknown, and while it is unknown block a new delta of the same kind for that account.

**Apply when:** a signed delta mutation can receive a timeout, a 5xx or a lost connection, or sits behind a generic retry helper or a Try again button.

**Boundary notes:** for the general unknown-outcome ladder and identity per deliberate action see execution-outcome-unknown-timeout-ladder and execution-fresh-identity-per-deliberate-action; this card adds byte identity for signed deltas.

**Checks:** the signer is called once per user action across all retries; the retry body is byte-identical including salt, nonce and timestamp; a replay or signature-already-used rejection maps to unknown, not to success or failure; the unknown state names where to check history; a fresh user action after resolution signs a fresh request; delta mutations bypass the generic retry wrapper.

**Anti-pattern:** Wrap the mutation in a retry helper that rebuilds the request, or wire Try again to the same submit function, so each attempt gets a new salt, timestamp and signature.

**Why it fails:** Each re-signed request is a distinct valid instruction, so a margin add or transfer can apply twice when the first one was admitted but its response was lost. A signature-already-used rejection only proves the original was ingested, not that it succeeded. A balance snapshot cannot attribute a change to one request when other fills, funding or transfers move the same balance, so polling the balance does not settle it either.

**Bad example (illustrative):**

```text
retry(() => send(sign(buildMarginAdd({ amount, nonce: newNonce() }))))
```

**Better example (illustrative):**

```text
const signed = attempt.signedBytes; const result = await resendExact({ signed, retryAfter })
```

**Legitimate exceptions:** A failure proven to be before dispatch, see execution-not-dispatched-needs-proof, or a rejection the venue documents as returned before submission. Absolute set operations such as setting leverage cannot double-apply on resend; for their retry policy see perps-leverage-and-margin-mode-are-venue-state.

**Verification scenario:** A fixture returns 503 after admitting a margin add. The retry body is byte-identical, a replay rejection leaves the UI in unknown with a pointer to history, a second add for that account is blocked meanwhile, and no second signature is requested from the wallet or the delegated key.

**Automatable check:** A test asserting one signer call per user action across retries, and a lint rule that delta mutations do not pass through the generic retry helper.

Pack: `perps` (candidate). Topics: `perps`, `execution`, `frontend`, `implementation`, `review`.

<a id="perps-amount-and-time-units-per-operation"></a>

## Encode amounts and timestamps per operation and name the unit in the type

One venue can mix raw base-unit integers, decimal strings, seconds and milliseconds across its operations, and publish market statistics as raw fractions and base-unit quantities. Give each operation its own codec: the input is a typed human decimal and the output type names the unit (base units, decimal amount, epoch seconds, epoch milliseconds). The signed structure and the request body are built from the same codec output so they cannot diverge. Read-side statistics are converted once in the mapper with the unit in the field name.

**Apply when:** code builds payloads for deposit, withdraw, transfer, margin adjustment or orders, maps their history rows, or renders header statistics such as funding, open interest and 24h change.

**Boundary notes:** for decimals per asset and timestamp units see money-base-units-from-asset-decimals and money-timestamp-units-by-wire; this card is about one venue mixing units between operations.

**Checks:** no shared amount or time helper serves every request; each operation has a fixture asserting its exact wire strings; a history row is mapped with its own unit, which may differ from the matching input; open interest in base units is multiplied by mark before it carries a currency sign; a funding fraction is converted to percent once; the 24h change is relative to the previous-day price; signing time uses the unit and resolution the signed structure expects.

**Anti-pattern:** Use one toWireAmount helper and the current millisecond clock for every request, and render statistics fields exactly as delivered.

**Why it fails:** On a venue where some operations are verified on chain, those can take raw base-unit integers and second-resolution timestamps while ledger-only operations take decimal strings and milliseconds; read each operation's contract rather than assuming either split. Mixing them moves a million times too much or too little at 6 decimals, or yields a signature rejected as stale or invalid that looks like a signing bug. On the read side, open interest in contracts shown with a currency sign and a raw funding fraction shown as percent are wrong by the mark price or by 100.

**Bad example (illustrative):**

```text
const body = { amount: toWireAmount(amount), time: Date.now() }
```

**Better example (illustrative):**

```text
const wire = withdrawCodec.encode({ amount, now }); const body = wire.body; const signed = sign(wire.struct)
```

**Legitimate exceptions:** None for operations that move money. A venue that uses one unit everywhere still gets named unit types, with a single codec.

**Verification scenario:** Encode 10 units of a 6-decimal asset for a withdrawal and for a transfer: one yields 10000000 with a seconds timestamp, the other 10 with milliseconds, and each signed payload equals its body. Compare one market header against the venue reference figures for funding percent and open-interest notional.

**Automatable check:** Branded unit types so a decimal amount cannot be passed where base units are expected, plus per-operation fixtures asserting exact wire strings.

Pack: `perps` (candidate). Topics: `perps`, `money`, `types`, `frontend`, `implementation`.

<a id="perps-cancel-and-modify-outcomes"></a>

## Classify cancel rejections and send modifies in the venue quantity contract

A cancel rejection is one of four kinds: terminal (the order already filled or was cancelled), transient (the order is still in flight), unknown (the id is not visible) or superseded (a cancel is already queued). Map stable venue codes to those kinds in an exhaustive record and react per kind; unrecognized codes are not retried. A modify follows the venue contract for quantity, which is often the new total including what already filled, so the form works in remaining quantity and the mapper converts with the live cumulative fill.

**Apply when:** code handles cancel, cancel by client id or cancel-all responses, or builds an edit-order form or chart drag-to-amend.

**Boundary notes:** for stable error codes and acknowledgement versus final state see contracts-error-envelope-stable-codes and perps-order-ack-is-not-outcome.

**Checks:** terminal refetches that order and shows its real final state with a neutral notice; transient gets a bounded retry; unknown reconciles from order updates; superseded is silent; cancel-all is confirmed from the open-orders read, not from the acceptance; a rejected modify leaves the order as it was and refetches it; save is disabled when nothing changed; orders with attached trigger legs route to cancel-and-replace with its own warning; the form says when an edit loses queue priority.

**Anti-pattern:** Retry every cancel error or show Cancel failed and leave the row open; send the desired remaining quantity as the modify quantity.

**Why it fails:** An already-terminal rejection usually means the order filled first: a retry cannot succeed and a failure toast hides a fill the trader now owns. Cancel-all accepted does not mean the book is empty, because orders race fills. With a total of 10 and 4 filled, sending 3 to leave 3 resting is rejected as not above filled, or on another venue resizes the order to the wrong size. A price change or size increase moves the order to the back of its level, while a same-price decrease usually keeps priority, so presenting edit as free of side effects misleads.

**Bad example (illustrative):**

```text
onCancelError: () => toast("Cancel failed"); modify({ id, quantity: remaining })
```

**Better example (illustrative):**

```text
const kind = cancelKind[code]; modify({ id, quantity: toWireQuantity({ remaining, filled: order.filled }) })
```

**Legitimate exceptions:** A venue whose modify takes remaining quantity: the mapper encodes that instead and the form is unchanged. A venue without a modify operation uses cancel-and-replace; for protective orders see perps-protection-replace-place-before-cancel.

**Verification scenario:** Cancel an order that fills during the request: the row becomes Filled with a neutral notice and no retry is sent. Order 10, filled 4, user sets remaining 3: wire quantity is 7. A fill to 8 during the modify yields a rejection and an unchanged, refetched row. Cancel-all with one order filling mid-flight shows that fill, not a cancel.

**Automatable check:** An exhaustiveness test over the published cancel codes and a mapper unit test for the quantity conversion.

Pack: `perps` (candidate). Topics: `perps`, `execution`, `frontend`, `implementation`, `review`.

<a id="perps-forced-close-events-are-distinct"></a>

## Model liquidation, deleveraging and settlement as their own fill kinds

Partial liquidation, backstop liquidation, auto-deleveraging and instrument settlement are system events, not trades the user placed. Derive a discriminated fill kind once in the mapper from the venue flags and ledger types, fail loudly on an unknown type, and give each kind its own row label, its own fee or penalty handling and its own optional order reference. After a partial liquidation the remaining position stays visible with fresh margin state.

**Apply when:** code builds trade or position history, fill notifications, PnL attribution, the fills-to-orders join, or position state after a margin breach.

**Boundary notes:** notification wording is a product decision; the type distinction is a correctness requirement. For delivery of these events see terminal-critical-events-bypass-batching.

**Checks:** the kind union is closed and mapped through an exhaustive record; the order reference is optional for system kinds and the join does not assume it; where the venue distinguishes them, the liquidated leg, the deleveraged counterparty leg and settlement each map from their own flag; fees and penalties are shown as reported, including none; position size after each event matches venue state; a liquidation warning does not assume the whole position closes at the estimated price.

**Anti-pattern:** Join every fill to an order by id and mark forced closes with one liquidation boolean, or let the position row simply disappear.

**Why it fails:** System fills can carry a zero or absent order id, so the join throws or renders a blank row. Where the venue distinguishes them, the liquidation flag marks only the liquidated account leg, the deleveraged counterparty carries a different flag and settlement a third, so checking one flag makes a forced reduction look like a trade the user placed. Many venues liquidate in stages, with a fraction reduced first, a backstop taking over below a lower threshold and a penalty up to a stated cap. Without distinct kinds the trader cannot tell why size changed and realized PnL attribution is wrong.

**Bad example (illustrative):**

```text
const order = ordersById[fill.orderId]; const label = fill.isLiquidation ? "Liquidation" : order.type
```

**Better example (illustrative):**

```text
const kind = fillKind(fill); const order = kind === "order" ? requireOrder(fill) : null
```

**Legitimate exceptions:** A venue that exposes only a generic fill with a liquidation flag: carry the flag and do not invent finer kinds.

**Verification scenario:** A fixture ledger with a 20% partial liquidation, then a backstop takeover, then a deleverage fill with no order reference on another market: three differently labelled rows, no broken order link, sizes after each match venue state, realized PnL shown on the deleverage row, and an unknown fill type fails in the mapper.

**Automatable check:** A mapper unit test over the flag combinations and an exhaustive record over the fill-kind union.

Pack: `perps` (candidate). Topics: `perps`, `realtime`, `frontend`, `implementation`, `review`.

<a id="perps-market-session-gates-from-venue-flags"></a>

## Gate order entry on venue mode flags, not on the underlying market hours

On most venues a perpetual on an equity, index or commodity keeps matching, funding and liquidating when the underlying exchange is closed, and the session only changes which reference feeds drive index and mark; some instead switch it to a restricted mode, which they publish as a flag. One resolver returns the entry capability from venue state: open, reduce-only (instrument close-only, margin call, liquidation scope) or cancel-only (maintenance). Cancel stays enabled in every restricted mode; close stays enabled wherever the mode accepts reducing orders, and in cancel-only it is disabled with the venue reason unless a documented close-position instruction still runs. The underlying session is informational copy about price sourcing.

**Apply when:** code decides when the order form is disabled, or a design adds a market-closed badge, a maintenance banner or a close-only state.

**Boundary notes:** badge and banner wording are product decisions; do not invent them. Stale-feed gating is a different axis, see terminal-frozen-stream-must-look-stale.

**Checks:** the capability comes from venue flags for the venue, the instrument and the account, combined to the most restrictive; reduce-only capability limits size to the reducing part; cancel-only disables submit but not cancel; no client clock or trading-calendar table disables entry; an unknown mode value fails at the mapper rather than defaulting to open.

**Anti-pattern:** Grey out the form when the underlying exchange is closed while ignoring the venue cancel-only or close-only state.

**Why it fails:** Blocking entry by session strands a trader who needs to reduce risk overnight on a market that is still liquidating. In the other direction, during venue maintenance new orders are rejected while cancels still work, and a close-only instrument accepts only reducing orders, so a form that ignores those flags produces a wall of rejections and hides the one action that still works.

**Bad example (illustrative):**

```text
const disabled = !isUnderlyingSessionOpen(market, Date.now())
```

**Better example (illustrative):**

```text
const capability = entryCapability({ venueMode, instrumentMode, accountMode })
```

**Legitimate exceptions:** A venue that really halts matching per session publishes that as a mode flag, and the resolver follows it.

**Verification scenario:** Underlying closed, venue normal: form enabled with the session note. Venue in maintenance: submit disabled, cancel enabled, close disabled with the venue reason unless a documented close-position instruction runs. Instrument close-only: only reducing sizes are accepted and an opening order is blocked with the reason. Account in liquidation scope: reduce-only.

**Automatable check:** A table test of the capability resolver over the full flag matrix.

Pack: `perps` (candidate). Topics: `perps`, `state`, `frontend`, `planning`, `implementation`.

<a id="perps-close-all-per-target-outcomes"></a>

## Settle close-all per position, reduce-only and with no blind retry

Close-all and bulk cancel are one operation with an outcome per target: closed, rejected with a reason, or verifying. The operation continues past an individual failure. Each close is a reduce-only or close-position instruction. Because of that, an overlapping close cannot open exposure; the operation's in-flight state disables its own trigger, and a second close the venue rejects or trims is reported per target. An unknown outcome reconciles from fills and position events inside a bounded window and is never resubmitted automatically, and the whole operation is fenced to the account that started it.

**Apply when:** code implements close-all, bulk cancel, or a close reachable from several entry points such as a table row, a chart line and a dialog.

**Boundary notes:** for partial and unknown outcomes and account fencing see execution-type-unknown-and-partial-outcomes and execution-fence-mutations-to-account; for sizing each close see perps-full-close-exact-size.

**Checks:** the result lists every target with its own state; one failure does not relabel earlier successes or skip later targets; the operation's in-flight state disables its own trigger; a second close the venue rejects or trims is reported on that target; a timeout moves the target to verifying, not failed; pending state survives an account switch and stays attributed to the original account; the summary copy counts closed, rejected and verifying separately.

**Anti-pattern:** Loop over positions awaiting each close, abort on the first error with Close all failed, send plain opposite orders, and retry on timeout.

**Why it fails:** Positions closed before the failure are reported as failed and the remaining ones are silently untouched, so the trader believes nothing happened while exposure changed. A row close overlapping close-all submits twice, and unless the order is reduce-only the second one flips into an opposite position. A retry after a lost response closes twice. Clearing pending state on account switch hides whether the old operation completed.

**Bad example (illustrative):**

```text
for (const position of positions) await closePosition(position) // first throw aborts the rest
```

**Better example (illustrative):**

```text
const outcomes = await closeTargets({ targets: positions.map(toReduceOnlyClose), accountId })
```

**Legitimate exceptions:** A venue-native atomic close-all operation, which returns one outcome; still reconcile it from position events.

**Verification scenario:** Three positions, the second close rejects: results read closed, rejected with reason, closed. A row close concurrent with close-all opens no exposure, and the rejected or trimmed second close is reported on its target. A lost response followed by the position leaving the stream is marked closed with no second request. Switching account mid-operation keeps the outcomes on the original account.

**Automatable check:** Integration tests with per-target fault injection asserting no automatic resend per position, that every close carries reduce-only, and the per-target outcome list.

Pack: `perps` (candidate). Topics: `perps`, `execution`, `mutations`, `frontend`, `implementation`.

<a id="perps-order-variants-exhaustive-builders"></a>

## Resolve order variants through an exhaustive typed builder table

The order draft is a discriminated union with one member per order type, and each member holds only the fields and flags valid for it. A record keyed by order type maps to a builder that returns a payload or a validation error, so adding a type without a builder fails to compile and an invalid flag combination cannot be represented. Unknown venue enums fail at the boundary. Choose the branching tool by shape: a record lookup for value mapping, a discriminated-union match for single-key variants, a structural pattern-matching library only for nested multi-field patterns, and none of them inside tick-rate hot paths.

**Apply when:** the ticket supports several order types (market, limit, stop, stop-limit, time-sliced, scaled) with time-in-force and flags, or a diff adds a variant or a flag.

**Boundary notes:** in a tick-rate path such as per-message book or price handling, resolve the variant once outside the loop and call the resolved function; allocating matcher objects or closures per tick costs frames. For generic branching rules see ui-branching-explicitness.

**Checks:** no submit handler branches over a bag of optional fields; each payload contains exactly its variant fields; flag compatibility (post-only with market, reduce-only with attached protection) lives in the union; copy states the time-in-force behavior (remainder cancelled, all or none, rejected if it would cross); the market variant shows its price bound and handles an unfilled remainder; a structural matcher appears only where two or more nested fields decide the branch.

**Anti-pattern:** One submit handler with conditionals over optional fields, flags combined freely, and the same matching helper used everywhere including per-tick code.

**Why it fails:** Invalid combinations are representable and reach the venue, or worse a field is silently dropped: a stop price that is ignored turns the order into a plain market order. A new variant misses one branch. At many venues a market order is a marketable limit with a bound and can leave a remainder the UI never explains. A heavy matcher on a single key adds cost and indirection with no added safety, and in a hot path it adds allocation on every message.

**Bad example (illustrative):**

```text
if (draft.stopPrice && draft.type !== "limit") payload.trigger = draft.stopPrice
```

**Better example (illustrative):**

```text
const builders: Record<OrderType, OrderBuilder> = { market, limit, stop, stopLimit }; const result = builders[draft.type](draft)
```

**Legitimate exceptions:** One or two order types with no growth expected can use a plain conditional. For the price bound see perps-market-order-is-a-protected-limit.

**Verification scenario:** Adding an order type without a builder fails compilation. Each variant payload snapshot contains exactly its fields. Post-only on a market draft cannot be constructed. An immediate-or-cancel partial fill shows the remainder as cancelled. An unknown venue order-type string fails in the mapper.

**Automatable check:** Type-level exhaustiveness on the builder record and schema tests per variant.

Pack: `perps` (candidate). Topics: `perps`, `types`, `variants`, `frontend`, `implementation`.

<a id="perps-market-identity-is-venue-qualified"></a>

## Key markets, positions and orders by a qualified market id

A ticker symbol is not an identity when a venue hosts several books or a terminal aggregates venues. Create one qualified id (book plus symbol) at the boundary, normalize it once for casing and default-book aliases, and use it for every key: positions, orders, subscriptions, favorites, routes and stream merges. Every row carries its resolved market, including the wire asset index and precision, and a request takes those from the row. A market that cannot be resolved, or a catalog that is not ready and fresh for that book, fails before dispatch.

**Apply when:** code keys or joins positions, orders, subscriptions, favorites or routes by market, resolves an asset index for a request, or adds a second book or venue.

**Boundary notes:** instrument precision and limits come from the resolved market, see perps-instrument-config-from-venue.

**Checks:** no join compares bare symbols; the qualified id is a distinct type created by one constructor; stream merges key by the qualified id; the request asset index comes from the row market, never from a lookup in a default catalog; route ids are normalized before lookup so casing does not remount the workspace; the catalog for the row book is asserted ready before dispatch.

**Anti-pattern:** Key by ticker symbol, compare with strict equality and resolve the order asset index by symbol in the default catalog.

**Why it fails:** The same symbol on two books merges two positions into one row, shows the wrong mark and, worst, submits with another market asset index, so a close for one book trades a different market. Stream merges overwrite rows across books. A casing difference in a route id remounts the workspace or misses the catalog and renders an empty market.

**Bad example (illustrative):**

```text
const market = markets.find(item => item.symbol === position.symbol)
```

**Better example (illustrative):**

```text
const market = resolveMarket(position.marketId) // throws when the book catalog lacks it
```

**Legitimate exceptions:** A single-book venue needs no book component, but still normalizes casing through the same constructor.

**Verification scenario:** Two books list the same symbol with a position on each: two rows with their own marks, and closing one sends that book asset index. A route with different casing resolves to the same market without a remount. A position whose book catalog has not loaded blocks the close with a reason and sends nothing.

**Automatable check:** A branded type for the qualified id and a lint rule against joins on bare symbol equality.

Pack: `perps` (candidate). Topics: `perps`, `types`, `data`, `frontend`, `implementation`.

<a id="perps-rate-limit-kinds-need-different-reactions"></a>

## React to each rate-limit kind differently

A limit rejection is one of several kinds: a request-rate limit, an action-rate budget, an open-order capacity cap or venue overload. Map each stable code to its reaction in an exhaustive record. Reads and cancels wait for the retry-after hint and retry; an order create rejected for request rate is shown with the wait and resubmitted only by a new user action after revalidation; capacity tells the user to cancel orders; overload is surfaced. Only some kinds are fixed by waiting. Cancels are never queued behind a create wait, and polling prefers streams and filtered low-weight reads so reads do not starve order placement.

**Apply when:** code handles HTTP 429 or 503 responses or venue limit codes, adds a retry or backoff helper, or designs polling for tickers, books or orders.

**Boundary notes:** for stable error codes see contracts-error-envelope-stable-codes. Retrying a mutation whose outcome is unknown is a different question, see perps-cancel-replace-unknown-outcome and execution-outcome-unknown-timeout-ladder.

**Checks:** a capacity rejection is never retried automatically and its copy points to open orders; a request-rate rejection of a read or cancel waits for the hinted time, not a fixed backoff, and a rejected create is never resent automatically; unknown limit codes are surfaced and not retried; heavy reads (full tickers, deep books, unfiltered orders) are not polled where a stream or a filtered read exists; batch responses that return a rejection as a single-element array are unwrapped; cancel requests use their own path and budget.

**Anti-pattern:** One Too many requests, retrying handler with exponential backoff for every 429.

**Why it fails:** An open-order cap is a capacity limit: waiting never frees a slot, so the retry loop spins while the trader sees a spinner instead of the instruction to cancel orders. Request weight is commonly counted per network address and shared by every tab and every user behind the same address, so aggressive polling of heavy reads starves order placement. Action budgets are per account and cancels are often free, so a cancel queued behind a create wait delays the one action that reduces risk.

**Bad example (illustrative):**

```text
if (status === 429) return retryWithBackoff(request)
```

**Better example (illustrative):**

```text
const reaction = limitReaction[code]; if (reaction.kind === "capacity") return showCancelOrdersPrompt()
```

**Legitimate exceptions:** None. A venue with a single limit kind still maps its code explicitly so a later kind fails the exhaustiveness check.

**Verification scenario:** Return the capacity code on create: no automatic retry and copy that points to open orders. Return a request-rate code with a retry-after hint on a read: one retry after the hinted delay. Return it on a create: the wait is shown, nothing is resent, and a new submit revalidates first. During that wait a cancel is sent immediately.

**Automatable check:** An exhaustiveness test on the limit-code map.

Pack: `perps` (candidate). Topics: `perps`, `errors`, `frontend`, `implementation`, `review`.

<a id="perps-delegated-trading-key-scope-and-expiry"></a>

## Treat a delegated trading key as a scoped, expiring credential

A delegated trading key (session or agent key) is narrower than the wallet: it typically cannot withdraw, it expires, and closing a connection does not revoke it. Model it as a status union (absent, valid, expiring soon, expired), check it before a mutation starts, and make re-delegation a deliberate user step rather than a replay in the middle of a submit. Owner-only operations go through the wallet signer by type. Signing time derives from a server-time offset. Whether sign-out revokes the key at the venue, which may need an owner signature, is a security decision to source; the UI never implies a key is revoked when it is not.

**Apply when:** code implements enable trading, session restore, order signing, withdrawals or transfers, sign-out, or timestamps inside signed requests.

**Boundary notes:** where and how the key is stored is a security decision to raise, not to improvise. For replay after auth refresh and signer capability policy see execution-auth-refresh-never-replays-mutations and chain-signer-allow-only-capability-policy.

**Checks:** mutation inputs take a trading signer or an owner signer as distinct types; expiry is evaluated before the request is built; an expired or absent key blocks submit with a re-enable prompt and sends nothing; a mutation interrupted by expiry is not replayed after re-delegation; the signed timestamp uses the server offset; which operations the key may sign is read from the venue contract; restore validates the key against the venue, not only local storage.

**Anti-pattern:** Assume the session key can do everything the wallet can, discover expiry from a rejected order, and sign with the device clock.

**Why it fails:** A withdraw flow wired to the delegated key fails with a signer mismatch that reads like a bug. An expired key rejects the order at the worst moment, and re-delegation then needs a wallet prompt the trader did not expect while the market moves. Signed requests embed a timestamp with a short freshness window, so device clock skew produces invalid-signature errors that are really clock errors. A key left valid after sign-out can still trade.

**Bad example (illustrative):**

```text
await withdraw({ amount, signer: sessionKey, timestamp: Date.now() })
```

**Better example (illustrative):**

```text
await withdraw({ amount, signer: ownerSigner, timestamp: serverNow() }) // ownerSigner is not assignable from a trading key
```

**Legitimate exceptions:** Server-custodied keys, where scope and expiry are enforced by the backend and the client only reflects the status.

**Verification scenario:** Device clock skewed by 10 minutes: orders still sign validly using the offset. Key expired: submit is blocked with a re-enable prompt and no request is sent. A withdrawal requests the wallet signature, never the delegated key. After sign-out the UI shows the key as revoked only when the venue reports it revoked.

**Automatable check:** A type-level split between owner signer and trading signer in mutation inputs, so passing the wrong one fails compilation.

Pack: `perps` (candidate). Topics: `perps`, `security`, `signing`, `frontend`, `implementation`.

<a id="perps-deposit-credit-lags-chain-confirmation"></a>

## Show the venue credit state, not the chain receipt, as deposit completion

A confirmed funding transaction is not yet tradable collateral. The venue credits after its own confirmation count and ingestion, so progress has distinct stages: wallet approval, transaction submitted, chain confirmed, venue credited. The last stage is driven by the venue deposit history or balance, never by the chain receipt or a relayer status. Map every documented funding status, keep an unknown status visible as raw text, and show the confirmation count where the venue reports it.

**Apply when:** code builds deposit or withdrawal progress, enables trading after a deposit, or maps funding history rows.

**Boundary notes:** for observing the receipt itself see execution-settle-on-observed-chain-receipt; this card covers the gap between the receipt and the venue ledger.

**Checks:** the form does not show a spendable balance before the venue credits; a removed or reorged deposit and a failed-and-credited-back withdrawal each have their own state; minimum-deposit and approval failures are reported before any transfer is attempted; a balance that has not arrived is shown as crediting, not as zero; the status map is exhaustive and an unknown value does not fall back to complete; no fixed timer promotes a deposit to credited.

**Anti-pattern:** Mark the deposit complete and enable the order form when the chain receipt or relayer status says confirmed.

**Why it fails:** The venue balance is still zero at that moment, so the first order fails with insufficient margin right after the UI said the money arrived. Funding rows have states beyond pending and confirmed: removed after a reorg, and for withdrawals failed and credited back, so a two-state UI shows a removed deposit as done and a returned withdrawal as sent. A minimum deposit and a separate approval step can each fail before any transfer, and a generic failure message hides which.

**Bad example (illustrative):**

```text
if (receipt.status === "success") setDepositState("complete")
```

**Better example (illustrative):**

```text
const stage = depositStage({ receipt, venueRow }) // credited only when the venue row says so
```

**Legitimate exceptions:** A venue that credits synchronously with the transaction, verified from its contract, can collapse the last two stages.

**Verification scenario:** The chain confirms, the venue row stays pending for 30 seconds, then credits: the form stays in crediting and never shows a spendable balance early. A removed row shows as reverted. A withdrawal that fails and is credited back shows returned funds, not sent. An unknown status renders its raw text.

**Automatable check:** An exhaustiveness test over the funding-status map, including an unknown value.

Pack: `perps` (candidate). Topics: `perps`, `money`, `chain`, `frontend`, `implementation`.

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

Before implementation, name the single authoritative live writer for each read model. Once a socket owns a query, feature components do not independently mount-refetch, invalidate or poll it. The live coordinator owns continuity checks and the one authoritative resume or re-snapshot when focus, visibility, online state, heartbeat or sequence evidence says continuity is unproven. A late REST or socket result is version-merged so it cannot regress newer state. Enforce ownership with lint whose guarded and exempted paths must still exist: a guard on a deleted path protects nothing. Refines core card state-single-owner.

**Apply when:** a diff adds invalidate, refetch, setQueryData or polling on a stream-written key, a settle step invalidates a socket-owned entity, or lint config names owner paths.

**Boundary notes:** derived read models (history, charts) declare their own invalidation. A missing authoritative frame calls for telemetry and explicit recovery, not a hidden REST writer.

**Checks:** the PR lists every production writer to the key; settlement comes from the authoritative live event; the lint rule resolves aliased imports and intermediate variables, not only literal calls; CI fails when a guarded file, directory or glob matches nothing.

**Anti-pattern:** let each component refetch on focus, or disable every visibility and reconnect check so a suspended client can keep stale money data marked live.

**Why it fails:** the REST response is older than frames already applied and overwrites them, so a just-bought position or fill flickers away; a guard scoped to a deleted path silently allows writes from anywhere.

**Bad example (illustrative):**

```text
useQuery({ queryKey: positionsKey, refetchOnWindowFocus: true }) plus invalidate(positionsKey) on settle
```

**Better example (illustrative):**

```text
one live owner writes positionsKey; components do not refetch; the coordinator proves continuity or performs one resume or re-snapshot
```

**Legitimate exceptions:** a read model with no reliable stream may poll under a bounded policy. A declared recovery that proves single ownership transfer and version ordering is allowed.

**Verification scenario:** hold a REST response, apply a newer frame, release the response and assert the frame survives; delete a guarded path on a test branch and assert the existence check fails.

**Automatable check:** an ESLint rule banning invalidation and writes on owned keys outside the owner, plus a script failing when any lint files, ignores or allowlist entry matches zero files.

Pack: `realtime` (candidate). Topics: `cache`, `realtime`, `query`, `frontend`, `review`.

<a id="realtime-snapshot-and-ack-latch"></a>

## Apply live frames after snapshot and ack latches

A client read model goes live only when snapshot and stream coverage are aligned. If the snapshot carries a stream position, start both and resume from that position. Without a position, establish and acknowledge live coverage first, begin a bounded epoch-scoped buffer, then fetch and install the snapshot before applying buffered newer frames through the version guard. Buffer overflow marks the model stale and restarts the handoff; it never silently drops money-relevant deltas. Fence every late REST response, ack and frame by route identity and account generation. Refines core card realtime-snapshot-delta-contract.

**Apply when:** a feature seeds from REST then applies socket frames for the same entities, or reconnects a route owning money-relevant state such as orders or balances.

**Boundary notes:** Dropping an early frame is allowed only for a complete-state channel whose next frame replaces the whole model. A snapshot without a stream position cannot safely run before coverage for orders, positions, balances or other sparse updates.

**Checks:** latch state is per route and epoch; coverage exists before an unpositioned snapshot starts; buffer byte and frame caps are explicit; overflow revokes readiness and restarts; on reconnect one exact resume or re-snapshot runs when continuity is unproved, then buffered newer frames win; visible and online transitions ask the coordinator to prove continuity; no recovery path replays a mutation.

**Anti-pattern:** apply frames as soon as they arrive, before the snapshot lands, then let the snapshot replace the cache.

**Why it fails:** the snapshot, read earlier, overwrites newer frames, so a just-filled order shows as open or a closed position reappears; a frame from the previous account's subscription can also land in the new account's cache.

**Bad example (illustrative):**

```text
socket.onFrame(f => cache.apply(f)); cache.set(await fetchSnapshot())
```

**Better example (illustrative):**

```text
await ackFor(epoch); startBoundedBuffer(epoch); install(await snapshot()); applyNewer(buffered); markLive()
```

**Legitimate exceptions:** complete-snapshot channels may let the first socket snapshot satisfy readiness through a shared coordinator. Routes whose frames self-heal need no reconnect reconciliation; do not add one.

**Verification scenario:** ack coverage, hold REST, deliver two frames, release REST and assert both apply once; overflow the buffer and assert readiness revokes and handoff restarts; reconnect or resume from suspension and assert one continuity repair.

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

Keep a typed policy per action naming which read models, if any, must be fresh. Stream health is freshness evidence, not authorization by itself. Risk-increasing submissions may block under an approved contract; cancel, close, reduce-only and other risk-reducing actions remain available through the authoritative mutation path unless an explicit money policy proves stale state is required. Derive any gating and explanation through an exhaustive status map. Actions also wait until the socket has applied the latest credential refresh, so a submit never relies on a stream still bound to the old session. Refines core card lifecycle-readiness-and-user-feedback.

**Apply when:** a submit, cancel or transfer depends on live balances or order state; a channel joins the recovery set; auth refresh or reconnect logic changes.

**Boundary notes:** which actions block and the messages shown are product decisions and must be sourced. The registry makes the decision explicit and testable; it does not choose it.

**Checks:** the registry is keyed by action and typed against authenticated channel names; every status has a mapping; risk-reducing actions have an explicit degraded-stream policy and are never disabled merely because the read stream reconnects; the session check compares the latest successful refresh revision with the revision the socket applied; non-authority channels such as trades or history never block; disabled controls show the mapped reason.

**Anti-pattern:** block every action whenever any socket reconnects, or never block and let users submit against unconfirmed balances.

**Why it fails:** the first freezes trading on irrelevant channel blips; the second lets a user act on a balance or open order the stream has not confirmed, producing rejected or unintended trades.

**Bad example (illustrative):**

```text
disabled = !socket.connected
```

**Better example (illustrative):**

```text
policy = actionFreshness[action]; disabled = policy.mayBlock && policy.reason(streams) !== null
```

**Legitimate exceptions:** read-only views need no action authority. If server validation already rejects stale submissions safely, gating may be limited to messaging, which is a product decision.

**Verification scenario:** degrade balances and assert a sourced risk-increasing submit policy; degrade orders and assert cancel and reduce-only remain reachable unless the approved contract says otherwise; degrade trades and keep unrelated actions enabled; verify auth revision only gates actions that use the stale socket identity.

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

Identify each live resource by its stable data query key (endpoint, scope, parameters and, for private data, account identity). Keep connection or subscription generation inside the coordinator, never in the data key, and let every consumer, whether sync component, reader or hover preload, acquire an internal lease on it. The first lease starts the snapshot and the live writer and later ones reuse them; after the final release a short grace period lets a re-acquire keep the snapshot and channel, and final disposal aborts pending transport work, unsubscribes and stops timers. Cache removal is a separate identity, permission or retention decision, not a routine disconnect side effect. Refines core card realtime-subscription-lifecycle.

**Apply when:** intent preloading warms data a page will read, several components need the same stream, or teardown currently follows one component's unmount.

**Boundary notes:** account-scoped resources must define account and session invalidation before adopting grace, so a lease never carries one account's stream into another session. Snapshot and live merge rules stay in each adapter; the lease layer does not guess them.

**Checks:** reconnecting changes the coordinator epoch without changing the data key; components never create consumer ids or count readers; timed leases expire on their own; readers do not refetch on mount or focus over the writer; callbacks from retired subscription epochs are rejected; an explicit retry restarts the shared writer once for concurrent callers.

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

**Verification scenario:** acquire from hover, mount during grace and assert one subscription and stable cache key; reconnect and assert a new epoch reuses the same data entry; release all and assert transport teardown; switch account and assert no lease or private cache survives.

Pack: `realtime` (candidate). Topics: `subscriptions`, `cache`, `realtime`, `frontend`, `implementation`.

<a id="realtime-gap-recovery-resume-or-resnapshot"></a>

## Choose sequence resume or re-snapshot for gaps

Decide per channel how a client recovers lost frames, and write it into the channel contract. Sequence numbers with a resume token detect gaps exactly and let a short disconnect resume, but the server must retain a bounded replay window and still re-snapshot past it. Re-snapshot with row versions keeps fan-out free of replay state and makes every reconnect correct, but cannot detect a frame lost mid-session and needs full-row frames plus versioned deletions. Refines core card realtime-snapshot-delta-contract.

**Apply when:** designing a channel, a reconnect or shedding path, or a heartbeat, especially when deltas over large models (order books, long lists) make snapshots expensive.

**Boundary notes:** give liveness to the client: it sends pings, counts any inbound frame as alive, and reconnects when a pong deadline passes with no traffic. Hidden tabs may suspend deadlines, but then continuity becomes unproven; the visible or online transition must resume or re-snapshot before money data regains action authority. The server answers pings and sheds peers it cannot write to.

**Checks:** the contract names the recovery model; visibility and online transitions check the last proven continuity epoch; with re-snapshot, every shed, heartbeat timeout, unproven resume and reconnect resubscribes and re-reads the base before the cache is trusted; with resume, a sequence gap or expired token falls back to a snapshot; a shared-worker socket owns one heartbeat for all tabs.

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

<a id="terminal-book-store-and-paint-cadence"></a>

## Keep the book outside React and publish at paint cadence

The order book lives in an owner object outside the component tree: per side a price-to-quantity map plus a sorted price index, with every delta applied in order at event cadence. A frame-coalesced flush slices the visible rows, computes cumulative totals and publishes one immutable display snapshot. Each channel declares its accumulator: replace for full-state channels, append with dedupe and a cap for tapes. The first data after subscribe publishes immediately and teardown cancels any pending publish. For the generic batching and store rules, see realtime-visibility-aware-batching and react-external-store-snapshots.

**Apply when:** wiring book, tape, mid, mark or connection-status streams into component state, a store or a query cache, or adding a throttle or frame batch to a stream handler.

**Checks:** no per-message deep clone, re-sort or component commit; zero quantity deletes a level; every publish is keyed by market and connection generation; first data is not delayed by the throttle interval; nothing publishes after unsubscribe; append channels never use last-wins; the store is read in the leaf that displays it, shaped to that consumer and pinned by content equality; status is exposed as a primitive; rows are keyed by price.

**Anti-pattern:** On each delta clone the book, filter, push, sort and set component state; wrap the dispatcher in one trailing throttle with latest-wins for every channel; subscribe at a layout root and pass data down.

**Why it fails:** Clone plus scan plus sort per message makes the main thread spend a burst allocating, and every write is a commit, so the ticket lags exactly when the market moves. A plain trailing throttle delays the first snapshot on every market switch and can fire after unsubscribe, writing the previous market into the new slot. Last-wins silently drops trades when two batches land in one frame. A root subscription re-renders the whole terminal per commit: a status-only change re-renders every mounted component under the subscription, and none once reads move to equality-pinned leaves.

**Bad example (illustrative):**

```text
socket.on('book', d => setBook(sortLevels(applyDelta(structuredClone(book), d))))
```

**Better example (illustrative):**

```text
book.apply(delta); scheduler.requestFlush(() => publish(book.top(depth)))
```

**Legitimate exceptions:** Low-rate feeds, or feeds that send the full visible book on each update, can replace state directly. Order status and fills are not coalesced by replacement (see terminal-critical-events-bypass-batching).

**Verification scenario:** Replay a burst fixture while switching markets rapidly: at most one publish per frame, the final book equals a naive reference reducer, the first paint per market is not delayed, no frame shows the previous market, two trade batches inside one frame both appear, and fifty no-op store commits render the tape once.

**Automatable check:** Property test of the reducer against the reference; fake-scheduler test for first publish and teardown; render-count test per leaf.

Pack: `terminal` (candidate). Topics: `realtime`, `performance`, `state`, `frontend`, `implementation`.

<a id="terminal-book-snapshot-delta-sync"></a>

## Sync the book by the channel's declared frame contract

Before writing a book reducer, record per channel what the venue contract says: replace or patch, depth, cadence, what the sequence counts and which gap signal exists. Patch channels buffer live diffs, fetch the snapshot, drop diffs at or below the snapshot id, require the first applied diff to straddle it (exact inequality from the venue contract) and chain every later diff to the last applied id. Continuity is an exhaustive classifier (apply, heartbeat, snapshot, reset-continue, gap), not a monotonic comparison. For the generic handshake and recovery choice, see realtime-snapshot-and-ack-latch and realtime-gap-recovery-resume-or-resnapshot.

**Apply when:** building a local book or other sequenced stream from a snapshot plus increments, or adding a checksum or gap detector.

**Checks:** quantities are absolute, zero removes a level and a delete for an unknown level is a no-op; depth-limited feeds truncate each side to the subscribed depth after every message; checksums use the received wire strings in the specified order and signedness, and a mismatch is a gap; flagged snapshot batches merge by stable identity; a sequenced book that crosses is a sync bug and resyncs, while an unsequenced aggregated feed uncrosses by per-level recency before mid or spread; a backfill anchors on the last processed data item, never on a control frame; gaps are tracked as ranges and recovery is one in-flight resync with capped backoff and a visible resyncing state.

**Anti-pattern:** Fetch the snapshot, subscribe, merge every frame and resync whenever a sequence is not the previous one plus one.

**Why it fails:** Diffs older than the snapshot re-apply old quantities, and a diff lost in the hole leaves a phantom level, so previews price against liquidity that does not exist. A merge reducer on a full-state channel keeps levels that left the visible range. A naive check loops resyncing on quiet-market keepalives that repeat an id, or freezes after a sequence reset. Re-stringified numbers lose trailing zeros and break the checksum.

**Bad example (illustrative):**

```text
if (msg.prevSeq !== lastSeq) resync(); else merge(book, msg)
```

**Better example (illustrative):**

```text
const step = classify(msg, lastSeq); handlers[step.kind](step) // apply | heartbeat | snapshot | resetContinue | gap
```

**Legitimate exceptions:** A feed whose subscribe ack is the snapshot on the same ordered connection needs only the chain check. Feeds without a checksum rely on the chain.

**Verification scenario:** Replay a fixture with a diff older than the snapshot, a snapshot older than the first buffered diff, a dropped diff, a delete for an unknown level, an empty heartbeat repeating the id, and an id jump of millions. Expected: ignored, snapshot refetched, one visible resync, no-op, no-op, one bounded recovery with no long task. A reset to a smaller id continues only where the venue documents reset semantics and the chain pointer matches; otherwise it resnapshots.

**Automatable check:** Property test: under random snapshot timing and diff loss the book equals the reference or is resyncing; checksum test pinned to the documented example.

Pack: `terminal` (candidate). Topics: `realtime`, `subscriptions`, `frontend`, `implementation`, `review`.

<a id="terminal-book-grouping-and-depth-math"></a>

## Group and accumulate book levels with side-aware math

Book display math is one pure pipeline: sort, uncross where the feed needs it, group with exact decimal arithmetic on integer tick multiples (bids floor to the bucket, asks ceil), accumulate size and notional outward from the spread, and apply display order last. Mid and spread come from the raw best levels. Depth bars scale to the largest cumulative total among the visible rows, with one scale for both sides unless the sourced design specifies per-side scaling. The book model carries its coverage (full, depth-limited or partial beyond the snapshot) and any impact estimate returns a typed result. For the decimal and rounding rules, see money-exact-decimal-strings and money-rounding-direction-by-bound.

**Apply when:** building price grouping, cumulative totals, depth bars, a spread row, own-order markers or a market-order impact preview from the local book.

**Checks:** bucket keys are integer tick multiples, never floats; totals are computed once per flush, not per row in render; quote size sums price times quantity per raw level; own-order prices are bucketed with the same function and side as levels; grouping is persisted as an index into a multiplier ladder relative to the market tick and validated on read; where the venue serves aggregated books the grouping is a subscription parameter and the client does not regroup; an impact walk that runs out of levels returns an exceeds-visible-depth result with the filled portion.

**Anti-pattern:** Bucket both sides with one float floor or round, read mid from grouped levels, scale bars to the largest size in the whole book, persist an absolute tick for all markets, and report an average price for an order larger than the book holds.

**Why it fails:** Rounding asks down shows liquidity at a better price than exists and can make the grouped book look crossed. Float division misbuckets at boundaries, drawing a level at 0.0744 at 0.0743. Scaling to the whole book makes visible bars tiny when a far level is huge. An absolute tick chosen on a high-priced market gives one row or thousands on a low-priced one. A capped or depth-limited book is a partial sample, so an estimate that silently runs out of levels understates slippage for exactly the large orders where it matters.

**Bad example (illustrative):**

```text
const bucket = Math.floor(price / group) * group // both sides, floats
```

**Better example (illustrative):**

```text
const bucket = side === 'bid' ? floorToStep(price, step) : ceilToStep(price, step) // integer tick multiples
```

**Legitimate exceptions:** Venue-side aggregation replaces client grouping entirely.

**Verification scenario:** A level at 0.0744 with tick 0.0001 and 1x grouping renders at 0.0744. At 10x the grouped best ask is at or above the raw best ask, the grouped best bid at or below the raw best bid, per-side size is conserved, cumulative depth is monotonic away from the spread and the spread equals the raw spread. An order three times the visible depth shows the exceeds-depth state, not an average price.

**Automatable check:** Property tests: grouping conserves size per side and never crosses; unit tests of both impact outcomes.

Pack: `terminal` (candidate). Topics: `money`, `realtime`, `frontend`, `implementation`, `review`.

<a id="terminal-book-rows-stable-layout"></a>

## Place book rows by slot so level churn shifts no layout

Each side of the ladder is a fixed track sized to its row count. Rows are absolutely positioned against the spread edge and placed with a transform of slot times row height, with DOM order and price keys unchanged. Row, header and toolbar heights are numeric constants shared with the fit-to-space math, which measures the container, slices to whole rows and gives unused slots to the other side when one is short. A canvas book redraws only when its data changes, scales its backing store for device pixel ratio and runs no idle frame loop. For general rendering cost, see web-app-render-only-visible.

**Apply when:** rendering a live ladder, or any list whose rows appear and disappear many times a minute, in DOM rows or on canvas, especially in a narrow or resizable pane.

**Checks:** the ladder has no scroll container; hover tracking writes a transform directly instead of setting state per pointer move; a row click sets the price from the price cell, not from whichever column was hit; the widest row (mid and spread) fits the minimum pane width through container queries; own-order markers join on side plus price formatted at tick precision; only visible rows are converted to display units; canvas draw inputs are identity-stable, the canvas redraws on font load, hit-testing shares the row geometry function with drawing, and best bid and ask have a text alternative (see ui-semantics-and-accessibility).

**Anti-pattern:** Rows in document flow with content-derived heights, or a canvas draw effect that depends on an object rebuilt every render plus a permanent animation-frame loop.

**Why it fails:** In flow, every level that arrives or leaves moves each row behind it by one slot and the browser counts each move as a layout shift; book churn alone can push a trade page past its cumulative layout shift budget. A state update per pointer move makes hover the most expensive ladder frame. On canvas an unstable dependency clears and redraws on every unrelated parent render and resets flash timers, a perpetual loop costs about 60 callbacks a second while nothing changes, and an unscaled backing store blurs text on dense displays.

**Bad example (illustrative):**

```text
levels.map(l => <Row key={l.price} level={l} />) // in flow, heights from content
```

**Better example (illustrative):**

```text
style = { position: 'absolute', height: ROW_H, transform: 'translateY(' + dir * slot * ROW_H + 'px)' }
```

**Legitimate exceptions:** Static or slow lists. A DOM-row book with a small fixed row count and coalesced updates is simpler than canvas; choose canvas on measured need.

**Verification scenario:** Add and remove a level while observing layout-shift entries: no row contributes. Resize the pane to its minimum: the row count changes with no scrollbar and the mid row is not clipped. On canvas, 100 unrelated parent renders cause zero draws and five idle seconds cause zero frame callbacks.

**Automatable check:** Browser journey collecting layout-shift entries during level churn with a zero-row assertion; a spy on the canvas clear call across unrelated renders.

Pack: `terminal` (candidate). Topics: `performance`, `components`, `frontend`, `implementation`.

<a id="terminal-live-rows-stable-under-pointer"></a>

## Keep actionable live rows stable under the pointer

A row that carries an action is keyed by its entity (price level, position id, order id) and the action is bound to the entity captured at pointer down. A live-sorted list with pressable rows freezes membership and order as a list of keys while the pointer is over it, renders each frozen slot from the live item with that key, and unfreezes on leave. Tables keep their rows through a refetch for the same account and drop them at once when the account changes.

**Apply when:** book rows set a price on click, tables sorted by a live value carry close or cancel actions, a markets list or tape re-sorts live, or a table derives from combined queries that go pending on a dependency refetch.

**Checks:** no click handler resolves the row at an index at click time; values keep updating while order is frozen, falling back to the last value seen if the item left the live set; a user-initiated sort or filter change re-freezes with the new order; destructive actions name the entity in their confirmation; retained rows are scoped to the account identity, a settled error replaces them, and row actions still pass the account fence (see execution-fence-mutations-to-account).

**Anti-pattern:** Re-sort on every update with index keys, pause all updates while hovered, show a skeleton whenever a combined query is pending, or enable keep-previous-data globally.

**Why it fails:** Between aiming and pressing the row's content changes, so the trader sets a limit one level off or closes or cancels a different position than intended: a money-losing misclick that looks like user error. Pausing everything shows stale values and then jumps. A dependency refetch that flashes a table to a skeleton loses scroll position and open row controls mid-action. Global keep-previous shows one account's rows inside another account's session after a switch.

**Bad example (illustrative):**

```text
onClick={() => closePosition(sortedRows[index])}
```

**Better example (illustrative):**

```text
rows = frozenKeys ? frozenKeys.map(k => liveByKey.get(k) ?? lastSeen.get(k)) : liveRows
```

**Legitimate exceptions:** The ladder itself, where movement is the information; it stays stable through fixed slots (see terminal-book-rows-stable-layout). Read-only tickers. Touch devices without hover still bind the entity at pointer down. Tables keyed by an explicit user filter show loading when the filter changes.

**Verification scenario:** Hover a row, push updates that would reorder, press: the action payload names the entity under the pointer at pointer down, rows did not shift and values still updated; leave and the list catches up. Trigger a catalog refetch: no skeleton. Switch account: the first frame contains no old rows.

**Automatable check:** Interaction test asserting the payload entity; component test that no previous-account row renders after an identity switch.

Pack: `terminal` (candidate). Topics: `components`, `execution`, `frontend`, `implementation`, `review`.

<a id="terminal-chart-history-live-bridge"></a>

## Bridge chart history to live bars without rewinding the tip

The chart adapter keeps series state per market and interval: tip time, tip close and a ready flag. Live bars wait in a bounded buffer until the first history load settles, success or failure, and are then flushed sorted. A live bar older than the tip is dropped, and history advances the tip only when its newest bar is at or after it, so paging backwards never lowers it. Every emit is a complete open-high-low-close-volume bar stamped at its bucket start. When bars are folded from ticks or fills on the client, the current bar is seeded from the server candle for that bucket. For the generic latch, see realtime-snapshot-and-ack-latch.

**Apply when:** feeding a charting library from request-based history plus a live candle, tick or fill stream.

**Checks:** the stream is opened before or with the history request; snapshot arrays sent on subscribe or reconnect are emitted in chronological order, not only their last element; each subscription has a token and callbacks from a superseded token are dropped; history, handoff and live share one normalization pipeline that drops malformed and all-zero bars, flattens zero-volume filler bars to the previous real close instead of removing them, and, only where the venue or product specifies gapless candles, anchors opens to the previous close at new-bar boundaries and never across real session breaks; corrections to history reset the library cache instead of pushing old bars.

**Anti-pattern:** Push every live bar as it arrives, treat each history response as the newest state, and start the current bar from the first tick seen.

**Why it fails:** Embedded charting libraries by default accept only an update to the latest bar or a newer bar; an older time raises a time-order violation and can stop live updates for the series. A history page loaded by zooming out can rewind the last-bar bookkeeping, so the next live bar anchors to an hours-old close and draws a spike. Forwarding only the last element of a reconnect snapshot leaves a hole. A bar started from the first live tick loses the earlier open and volume and repaints on reload. Removing filler bars warps the time axis, and all-zero bars drag the price scale to zero.

**Bad example (illustrative):**

```text
stream.on('candle', c => chart.update(toBar(c)))
```

**Better example (illustrative):**

```text
stream.on('candle', c => series.ready ? emitIfNotOlder(c) : pending.push(c)) // flush sorted when history settles
```

**Legitimate exceptions:** A venue that streams complete server-built candles per resolution is passed through, still under the monotonic guard.

**Verification scenario:** Delay history two seconds while live bars arrive; page older history, then push a live bar; reconnect with a three-candle snapshot; subscribe mid-bucket; inject a frame with an older start time. Expected: no spikes, holes or time-order errors, the current candle keeps its historical open and volume, the old frame is dropped and updates continue, and filler bars between two trades render flat.

**Automatable check:** Adapter tests with a fake stream and fake history asserting non-decreasing bar times and full bars on every call.

Pack: `terminal` (candidate). Topics: `realtime`, `subscriptions`, `frontend`, `implementation`.

<a id="terminal-chart-datafeed-request-contract"></a>

## Honor the chart datafeed's history, symbol and failure contract

A pull-based charting datafeed is an imperative contract that bypasses the app's query retry layer and caches what it is told. History is fetched backwards from the requested end until the requested bar count is collected or the market's first bar is reached, returned ascending and deduplicated with times at bucket open and the end exclusive, and the no-more-data flag is set only when the server has nothing older. Symbol info is built from the same validated market metadata the order form uses. Bar times and bucket boundaries stay in UTC and the display zone is applied only in formatting. Transient failures are retried inside the adapter and never reported as an unknown symbol or as no data.

**Apply when:** implementing history, symbol resolution or live-status callbacks for an embedded charting library, or configuring a price scale, session or time zone.

**Checks:** price scale is the power of ten for the tick's decimal places and the minimum move is the tick in those units (tick 0.0005: scale 10000, move 5), both computed in decimal math; symbols resolve only after metadata has loaded; session and time zone come from venue metadata; the feed reports live only after the watch outcome is known and reads paused before live when any feed is dead; times shifted for display never flow back into requests (see money-timestamp-units-by-wire).

**Anti-pattern:** Return exactly the bars inside the requested window, leave the default two-decimal price scale, and call the error callback on the first failed fetch.

**Why it fails:** The library weighs the requested bar count above the time range: when the range holds fewer bars it calls history repeatedly, a request storm and a chart that never finishes loading on illiquid or newly listed markets. End-of-data on a merely empty window truncates history; never signalling it loops at the listing date. A default scale renders a 0.00001234 asset as 0.00. A range reported as failed is treated as settled, so the chart sits on no data for the session. Reporting live when subscribe returns shows a live chart frozen on history after the socket rejects the watch. Local-time bucketing makes daily bars differ by user.

**Bad example (illustrative):**

```text
onHistory(bars.filter(b => b.time >= from && b.time <= to), { noData: bars.length === 0 })
```

**Better example (illustrative):**

```text
const bars = await collectBack({ to, count }); onHistory(bars, { noData: bars.length === 0 && reachedFirstBar })
```

**Legitimate exceptions:** Chart libraries without a pull-based feed: the app owns paging with the same ordering and dedupe rules.

**Verification scenario:** A market listed ten days ago on the daily chart makes one or two history calls, then none. A sub-cent market shows full tick precision on axis, crosshair and order lines, and delayed metadata shows loading, never a two-decimal axis. Fail history once: the chart still loads. Reject the live watch: a paused badge. Under a UTC+13 system zone daily bars match the venue.

**Automatable check:** Adapter test with a fake API asserting call count, ascending unique times and the no-data flag at the listing boundary.

Pack: `terminal` (candidate). Topics: `boundaries`, `errors`, `frontend`, `implementation`, `review`.

<a id="terminal-chart-widget-lifecycle"></a>

## Create the chart widget once and drive it through its API

A heavy charting library is loaded dynamically, instantiated once per container, and changed through its own methods for symbol, interval and theme. The instance sits in a ref with an alive flag that every async callback checks; cleanup marks it dead first, then unsubscribes and destroys. Realtime subscriptions are replaceable by listener id: the existing teardown is called before the new one is registered. Channel identity is symbol plus resolution plus source generation, and a source change resets the library bar cache and reloads. For the underlying rules, see lazy-loading-boundaries, effects-external-sync and realtime-subscription-lifecycle.

**Apply when:** embedding a third-party chart and handling instrument switch, interval, theme, layout persistence, data-source or network switch and unmount.

**Checks:** no effect recreates the widget when symbol, theme, price or positions change; a replacement subscription that is invalid removes the entry instead of leaving the old handler; layout is persisted debounced, keyed by symbol and schema version, and validated on restore (see storage-versioned-boundary); the container size is reserved before the library loads; a load failure shows an error state; unmount leaves no listeners, timers or subscriptions; a transport reconnect to the same source does not reset the cache.

**Anti-pattern:** An effect that recreates the widget whenever its inputs change, ready callbacks that run after unmount, and a subscription map that overwrites the stored teardown on resubscribe.

**Why it fails:** Recreation costs hundreds of milliseconds, flashes, loses drawings and leaks listeners, timers and datafeed subscriptions. A late ready callback calls into a destroyed instance. Overwriting a teardown without calling it leaves the old stream handler alive, and it keeps pushing bars for the old resolution or symbol into the new series: duplicated or jumping candles and time-order errors. After an endpoint or network switch the library cache merges bars from the previous source with new data. A stale layout write overwrites the drawings the user just made.

**Bad example (illustrative):**

```text
useEffect(() => { const w = createWidget({ symbol, theme }); return () => w.remove() }, [symbol, theme])
```

**Better example (illustrative):**

```text
subs.get(id)?.teardown(); subs.set(id, open({ symbol, resolution, generation }))
```

**Legitimate exceptions:** A library with no symbol-change method is recreated, still disposed and guarded. An explicit user reset of the chart.

**Verification scenario:** Switch instruments twenty times: one constructor call, a stable subscription count and a flat heap. Switch one minute to five minutes and back quickly: exactly one active stream subscription and no bars from another resolution. Unmount during load: no errors. A corrupt saved layout falls back to the default. Switch data source: no bars from the previous source remain.

**Automatable check:** Test counting constructor calls and active subscriptions; unit test that subscribing twice with one id calls the first teardown once and only one handler receives frames.

Pack: `terminal` (candidate). Topics: `lifecycle`, `effects`, `subscriptions`, `frontend`, `implementation`.

<a id="terminal-chart-trading-lines-are-projection"></a>

## Treat chart order and position lines as a projection

Lines for positions, orders and protection consume the same read models as the tables through a sync adapter that diffs by id; the chart owns no list of its own. Drag and cancel use the ticket's mutation path and validation. On drag end the handler looks the order up by id in the latest authoritative list, claims a per-order pending token and calls one modify carrying the order's current size and flags. While the token is held the sync loop skips that line; on failure the line returns to the latest authoritative price only if that token still owns it. Preview lines never override the price scale.

**Apply when:** order, position or protection lines on a chart are draggable or carry cancel and close controls, or preview lines follow a price being typed.

**Checks:** a drag to the same price or for a vanished order sends nothing; a later drag replaces the token so an older failure cannot roll it back; the account guard captured at line creation must equal the one at action time (see execution-fence-mutations-to-account); an account or session change clears and resyncs every line; child lines wait for their parent position; a line shows pending during its request; preview lines draw only for positive finite prices and are removed otherwise; autoscale is left alone and lines are created only after a symbol switch completes; where the venue has no modify, see perps-protection-replace-place-before-cancel.

**Anti-pattern:** An overlay that keeps its own list, a drag handler that uses the order captured when the line was created and cancels then re-places it, and a preview that forces the scale to include the typed price.

**Why it fails:** An overlay with its own list disagrees with the tables after one missed update. The captured order may have been partly filled or re-priced. Cancel plus place has a window with no order and can double-place. A rejected modify leaves a line where no order exists and the trader believes the stop is there. Two quick drags race, and the older failure rolls back the newer position. A half-typed price far from the market squashes the candles into a line, and autoscale can stay disabled afterwards.

**Bad example (illustrative):**

```text
onDragEnd = () => { cancel(order.id); place({ ...order, price: line.price }) }
```

**Better example (illustrative):**

```text
onDragEnd = () => { const t = claim(id); modify(latest(id), line.price).catch(() => owns(id, t) && line.setPrice(latest(id).price)) }
```

**Legitimate exceptions:** User drawings and annotations are chart-owned. An explicit fit-to-orders action may rescale.

**Verification scenario:** Drag a stop line and reject at the venue: the line returns and the error shows. Drag twice quickly and fail the first after the second succeeds: the line ends at the authoritative price. Switch account mid-drag: no request, and lines are replaced. Type a preview price a thousand times away: candles are unchanged; clear the input: the line is removed.

**Automatable check:** Unit tests of the pure drag handler and the sync adapter against a fake chart API.

Pack: `terminal` (candidate). Topics: `execution`, `mutations`, `frontend`, `implementation`, `review`.

<a id="terminal-hidden-tab-resnapshot-not-replay"></a>

## Return from a hidden tab with a snapshot, not a replay

A hidden page gets throttled timers and no animation frames, so nothing may depend on page timers or queue for a frame. While hidden, frames reduce into latest state with bounded memory and flush only at the hidden cadence of realtime-visibility-aware-batching. After a grace period hidden, market-data watches (book, tape, candles) are released and re-opened as cold snapshots on return; account, order and risk channels stay subscribed so critical events still surface while hidden. On return, stream health is checked first: an intact chain renders the current state once, anything else resnapshots. For the generic rules, see realtime-visibility-aware-batching and realtime-gap-recovery-resume-or-resnapshot.

**Apply when:** implementing heartbeats, countdowns, frame-batched rendering or gap healing in a terminal that traders leave in a background tab.

**Checks:** the heartbeat runs where page throttling does not apply (see realtime-shared-worker-socket-broker); one visibility generation serves the whole tab and holders outside React, such as the chart adapter, subscribe to it; visibility is re-checked when the suspend timer fires, because timers fire late after sleep; during reconnect the last ladder stays with a reconnecting badge while the ticket quote is null; the chart computes the gap from its tip: no gap is a no-op, a gap within the per-request cap fetches only the missing range, and anything else is a full reset under a loading overlay.

**Anti-pattern:** Keep every subscription open in the background, drain a frame queue with animation frames, and on return replay the backlog or reset every panel to a skeleton.

**Why it fails:** Hidden timers run about once a second and later about once a minute, so a server that closes idle sockets after a fixed window drops a connection whose ping was throttled. A queue drained only by animation frames grows without bound, and replaying it is a multi-second long task when the trader looks back. A never-lose-an-event tail is right for a dropped socket on a visible tab and wrong for one hidden half an hour: the trader returns to a terminal replaying states nobody needs. Resetting the chart on every return blanks it for seconds.

**Bad example (illustrative):**

```text
onVisible = () => { queue.forEach(apply); chart.resetData() }
```

**Better example (illustrative):**

```text
onVisible = () => stream.intact ? renderOnce(latest) : resnapshot() // chart: backfill(gap) or reset
```

**Legitimate exceptions:** Streams with cheap sequence resume.

**Verification scenario:** Hide the tab six minutes on a busy fixture: memory stays bounded and only market-data subscriptions close after the grace period. Return: book and chart are current within one snapshot, with no long frame over 200 ms and no historical renders; during reconnect the ladder keeps its badge and the submit path has no quote. Hide three intervals: three bars are appended with no blank.

**Automatable check:** Fixture recording subscription events across a simulated visibility change, asserting market-data close then one re-subscribe.

Pack: `terminal` (candidate). Topics: `realtime`, `lifecycle`, `performance`, `frontend`, `implementation`.

<a id="terminal-frozen-stream-must-look-stale"></a>

## Make a frozen stream look stale

Every live channel has a freshness watchdog that yields live, stale, reconnecting or failed from the time of its last validated inbound frame against a declared budget. Transport open does not prove live; an ack or first validated frame does. Browsers cannot send protocol pings, so the client implements the venue's application heartbeat at well under half the idle timeout and treats quiet-period heartbeats as liveness. Which health state may block which action is decided separately: see realtime-stream-health-action-authority.

**Apply when:** building the socket client, reconnect and backoff logic, tab-visibility handling, or any panel that shows price, book, positions or balances of differing freshness side by side.

**Checks:** panels dim and label stale data with its age; retry exhaustion is a visible failed state with manual retry and automatic resume on visibility or network return; staleness is checked immediately on tab resume; a stale verdict triggers reconnect, re-auth, re-subscribe and re-snapshot before live styling returns; the slower of two values shown side by side is labelled; risk-increasing actions are not sized from account state older than the last fill for that instrument; close and reduce go through the venue close instruction or a reduce-only order, so a stale size cannot add exposure, and they stay available (see perps-risk-reducing-actions-availability).

**Anti-pattern:** Derive connected from the socket being open, rely on the close event to detect a dead connection, and stop reconnecting after a few attempts with only a log line.

**Why it fails:** A half-open connection never fires close, so a silent socket shows a frozen book in live styling and the trader acts on it. Timer-pushed account snapshots lag fill events: the position row trails the fill and an order sized from it misstates the exposure. Ad hoc refetches from several places create competing writers (see realtime-one-live-writer-per-read-model).

**Bad example (illustrative):**

```text
const live = socket.readyState === WebSocket.OPEN
```

**Better example (illustrative):**

```text
const health = now - lastFrameAt[channel] > budget[channel] ? 'stale' : 'live'
```

**Legitimate exceptions:** Static or slow metadata needs no indicator. With server-pushed heartbeats only the inbound timer is needed. Venues that push account state per event have no snapshot lag to label.

**Verification scenario:** Stop frames without closing the socket: the panel turns stale within its budget and a reconnect starts. Exhaust retries: a failed state appears and manual retry works. Deliver a fill with the next account snapshot five seconds later: during the gap an add sized from the old snapshot waits for a newer snapshot or follows the sourced action policy (see realtime-stream-health-action-authority), while close stays available and sends a reduce-only or close-position order. State-table tests cover open then close before ack and a late ack from an old generation.

**Automatable check:** Status reducer tests with an injected clock (see web-app-injected-nondeterminism); a visual test for stale styling.

Pack: `terminal` (candidate). Topics: `realtime`, `lifecycle`, `execution`, `frontend`, `planning`.

<a id="terminal-critical-events-bypass-batching"></a>

## Never queue risk and control events behind batching

Stream channels are classified in an exhaustive registry. Latest-value visuals (ticker, book, mark) coalesce. Fact streams (orders, fills, positions, balances) apply every frame in order and render at most once per frame. Control and critical events (rejection, margin call, liquidation notice, session invalid, resync) apply and surface at once, including while the tab is hidden. Guards inside stream handlers block only identified bad cases and let unknown new entities through. For the batching mechanics themselves, see realtime-visibility-aware-batching.

**Apply when:** adding frame coalescing, throttles, a slow hidden-tab cadence or transitions to stream handling, or adding a filter or readiness guard to a stream handler or a trade action.

**Checks:** no single throttle wraps the whole socket handler; a new channel cannot be added without a class in the registry; a guard enumerates the update types it can match; a guard that depends on other data loads it before processing instead of dropping the frame; equivalent branches (buy and sell, open and close) share the same fallback; a blocked action says why; account and session fencing still blocks everything from the wrong scope.

**Anti-pattern:** One throttle around all frames with latest-wins per channel, or a broad guard that ignores updates for entities not yet in the cache.

**Why it fails:** Latest-wins drops intermediate facts: a rejection is replaced by a later frame. A slow hidden cadence delays a liquidation warning by seconds. Throttled order status lets the ticket accept a second submit against stale state. A broad not-in-cache guard also matches the most important case: a position from a trade just submitted is by definition not in the cache, so the trader trades and sees nothing until reload. A silent early return in a trade handler looks like a dead button.

**Bad example (illustrative):**

```text
socket.onmessage = throttle(handleAnyFrame, 250); if (!cache.has(update.id)) return
```

**Better example (illustrative):**

```text
registry[channel].kind === 'critical' ? applyNow(frame) : coalesce(channel, frame)
```

**Legitimate exceptions:** None for dropping facts. Rendering of fact streams may be frame-batched as long as data application is immediate.

**Verification scenario:** Send a hidden-tab burst mixing hundreds of ticker frames with one rejection and one margin warning: both surface within one task and ticker renders are coalesced. With a hidden-items guard on, submit an order for an instrument never seen in the cache: the position appears from the stream without reload, the hidden item stays hidden, and both sides behave the same.

**Automatable check:** Registry-driven test that critical channel handlers are not wrapped by the throttle utility; a regression test per stream handler that a new entity absent from the cache is applied.

Pack: `terminal` (candidate). Topics: `realtime`, `performance`, `errors`, `frontend`, `review`.

<a id="terminal-notifications-from-events-once"></a>

## Fire fill and trigger notifications from events, once

Toasts, sounds and badges for fills, triggers, cancels and liquidations are keyed by venue event identity (order id plus terminal status, fill id). A bounded seen-set with expiry dedupes across channels. The first snapshot after subscribe, reconnect or account change is a silent baseline, and the batch of recent history that many channels replay on resubscribe merges by identity without side effects. The message is built from event fields, not inferred from a diff. For effects after replayable input, see stream-checkpoints-and-effects.

**Apply when:** adding notifications for order and position transitions, when several channels report the same transition, or when handling reconnect and resnapshot of user streams.

**Checks:** no effect diffs the previous and current order list to infer events; one notifier is fed by every channel (request response, order stream, rejection stream) instead of each notifying on its own; transitions missed while offline go to the activity log, not a toast burst; the seen-set is bounded and scoped to the account; positions and balances come from the venue state channel, never from summing fills (see money-value-provenance).

**Anti-pattern:** An effect that diffs order snapshots and notifies each difference, or appending every stream message as a new event.

**Why it fails:** On first load, reconnect, account switch or cache reset the previous list is empty or stale, so every existing order looks new or every missing one looks filled: a burst of false toasts and sounds. A resubscribe replays recent history, and on a flaky connection that repeats many times a minute, duplicating rows, replaying filled toasts and double-counting size and PnL if fills are summed. One terminal event arriving on two channels notifies twice. A vanished order is ambiguous between fill, cancel and expiry.

**Bad example (illustrative):**

```text
useEffect(() => diff(prevOrders, orders).forEach(notify), [orders])
```

**Better example (illustrative):**

```text
if (!isBaseline && !seen.has(eventKey(event))) { seen.add(eventKey(event)); notify(event) }
```

**Legitimate exceptions:** A venue with no event identity: baseline silently after each resnapshot and classify disappearances with an order-history read. Streams with resume tokens that guarantee exactly-once continuation need no replay dedupe.

**Verification scenario:** Load with five open orders: no toasts. Deliver one fill on two channels: one toast. Disconnect, fill, reconnect: no burst and the activity log has the fill. Reconnect three times with five historical fills: five rows, zero new toasts, position unchanged. Switch account: no toasts.

**Automatable check:** Count notification dispatches under replayed, duplicated and resnapshotted frames; reducer test applying the same flagged snapshot twice and asserting idempotence.

Pack: `terminal` (candidate). Topics: `realtime`, `effects`, `frontend`, `implementation`.

<a id="terminal-order-draft-ownership"></a>

## Live data revalidates the order draft, never rewrites it

The order draft holds only what the trader typed or chose. Live price, balance and bounds feed a derived preview and a validation context; they never write an input. Which state survives a side, type, market or account change is an explicit decision.

**Apply when:** ticket fields depend on live price, balance, max size or leverage; the form has Max, a slider, a limit prefill, a debounced preview, side tabs or order types.

**Checks:** no effect calls a draft setter with live-data dependencies; a bounds change shows an error naming the overage; size is clamped only on a discrete trader-driven cap step (leverage change, side flip, funding-source toggle), once, lot-floored and never while the trader is editing the size input or slider; when the product specifies a limit prefill, one resolver derives it from the book using the sourced reference, rounds it to the tick on the side that never crosses the spread, returns null while the book is unread, samples it once when the field becomes visible, keeps any value the trader typed, and clears it on market change; a debounced preview is keyed on user inputs and reads the freshest derived price at quote time; the shell owns size, limit price and slippage while entry fields remount on market, side and type; in-flight attempt state is keyed by operation id and lives outside the form that remounts, so a side flip does not drop the outcome; whether submissions may overlap is a recorded product decision enforced only by the control's existing in-flight state (see execution-fresh-identity-per-deliberate-action).

**Anti-pattern:** Effects that re-clamp the size when max ticks, a limit field bound to the live mid, or a debounce keyed on a price derived from the book.

**Why it fails:** A clamp on each cap downtick ratchets a Max size down a lot at a time and never back up. A limit field that tracks mid races the click, and a seed latched at page load hands over a stale price. A debounce keyed on a live-derived bound restarts on every tick, so the preview never becomes current and preview-only rejections reach the venue. A per-form placement record is dropped on a mid-placement side flip, losing the outcome.

**Bad example (illustrative):**

```text
useEffect(() => setSize(min(size, max)), [max])
```

**Better example (illustrative):**

```text
const error = gt(size, max) ? 'exceeds max' : null
```

**Legitimate exceptions:** Pegged modes the trader enabled, with the pegged meaning shown and the value frozen at click.

**Verification scenario:** Type Max on a market order and stream adverse ticks: the input text is unchanged and the gate names the overage. Lower leverage: the field drops to the new Max once. With a specified prefill, switch from market to limit after a wait: the field shows the resolver value sampled then, on the non-crossing side. Start a placement and flip side: the outcome still arrives on its operation id.

**Automatable check:** Component test that input values survive simulated ticks; hook test that many derived-price changes in the debounce produce one preview request.

Pack: `terminal` (candidate). Topics: `forms`, `state`, `execution`, `frontend`, `implementation`.

<a id="terminal-confirm-freezes-intent-live-risk"></a>

## A confirm step freezes intent and keeps risk figures live

A review dialog between the order form and dispatch renders two kinds of data. The trader's intent (size, price, side, type, reduce-only, bracket plans and the reviewed account and venue) is snapshotted at the submit click and is what gets sent. Derived risk figures (margin, liquidation estimate) stay live. A funding leg the dispatch will move is intent: freeze it with the order or, where it must be recomputed, reconfirm when it materially worsens (see money-requote-material-tolerance). The confirm click re-runs validation and the margin verdict against live state and refuses if the reviewed account or venue is no longer the active one. For the related fences, see execution-fence-mutations-to-account, money-requote-material-tolerance and websec-signed-payload-must-match-what-user-saw.

**Apply when:** a confirmation or review step sits between the order form and dispatch while prices and account state keep moving, including a skip-confirmation preference.

**Checks:** the dispatched payload is built from the frozen intent, not from form state read at confirm time; risk rows read live previews; a blocking verdict or a hold state at confirm closes the dialog and shows the objection in the form; dismissal is blocked while the send is in flight; a storage failure reading the skip preference degrades to showing the dialog.

**Anti-pattern:** Render the dialog entirely from live form state, or entirely from a snapshot, and validate only at the first click.

**Why it fails:** A market order's bound moves with the book, so a dialog quoting live values can show one price and send another. The reduce-only toggle stays live until the click, so reading it later can describe an order the trader did not place. In the other direction, frozen margin and liquidation rows go stale while the dialog is open, and a funding-leg amount shown at open but recomputed at send moves something the trader did not review. Dismissing with Escape after the send abandons the visible state of an order already in flight. An extra confirmation costs a click; a skipped one costs an unintended position.

**Bad example (illustrative):**

```text
onConfirm = () => send(readFormState()) // whatever the form holds now
```

**Better example (illustrative):**

```text
onConfirm = () => liveVerdict.blocks || !sameOwner(intent.owner, current) ? close() : send(intent)
```

**Legitimate exceptions:** One-click trading, where snapshot and send share a tick.

**Verification scenario:** Open the dialog and flip reduce-only behind it: the sent order matches the dialog. Open the dialog and drain margin: confirm does not send and the form shows the objection. Switch account with the dialog open: confirm is refused. Press Escape during the send: the dialog stays until the outcome is known.

**Automatable check:** End-to-end test capturing the dispatched intent and comparing it with the dialog text; a fixture that changes state between review and confirm.

Pack: `terminal` (candidate). Topics: `execution`, `forms`, `money`, `frontend`, `implementation`.

<a id="terminal-submit-hot-path-and-hotkeys"></a>

## Keep the submit hot path short and its triggers exact

Between the trader's intent and the order request there are only documented, essential awaits. Trade buttons keep native click activation, and the button node stays mounted and in place between press and release, so live updates cannot swallow the click. Pointer-down activation is a sourced product decision, never a default. Trading hotkeys exist only while the feature is armed and go through the same submission path as the button, with the same validation and a fresh operation identity (see execution-fresh-identity-per-deliberate-action).

**Apply when:** touching submit, cancel, close or close-all handlers or the helpers they share (auth refresh, flags, analytics, session checks), or adding quick-trade buttons or keyboard shortcuts that trigger orders.

**Checks:** the awaited calls between intent and request are listed before and after the change; variant-specific async helpers stay inside their guard; order and signing code is preloaded when the ticket mounts; non-essential work runs after dispatch; an essential preflight documents its authority, timeout, caching and failure behavior; hotkeys ignore key repeats, held modifiers and focus in an input, select or editable element; hold-to-arm state resets on window blur and when the feature is disabled.

**Anti-pattern:** Add awaited preflights before dispatch, lazy-load the signing module on first click, bind both pointer-down and click handlers, or map keys to orders in a global keydown listener.

**Why it fails:** Each await adds latency and a new failure point before the order leaves: in a fast market a few hundred milliseconds is a worse fill, and a failing analytics call blocks trading. If live updates remount or move the button between press and release, the click is lost and the trader believes they traded. Binding both handlers fires twice and doubles the order. With a global listener, typing a size fires orders, a held key repeats the order at the operating system repeat rate, and a hold-to-arm key stays armed after switching windows because the key-up never arrives.

**Bad example (illustrative):**

```text
window.addEventListener('keydown', e => actions[e.key]?.())
```

**Better example (illustrative):**

```text
if (!armed || e.repeat || e.metaKey || e.ctrlKey || e.altKey || isEditable(document.activeElement)) return
```

**Legitimate exceptions:** Checks that must be fresh (session validity, quote expiry), bounded by a timeout. Where pointer-down activation is sourced, destructive confirmations and touch targets inside scroll containers still keep click activation.

**Verification scenario:** On click the first network call is the order request or the documented preflight list, with slow or failing analytics and flag endpoints causing no delay. Press, move away, release: no action. Re-render the ticket between press and release: one action. Enter key: one; secondary button: none. Type the mapped key in the size input: nothing fires. Hold the key: one action. Hold the arm key, blur the window, return: not armed.

**Automatable check:** Test recording the network sequence on submit; component tests with event sequences.

Pack: `terminal` (candidate). Topics: `execution`, `performance`, `frontend`, `implementation`, `review`.

<a id="terminal-trades-tape-bounded-ordered"></a>

## Keep the trades tape bounded, ordered and deduplicated

The recent-trades tape is a capped buffer sized to the visible rows plus a small margin. Trades are inserted by venue sequence, or by trade id only where the venue documents ids as ordered, otherwise by trade time then id, deduplicated within that window, flushed once per frame and rendered with rows keyed by trade id so only new rows mount and animate. For the append accumulator and publish cadence it shares with the book, see terminal-book-store-and-paint-cadence.

**Apply when:** building a recent-trades list fed by a snapshot plus a stream, or by a channel that replays recent trades on every resubscribe.

**Checks:** snapshot and live overlap dedupe by id; the cap applies to both the pending batch and the published list; no whole-array shift or re-sort runs per trade; a resubscribe batch merges rather than appends; only visible rows are converted to display units; merging same-instant prints into one row is a product decision, not a default.

**Anti-pattern:** Prepend each trade to a growing array in component state, order by arrival and key rows by index.

**Why it fails:** Memory and render cost grow all session, so the terminal turns janky after it has been open a while. Arrival order differs from execution order under batching. Index keys reuse each row component for a different trade, so a mount animation plays on the wrong row and any change-triggered flash fires on every row. Overlap between the snapshot and the first live frames shows the same print twice. A tape that re-merges and re-sorts hundreds of fills on every store commit becomes a hot spot.

**Bad example (illustrative):**

```text
setTrades(prev => [trade, ...prev])
```

**Better example (illustrative):**

```text
tape.insertBySequence(trade); scheduler.requestFlush(() => publish(tape.visible()))
```

**Legitimate exceptions:** A full trade-history view uses cursor pagination, not the tape buffer. A feed guaranteed ordered and unique may skip the ordered insert but keeps the cap.

**Verification scenario:** Stream a very large number of trades: the length stays at the cap and the heap is flat. Shuffle delivery inside a batch: display follows sequence. Overlap the snapshot with live trades, then reconnect: no duplicate rows and only genuinely new rows animate.

**Automatable check:** Unit tests on the buffer for cap, order and dedupe; a heap assertion in a soak test.

Pack: `terminal` (candidate). Topics: `realtime`, `performance`, `frontend`, `implementation`.

<a id="terminal-measure-before-virtualize-or-workers"></a>

## Measure before adding virtualization, workers or chunking

Virtualization, workers, canvas and yielded chunks are added where measurement attributes the cost, and each comes with a fallback. A fixed-row book is not virtualized. Long lists virtualize with fixed row height, entity keys and per-cell live subscriptions. Every worker request has a deadline and a typed fallback. Burst handlers yield between chunks, and anomaly handling does bounded work. For the evidence rule and visible-only rendering, see react-performance-evidence and web-app-render-only-visible.

**Apply when:** deciding to virtualize a list, move parsing, reduction or drawing into a worker, split burst work across tasks, or write gap detection and resync loops.

**Checks:** slow frames are attributed with long-animation-frame data (blocking duration, script source, forced layout) tagged by route before anything is optimized; worker start failure and message errors are detected explicitly; workers send deltas or transferable buffers at the publish cadence, not full state per message; work that must be atomic for correctness, such as applying one diff, stays in one task and yields happen between diffs; gaps are tracked as ranges, and recovery is a single in-flight attempt with capped backoff, jitter and a visible degraded state after repeated failure.

**Anti-pattern:** Virtualize every table including five-row ones, move selectors to a worker by default, process a whole snapshot and all derived work in one task, and allocate a timer per missing sequence id.

**Why it fails:** Virtualization adds a scroll container, measurement, focus and keyboard handling and sticky-header complexity with no gain on small fixed lists. A structured-clone copy per message can exceed the compute saved. Workers fail in the field: a mobile browser can stall worker responses until a watchdog fires, so a page without a prompt fallback loads only after that timeout. Any task over 50 ms blocks input, and a click on Buy during it is a late order. An id jump of millions that allocates per missing id freezes the tab.

**Bad example (illustrative):**

```text
for (let id = last + 1; id < msg.id; id++) missing.set(id, setTimeout(resync, 500))
```

**Better example (illustrative):**

```text
const next = await withDeadline(worker.reduce(delta), budgetMs).catch(() => reduceOnMain(delta))
```

**Legitimate exceptions:** Lists known to hold thousands of rows can be virtualized up front. Small books and low message rates need no worker; the simplest correct design wins.

**Verification scenario:** Profile before and after with a burst fixture. Kill the worker mid-session: the book continues on the main-thread path within one publish interval and telemetry records the fallback. Reconnect under CPU throttling with a 5,000-level snapshot while clicking submit: click-to-feedback stays under 200 ms. Feed id 10 then id 5,000,000: no long task and one recovery attempt.

**Automatable check:** Performance budget test on long tasks and commits per second; unit test with an injected worker factory that never responds, asserting fallback within the deadline.

Pack: `terminal` (candidate). Topics: `performance`, `planning`, `frontend`, `review`.

<a id="terminal-link-prefetch-storm-on-redirect"></a>

## Never auto-prefetch a persistent link that redirects

An always-visible navigation link must target a canonical URL. When the bare route redirects to a remembered or default market, the destination is resolved on the server and handed to the navigation, so no link points at a redirecting URL. Where the destination cannot be canonical, automatic prefetch is disabled on that link and prefetch happens on intent. An idle-request cap in a browser test keeps it that way. For the route contract, see navigation-state-contracts.

**Apply when:** header, logo or tab links in a framework router with automatic link prefetch target a section root that the edge or a layout redirects or canonicalizes.

**Checks:** no persistent link targets a route that redirects; pickers that are buttons prefetch on hover or focus, because a cold fetch during a view transition is a visible freeze; idle pages make zero automatic route-payload requests for other sections; resource hints such as fetch priority are changed only with a before and after measurement.

**Anti-pattern:** A header link to the bare trade route, which redirects to a market route, left on default prefetch on the assumption that automatic prefetch is free.

**Why it fails:** The router keeps rescheduling the prefetch of the redirecting route while the user sits on another page: on a production build an idle page issues repeated payload requests for the redirecting route, hundreds per minute. With automatic prefetch disabled on that link the idle page makes zero automatic requests and click navigation still works. Changing the chart bundle's fetch priority does not change chart-ready time on a slow network when total bytes dominate.

**Bad example (illustrative):**

```text
<Link href="/trade">Trade</Link> // /trade redirects to /trade/<market>
```

**Better example (illustrative):**

```text
<Link href={canonicalTradeHref} prefetch={false}>Trade</Link> // pickers: onPointerEnter={() => router.prefetch(href)}
```

**Legitimate exceptions:** Static destinations with no redirect, where default prefetch is correct.

**Verification scenario:** Sit idle on the trading page for 30 seconds in a production build: automatic route-payload requests for other sections stay at zero. Then navigate to another section and back by click: both navigations work.

**Automatable check:** Browser journey that counts route-payload requests during idle with a hard failure cap, plus the click journey.

Pack: `terminal` (candidate). Topics: `performance`, `web-app`, `frontend`, `implementation`, `review`.

<a id="terminal-rolling-window-query-keys"></a>

## Bucket rolling time windows in query keys

A query parameterized by a rolling window (the last 24 hours of fills, funding history) derives its start from a shared ticking clock floored to a bucket, so the key changes at most once per bucket. When the key change is a same-window rotation, a small positive shift of the start, the previous data stays as a placeholder; a different window selection shows loading. For key identity in general, see cache-identity-and-invalidation.

**Apply when:** a query key or request parameter contains a start or end time computed from now, or a window selector offers rolling ranges beside fixed ones.

**Checks:** no wall-clock read appears inside a query key expression; the clock is shared so sibling queries rotate together; the placeholder is kept only for a same-window rotation, never across a window change or an account change; the server-rendered first paint uses the server bucketed start so hydration agrees (see web-app-hydration-stable-clock); an all-time range uses a constant.

**Anti-pattern:** Put the current time minus the window into the key at render, or freeze the start when the window is selected.

**Why it fails:** A key that changes every render refetches forever and never settles. A frozen start turns the last 24 hours into the last 30 hours as the page stays open, which on a trading screen misstates recent fills and funding. Rotating the key each bucket without a placeholder flashes the region to loading once a minute.

**Bad example (illustrative):**

```text
queryKey: ['fills', Date.now() - dayMs]
```

**Better example (illustrative):**

```text
start = floorToMinute(now) - dayMs; placeholderData: (prev, q) => isSameWindowRotation(q, start) ? prev : undefined
```

**Legitimate exceptions:** Fixed ranges explicitly chosen by the user, which are stable keys already.

**Verification scenario:** Leave the page open for several minutes: one request per bucket and no skeleton flash, and the oldest row shown stays inside the window. Change the window: the skeleton shows. Switch account: no rows from the previous account appear as placeholder.

**Automatable check:** Lint against wall-clock reads inside query key expressions; hook test with a fake clock asserting one key change per bucket.

Pack: `terminal` (candidate). Topics: `query`, `cache`, `frontend`, `implementation`.

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

## Place third-party reads by trust and delivery contract

Classify every third-party read by credential secrecy, request signing, authorization, CORS, privacy, cacheability, consistency and vendor quota. Secret-bearing, server-authorized or normalized authoritative reads go through a first-party server boundary. Public CORS-safe data may load directly in the browser when user-distributed quotas and latency make that preferable. Server rendering uses only sources whose cache and timeout contract protects the response stream. The region still renders its real surface with null data in the HTML, while surrounding first-party critical data keeps streaming.

**Apply when:** a server component, layout bootstrap or server-rendered suspense query calls an external API, or a diff adds query keys for a vendor.

**Boundary notes:** Placement is separate from priority: a vendor ticker still waits for its bucket, while a critical vendor balance starts once browser prerequisites allow.

**Checks:** every vendor registry entry declares placement and why; browser-direct reads contain no reusable credential or server-only signature and satisfy CORS and privacy policy; server reads use bounded timeout, cache and quota ownership; the dehydration predicate follows that registry instead of a global vendor ban; socket-owned account queries (never stale, no refetch) are excluded unless opted in, since a snapshot from before the subscription would never be repaired; a vendor addend in a first-party total renders the first-party part with the addend marked busy.

**Anti-pattern:** Put every vendor read in the browser, or every vendor read on the server, without classifying its trust and delivery contract.

**Why it fails:** Browser-only placement can expose credentials, fail CORS and let untrusted clients become the source of a sensitive fact; server-only placement can exhaust shared-IP quotas and hold HTML on vendor latency.

**Bad example (illustrative):**

```text
await queryClient.prefetchQuery(venueMarketsQuery) inside a server layout.
```

**Better example (illustrative):**

```text
Public ticker: browser query under the vendor registry; signed account balance: first-party proxy with scoped credential, cache and timeout policy.
```

**Legitimate exceptions:** Reads through a first-party proxy you operate, with its own cache and quota contract, are first-party server requests with their own priority.

**Verification scenario:** Exercise public CORS-safe, secret-bearing, signed and no-CORS vendors; verify registry-selected placement, no client credential exposure, bounded server behavior and hydration only for approved server-owned keys.

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

## Keep server pages until route needs prove otherwise

Keep Next.js pages and layouts as server components by default. Read promised params in the route owner, perform route-local authorization, metadata and server-only composition there, and place the interactive trading workspace in the smallest client child. Use Suspense or the framework's current cache and partial-rendering primitives around dynamic regions. Opt an entire page into client mode only when measured navigation behavior requires it and no route-local server responsibility is lost.

**Apply when:** planning routing for a Next.js 16 app with many dynamic routes, or reviewing a page that exports segment config, reads cookies or awaits params outside Suspense.

**Boundary notes:** Content, auth and admin routes with little in-app navigation can stay server pages.

**Checks:** page and layout responsibilities match the repository's Next.js version; route authorization and metadata remain server-owned; client boundaries contain only interactive state; params are resolved at the correct boundary; hard loads stream approved critical content; navigation and JavaScript cost are measured before whole-page clientization.

**Anti-pattern:** Make every page client-only to avoid one dynamic server read, or keep an entire interactive workspace server-owned.

**Why it fails:** Whole-page clientization discards server authorization, metadata and streaming, while an oversized dynamic server page can add unnecessary round trips and loading for data the browser already holds. Either extreme ignores route responsibilities.

**Bad example (illustrative):**

```text
export default async function Page({ params }) { const { id } = await params; return <Workspace id={id} /> }
```

**Better example (illustrative):**

```text
Server Page resolves params, authorization and metadata, then renders <TradingWorkspaceClient marketId={marketId} /> inside the approved boundary.
```

**Legitimate exceptions:** A route needing per-request server-only work in the page body, with no client equivalent, can stay server-rendered; record why.

**Verification scenario:** Navigate between two entities and allow the framework's expected dynamic route payload; assert there is no additional client waterfall or unnecessary loading for cached data, route-local authorization and metadata stay server-owned, and a hard load streams approved critical content.

**Automatable check:** A boundary check rejects server-only imports from client modules and flags whole-page clientization for explicit review.

Pack: `web-app` (candidate). Topics: `frontend`, `planning`, `performance`, `composition`.

<a id="web-app-progressive-merged-readiness"></a>

## Render merged regions from the first ready source

When a region merges independent sources (one per chain, venue or market) and any single result is useful, start every admitted source query in parallel, including during SSR, and suspend only until the first succeeds; a successful empty result counts as ready, a failure does not. The data component merges the entries that exist and passes real data to the surface; later results and live updates flow through the same per-source cache entries. Use an explicit aggregate over ordinary query results so partial success, pending and per-source failure stay identifiable. If server streaming is required, wait for first success with success-only semantics rather than `Promise.race`, and include only SSR-eligible sources.

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
useQueries starts every source; render resolved entries by source key; pending and failed sources keep their own status without blanking successful data.
```

**Legitimate exceptions:** Two or three fast co-located sources can share one boundary; staging is worth its cost when tail latency differs materially between sources.

**Verification scenario:** Reject one source first, delay another and resolve a third with an empty list; assert rejection does not blank the region, the empty success establishes readiness, source identity stays intact and only SSR-eligible results stream.

Pack: `web-app` (candidate). Topics: `frontend`, `query`, `components`, `performance`, `implementation`.

<a id="web-app-render-only-visible"></a>

## Unmount hidden panels and return from cache

Choose unmounting or retained hidden state from measured cost and state-lifetime needs. Ordinary hidden DOM with live effects should unmount, while a framework Activity boundary may preserve expensive local state if its effects and subscriptions clean up correctly while hidden. Instant return comes from the query cache and an admitted live owner: the region re-renders from cached entries and shows null-data surfaces only for scopes never loaded. The cost compounds where the router retains hidden routes (Next.js App Router keeps several visited routes mounted for back navigation), multiplying every hidden region. Refines core card react-performance-evidence.

**Apply when:** a diff adds force-mount, preserve-content, display:none toggles or hidden Activity around data-bearing UI, or a hidden route still asserts request demand or holds subscriptions.

**Boundary notes:** Scroll position or open state that must survive a switch is state, not DOM: store it in the feature's state and restore it on mount.

**Checks:** hidden regions have measured DOM and memory cost; effects release subscriptions or demand while hidden; unsent drafts and expensive canvases follow approved persistence behavior; reopening renders from cache without a loading flash; slow reopening is fixed through the query key or cache lifetime, not by pinning the tree.

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

**Automatable check:** Lint force-mount and preserve-content usage outside a reviewed allowlist; verify effect cleanup and profile retained Activity boundaries.

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

<a id="websec-signed-payload-must-match-what-user-saw"></a>

## Confirm from the bytes being signed, and assume your own served script can lie

The confirmation the user reads is decoded from the exact payload handed to the signer, never re-rendered from form state, and the action is signed in a typed, human-readable form so the wallet or hardware device shows recipient, amount and action independently of the page. Served assets are immutable and content-addressed, so replacing one needs the release pipeline rather than one person's cloud session. Wallet-side validation is covered elsewhere, see chain-wallet-untrusted-user-boundary.

**Apply when:** Building any flow where the page constructs a transaction, order or typed-data payload for a wallet to sign, or designing deploy and asset hosting for the trading app.

**Boundary notes:** Nothing inside the page can detect a replaced script, because the page is then the attacker. The independent controls are the wallet display, the storage permissions and an outside monitor. Release authority is covered elsewhere, see operations-split-release-authority-provenance.

**Checks:** The modal and the sign call receive the same payload object; the modal decodes it rather than reading the form. Asset names are hashed; bucket writes are limited to the release role, with object versioning and write alerts; no long-lived human write credentials exist. Build hashes are published so a monitor can diff served files against built files.

**Anti-pattern:** Render the summary from form state while a separately built payload goes to the signer, and serve static assets from a bucket any developer credential can overwrite.

**Why it fails:** In a 2025 incident, an attacker holding a developer's cloud session replaced a script in the storage behind a production signing app. It activated for one target account only, swapped the payload at signing time and left the on-screen summary untouched; the signers approved because the page looked right.

**Bad example (illustrative):**

```text
showConfirm(formValues); wallet.sign(buildPayload(formValues))
```

**Better example (illustrative):**

```text
const payload = buildPayload(intent); showConfirm(decode(payload)); wallet.signTypedData(payload)
```

**Legitimate exceptions:** Flows signed by a delegated or session key cannot show every order in a wallet. The scope of that key (no withdrawals, capped notional, expiry) is then the control and is shown when the key is approved, see chain-signer-allow-only-capability-policy.

**Verification scenario:** In a test build, mutate the payload after the modal opens: the modal shows the mutated recipient because it renders from final bytes. Try to overwrite a production asset with a non-pipeline credential: denied and alerted.

**Automatable check:** A CI or monitor step comparing deployed asset hashes with the build manifest, and an alert on any object write outside the release role.

Pack: `websec` (candidate). Topics: `security`, `signing`, `frontend`, `implementation`, `review`.

<a id="websec-dependency-runs-as-your-origin"></a>

## Every bundled dependency runs with your origin's full authority

Any package in the bundle, including transitive utilities for colors, logging or strings, can wrap fetch and the injected wallet provider. Treat every lockfile change on a signing app as a code change to the signing path: review a diff of the built bundle, not only the manifest, and keep the dependency set behind the signing path small. Intake rules (frozen install, minimum release age, update-bot cooldown) are not restated here, see operations-supply-chain-baseline.

**Apply when:** Adding or updating any dependency in an app that builds transactions or talks to a wallet, or reviewing an automated dependency bump.

**Boundary notes:** A content security policy does not help here: the code is first-party bundle code and needs no exfiltration, because it only rewrites what gets signed. The wallet-side display of the final recipient is the last line of defense, see websec-signed-payload-must-match-what-user-saw.

**Checks:** Lockfile changes produce a bundle diff listing new modules, new references to wallet-provider globals, assignments to fetch or XMLHttpRequest, and new long hex or base58 literals. Dependency bumps are not auto-merged for the trading app. Modules imported by the signing path are enumerable and reviewed.

**Anti-pattern:** Resolve caret ranges fresh in CI, auto-merge dependency bumps, and assume only wallet or crypto packages are sensitive.

**Why it fails:** In a 2025 registry compromise, phished maintainer credentials published new patch versions of utility packages with billions of weekly downloads. The payload ran in the browser, wrapped fetch, XMLHttpRequest and the wallet provider, and rewrote recipient and approval targets to lookalike addresses before signing while the UI stayed correct. Any site whose build resolved fresh versions during the exposure window shipped it; builds from a lockfile committed before the release did not.

**Bad example (illustrative):**

```text
"tiny-color-util": "^4.1.0", resolved at build time and merged by the bot unreviewed
```

**Better example (illustrative):**

```text
Frozen install from the committed lockfile; a lockfile PR attaches the bundle diff and needs an owner review
```

**Legitimate exceptions:** An emergency security fix younger than the age gate, taken through an explicit reviewed override.

**Verification scenario:** Open a PR bumping a transitive utility to a version published today: resolution fails on the age gate. Add a fixture package that assigns to the global fetch: the bundle-diff check flags it.

**Automatable check:** Scan the built bundle diff for assignments to global fetch, the XMLHttpRequest prototype or the wallet provider request method, and for new address-shaped literals.

Pack: `websec` (candidate). Topics: `security`, `modules`, `frontend`, `review`.

<a id="websec-no-runtime-resolved-third-party-code"></a>

## Do not let third-party code resolve its version at page load

A lockfile pins only what is bundled. If a package is a thin loader that injects a script tag for its real implementation, the code users run is whatever the remote host serves at that moment. Bundle third-party code at build time from an exact locked version, or self-host a reviewed copy as an immutable asset. If a remote script is unavoidable, put the full version in the URL and add Subresource Integrity with the crossorigin attribute.

**Apply when:** Integrating wallet connectors, onramp widgets, analytics, chat or any SDK, and before adopting a package whose published code is small relative to what it does.

**Boundary notes:** A nonce-based policy with strict-dynamic does not stop this, because a trusted script may load further scripts. An Integrity-Policy header for scripts enforces this where supported, and it requires integrity metadata on every first-party chunk too, so enable build-time SRI first and roll it out report-only. Policy shape is covered elsewhere, see websec-strict-csp-for-trading-pages.

**Checks:** New SDKs are audited for dynamic script injection before adoption. No script URL in the bundle carries a floating tag or a version range. The production script policy lists no third-party host. Remote scripts that remain have a full version and an integrity hash.

**Anti-pattern:** Pin a loader package in the lockfile and consider the integration pinned while it fetches the latest implementation from a public CDN on every page load.

**Why it fails:** In a December 2023 incident, phished registry access of a former employee was used to publish a malicious version of a wallet connector library. Integrators loaded it through a loader that resolved the newest version from a CDN, so every site using it served a wallet drainer within minutes, with no redeploy and no lockfile change on their side. The window was closed by the publisher, not by integrators.

**Bad example (illustrative):**

```text
script.src = cdnBase + "/connector@1/index.js" // major-only range, resolved per page load
```

**Better example (illustrative):**

```text
import { connect } from "connector" // exact version in the lockfile, bundled at build time
```

**Legitimate exceptions:** Wallet browser extensions inject their own provider outside the page's control, see chain-wallet-untrusted-user-boundary. Payment or identity-check iframes on their own origin are isolated by the frame boundary.

**Verification scenario:** Build the app and block all third-party script hosts at the network layer: connect and trade flows still work. Search the bundle for script-element creation and confirm no target resolves a floating version.

**Automatable check:** A CI check that the production script policy contains no third-party host, plus a bundle scan for dynamic script URLs lacking a full version and integrity hash.

Pack: `websec` (candidate). Topics: `security`, `modules`, `frontend`, `implementation`, `review`.

<a id="websec-strict-csp-for-trading-pages"></a>

## Ship a nonce-based strict CSP with narrow connect-src and frame-ancestors

Use script-src with a per-response nonce and strict-dynamic (or hashes for a static shell), object-src none, base-uri none, frame-ancestors none or the exact embedding origins, and an explicit connect-src generated from the same typed endpoint registry the app uses, so adding a host is a reviewed change. Deliver it as a response header and roll it out in report-only mode first.

**Apply when:** Configuring response headers for the trading app, adding a third-party script, or adding a new API, RPC or socket host.

**Boundary notes:** CSP is not a supply-chain control. A compromised bundled dependency, or a script trusted through strict-dynamic, runs with full rights, see websec-dependency-runs-as-your-origin and websec-no-runtime-resolved-third-party-code. In server-rendered React frameworks a per-request nonce forces dynamic rendering for those routes; decide that trade-off explicitly instead of weakening the policy.

**Checks:** No unsafe-inline and no host allowlist in script-src. connect-src has no wildcard and matches the endpoint registry exactly. frame-ancestors is present. Violation reports are collected and read before enforcement is switched on.

**Anti-pattern:** A host-allowlist script-src with CDNs and unsafe-inline, a wildcard connect-src because there are many endpoints, no frame-ancestors, and a meta-tag policy added late.

**Why it fails:** Host allowlists are bypassable in most real configurations through callback endpoints or hosted libraries with gadget behavior on an allowed host, so injected markup still executes. A wide connect-src lets an injected script send session tokens and order data to any host. Without frame-ancestors the terminal can be framed and one-click trading buttons clickjacked.

**Bad example (illustrative):**

```text
script-src 'self' 'unsafe-inline' https://cdn.example; connect-src *
```

**Better example (illustrative):**

```text
script-src 'nonce-{random}' 'strict-dynamic'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; connect-src {registry hosts}
```

**Legitimate exceptions:** User-configurable RPC endpoints need a proxy on an allowed origin or a deliberately wider connect-src recorded as accepted risk. A charting library that needs unsafe-eval or blob workers is isolated in a sandboxed iframe with its own policy.

**Verification scenario:** Inject a script element through a test-only reflected parameter: blocked and reported. Fetch an unlisted host from the console: blocked. Load the app in a cross-origin iframe: refused.

**Automatable check:** A header test asserting the policy shape, and a unit test that every host in the endpoint registry appears in connect-src and nothing else does.

Pack: `websec` (candidate). Topics: `security`, `web-app`, `frontend`, `implementation`, `review`.

<a id="websec-trusted-types-for-untrusted-strings"></a>

## Treat external display strings as hostile and enforce Trusted Types on DOM sinks

Market names, token symbols, memo fields, token-list metadata, URL parameters, notification payloads and API error strings are attacker-controlled. Enable require-trusted-types-for 'script' (report-only first) with a small set of named policies, validate and length-cap external strings at the boundary, see types-boundary-validation, and allowlist URL schemes for any external link.

**Apply when:** Rendering any string that originates from a chain, a venue API, a token list, a URL or a notification, or adding rich text, tooltips, announcements or a markdown renderer.

**Boundary notes:** React text rendering escapes by default, so the work is auditing library sinks: chart, table and toast libraries often accept HTML strings for labels and tooltips. Replace those with DOM or text APIs. Link href values are a sink for javascript: URLs, which the scheme allowlist blocks; document.title takes text and is not an injection sink.

**Checks:** No raw HTML insertion outside one sanitizer module behind a single named policy. Chart legends, tooltips, table cells and toasts receive text, not markup. External links pass a scheme allowlist. Violation reports are collected.

**Anti-pattern:** Insert announcements or token descriptions as raw HTML, build tooltip HTML strings for a chart or table library, or pass URL parameters into a link target unchecked.

**Why it fails:** Where listings are permissionless, anyone can create a market or token whose name or metadata contains markup. An injected symbol reaching an HTML-string sink executes script in the origin that holds the session and talks to the wallet; with an approved session key it can place orders without a prompt.

**Bad example (illustrative):**

```text
tooltip.innerHTML = "<b>" + market.name + "</b> " + price
```

**Better example (illustrative):**

```text
nameNode.textContent = market.name; priceNode.textContent = price
```

**Legitimate exceptions:** A library that requires HTML strings and cannot be configured otherwise is fed through the one sanitizing policy or isolated in a sandboxed iframe.

**Verification scenario:** Add a fixture market whose name is an image tag with an error handler. It renders as literal text in the market list, chart legend, tooltips and toasts, no dialog opens, and any sink that received a raw string emits a violation report.

**Automatable check:** An end-to-end fixture with a hostile symbol asserting no dialog and no violation report, and a lint rule forbidding raw HTML insertion outside the sanitizer module.

Pack: `websec` (candidate). Topics: `security`, `components`, `frontend`, `implementation`, `review`.

<a id="websec-third-party-script-isolation-on-trade-routes"></a>

## Keep third-party scripts out of the main frame on routes that sign

Trade and account routes load only first-party bundled code. A third-party script that is truly required runs in a sandboxed cross-origin iframe with a narrow postMessage contract, or is mirrored in-house at a pinned version and served under a hashed immutable name with Subresource Integrity. Analytics on those routes go through a first-party endpoint with an explicit event schema that excludes addresses, amounts and payloads.

**Apply when:** Adding analytics, a tag manager, session replay, support chat, experiment tooling, an onramp widget or a self-hosted charting bundle to routes where orders are signed.

**Boundary notes:** Version pinning of remote code is covered elsewhere, see websec-no-runtime-resolved-third-party-code. Large vendor libraries deployed as content-hashed immutable assets with long cache lifetimes are also the performance-correct choice. Dependency intake is covered elsewhere, see operations-supply-chain-baseline.

**Checks:** The trade route requests scripts only from its own origin, all with hashed names. No tag manager or session replay loads there. The analytics schema is an allowlist of fields. Every external or vendor script tag carries an integrity attribute; a vendor library that loads its own sub-bundles is served from one hashed immutable directory or isolated in a sandboxed iframe. Each iframe message handler checks origin and message shape.

**Anti-pattern:** A tag manager on every route so scripts can be added without deploys, session replay recording the order form and wallet prompts, and a vendor bundle served from a mutable path with a long cache and no hash.

**Why it fails:** A tag manager is a remote code execution channel into the trading origin, held by a different team and credential set; any script it adds can read the DOM and wrap fetch and the wallet provider, and it changes with no code review or lockfile diff. Session replay sends balances, addresses and order intent to a third party. A mutable vendor file can be swapped like any other asset, see websec-signed-payload-must-match-what-user-saw.

**Bad example (illustrative):**

```text
The root layout injects the tag-manager snippet and session replay for every route, trade included
```

**Better example (illustrative):**

```text
Trade layout: bundled scripts only; track(event) posts allowlisted fields to a first-party endpoint
```

**Legitimate exceptions:** Regulatory or fraud tooling mandated on all routes: isolate it in an iframe where possible and record the accepted risk with an owner.

**Verification scenario:** Load the trade route with third-party hosts blocked: full functionality. List its scripts: only same-origin hashed files. Change one byte of the vendor entry script on the server: the browser refuses it on integrity mismatch; a write to its sub-bundle directory from a non-release credential is denied and alerted.

**Automatable check:** An end-to-end assertion that the trade route requests no script from another origin, and a CI check that every external or vendor script tag has an integrity attribute.

Pack: `websec` (candidate). Topics: `security`, `web-app`, `frontend`, `planning`, `review`.
