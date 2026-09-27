# Knowledge behavior evaluation protocol

These fixtures are executable evaluation inputs, not proof that a model follows the cards. A production model evaluation must run separately from the test suite and record the exact knowledge release digest, runtime profile, model identifier, prompt, raw response, parsed response, and evaluator result.

For each case in `fixtures/behavior.json`:

1. Load the exact released cards with `selectKnowledge({ root, topics })`.
2. Give the model the case situation, selected cards, and the output schema below. Do not include `expected`, `positiveOutput`, or `negativeOutput`.
3. Require one JSON object with `decisionCode`, `appliedCardIds`, `rejectedPatternCodes`, and a concrete `rationale`.
4. Parse the response without repair. A malformed response fails.
5. Score the native result by separate contract, decision, applicability and rationale dimensions. `evaluateKnowledgeDecision` remains the strict static test-vector checker; an exact expected-card omission is a routing diagnostic in native behavior acceptance, not proof that a correct solution failed.
6. Store the result outside the release artifact. A model run never writes `knowledge/audit.json` and cannot promote completeness.

The positive and negative outputs are behavioral test vectors for the evaluator. The positive vector must pass and the negative vector must fail. They are not answers to place in the model prompt.

Model behavior remains unverified until the separately coordinated run completes against the exact release and all cases pass. Changing cards, fixtures, runtime selection, or model profile makes previous results stale.

The depth-review candidate includes 30 decision cases. They cover legitimate exceptions as well as defects: independent drafts, repository conventions, actual compiler coverage, required authorization, provider ordering, single-use intent, external snapshots, stream ownership, retry identity and command-versus-event semantics.

The native evaluation separately executes the existing preference-boundary implementation task and a fresh review task. These remain deliberately small. Passing the decision cases does not establish successful implementation of every React pattern, production-scale architecture quality or a complete authenticated user journey.

Compare baseline and guided results only on the same fixture version. Results from an earlier 12-case suite cannot establish improvement on the expanded suite. A higher card-routing score is distinct from a semantic correctness gain. Record failures and false positives even when the source audit passes.

Revision 7 keeps unknown/unavailable card IDs, duplicate IDs, scenario-forbidden card application, wrong decisions, missing rejected patterns, unsound rationales, failed implementations and failed reviews as hard failures. Missing an exact expected supporting card remains visible in routing diagnostics and counts. Several cards can support the same correct decision, and reciting every related card is not the acceptance outcome.

A scorer-only reassessment may reuse immutable model inputs and outputs when the fixture, knowledge, prompt and code-task bindings remain unchanged. Preserve the original result, source proof digest, previous receipt digest and changed evaluator identity. Label the result as reassessed, never as another native run or an observed improvement in the model's answers.
