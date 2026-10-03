# Executable checks catalog

Checks a destination repository can implement with its own language, linter, test runner and CI. Each entry states the purpose, the signal it inspects, an implementation sketch, the test cases that prove it bites and its ratchet behavior. Adopt a check by adding it to the repository's check command and to the matching risk-routing row, then record it in PROJECT.md.

Rules for every check:

- Ship the check with its own tests: at least one fixture that must fail and one that must pass. A check that cannot fail proves nothing.
- Report category and location. Never echo a secret, key or credential.
- Fail closed: input the check cannot parse is a failure with a clear message, not a pass.
- Prefer a syntax-aware rule over text matching when the language tooling allows it, and document any known blind spot in the check's help text.

## Money and execution

### No float parsing of wire amounts

- **Purpose:** keep amounts, prices, fees and balances exact from the wire to signing, submission and accounting.
- **Signal:** in money-path files from risk routing, float conversions (such as `Number()`, `parseFloat()`, unary plus or `float()`) and native float arithmetic applied to wire amount fields or to values that reach a payload builder.
- **Sketch:** a lint or syntax-tree rule scoped to money-path globs. Allow the repository's exact decimal helpers and an explicit display-only formatter; anything else needs a baseline entry.
- **Tests:** fails on a float-multiplied minimum output and on a parsed balance passed into a payload; passes the exact decimal helper and a display-only formatter; ignores files outside money paths.
- **Ratchet:** baseline of existing violations; new violations and stale entries fail.

### No retry option on mutations

- **Purpose:** an automatic retry of a non-idempotent write can duplicate an order, transfer or signature.
- **Signal:** mutation definitions with retries enabled; HTTP clients or interceptors that replay POST, PUT, PATCH or DELETE, including after an auth refresh; transaction senders that rebroadcast automatically.
- **Sketch:** a lint rule on mutation options and client configuration, plus a unit test of the shared interceptor. Allowlist only operations whose contract declares idempotency, each entry citing that contract.
- **Tests:** fails on a mutation with retries; fails on an interceptor replaying a POST after a token refresh; passes GET retries; passes an allowlisted idempotent operation; fails an allowlist entry without a contract citation.
- **Ratchet:** allowlist entries require a contract reference; stale entries fail.

### Mainnet broadcast guard

- **Purpose:** agents, tests, previews and local fixtures never sign or broadcast on mainnet without explicit release authority.
- **Signal:** the chain ID at the sign or send boundary; test, fixture and preview configuration; direct use of raw wallet or RPC clients.
- **Sketch:** route every sign and send through one wallet boundary that rejects mainnet chain IDs unless the environment carries an explicit, human-granted authorization. Test and e2e fixtures inject an RPC transport that throws on mainnet chain IDs. A static rule rejects raw client imports outside the boundary and mainnet chain IDs in test configuration; forked chains carry an explicit fork marker.
- **Tests:** a send on a mainnet chain ID in a test environment throws before any network call; testnet passes; a fork passes only with its marker; authorized production passes; a raw client import outside the boundary fails.
- **Ratchet:** baseline for existing raw client imports; new imports and stale entries fail. Mainnet chain IDs in tests are never allowlisted.

## Live data

### Polling stops on terminal errors

- **Purpose:** a poll loop that ignores terminal errors hammers the endpoint and hides a final state such as not found, unauthorized, expired, rejected or reverted.
- **Signal:** interval timers, recursive timeouts and query refetch intervals that poll a resource.
- **Sketch:** one shared polling helper whose next interval is a function of the latest result and error and turns off for terminal errors and terminal statuses; a lint rule rejects raw polling outside it.
- **Tests:** with a fake clock, a terminal error after the first poll stops further requests; a retryable error continues with backoff; a terminal success status stops; unmount or cancel stops; no request fires after stop.
- **Ratchet:** baseline for existing raw polling; new raw polling and stale entries fail.

### No refetch of stream-owned cache keys

- **Purpose:** a snapshot refetch or invalidation can overwrite newer stream state with older data.
- **Signal:** invalidate, refetch, reset or remove calls whose key resolves to a registered stream-owned key root.
- **Sketch:** keep a registry of stream-owned key roots beside the stream owners. A static rule resolves literal keys and key factories and flags matches; development builds may also assert at the cache boundary.
- **Tests:** fails on invalidating a registered root directly and through its key factory; passes snapshot-owned keys; passes the stream owner's own writes; fails when a registry entry names a root no code defines.
- **Ratchet:** registry changes need owner review; baseline existing violations; stale entries fail.

