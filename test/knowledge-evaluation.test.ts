import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { KnowledgeDecisionOutputSchema } from "../src/knowledge/evaluation.js";
import {
  type BehaviorEvaluationServices,
  readBehaviorEvaluation,
  rescoreBehaviorEvaluation,
  runBehaviorEvaluation,
} from "../src/knowledge/model-evaluation.js";
import { runtimeProfiles } from "../src/runtime/core.js";
import type { RuntimeResult, StartRuntimeInput } from "../src/runtime/index.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fixtures = z
  .object({
    cases: z.array(
      z.object({
        id: z.string(),
        positiveOutput: KnowledgeDecisionOutputSchema,
        negativeOutput: KnowledgeDecisionOutputSchema,
      }),
    ),
  })
  .parse(JSON.parse(readFileSync(join(root, "knowledge/fixtures/behavior.json"), "utf8")));

const implementedPreferenceStore = `export const defaultPreference = Object.freeze({
  schemaVersion: 2,
  theme: "system",
  compact: false,
});

const themes = new Set(["light", "dark", "system"]);

export function decodePreference(serialized) {
  if (serialized === null) return { ...defaultPreference };
  let value;
  try {
    value = JSON.parse(serialized);
  } catch {
    return { ...defaultPreference };
  }
  if (value?.schemaVersion === 1 && typeof value.darkMode === "boolean") {
    return { schemaVersion: 2, theme: value.darkMode ? "dark" : "light", compact: false };
  }
  if (
    value?.schemaVersion !== 2 ||
    !themes.has(value.theme) ||
    typeof value.compact !== "boolean"
  ) return { ...defaultPreference };
  return { schemaVersion: 2, theme: value.theme, compact: value.compact };
}
`;

type FakeOptions = Readonly<{
  contradictDecisionRationale?: boolean;
  cancelFirst?: boolean;
  omitIdentityFor?: string;
  actualModelsUnreported?: boolean;
  emptyStaticAppliedCards?: boolean;
  emptyRequiredAppliedCards?: boolean;
  wrongDecisionWithEmptyCards?: boolean;
  omitRequiredRejection?: boolean;
  invalidAppliedCardMode?: "unknown" | "duplicate" | "forbidden";
  partialUserTriggeredCards?: boolean;
  baselineRoutingMisses?: boolean;
  mutateExecutableDuringRun?: boolean;
}>;

const baselineRoutingSelections = new Map([
  ["implement-user-triggered-request", ["effects-external-sync"]],
  ["plan-low-frequency-status", ["dataflow-batch-stream-choice"]],
  ["plan-lazy-settings-panel", ["lazy-loading-boundaries", "react-performance-evidence"]],
]);

const completed = ({
  input,
  output,
  sessionId,
  actualModel,
}: {
  input: StartRuntimeInput;
  output: unknown;
  sessionId: string | null;
  actualModel: string | null;
}): RuntimeResult => ({
  status: "completed",
  output: JSON.stringify(output),
  requestedModel: runtimeProfiles[input.profile][input.role].model,
  actualModel,
  nativeSessionId: sessionId,
  startedAt: "2026-09-26T00:00:00.000Z",
  finishedAt: "2026-09-26T00:00:01.000Z",
  exitCode: 0,
  artifactPath: join(input.artifactDirectory, `${input.invocationId}.json`),
  pid: 100,
  reason: null,
});

