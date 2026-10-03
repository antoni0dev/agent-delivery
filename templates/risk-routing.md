# Risk routing

Routing maps diff signals to the review lenses, knowledge packs and checks a candidate requires. It sets the minimum review; a reviewer may still expand for a concrete dependency.

## Adopt it

Copy the routing table into the destination's `PROJECT.md` under "Risk routing", or into a tracked routing file that PROJECT.md names. Replace the example matches with the repository's real paths, symbols and file names, delete rows that do not apply and keep the lens, pack and check names below. If routing is automated, keep the same columns in a data file with path globs and content patterns and print the matched rows into the audit packet. Keep one routing source: when two copies disagree, the stricter row applies until they are reconciled.

## Apply it

1. Match every row against the candidate diff: changed paths plus added and removed lines, on either side of a rename.
2. Take the union of matched rows. Every audit includes the `general` lens; each other lens runs in its own independent context.
3. Give each lens its role file, the matched pack content and the accepted exceptions.
4. Run the matched checks on the exact head, or record why one is unavailable. An unavailable check is unverified, never passed.
5. Compare matched flags with the ticket (check: Ticket flags match routing). A money signal on a ticket flagged money false, or a ui signal on one flagged ui false, stops review until the owner corrects the flag and reruns what the corrected flag requires.

## Names

| Lens | Role | Owns |
|---|---|---|
| `general` | `roles/reviewer.md` | Architecture, ownership, authorization, failure paths, tests and the hygiene gate; runs on every audit |
| `contract` | `roles/contract-reviewer.md` | One contract row per changed REST, stream, ABI or indexer boundary |
| `money` | `roles/money-reviewer.md` | Amounts, rounding, fees, quotes, approvals, addresses and signed intent |

QA is not a lens: `project-qa` runs after audit evidence with `roles/qa.md`. Add a project lens only with its own read-only role file. Packs: `money`, `execution`, `chain`, `realtime`, `contracts`, `operations`, `web-app`. Checks name entries in `templates/checks/README.md` or the repository's own commands.

## Routing table

| Signal | Example matches | Lenses | Packs | Checks | Flags and policy |
|---|---|---|---|---|---|
| Signing and broadcast | Wallet sign and send calls such as `signTypedData`, `signTransaction` or `sendTransaction`; `permit`, `approve` and allowance changes | general, money, contract | money, chain, execution | Mainnet broadcast guard; E2E fixture traps with a deterministic injected wallet; testnet QA for writes | money; human merge |
| Amount and decimal math | Unit conversion, decimals, slippage, basis points, fee math, float conversion near amounts | general, money | money | No float parsing of wire amounts; focused boundary tests | money |
| Address and chain configuration | Contract, router, spender or token address constants; chain ID maps; RPC endpoints | general, money, contract | chain, contracts | Contract provenance verifier; Guarded paths exist | money; human merge |
| Mutations and idempotency | Mutation hooks, POST, PUT, PATCH or DELETE callers, idempotency keys, retry options, auth-refresh interceptors | general, plus money on a money path | execution | No retry option on mutations | money on a money path |
| Streams and live data | Socket clients, subscriptions, stream handlers, polling loops, cache writers for stream-owned keys | general, contract | realtime | No refetch of stream-owned cache keys; Polling stops on terminal errors | - |
| Contract specs | OpenAPI documents, stream contracts, ABIs, indexer schemas, generated clients and their provenance | general, contract | contracts | Contract provenance verifier | - |
| CI workflows | Workflow definitions, required check aggregation, release and deploy scripts, branch rulesets | general | operations | Guarded paths exist; Agent merge guard; PR title and commit lint | human review per policy |
| Dependency manifests | Package manifests, lockfiles, toolchain pins, container images | general | operations | Secret and key-material scan; immutable install from the lockfile | - |
| Auth and session | Login, logout, token refresh, cookies, session storage, protected routes | general, contract | web-app, contracts | Secret and key-material scan; real non-production authentication QA | ui when visible |
| User interface | Components, routes, styles, copy | general | web-app | E2E registration and empty runs; E2E fixture traps | ui |

Signals overlap by design: a swap form change can match amount math, signing and user interface at once, and then needs all three rows.