## Contracts and structure

### Contract provenance verifier

- **Purpose:** generated clients, types, ABIs and address registries match the upstream source they claim.
- **Signal:** committed contract snapshots, generated output and the provenance file.
- **Sketch:** the provenance file records each snapshot's source repository or release, revision, artifact path and digest. The verifier checks digests, regenerates from the committed snapshot into a temporary directory and fails on any difference from committed output. Fetching upstream belongs to a scheduled drift job, not the offline check.
- **Tests:** a hand edit to generated output fails; a snapshot changed without a provenance update fails; a clean tree regenerates with no diff; a provenance entry pointing at a missing artifact fails; an address registry entry without a deployment reference fails.
- **Ratchet:** none; any difference fails.

### Module boundaries with a known-violations baseline

- **Purpose:** modules import each other only through public entrypoints, and shared code lives in a neutral module.
- **Signal:** import edges from one module into another module's internal paths, and import cycles.
- **Sketch:** build the import graph with language tooling, declare allowed edges and public entrypoints, and compare violations with a baseline keyed by importer and imported path.
- **Tests:** fails on a cross-module internal import; passes a public entrypoint import and an intra-module import; a baseline entry suppresses only its exact edge; fixing an edge without deleting its entry fails.
- **Ratchet:** the baseline only shrinks; the change that fixes a violation removes its entry.

### Ratcheting allowlists

- **Purpose:** one mechanism for every check that tolerates legacy violations without letting them grow.
- **Signal:** a check's violations compared with its allowlist or baseline.
- **Sketch:** entries hold a stable key (rule, file and symbol, or a line-insensitive fingerprint), an owner and a reason, with an optional expiry. Fail when a violation has no entry (new) or an entry matches nothing (stale). Never key on line numbers.
- **Tests:** a new violation fails; a stale entry fails with an instruction to delete it; moved code still matches its entry; a duplicate entry fails; an expired entry fails.
- **Ratchet:** this is the ratchet. Adding entries needs the same review as changing the rule.

### Guarded paths exist

- **Purpose:** path-based rules (ownership files, CI path filters, risk-routing globs, check scopes, merge guards) silently stop applying when a path is renamed.
- **Signal:** every path and glob in guard configuration.
- **Sketch:** collect paths and globs from each configuration source; each must match at least one tracked file.
- **Tests:** a missing path fails and names its configuration file; a glob matching nothing fails; a renamed directory is caught; an intentionally empty glob passes only with an allowlist entry.
- **Ratchet:** allowlist for intentionally empty globs, each with a reason; stale entries fail.

## Tests

### E2E fixture traps

- **Purpose:** mocked journeys fail loudly instead of passing over hidden defects.
- **Signal:** page errors, hydration or render-mismatch console messages, and network requests to API origins without a registered mock.
- **Sketch:** a shared base fixture installs recorders before navigation and fails the test at teardown on any recorded page error or mismatch message. A catch-all route answers every unmocked API request with HTTP 500 and records its method and URL; teardown fails on any recorded request the test did not declare as expected. Injected wallets fail on any unexpected signing request.
- **Tests:** a page with a hydration mismatch fails; an unmocked request receives 500 and the failure lists its URL; a declared expected request passes; recorders keep their observations when an earlier assertion fails.
- **Ratchet:** per-test expected-request declarations; a declaration that matches nothing fails.

### E2E registration and empty runs

- **Purpose:** journeys added by a change keep running in CI after merge, and an empty or filtered run never counts as a pass.
- **Signal:** spec files added in the diff, the CI suite registry or configuration, and the runner's result counts.
- **Sketch:** compare specs added against the base with the CI registry and fail on any unregistered new spec. Wrap the runner so a run fails when zero tests executed, every test was skipped or a requested spec contributed no test.
- **Tests:** an unregistered new spec fails; a registered one passes; a filter matching nothing fails; a spec whose tests are all skipped fails; a deleted spec still in the registry fails.
- **Ratchet:** the registry is the allowlist; stale registry entries fail.

## Delivery and repository safety

