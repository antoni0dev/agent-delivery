# Knowledge release

The knowledge subsystem turns reviewed source material into portable engineering cards without exporting source identity, provenance, private paths, or organization-specific examples. Tracked files contain generic guidance, opaque source and unit identifiers, structural counts, hashes, coverage dispositions, and release bindings. Full extracted text, OCR, titles, and source locations stay in the configured gitignored private root.

## Runtime API

`loadKnowledge({ root })` verifies the tracked release and returns its digest, completeness, cards, source snapshot digest, coverage counts, and audit state. It throws when a tracked artifact no longer matches its release binding.

`selectKnowledge({ root, topics })` verifies the same release and returns cards with at least one exact requested topic. Topic matching is exact, so a word that happens to occur in card prose cannot pull an unrelated card into a context pack.

`verifyKnowledge({ root })` returns `{ passed, errors }`. A structurally valid release can pass verification while `complete` remains false. Completeness additionally requires zero pending source units and an independent approval bound to the exact source, card, coverage, and topic-index digests.

## Tracked release files

| File | Purpose |
|---|---|
| `knowledge/cards.json` | Generic cards with applicability, failure mechanisms, bad/better examples, exceptions and verification scenarios |
| `knowledge/guide.md` | Generated readable view of the canonical cards |
| `knowledge/topics.json` | Exact topic-to-card projection |
| `knowledge/source-snapshot.json` | Opaque source-unit inventory and extraction hashes |
| `knowledge/coverage.json` | One disposition for every source unit, linked to derived cards where eligible |
| `knowledge/release.json` | Immutable digest binding for source, cards, coverage, and topic index |
| `knowledge/audit.json` | Optional independent approval receipt |
| `knowledge/fixtures/behavior.json` | Versioned planning, implementation, and review scenarios |
| `knowledge/evaluation.md` | Protocol for separately coordinated model behavior evaluation |

The current snapshot contains 2,948 units across six sources: 412 sections, 2,275 paragraphs, 29 examples, 7 code blocks, 3 tables, 104 PDF pages, and 118 embedded document images. The curated release contains 58 cards. Coverage classifies 837 units as incorporated, 118 images as visually covered, 1,658 units as reconciled, and 335 units as excluded. Reconciliation records qualified, conflicting, dated, duplicated, or mixed-eligibility guidance rather than treating it as direct incorporation. No unit is pending source disposition.

The release remains incomplete until a fresh independent coverage auditor creates `knowledge/audit.json`. Model behavior also remains unverified until a separately coordinated run follows `knowledge/evaluation.md` against this exact release. Editing a card, source snapshot, coverage disposition, or topic mapping invalidates the release or makes an existing audit stale. Regeneration never creates or updates audit approval.

## Ingestion

Run `scripts/ingest-sources.py` with three document inputs, one reference directory, one PDF input, one remote Markdown input, a gitignored private root, and the tracked output paths. The script performs these operations:

1. Extracts document paragraphs by structural role, code-like blocks, examples, tables, and embedded images.
2. Runs the native OCR helper over every embedded image as extraction evidence and preserves each image's surrounding document context privately.
3. Extracts the PDF page by page and inventories embedded image records.
4. Parses headings, prose, tables, and fenced code from Markdown sources.
5. Stores complete source content and provenance in the private root.
6. Reads an explicit private curation map. Unassigned units become pending, and images require recorded visual review before receiving a final disposition.
7. Writes a sanitized snapshot and unit-level coverage ledger using opaque identifiers.
8. Binds the derived artifacts in `release.json` without producing an audit receipt.

The ingestion command takes source paths and the remote location as runtime arguments. Keep those values out of tracked scripts, shell history committed to the repository, documentation, and exported artifacts.

## Coverage dispositions

`incorporated` means a reviewed unit contributed directly to one or more generic cards. `covered` means a visually inspected image supports linked guidance without adding a distinct rule. `reconciled` records how conflicting, dated, duplicated, or mixed-eligibility material was narrowed into the linked cards. `superseded` preserves traceability when newer reviewed guidance replaces a unit. `excluded` requires a reason category and cannot link to a card. `pending` keeps the release incomplete.

Organization-specific examples and material with unclear transfer eligibility must be excluded from portable outputs. Candidate guidance can remain under a separate source-use hold for local review; an incorporated or reconciled coverage disposition does not grant permission to export it. Employer-confidential material cannot be transferred through paraphrasing. Full source content and eligibility notes belong in the private inventory. The tracked ledger records only an opaque unit ID and a generic reason category.

## Independent audit receipt

An accepted audit has producer kind `independent`, method `fresh-coverage-audit`, decision `approved`, the four exact release digests, and an `auditDigest` over the record without that final field. The producer ID must differ from `release.json`'s curator ID. This enforces workflow separation and staleness detection; it is not a security boundary against a privileged local user.

The independent auditor should inspect the private unit inventory, confirm every eligible unit is represented by the linked generic cards, confirm every exclusion is justified, check the visual image review evidence and context records, and verify the tracked content contains no source attribution or private details before writing the receipt.
