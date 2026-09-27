# Agent delivery

Build the portable delivery contract, not a project-specific harness. Keep private source snapshots, credentials, identities, paths and run state outside tracked files and export bundles.

- Node 24 LTS, TypeScript and SQLite. Run `npm run check` before handoff.
- One writer per isolated checkout. Independent reviewers do not implement their reviewed changes.
- Role models are pinned by the selected runtime profile. No implicit substitutions.
- Local records enforce workflow correctness, not security against a privileged local user.
- Activation requires capability conformance, reviewed knowledge and destination-specific authority.
- Do not activate a live workspace or scheduler while developing core tests.
- Test observable concurrency, stale-evidence, cancellation and recovery behavior.
- Use types, validated boundaries, object parameters and configuration maps. No speculative frameworks.
- Never embed company examples, source screenshots or source attribution in transferable files.
