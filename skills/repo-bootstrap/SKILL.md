---
name: repo-bootstrap
description: Set up a new repository's day-1 delivery baseline, from branch rules as code, commit conventions, toolchain pins and supply-chain controls to gate scripts, contract snapshots, e2e and preview environments, release authority, maintenance jobs and harness configuration, with chain additions for decentralized exchange apps. Use when asked to "bootstrap a repository", "set up a new repo", "day-1 setup" or "make this repo agent-ready".
---

# Repository bootstrap

Read [the workflow](../../../.agent-harness/WORKFLOW.md) and
[project configuration](../../../.agent-harness/PROJECT.md).
These paths target an installed skill; in the source package use root `WORKFLOW.md`,
`templates/` and `knowledge/`. Templates and the checks catalog named below are under
`.agent-harness/templates/` when installed. Select the `operations` and `contracts`
packs, and `chain`, `money` and `execution` for the chain additions.

Bootstrapping changes CI and hosted settings. Draft each setting as a reviewed file in
a pull request; apply hosted rulesets, environments and secrets only with explicit
authority. Never create, print or commit credentials. Use the repository's chosen
language and tools: each item names an outcome, not a tool. Check names refer to
entries in `checks/README.md`.

## Baseline

1. **Branch ruleset as code.** Keep the protected-branch ruleset in the repository and
   apply it from that file: pull requests required, no direct pushes, one aggregate
   required check whose name stays stable when jobs change. Record the name and
   whether CI runs on drafts in PROJECT.md. Checks: Guarded paths exist; Agent merge
   guard. Pack: `operations`.
2. **Conventional commits.** Lint PR titles and commit subjects in CI. Check: PR title
   and commit lint. Pack: `operations`.
3. **Toolchain pinning.** Pin runtime and package-manager versions in files CI also
   reads, commit the lockfile and install from it immutably. Pack: `operations`.
4. **Supply-chain baseline.** Pin CI actions and images by digest, grant workflow
   tokens least privilege, review install scripts and schedule grouped dependency
   updates with a cooldown. Check: Secret and key-material scan. Pack: `operations`.
5. **Gate scripts.** One read-only check command for CI (types, lint without autofix,
   tests, contract verification, boundary rules) and a local variant that may
   autofix. Checks: Gate record at exact HEAD; Module boundaries with a
   known-violations baseline; Ratcheting allowlists. Pack: `operations`.
6. **Contract snapshots with provenance.** Commit upstream API and stream contracts
   with a provenance file (source, revision, digest) and generate clients from the
   snapshot; chain apps add the snapshots in DEX item 1. Check: Contract provenance
   verifier. Template: `tech-spec.md` interfaces. Pack: `contracts`.
7. **E2E.** Mocked journeys against a production build with inert fixtures, plus a
   real-API configuration for non-production. Record both commands and the critical
   test floor in PROJECT.md. Checks: E2E fixture traps; E2E registration and empty
   runs. Pack: `operations`.
8. **Per-PR preview with a stale-main guard.** Deploy each PR head to non-production
   with its SHA visible. The guard refuses to promote a build that is not on the
   current protected branch and marks preview evidence stale when the PR base falls
   behind policy. Template: `release-receipt.md`. Pack: `operations`.
9. **Release authority and tag provenance.** Choose the release model and who may
   release. Tags are created by CI on protected commits with provenance attestations,
   never by hand. Template: `release-receipt.md`. Pack: `operations`.
10. **Backend promotion.** Record the environment promotion order and the backend
    contract version each frontend release requires; release the frontend only
    against a promoted contract. Template: `release-receipt.md` migrations section.
    Pack: `contracts`.
11. **Maintenance jobs.** Schedule dependency updates, upstream contract drift checks,
    stale-baseline sweeps and instruction drift checks, each with an owner, cadence and
    stop condition. Template: `runbook.md` for alerts they raise. Check: Instruction
    drift. Pack: `operations`.
12. **Harness and PROJECT.md.** Install the harness for the selected client and complete
    PROJECT.md: tiers and flags, risk routing from `risk-routing.md`, the required CI
    check, release model and authority, contract commands, e2e commands and floor, QA
    identities, human-merge policy and broadcast guard. Then complete
    `docs/readiness.md`. Check: Ticket flags match routing. Packs: `operations`,
    `contracts`.

## Decentralized exchange (DEX) additions

1. **ABIs, indexer schemas and per-chain address registry.** Commit ABIs, indexer
   schemas and a registry keyed by chain ID with checksummed addresses and deployment
   provenance, all recorded in the provenance file. Generate bindings from the
   snapshots and keep address literals out of application code. Checks: Contract
   provenance verifier; Guarded paths exist. Packs: `contracts`, `chain`.
2. **Money paths.** Mark money-path globs in risk routing. Checks: No float parsing of
   wire amounts; No retry option on mutations. Packs: `money`, `execution`.
3. **Testnet and forks.** Record testnet chain IDs, a forked-chain command for
   deterministic integration tests and the testnet real-API e2e configuration. QA
   wallets are references, never keys. Check: Mainnet broadcast guard. Packs: `chain`,
   `operations`.
4. **Deterministic injected wallet.** A fixture wallet with fixed accounts and chain ID,
   scripted approve, reject and delay responses, and failure on any unexpected signing
   request. Check: E2E fixture traps. Pack: `execution`.
5. **Human merge.** Ownership rules in the ruleset require a human review for the
   address registry, signing code, approval logic and chain configuration, where
   money-flagged changes concentrate; the PROJECT.md human-merge policy covers every
   money-flagged change. Record the policy in PROJECT.md. Check: Guarded paths exist. Pack: `operations`.

## Finish

Deliver the setup as small draft PRs grouped by concern, each passing its own new
checks. Report every item as done with evidence, deferred with an owner, or not
applicable with the reason. A hosted setting drafted but not yet applied for lack of
authority is deferred, not done.
