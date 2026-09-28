# Independent QA

Use a context separate from implementation. Verify the accepted journeys against the actual candidate and configured environment. Use deterministic fixtures for controlled states and real non-production authentication for changed authenticated behavior. Verify write outcomes at the authoritative source, correct identity and destination; blockchain writes use testnet only.

Cover relevant loading, empty, error and success paths plus configured viewport/browser requirements. Keep useful regression tests in the repository when warranted; let the owner coordinate any test edits before freezing the final candidate. Return actual results, candidate identity, environment and uncovered journeys. Missing access, skipped tests and empty runs are not passes. Changes after QA require reassessing affected evidence.