const fakeServices = ({
  options = {},
  prompts,
}: {
  options?: FakeOptions;
  prompts: StartRuntimeInput[];
}): BehaviorEvaluationServices => ({
  probe: async ({ profile, executable }) => ({
    profile,
    executable,
    version: "0.999.0",
    available: true,
    capabilities: {
      freshContext: true,
      readOnly: true,
      structuredOutput: true,
      modelSelection: true,
    },
    reason: null,
  }),
  start: async (input) => {
    prompts.push(input);
    if (options.mutateExecutableDuringRun === true && prompts.length === 1) {
      writeFileSync(input.executable, "changed fixture runtime\n");
    }
    mkdirSync(input.artifactDirectory, { recursive: true });
    writeFileSync(
      join(input.artifactDirectory, `${input.invocationId}.json`),
      JSON.stringify({
        invocationId: input.invocationId,
        startedAt: new Date(Date.now() + 60_000).toISOString(),
      }),
    );
    if (options.cancelFirst === true && prompts.length === 1) {
      return {
        status: "cancelled",
        output: null,
        requestedModel: runtimeProfiles[input.profile][input.role].model,
        actualModel: null,
        nativeSessionId: null,
        startedAt: "2026-09-26T00:00:00.000Z",
        finishedAt: "2026-09-26T00:00:00.100Z",
        exitCode: null,
        artifactPath: join(input.artifactDirectory, `${input.invocationId}.json`),
        pid: 100,
        reason: "Runtime invocation was cancelled.",
      };
    }

    const model = runtimeProfiles[input.profile][input.role].model;
    const identity =
      options.omitIdentityFor === input.invocationId || options.actualModelsUnreported === true
        ? null
        : model;
    const session =
      options.omitIdentityFor === input.invocationId ? null : `session-${prompts.length}`;
    if (input.invocationId.endsWith("-decisions")) {
      const cases = fixtures.cases.map((fixture, index) => {
        const positive = fixture.positiveOutput;
        const baselineRoutingSelection = input.invocationId.startsWith("baseline-")
          ? baselineRoutingSelections.get(fixture.id)
          : undefined;
        return {
          id: fixture.id,
          ...positive,
          ...(options.emptyStaticAppliedCards === true &&
          fixture.id === "review-static-list-false-positive"
            ? { appliedCardIds: [] }
            : {}),
          ...(options.partialUserTriggeredCards === true &&
          fixture.id === "implement-user-triggered-request"
            ? { appliedCardIds: ["effects-external-sync"] }
            : {}),
          ...(options.emptyRequiredAppliedCards === true &&
          fixture.id === "plan-derived-display-state"
            ? { appliedCardIds: [] }
            : {}),
          ...(options.wrongDecisionWithEmptyCards === true && index === 0
            ? { ...fixture.negativeOutput, appliedCardIds: [] }
            : {}),
          ...(options.omitRequiredRejection === true && index === 0
            ? { rejectedPatternCodes: [], appliedCardIds: [] }
            : {}),
          ...(options.invalidAppliedCardMode !== undefined &&
          fixture.id === "review-static-list-false-positive"
            ? {
                appliedCardIds: {
                  unknown: ["nonexistent-card"],
                  duplicate: ["components-cohesive-ownership", "components-cohesive-ownership"],
                  forbidden: ["queries-explicit-async-states"],
                }[options.invalidAppliedCardMode],
              }
            : {}),
          ...(options.baselineRoutingMisses === true && baselineRoutingSelection !== undefined
            ? { appliedCardIds: baselineRoutingSelection }
            : {}),
          ...(options.contradictDecisionRationale === true && index === 0
            ? {
                rationale:
                  "Copy the total into separate state after every input change so render uses the mirrored value.",
              }
            : {}),
        };
      });
      return completed({ input, output: { cases }, sessionId: session, actualModel: identity });
    }
    if (input.invocationId.endsWith("-implementation")) {
      writeFileSync(join(input.cwd, "preference-store.js"), implementedPreferenceStore);
      return completed({
        input,
        output: { summary: "Validated both versions and returned safe version two values." },
        sessionId: session,
        actualModel: identity,
      });
    }
    if (input.invocationId.endsWith("-review")) {
      return completed({
        input,
        output: {
          assessments: [
            {
              candidateCode: "account-cache-collision",
              verdict: "finding",
              rationale:
                "The remote result varies by account, so omitting accountId lets one account reuse another account's cached record.",
            },
            {
              candidateCode: "local-resource-key",
              verdict: "valid",
              rationale:
                "The local label is application-owned and account-independent, so resourceId completely identifies its value.",
            },
          ],
        },
        sessionId: session,
        actualModel: identity,
      });
    }
    const decisionAssessments = fixtures.cases.map((fixture, index) => ({
      id: fixture.id,
      semanticallySound: !(options.contradictDecisionRationale === true && index === 0),
      rationale:
        options.contradictDecisionRationale === true && index === 0
          ? "The rationale advocates mirrored state while the selected code claims a render-time derivation, so they contradict each other."
          : "The selected behavior and concrete rationale agree with the situation and the relevant boundary described in the supplied guidance.",
    }));
    return completed({
      input,
      output: {
        decisionAssessments,
        reviewAssessments: [
          {
            candidateCode: "account-cache-collision",
            semanticallySound: true,
            rationale:
              "The finding correctly ties remote value identity to account scope and explains the cross-account collision.",
          },
          {
            candidateCode: "local-resource-key",
            semanticallySound: true,
            rationale:
              "The valid classification matches the stated account-independent ownership of the local label.",
          },
        ],
      },
      sessionId: session,
      actualModel: identity,
    });
  },
});

