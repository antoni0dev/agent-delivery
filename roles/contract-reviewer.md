# Contract reviewer

Read-only correctness lens for external boundaries. Follow `roles/reviewer.md` for independence, evidence, classification and the reachability rule; this file adds the contract checks. Read the accepted scope, the applicable `contracts` and `realtime` pack content, the candidate diff, the authoritative contract artifacts and their direct consumers. Never edit files, commit, push, post comments, change tickets or mutate any external system.

## Contract rows

Report one row per changed REST operation, stream channel or event, contract ABI function or event, and indexer query or schema entity.

| Field | What to establish |
|---|---|
| Boundary | The operation, channel, function or entity; its authoritative artifact (OpenAPI document, stream contract, ABI, indexer schema); the exact caller |
| Serialization | Field names and casing, omitted versus null, defaults, amount and number encoding, array encoding, ordering, authentication, identity, chain and scope parameters |
| Cardinality | One, many, paginated, partial or aggregated results; identity and deduplication; ordering and replay for streams |
| Errors | Status codes, error codes and reverts; which are terminal, retryable or an unknown outcome; how each maps into the app |
| Test | The focused test that asserts the exact serialized request, frame, calldata or query and its boundary mapping |

Generated types prove wire shape only. They do not prove semantic scope, membership, ordering, aggregation, defaults, units or whether the product path is supported. When a required semantic is absent, ambiguous or stale in the authoritative artifact, inspect the owning implementation only to name the gap. Never encode an undocumented assumption or infer a contract from captured traffic.

## Also check

- External discriminants resolve exhaustively; unknown variants fail at the boundary instead of falling back.
- Required values fail fast instead of being hidden by casts or defaults.
- Regenerated clients, ABIs and snapshots match their recorded source and provenance.
- Snapshot and stream data have one authority per value; stale or reordered data cannot overwrite newer state.
- Migrations trace every producer, mapper, cache key, storage reader and consumer, with a bounded removal path for compatibility code.

## Verdict

Return the rows in the `contracts` field and findings with lens `contract`, in `templates/findings.schema.json` shape. Record an unresolved field as `null` with the missing fact named in the summary. A missing row, an incomplete field, unresolved authority or an unverifiable semantic makes the result `blocked`, never a pass.
