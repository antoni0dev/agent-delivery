# Knowledge behavior evaluation

The behavior evaluation is a separate semantic gate. It does not approve source coverage and never writes `knowledge/audit.json`.

`runBehaviorEvaluation` compares the same fixtures under two conditions. The baseline receives the task, neutral candidate choices, and available card identifiers without card content. The guided condition receives the exact cards selected by fixture topics. Neither prompt includes expected outputs or marks a choice as correct.

The planner handles the decision cases in one invocation per condition and returns a separate result for every case ID. The implementer edits a disposable Git repository; the controller protects the fixture tests and metadata, requires a real source diff, and runs the tests itself. The reviewer classifies a known semantic defect and a valid counterexample in one fresh read-only invocation per condition. A fresh semantic judge evaluates the decisions and review rationales in each condition. The suite therefore uses eight native calls, each with a five-minute deadline.

Raw prompts, responses, runtime metadata, disposable repositories, test output, and the digest-bound result stay in the caller-provided private directory. Tracked files contain only generic public fixtures and evaluator code.

The proof binds the knowledge digest, decision fixture digest, code fixture digest, evaluator digest, runtime profile, native version, requested models, raw prompt and response digests, and fresh native session identifiers. Actual model metadata is checked when the runtime reports it; an omitted value is recorded explicitly as `requested-pinned-actual-unreported`, while any reported mismatch fails. `readBehaviorEvaluation` rejects a missing, failed, tampered, stale, or session-incomplete proof.

`appliedCardIds` lists guidance that materially governs the selected behavior. It may be empty for a sound counterexample that rejects an inapplicable pattern. When the response claims one or more applied cards, all fixture-required cards remain mandatory. Every decision, including a no-pattern counterexample, must also pass the fresh semantic judge.

`rescoreBehaviorEvaluation` can apply a versioned evaluator correction to existing raw evidence without another model call. It verifies the prior receipt plus every prompt and response digest, preserves every earlier result, and writes a separately digest-bound receipt with `previousReceiptDigest`.

The revision 6 report separates four claims. Semantic decision correctness measures the chosen decision and required rejected patterns. Rationale correctness comes from the fresh semantic judge. Card-routing adherence measures whether a response that claims applied cards selects every required card. Guided conformance combines those checks with controller-tested implementation and independent review behavior.

Baseline and guided semantic results must be reported before card routing. A card-routing increase is not semantic improvement. `observedSemanticImprovement` is false when the guided condition does not exceed the baseline semantic count, including when both are perfect. A passing receipt authorizes the guided conformance gate only; it does not claim universal productivity or a causal improvement beyond the bounded fixtures. Source coverage remains `independent-audit-required` and must pass its separate audit.

`readBehaviorEvaluation` requires `currentRoot`, the active configured root that owns the knowledge release. It recomputes the current knowledge, fixture, code-fixture, selector, evaluator, release, prompt-schema, and card-selection digests there. `sourceRoot` in the receipt identifies provenance only and never supplies current activation inputs. Moving unchanged bytes to another active root remains valid; changing the active evaluator or selector makes the receipt stale.

The reader also requires the currently configured runtime `executable`. Both the recorded and configured executable are resolved through `PATH` when needed and canonicalized through filesystem realpath resolution. A symlink to the same binary is valid. A different binary is rejected even when it reports the same version, and the current configured executable is the one probed for version evidence.

New evaluations hash the canonical executable before the first native call and after the final call, and pass only when both observations match. A historical receipt can add a digest only as an assessment-time observation when the executable's modification and change times both predate the earliest recorded invocation. The receipt labels these evidence bases explicitly. If the file times do not support that bounded inference, the historical trial remains unverified. Readers always compare the current executable bytes with the recorded digest. This is local workflow evidence, not protection from a privileged host user.