const runControlled = async (options: FakeOptions = {}) => {
  const directory = mkdtempSync(join(tmpdir(), "knowledge-evaluation-"));
  const executable = join(directory, "codex");
  writeFileSync(executable, "fixture runtime\n");
  const prompts: StartRuntimeInput[] = [];
  const services = fakeServices({ options, prompts });
  const proof = await runBehaviorEvaluation(
    {
      root,
      directory,
      executable,
      nodeExecutable: process.execPath,
      profile: "codex",
    },
    services,
  );
  return { directory, prompts, proof, services };
};

function stableJson(value: unknown): string {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    typeof value === "number"
  ) {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(",")}}`;
  }
  throw new Error(`Unsupported value: ${typeof value}`);
}

const digestValue = (value: unknown): string =>
  createHash("sha256").update(stableJson(value)).digest("hex");

test("runs eight bounded controller-scored calls and reads an exact passing proof", async () => {
  const { directory, prompts, proof, services } = await runControlled();
  assert.equal(proof.passed, true);
  assert.equal(proof.semanticPassed, true);
  assert.equal(proof.guidedConformancePassed, true);
  assert.equal(proof.evaluationRevision, 7);
  assert.equal(
    proof.runtime.executableDigestEvidence?.basis,
    "captured-before-and-after-invocations",
  );
  assert.equal(proof.comparison?.observedSemanticImprovement, false);
  assert.equal(proof.coverageStatus, "independent-audit-required");
  assert.equal(proof.invocations.length, 8);
  assert.deepEqual(
    prompts.map((prompt) => prompt.role).sort(),
    ["planner", "implementer", "reviewer", "planCritic"].flatMap((role) => [role, role]).sort(),
  );
  assert.deepEqual(new Set(prompts.map((prompt) => prompt.deadlineMs)), new Set([5 * 60 * 1_000]));
  const plannerPrompts = prompts.filter((prompt) => prompt.role === "planner");
  for (const prompt of plannerPrompts) {
    assert.doesNotMatch(prompt.prompt, /positiveOutput|negativeOutput|expectedDecisionCode/);
    for (const fixture of fixtures.cases) {
      assert.equal(prompt.prompt.includes(fixture.positiveOutput.rationale), false);
      assert.equal(prompt.prompt.includes(fixture.negativeOutput.rationale), false);
    }
  }
  const result = await readBehaviorEvaluation(
    {
      directory,
      knowledgeDigest: proof.knowledgeDigest,
      profile: "codex",
      currentRoot: root,
      executable: proof.runtime.executable,
    },
    services,
  );
  assert.equal(result.digest, proof.digest);
  assert.equal(result.semanticPassed, true);
});

test("semantic judge rejects correct labels paired with a contradictory rationale", async () => {
  const { proof } = await runControlled({ contradictDecisionRationale: true });
  assert.equal(
    proof.conditions.every((condition) => condition.decisions.semanticDecisionPassed === true),
    true,
  );
  assert.equal(
    proof.conditions.every((condition) => condition.decisions.rationalePassed === false),
    true,
  );
  assert.equal(proof.passed, false);
});

test("revision seven records unreported actual models and accepts a sound no-pattern decision", async () => {
  const { proof, directory, services } = await runControlled({
    actualModelsUnreported: true,
    emptyStaticAppliedCards: true,
  });
  assert.equal(proof.evaluationRevision, 7);
  assert.equal(proof.modelEvidenceStatus, "requested-pinned-actual-unreported");
  assert.equal(proof.passed, true);
  assert.equal(
    proof.conditions.every(
      (condition) =>
        condition.decisions.cases.find((item) => item.id === "review-static-list-false-positive")
          ?.passed === true,
    ),
    true,
  );
  await readBehaviorEvaluation(
    {
      directory,
      knowledgeDigest: proof.knowledgeDigest,
      profile: "codex",
      currentRoot: root,
      executable: proof.runtime.executable,
    },
    services,
  );
});

test("supporting-card omissions remain diagnostic when the engineering decision is sound", async () => {
  const { proof } = await runControlled({ partialUserTriggeredCards: true });
  assert.equal(proof.passed, true);
  for (const condition of proof.conditions) {
    const result = condition.decisions.cases.find(
      (item) => item.id === "implement-user-triggered-request",
    );
    assert.equal(result?.passed, true);
    assert.equal(result?.cardRoutingPassed, false);
    assert.equal(
      result?.routingDiagnostics?.includes(
        "Expected supporting card was not cited: mutations-confirmed-reconciliation",
      ),
      true,
    );
  }
});

test("empty declared citations retain the missing-card diagnostic", async () => {
  const { proof } = await runControlled({ emptyRequiredAppliedCards: true });
  assert.equal(proof.passed, true);
  for (const condition of proof.conditions) {
    const result = condition.decisions.cases.find(
      (item) => item.id === "plan-derived-display-state",
    );
    assert.equal(result?.cardRoutingPassed, false);
    assert.equal(
      result?.routingDiagnostics?.includes(
        "Expected supporting card was not cited: state-single-owner",
      ),
      true,
    );
  }
});

test("empty citations cannot excuse a wrong decision or missing rejected pattern", async () => {
  for (const options of [{ wrongDecisionWithEmptyCards: true }, { omitRequiredRejection: true }]) {
    const { proof } = await runControlled(options);
    assert.equal(proof.passed, false);
    assert.equal(
      proof.conditions.every((condition) => condition.decisions.semanticDecisionPassed === false),
      true,
    );
  }
});

test("unknown, duplicate and forbidden applied cards remain hard failures", async () => {
  for (const invalidAppliedCardMode of ["unknown", "duplicate", "forbidden"] as const) {
    const { proof } = await runControlled({ invalidAppliedCardMode });
    assert.equal(proof.passed, false);
    for (const condition of proof.conditions) {
      const result = condition.decisions.cases.find(
        (item) => item.id === "review-static-list-false-positive",
      );
      assert.equal(result?.passed, false);
      assert.equal(result?.contractPassed, false);
    }
  }
});

test("new evaluation fails when executable bytes change during the run", async () => {
  const { proof } = await runControlled({ mutateExecutableDuringRun: true });
  assert.equal(proof.passed, false);
  assert.equal(
    proof.failures.includes("Runtime executable changed during behavior evaluation"),
    true,
  );
});

test("comparison reports routing gain without inflating semantic improvement", async () => {
  const { proof } = await runControlled({ baselineRoutingMisses: true });
  assert.equal(proof.passed, true);
  assert.deepEqual(proof.comparison, {
    baselineSemanticDecisionsPassed: fixtures.cases.length,
    guidedSemanticDecisionsPassed: fixtures.cases.length,
    semanticDecisionsTotal: fixtures.cases.length,
    baselineRationalesPassed: fixtures.cases.length,
    guidedRationalesPassed: fixtures.cases.length,
    rationalesTotal: fixtures.cases.length,
    baselineCardRoutingPassed: fixtures.cases.length - 3,
    guidedCardRoutingPassed: fixtures.cases.length,
    cardRoutingTotal: fixtures.cases.length,
    observedSemanticDelta: 0,
    observedCardRoutingDelta: 3,
    observedSemanticImprovement: false,
  });
});

test("rescoring preserves earlier receipts and emits revision seven", async () => {
  const controlled = await runControlled({
    actualModelsUnreported: true,
    emptyStaticAppliedCards: true,
  });
  const {
    digest: _digest,
    evaluationRevision: _evaluationRevision,
    comparison: _comparison,
    guidedConformancePassed: _guidedConformancePassed,
    ...legacyBase
  } = controlled.proof;
  const failedLegacyBase = {
    ...legacyBase,
    evaluationRevision: 2,
    selectorEvaluatorDigest: "0".repeat(64),
    semanticPassed: false,
    passed: false,
    failures: ["legacy evaluator rejected the no-pattern case"],
  };
  const legacy = { ...failedLegacyBase, digest: digestValue(failedLegacyBase) };
  const runName = readdirSync(join(controlled.directory, "runs"))[0];
  assert.notEqual(runName, undefined);
  if (runName === undefined) throw new Error("Controlled run directory is missing");
  writeFileSync(join(controlled.directory, "codex.json"), JSON.stringify(legacy));
  writeFileSync(join(controlled.directory, "runs", runName, "result.json"), JSON.stringify(legacy));
  writeFileSync(
    join(controlled.directory, "runs", runName, "rescored-result.json"),
    JSON.stringify(legacy),
  );

  const rescored = rescoreBehaviorEvaluation({
    directory: controlled.directory,
    root,
    profile: "codex",
  });
  assert.equal(rescored.evaluationRevision, 7);
  assert.equal(rescored.sourceProofDigest, legacy.digest);
  assert.equal(rescored.previousReceiptDigest, legacy.digest);
  assert.equal(rescored.passed, true);
  assert.equal(
    readFileSync(join(controlled.directory, "runs", runName, "result.json"), "utf8"),
    JSON.stringify(legacy),
  );
  assert.equal(
    readFileSync(join(controlled.directory, "runs", runName, "rescored-result.json"), "utf8"),
    JSON.stringify(legacy),
  );
  assert.equal(
    JSON.parse(
      readFileSync(
        join(controlled.directory, "runs", runName, "digest-rescored-result.json"),
        "utf8",
      ),
    ).digest,
    rescored.digest,
  );
});

test("cancellation and missing native identity fail closed", async () => {
  const cancelled = await runControlled({ cancelFirst: true });
  assert.equal(cancelled.proof.passed, false);
  assert.equal(cancelled.proof.invocations.length, 1);
  await assert.rejects(
    readBehaviorEvaluation(
      {
        directory: cancelled.directory,
        knowledgeDigest: cancelled.proof.knowledgeDigest,
        profile: "codex",
        currentRoot: root,
        executable: cancelled.proof.runtime.executable,
      },
      cancelled.services,
    ),
    /current evaluator revision|failed guided conformance/,
  );

  const identityMissing = await runControlled({ omitIdentityFor: "guided-semantic-judge" });
  assert.equal(identityMissing.proof.semanticPassed, true);
  assert.equal(identityMissing.proof.passed, false);
  await assert.rejects(
    readBehaviorEvaluation(
      {
        directory: identityMissing.directory,
        knowledgeDigest: identityMissing.proof.knowledgeDigest,
        profile: "codex",
        currentRoot: root,
        executable: identityMissing.proof.runtime.executable,
      },
      identityMissing.services,
    ),
    /failed guided conformance/,
  );
});

test("read rejects missing and stale release proofs", async () => {
  const missingDirectory = mkdtempSync(join(tmpdir(), "knowledge-evaluation-missing-"));
  const prompts: StartRuntimeInput[] = [];
  const services = fakeServices({ prompts });
  await assert.rejects(
    readBehaviorEvaluation(
      {
        directory: missingDirectory,
        knowledgeDigest: "0".repeat(64),
        profile: "codex",
        currentRoot: root,
        executable: join(missingDirectory, "missing-codex"),
      },
      services,
    ),
    /has not run/,
  );

  const completedRun = await runControlled();
  await assert.rejects(
    readBehaviorEvaluation(
      {
        directory: completedRun.directory,
        knowledgeDigest: "0".repeat(64),
        profile: "codex",
        currentRoot: root,
        executable: completedRun.proof.runtime.executable,
      },
      completedRun.services,
    ),
    /another profile or knowledge release/,
  );
});

test("read validates the active root while allowing an unchanged portable location", async () => {
  const completedRun = await runControlled();
  const portableRoot = mkdtempSync(join(tmpdir(), "knowledge-evaluation-portable-"));
  cpSync(join(root, "knowledge"), join(portableRoot, "knowledge"), { recursive: true });
  cpSync(join(root, "src/knowledge"), join(portableRoot, "src/knowledge"), { recursive: true });

  const accepted = await readBehaviorEvaluation(
    {
      directory: completedRun.directory,
      knowledgeDigest: completedRun.proof.knowledgeDigest,
      profile: "codex",
      currentRoot: portableRoot,
      executable: completedRun.proof.runtime.executable,
    },
    completedRun.services,
  );
  assert.equal(accepted.digest, completedRun.proof.digest);

  const evaluatorPath = join(portableRoot, "src/knowledge/model-evaluation.ts");
  writeFileSync(
    evaluatorPath,
    `${readFileSync(evaluatorPath, "utf8")}\n// changed active evaluator\n`,
  );
  await assert.rejects(
    readBehaviorEvaluation(
      {
        directory: completedRun.directory,
        knowledgeDigest: completedRun.proof.knowledgeDigest,
        profile: "codex",
        currentRoot: portableRoot,
        executable: completedRun.proof.runtime.executable,
      },
      completedRun.services,
    ),
    /stale for the current evaluator inputs/,
  );
});