### Gate record at exact HEAD

- **Purpose:** "checks passed" is evidence for one commit, not a claim.
- **Signal:** runs of the repository's gate command.
- **Sketch:** refuse to start on a dirty tree. Record the full head SHA and each command, exit code, duration and tool version. If autofix or formatting changed files during the run, mark the record failed and list them; the owner commits the change and reruns on the new head. Confirm the head did not move during the run. Consumers accept a record only when its SHA equals the current head.
- **Tests:** a dirty tree refuses to start; an autofix that edits a file yields a failed record naming it; a head that moves during the run fails; a consumer rejects a record for an older SHA; a nonzero exit is recorded as failed.
- **Ratchet:** none.

### Agent merge guard

- **Purpose:** an agent cannot merge, or push to the protected branch, without the recorded gates and the authority PROJECT.md grants.
- **Signal:** shell commands an agent is about to run: host CLI merges, merge API calls and pushes whose refspec targets the protected branch, including forms wrapped in shell runners, `eval`, environment prefixes and command substitutions.
- **Sketch:** the agent client's pre-command hook strips heredoc bodies (data, not commands), tokenizes, splits on shell operators and recurses into `-c` and `eval` strings. A protected-branch push is blocked unless a human set an explicit override. A merge requires a passing head-bound gate record, current required CI and reviews, ticket flags matching risk routing, PROJECT.md merge authority, and confirmation that deployment coupling has its separate authority. Money-flagged work stays blocked until the configured human-merge policy is satisfied. Text that looks like a merge but cannot be parsed is blocked.
- **Tests:** a push to the protected branch by refspec, forced or not, is blocked; a merge wrapped in a login shell is blocked without a gate record, authority record or required review; a money merge without the configured human review is blocked; missing ticket flags and deployment authority fail closed; a heredoc quoting a merge command is allowed; an unparseable merge-like command is blocked; a feature-branch push is allowed.
- **Ratchet:** none; deny by default.

### Secret and key-material scan

- **Purpose:** no credentials, private keys, seed phrases, tokens or personal data in source, fixtures, logs, screenshots, commit messages or PR text.
- **Signal:** added lines and new files in the diff, commit messages and the PR body.
- **Sketch:** pattern and entropy detection with dedicated detectors for private keys, mnemonic phrases, PEM blocks, bearer tokens and provider key formats. Output category and location only. Known public test vectors are allowlisted by fingerprint, never by value.
- **Tests:** a private key in a fixture fails; a mnemonic phrase fails; an allowlisted public test vector passes; the output never contains the matched value; removed lines are ignored.
- **Ratchet:** fingerprint allowlist; stale entries fail.

### PR title and commit lint

- **Purpose:** parseable history for release notes, changelogs and release automation.
- **Signal:** the PR title and commit subjects.
- **Sketch:** validate the conventional commit grammar (type, optional scope, breaking-change marker, subject) against the repository's allowed types and length limit. Lint the PR title in CI when squash merges use it as the commit subject.
- **Tests:** a valid typed subject passes; a missing or unknown type fails; a breaking-change marker is recognized; an overlong subject fails.
- **Ratchet:** none.

### Ticket flags match routing

- **Purpose:** self-declared flags cannot quietly lower review effort or skip e2e.
- **Signal:** the ticket's tier, `money` flag and `ui` flag against the risk-routing rows the diff matches.
- **Sketch:** compute the matched rows, then fail when a money row matches a ticket flagged money false, a ui row matches one flagged ui false, or a money ticket sits in the lowest tier.
- **Tests:** a decimal-math change on a money-false ticket fails; a component change on a ui-false ticket fails; consistent flags pass; a lowest-tier money ticket fails.
- **Ratchet:** none.

### Instruction drift

- **Purpose:** agent instructions stay true as code and harness files move.
- **Signal:** repository paths, commands and stated facts in agent instructions, PROJECT.md, skills and routing.
- **Sketch:** every referenced path must exist; every referenced command must exist in the build manifest or scripts; a fact stated in several files (required check name, protected branch, repair round limit) must agree; each behavior a document says a script enforces needs a matching test.
- **Tests:** a renamed file referenced by a skill fails; a removed script referenced by PROJECT.md fails; two files stating different required check names fail; placeholders such as `<title>` are ignored.
- **Ratchet:** none.