test("read binds the configured executable while accepting a symlink to the same binary", async () => {
  const completedRun = await runControlled();
  const differentExecutable = join(completedRun.directory, "different-codex");
  writeFileSync(differentExecutable, "different fixture runtime\n");
  await assert.rejects(
    readBehaviorEvaluation(
      {
        directory: completedRun.directory,
        knowledgeDigest: completedRun.proof.knowledgeDigest,
        profile: "codex",
        currentRoot: root,
        executable: differentExecutable,
      },
      completedRun.services,
    ),
    /different runtime executable/,
  );

  const executableAlias = join(completedRun.directory, "codex-alias");
  symlinkSync(completedRun.proof.runtime.executable, executableAlias);
  const accepted = await readBehaviorEvaluation(
    {
      directory: completedRun.directory,
      knowledgeDigest: completedRun.proof.knowledgeDigest,
      profile: "codex",
      currentRoot: root,
      executable: executableAlias,
    },
    completedRun.services,
  );
  assert.equal(accepted.digest, completedRun.proof.digest);

  writeFileSync(completedRun.proof.runtime.executable, "changed in place with same fake version\n");
  await assert.rejects(
    readBehaviorEvaluation(
      {
        directory: completedRun.directory,
        knowledgeDigest: completedRun.proof.knowledgeDigest,
        profile: "codex",
        currentRoot: root,
        executable: completedRun.proof.runtime.executable,
      },
      completedRun.services,
    ),
    /runtime executable bytes changed/,
  );
});
