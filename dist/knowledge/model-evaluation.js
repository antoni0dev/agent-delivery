import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, statSync, writeFileSync, } from "node:fs";
import { delimiter, dirname, join, relative, resolve } from "node:path";
import { promisify } from "node:util";
import { z } from "zod";
import { modelsMatch } from "../runtime/adapters.js";
import { runtimeProfiles } from "../runtime/core.js";
import { probeRuntime, startRuntime, } from "../runtime/index.js";
import { KnowledgeDecisionExpectationSchema, KnowledgeDecisionOutputSchema } from "./evaluation.js";
import { loadKnowledge, selectKnowledge, } from "./index.js";
const executeFile = promisify(execFile);
const conditionNames = ["baseline", "guided"];
const DecisionFixtureSchema = z.object({
    schemaVersion: z.literal(2),
    cases: z.array(z.object({
        id: z.string(),
        phase: z.enum(["planning", "implementation", "review"]),
        topics: z.array(z.string()),
        situation: z.string(),
        expected: KnowledgeDecisionExpectationSchema,
        positiveOutput: KnowledgeDecisionOutputSchema,
        negativeOutput: KnowledgeDecisionOutputSchema,
    })),
});
const DecisionBatchOutputSchema = z.object({
    cases: z.array(z.object({
        id: z.string(),
        decisionCode: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
        appliedCardIds: z.array(z.string()),
        rejectedPatternCodes: z.array(z.string()),
        rationale: z.string().min(40),
    })),
});
const ReviewOutputSchema = z.object({
    assessments: z.array(z.object({
        candidateCode: z.string(),
        verdict: z.enum(["finding", "valid"]),
        rationale: z.string().min(40),
    })),
});
const JudgeOutputSchema = z.object({
    decisionAssessments: z.array(z.object({
        id: z.string(),
        semanticallySound: z.boolean(),
        rationale: z.string().min(40),
    })),
    reviewAssessments: z.array(z.object({
        candidateCode: z.string(),
        semanticallySound: z.boolean(),
        rationale: z.string().min(40),
    })),
});
const InvocationSchema = z.object({
    id: z.string(),
    condition: z.enum(conditionNames),
    lane: z.enum(["decisions", "implementation", "review", "semantic-judge"]),
    role: z.enum(["planner", "implementer", "reviewer", "planCritic"]),
    status: z.enum(["completed", "failed", "blocked", "cancelled", "timed-out"]),
    requestedModel: z.string(),
    actualModel: z.string().nullable(),
    nativeSessionId: z.string().nullable(),
    promptDigest: z.string().regex(/^[a-f0-9]{64}$/),
    responseDigest: z
        .string()
        .regex(/^[a-f0-9]{64}$/)
        .nullable(),
    latencyMs: z.number().int().nonnegative(),
    costUsd: z.null(),
    costReason: z.literal("native-runtime-did-not-report-cost"),
    reason: z.string().nullable(),
});
const CommandResultSchema = z.object({
    exitCode: z.number().int().nullable(),
    stdout: z.string(),
    stderr: z.string(),
});
const RuntimeArtifactTimingSchema = z.object({
    invocationId: z.string(),
    startedAt: z.string(),
});
const ConditionResultSchema = z.object({
    condition: z.enum(conditionNames),
    selectionDigest: z.string().regex(/^[a-f0-9]{64}$/),
    decisions: z.object({
        passed: z.boolean(),
        contractPassed: z.boolean().optional(),
        semanticDecisionPassed: z.boolean().optional(),
        rationalePassed: z.boolean().optional(),
        cardRoutingPassed: z.boolean().optional(),
        semanticDecisionsPassed: z.number().int().nonnegative().optional(),
        semanticDecisionsTotal: z.number().int().nonnegative().optional(),
        rationalesPassed: z.number().int().nonnegative().optional(),
        rationalesTotal: z.number().int().nonnegative().optional(),
        cardRoutingPassedCount: z.number().int().nonnegative().optional(),
        cardRoutingTotal: z.number().int().nonnegative().optional(),
        cases: z.array(z.object({
            id: z.string(),
            passed: z.boolean(),
            contractPassed: z.boolean().optional(),
            semanticDecisionPassed: z.boolean().optional(),
            rationalePassed: z.boolean().optional(),
            cardRoutingPassed: z.boolean().optional(),
            routingDiagnostics: z.array(z.string()).optional(),
            errors: z.array(z.string()),
        })),
    }),
    implementation: z.object({
        passed: z.boolean(),
        changedFiles: z.array(z.string()),
        protectedFilesUnchanged: z.boolean(),
        sourceChanged: z.boolean(),
        sourceBeforeDigest: z
            .string()
            .regex(/^[a-f0-9]{64}$/)
            .nullable(),
        sourceAfterDigest: z
            .string()
            .regex(/^[a-f0-9]{64}$/)
            .nullable(),
        diffDigest: z
            .string()
            .regex(/^[a-f0-9]{64}$/)
            .nullable(),
        seedTest: CommandResultSchema,
        finalTest: CommandResultSchema,
    }),
    review: z.object({
        passed: z.boolean(),
        errors: z.array(z.string()),
    }),
    semanticJudge: z.object({
        passed: z.boolean(),
        errors: z.array(z.string()),
    }),
    guidedConformancePassed: z.boolean().optional(),
    passed: z.boolean(),
});
const ProofBaseSchema = z.object({
    schemaVersion: z.literal(1),
    evaluationRevision: z
        .union([z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6), z.literal(7)])
        .optional(),
    rescoredAt: z.string().optional(),
    previousReceiptDigest: z
        .string()
        .regex(/^[a-f0-9]{64}$/)
        .optional(),
    sourceProofDigest: z
        .string()
        .regex(/^[a-f0-9]{64}$/)
        .optional(),
    sourceSelectorEvaluatorDigest: z
        .string()
        .regex(/^[a-f0-9]{64}$/)
        .optional(),
    modelEvidenceStatus: z
        .enum([
        "actual-reported-and-matched",
        "partially-reported-all-matched",
        "requested-pinned-actual-unreported",
    ])
        .optional(),
    profile: z.enum(["codex", "claude-code", "cursor"]),
    sourceRoot: z.string(),
    createdAt: z.string(),
    knowledgeDigest: z.string().regex(/^[a-f0-9]{64}$/),
    coverageStatus: z.literal("independent-audit-required"),
    behaviorFixtureDigest: z.string().regex(/^[a-f0-9]{64}$/),
    codeFixtureDigest: z.string().regex(/^[a-f0-9]{64}$/),
    selectorEvaluatorDigest: z.string().regex(/^[a-f0-9]{64}$/),
    releaseManifestDigest: z.string().regex(/^[a-f0-9]{64}$/),
    promptSchemaDigest: z.string().regex(/^[a-f0-9]{64}$/),
    promptSetDigest: z.string().regex(/^[a-f0-9]{64}$/),
    runtime: z.object({
        executable: z.string(),
        executableDigest: z
            .string()
            .regex(/^[a-f0-9]{64}$/)
            .optional(),
        executableDigestEvidence: z
            .object({
            basis: z.enum([
                "captured-before-and-after-invocations",
                "assessment-observation-with-preexisting-file-times",
            ]),
            observedAt: z.string(),
            beforeObservedAt: z.string().optional(),
            afterObservedAt: z.string().optional(),
            fileMtimeMs: z.number().nonnegative(),
            fileCtimeMs: z.number().nonnegative(),
            earliestInvocationStartedAt: z.string().optional(),
        })
            .optional(),
        nativeVersion: z.string().nullable(),
        requestedModels: z.object({
            planner: z.string(),
            implementer: z.string(),
            reviewer: z.string(),
            planCritic: z.string(),
        }),
    }),
    invocations: z.array(InvocationSchema).max(8),
    conditions: z.array(ConditionResultSchema),
    comparison: z
        .object({
        baselineSemanticDecisionsPassed: z.number().int().nonnegative(),
        guidedSemanticDecisionsPassed: z.number().int().nonnegative(),
        semanticDecisionsTotal: z.number().int().positive(),
        baselineRationalesPassed: z.number().int().nonnegative(),
        guidedRationalesPassed: z.number().int().nonnegative(),
        rationalesTotal: z.number().int().positive(),
        baselineCardRoutingPassed: z.number().int().nonnegative(),
        guidedCardRoutingPassed: z.number().int().nonnegative(),
        cardRoutingTotal: z.number().int().positive(),
        observedSemanticDelta: z.number().int(),
        observedCardRoutingDelta: z.number().int(),
        observedSemanticImprovement: z.boolean(),
    })
        .optional(),
    guidedConformancePassed: z.boolean().optional(),
    semanticPassed: z.boolean(),
    passed: z.boolean(),
    failures: z.array(z.string()),
});
const ProofSchema = ProofBaseSchema.extend({
    digest: z.string().regex(/^[a-f0-9]{64}$/),
});
const promptContract = Object.freeze({
    version: 1,
    decision: {
        cases: [
            {
                id: "provided-case-id",
                decisionCode: "one-available-decision-code",
                appliedCardIds: ["available-card-id"],
                rejectedPatternCodes: ["available-pattern-code"],
                rationale: "concrete situation-specific explanation of at least 40 characters",
            },
        ],
    },
    review: {
        assessments: [
            {
                candidateCode: "provided-candidate-code",
                verdict: "finding-or-valid",
                rationale: "concrete code-specific explanation of at least 40 characters",
            },
        ],
    },
    judge: {
        decisionAssessments: [
            {
                id: "provided-case-id",
                semanticallySound: true,
                rationale: "concrete consistency judgment of at least 40 characters",
            },
        ],
        reviewAssessments: [
            {
                candidateCode: "provided-candidate-code",
                semanticallySound: true,
                rationale: "concrete consistency judgment of at least 40 characters",
            },
        ],
    },
    parsing: "single-json-object-without-repair",
});
const defaultServices = Object.freeze({
    probe: probeRuntime,
    start: startRuntime,
});
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const resolveRuntimeExecutable = (executable) => {
    const direct = executable.includes("/") || executable.includes("\\");
    const candidates = direct
        ? [resolve(executable)]
        : (process.env.PATH ?? "").split(delimiter).map((entry) => join(entry, executable));
    const found = candidates.find((candidate) => existsSync(candidate));
    if (found === undefined)
        throw new Error(`Runtime executable is unavailable: ${executable}`);
    return realpathSync(found);
};
const observeRuntimeExecutable = (executable) => {
    const path = resolveRuntimeExecutable(executable);
    const stats = statSync(path);
    return Object.freeze({
        path,
        digest: sha256(readFileSync(path)),
        observedAt: new Date().toISOString(),
        fileMtimeMs: stats.mtimeMs,
        fileCtimeMs: stats.ctimeMs,
    });
};
const historicalExecutableObservation = ({ runRoot, executable, invocationIds, }) => {
    const timings = invocationIds.map((invocationId) => RuntimeArtifactTimingSchema.parse(JSON.parse(readFileSync(join(runRoot, "runtime-artifacts", `${invocationId}.json`), "utf8"))));
    const startedTimes = timings.map((timing) => Date.parse(timing.startedAt));
    if (startedTimes.some((value) => !Number.isFinite(value))) {
        throw new Error("Historical runtime artifacts contain an invalid start time");
    }
    const earliestTime = Math.min(...startedTimes);
    const earliestInvocationStartedAt = new Date(earliestTime).toISOString();
    const observation = observeRuntimeExecutable(executable);
    if (observation.fileMtimeMs > earliestTime || observation.fileCtimeMs > earliestTime) {
        throw new Error("Historical runtime executable changed after the evaluation began; executable digest is unverified");
    }
    return Object.freeze({
        ...observation,
        earliestInvocationStartedAt,
    });
};
function stableJson(value) {
    if (value === null ||
        typeof value === "string" ||
        typeof value === "boolean" ||
        typeof value === "number") {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
        return `[${value.map(stableJson).join(",")}]`;
    }
    if (typeof value === "object") {
        return `{${Object.entries(value)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
            .join(",")}}`;
    }
    throw new Error(`Unsupported digest value: ${typeof value}`);
}
const digestValue = (value) => sha256(stableJson(value));
const parseJson = (value) => {
    if (typeof value !== "string") {
        return value;
    }
    return JSON.parse(value);
};
const filesBelow = (directory) => readdirSync(directory)
    .sort()
    .flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? filesBelow(path) : [path];
});
const digestFiles = ({ root, paths }) => digestValue(paths
    .sort()
    .map((path) => ({ path: relative(root, path), digest: sha256(readFileSync(path)) })));
const inputDigests = ({ root }) => {
    const behaviorPath = join(root, "knowledge/fixtures/behavior.json");
    const codeRoot = join(root, "knowledge/fixtures/code");
    return Object.freeze({
        behaviorFixtureDigest: sha256(readFileSync(behaviorPath)),
        codeFixtureDigest: digestFiles({ root, paths: filesBelow(codeRoot) }),
        selectorEvaluatorDigest: digestFiles({
            root,
            paths: [
                join(root, "src/knowledge/index.ts"),
                join(root, "src/knowledge/evaluation.ts"),
                join(root, "src/knowledge/model-evaluation.ts"),
            ],
        }),
        releaseManifestDigest: sha256(readFileSync(join(root, "knowledge/release.json"))),
        promptSchemaDigest: digestValue(promptContract),
    });
};
const selectedForCases = ({ root, fixtures }) => Object.fromEntries(fixtures.cases.map((fixture) => [
    fixture.id,
    selectKnowledge({ root, topics: fixture.topics }),
]));
const selectedCards = ({ root, topics }) => selectKnowledge({ root, topics });
const unique = (values) => [...new Set(values)].sort();
const choiceFor = ({ fixture, selected }) => Object.freeze({
    id: fixture.id,
    phase: fixture.phase,
    situation: fixture.situation,
    availableDecisionCodes: unique([
        fixture.positiveOutput.decisionCode,
        fixture.negativeOutput.decisionCode,
    ]),
    availableRejectedPatternCodes: unique([
        fixture.positiveOutput.decisionCode,
        fixture.negativeOutput.decisionCode,
        ...fixture.positiveOutput.rejectedPatternCodes,
        ...fixture.negativeOutput.rejectedPatternCodes,
    ]),
    availableCardIds: selected.cards.map((card) => card.id).sort(),
});
const cardPayload = (cards) => cards.map(({ id, topics, content }) => ({ id, topics, content }));
const conditionGuidance = ({ condition, cards, }) => condition === "guided"
    ? `Use these selected knowledge cards as decision guidance:\n${JSON.stringify(cardPayload(cards))}`
    : "No knowledge card content is supplied. Decide from the task and neutral choices alone.";
const decisionPrompt = ({ condition, fixtures, selections, }) => {
    const allCards = new Map();
    for (const selected of Object.values(selections)) {
        for (const card of selected.cards) {
            allCards.set(card.id, card);
        }
    }
    const choices = fixtures.cases.map((fixture) => {
        const selected = selections[fixture.id];
        if (selected === undefined) {
            throw new Error(`Selection missing for ${fixture.id}`);
        }
        return choiceFor({ fixture, selected });
    });
    return [
        "Evaluate every independent case. Candidate codes are neutral choices and are not correctness hints.",
        "Choose one available decision code, apply only available card IDs that materially govern the decision, and list the available pattern codes you reject.",
        "appliedCardIds names guidance actually used in the chosen design, including an applicable exception. Exclude a card consulted only to establish that it is outside the situation's scope. Return an empty appliedCardIds array when no selected guidance is actually applied; do not invent a pattern merely to cite a card.",
        "The rationale must explain the situation-specific behavior and must be consistent with the chosen and rejected codes.",
        conditionGuidance({
            condition,
            cards: [...allCards.values()].sort((a, b) => a.id.localeCompare(b.id)),
        }),
        `Cases:\n${JSON.stringify(choices)}`,
        `Return exactly one JSON object matching this contract:\n${JSON.stringify(promptContract.decision)}`,
        "Return one result for every case ID and no markdown.",
    ].join("\n\n");
};
const implementationPrompt = ({ condition, task, cards, nodeExecutable, }) => [
    "Implement the bounded fixture task in this disposable repository.",
    task,
    conditionGuidance({ condition, cards }),
    "Edit only preference-store.js. Do not edit tests or package metadata.",
    `You may run ${nodeExecutable} --test preference-store.test.js while working.`,
    'After the code is complete, return only JSON {"summary":"a concrete description of the implemented behavior"}.',
].join("\n\n");
const reviewCandidates = Object.freeze([
    Object.freeze({
        candidateCode: "account-cache-collision",
        target: "accountResourceKey",
        question: "Does omitting account identity create a semantic cache collision?",
    }),
    Object.freeze({
        candidateCode: "local-resource-key",
        target: "localLabelKey",
        question: "Is resource-only identity a defect for this static local label?",
    }),
]);
const invocationPlan = conditionNames.flatMap((condition) => [
    Object.freeze({ id: `${condition}-decisions`, role: "planner", lane: "decisions" }),
    Object.freeze({
        id: `${condition}-implementation`,
        role: "implementer",
        lane: "implementation",
    }),
    Object.freeze({ id: `${condition}-review`, role: "reviewer", lane: "review" }),
    Object.freeze({
        id: `${condition}-semantic-judge`,
        role: "planCritic",
        lane: "semantic-judge",
    }),
]);
const reviewPrompt = ({ condition, context, source, cards, }) => [
    "Independently review the code and context. Classify each neutral candidate as finding or valid.",
    "A finding must describe an actual semantic defect. A valid candidate must explain why the code is correct in its stated scope.",
    conditionGuidance({ condition, cards }),
    `Context:\n${context}`,
    `Code:\n${source}`,
    `Candidates:\n${JSON.stringify(reviewCandidates)}`,
    `Return exactly one JSON object matching this contract:\n${JSON.stringify(promptContract.review)}`,
    "Return one assessment for every candidate and no markdown.",
].join("\n\n");
const judgePrompt = ({ condition, fixtures, selections, decisionOutput, reviewOutput, reviewContext, reviewSource, }) => {
    const cards = new Map();
    for (const selected of Object.values(selections)) {
        for (const card of selected.cards)
            cards.set(card.id, card);
    }
    const cases = fixtures.cases.map((fixture) => {
        const selected = selections[fixture.id];
        if (selected === undefined)
            throw new Error(`Selection missing for ${fixture.id}`);
        return choiceFor({ fixture, selected });
    });
    return [
        "Act as a fresh semantic consistency judge. Do not trust labels alone.",
        "For every decision case, decide whether the selected behavior is sound for the situation and whether the concrete rationale truly supports the chosen decision, rejected patterns, and applied guidance.",
        "For both review candidates, decide whether the classification and rationale are sound for the supplied code and context. A response with correct-looking codes but contradictory or generic reasoning is unsound.",
        conditionGuidance({
            condition,
            cards: [...cards.values()].sort((a, b) => a.id.localeCompare(b.id)),
        }),
        `Decision cases and neutral choices:\n${JSON.stringify(cases)}`,
        `Decision response to judge:\n${JSON.stringify(decisionOutput)}`,
        `Review context:\n${reviewContext}`,
        `Review code:\n${reviewSource}`,
        `Review candidates:\n${JSON.stringify(reviewCandidates)}`,
        `Review response to judge:\n${JSON.stringify(reviewOutput)}`,
        `Return exactly one JSON object matching this contract:\n${JSON.stringify(promptContract.judge)}`,
        "Return every decision case ID and every review candidate code exactly once. Return no markdown.",
    ].join("\n\n");
};
const parseFixture = ({ root }) => DecisionFixtureSchema.parse(JSON.parse(readFileSync(join(root, "knowledge/fixtures/behavior.json"), "utf8")));
const initializeGit = async (directory) => {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    await executeFile("git", ["init", "-q"], { cwd: directory });
    await executeFile("git", ["add", "."], { cwd: directory });
    await executeFile("git", [
        "-c",
        "user.name=Evaluation Fixture",
        "-c",
        "user.email=fixture@example.invalid",
        "commit",
        "-qm",
        "seed fixture",
        "--allow-empty",
    ], { cwd: directory });
};
const commandEnvironment = () => {
    const environment = { ...process.env };
    delete environment.NODE_TEST_CONTEXT;
    return environment;
};
const commandResult = async ({ executable, args, cwd, }) => {
    try {
        const result = await executeFile(executable, args, {
            cwd,
            env: commandEnvironment(),
            timeout: 30_000,
            maxBuffer: 1_000_000,
        });
        return { exitCode: 0, stdout: result.stdout, stderr: result.stderr };
    }
    catch (error) {
        if (typeof error !== "object" || error === null) {
            return { exitCode: null, stdout: "", stderr: String(error) };
        }
        const record = Object.fromEntries(Object.entries(error));
        return {
            exitCode: typeof record.code === "number" ? record.code : null,
            stdout: typeof record.stdout === "string" ? record.stdout : "",
            stderr: typeof record.stderr === "string" ? record.stderr : String(error),
        };
    }
};
const responseText = (output) => typeof output === "string" ? output : JSON.stringify(output);
const exactIds = ({ expected, received }) => expected.length === received.length &&
    expected.every((value) => received.filter((candidate) => candidate === value).length === 1);
const evaluateDecisionDimensions = ({ fixture, selected, output, }) => {
    const choices = choiceFor({ fixture, selected });
    const contractErrors = [];
    const semanticErrors = [];
    const cardRoutingErrors = [];
    if (!choices.availableDecisionCodes.includes(output.decisionCode)) {
        contractErrors.push("Decision code was not one of the neutral choices");
    }
    for (const rejected of output.rejectedPatternCodes) {
        if (!choices.availableRejectedPatternCodes.includes(rejected)) {
            contractErrors.push(`Rejected pattern was not an available choice: ${rejected}`);
        }
    }
    if (output.decisionCode !== fixture.expected.expectedDecisionCode) {
        semanticErrors.push(`Expected decision ${fixture.expected.expectedDecisionCode}, received ${output.decisionCode}`);
    }
    const rejected = new Set(output.rejectedPatternCodes);
    for (const pattern of fixture.expected.requiredRejectedPatterns) {
        if (!rejected.has(pattern)) {
            semanticErrors.push(`Required rejected pattern was omitted: ${pattern}`);
        }
    }
    if (new Set(output.appliedCardIds).size !== output.appliedCardIds.length) {
        contractErrors.push("appliedCardIds contains duplicates");
    }
    const available = new Set(selected.cards.map((card) => card.id));
    for (const cardId of output.appliedCardIds) {
        if (!available.has(cardId)) {
            contractErrors.push(`Card was not present in selected context: ${cardId}`);
        }
    }
    const applied = new Set(output.appliedCardIds);
    for (const cardId of fixture.expected.requiredCardIds) {
        if (!applied.has(cardId)) {
            cardRoutingErrors.push(`Expected supporting card was not cited: ${cardId}`);
        }
    }
    for (const cardId of fixture.expected.forbiddenCardIds) {
        if (applied.has(cardId)) {
            cardRoutingErrors.push(`Inapplicable card was applied: ${cardId}`);
            contractErrors.push(`Inapplicable card was applied: ${cardId}`);
        }
    }
    return { contractErrors, semanticErrors, cardRoutingErrors };
};
const modelEvidence = ({ invocations, expectedModels, }) => {
    const sessions = invocations.map((invocation) => invocation.nativeSessionId);
    const expectedByRole = new Map([
        ["planner", expectedModels.planner],
        ["implementer", expectedModels.implementer],
        ["reviewer", expectedModels.reviewer],
        ["planCritic", expectedModels.planCritic],
    ]);
    const completedAndPinned = invocations.length === invocationPlan.length &&
        sessions.every((session) => session !== null) &&
        new Set(sessions).size === invocationPlan.length &&
        invocations.every((invocation) => {
            const expected = expectedByRole.get(invocation.role);
            return (invocation.status === "completed" &&
                expected !== undefined &&
                invocation.requestedModel === expected &&
                (invocation.actualModel === null ||
                    modelsMatch({ requested: invocation.requestedModel, actual: invocation.actualModel })));
        });
    const reported = invocations.filter((invocation) => invocation.actualModel !== null).length;
    let status = "partially-reported-all-matched";
    if (reported === invocations.length)
        status = "actual-reported-and-matched";
    if (reported === 0)
        status = "requested-pinned-actual-unreported";
    return { valid: completedAndPinned, status };
};
const selectionDigest = ({ decisionSelections, implementationSelection, reviewSelection, }) => digestValue({
    decisions: Object.fromEntries(Object.entries(decisionSelections).map(([id, selected]) => [
        id,
        selected.cards.map((card) => ({ id: card.id, digest: card.digest })),
    ])),
    implementation: implementationSelection.cards.map((card) => ({
        id: card.id,
        digest: card.digest,
    })),
    review: reviewSelection.cards.map((card) => ({ id: card.id, digest: card.digest })),
});
const emptyCommandResult = () => ({
    exitCode: null,
    stdout: "",
    stderr: "not-run",
});
const emptyCondition = ({ condition, digest, }) => ({
    condition,
    selectionDigest: digest,
    decisions: { passed: false, cases: [] },
    implementation: {
        passed: false,
        changedFiles: [],
        protectedFilesUnchanged: false,
        sourceChanged: false,
        sourceBeforeDigest: null,
        sourceAfterDigest: null,
        diffDigest: null,
        seedTest: emptyCommandResult(),
        finalTest: emptyCommandResult(),
    },
    review: { passed: false, errors: ["not-run"] },
    semanticJudge: { passed: false, errors: ["not-run"] },
    passed: false,
});
const writePrivate = ({ path, content }) => {
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    writeFileSync(path, content, { mode: 0o600 });
};
const isAborted = (signal) => signal?.aborted === true;
const proofDigest = (base) => digestValue(base);
const rawEvidence = ({ runRoot, id, kind, }) => {
    const content = readFileSync(join(runRoot, kind, `${id}.txt`), "utf8");
    return content.endsWith("\n") ? content.slice(0, -1) : content;
};
const findRunRoot = ({ directory, digest }) => {
    const runs = join(directory, "runs");
    for (const name of readdirSync(runs).sort()) {
        const runRoot = join(runs, name);
        const resultPath = join(runRoot, "result.json");
        if (!existsSync(resultPath))
            continue;
        const parsed = ProofSchema.safeParse(JSON.parse(readFileSync(resultPath, "utf8")));
        if (parsed.success && parsed.data.digest === digest)
            return runRoot;
    }
    throw new Error("Knowledge behavior source run artifacts are unavailable");
};
const scoreReview = (output) => {
    const errors = [];
    try {
        const parsed = ReviewOutputSchema.parse(output);
        if (!exactIds({
            expected: reviewCandidates.map((candidate) => candidate.candidateCode),
            received: parsed.assessments.map((assessment) => assessment.candidateCode),
        })) {
            errors.push("Review response had missing, duplicate, or unknown candidates");
        }
        const account = parsed.assessments.find((assessment) => assessment.candidateCode === "account-cache-collision");
        const local = parsed.assessments.find((assessment) => assessment.candidateCode === "local-resource-key");
        if (account?.verdict !== "finding") {
            errors.push("Account-scoped cache collision was not identified");
        }
        if (local?.verdict !== "valid") {
            errors.push("Valid local resource-only key was reported as a defect");
        }
    }
    catch (error) {
        errors.push(String(error));
    }
    return { passed: errors.length === 0, errors };
};
const scoreJudge = ({ output, fixtures, }) => {
    const errors = [];
    try {
        const parsed = JudgeOutputSchema.parse(output);
        if (!exactIds({
            expected: fixtures.cases.map((fixture) => fixture.id),
            received: parsed.decisionAssessments.map((assessment) => assessment.id),
        })) {
            errors.push("Semantic judge had missing, duplicate, or unknown decision IDs");
        }
        if (!exactIds({
            expected: reviewCandidates.map((candidate) => candidate.candidateCode),
            received: parsed.reviewAssessments.map((assessment) => assessment.candidateCode),
        })) {
            errors.push("Semantic judge had missing, duplicate, or unknown review candidates");
        }
        for (const assessment of parsed.decisionAssessments) {
            if (!assessment.semanticallySound) {
                errors.push(`Decision rationale was semantically unsound: ${assessment.id}`);
            }
        }
        for (const assessment of parsed.reviewAssessments) {
            if (!assessment.semanticallySound) {
                errors.push(`Review rationale was semantically unsound: ${assessment.candidateCode}`);
            }
        }
    }
    catch (error) {
        errors.push(String(error));
    }
    return { passed: errors.length === 0, errors };
};
const attachRationaleMetrics = ({ decisions, judgeOutput, }) => {
    const parsed = JudgeOutputSchema.safeParse(judgeOutput);
    const cases = decisions.cases.map((result) => {
        const assessment = parsed.success
            ? parsed.data.decisionAssessments.find((candidate) => candidate.id === result.id)
            : undefined;
        const rationalePassed = assessment?.semanticallySound === true;
        return {
            ...result,
            rationalePassed,
            passed: result.passed && rationalePassed,
        };
    });
    const rationalesPassed = cases.filter((result) => result.rationalePassed === true).length;
    const rationalesTotal = cases.length;
    const rationalePassed = rationalesTotal > 0 && rationalesPassed === rationalesTotal;
    return {
        ...decisions,
        cases,
        rationalePassed,
        rationalesPassed,
        rationalesTotal,
        passed: decisions.passed && rationalePassed,
    };
};
const behaviorComparison = ({ conditions, }) => {
    const baseline = conditions.find((condition) => condition.condition === "baseline");
    const guided = conditions.find((condition) => condition.condition === "guided");
    if (baseline === undefined || guided === undefined) {
        throw new Error("Behavior comparison requires baseline and guided conditions");
    }
    const baselineSemantic = baseline.decisions.semanticDecisionsPassed ?? 0;
    const guidedSemantic = guided.decisions.semanticDecisionsPassed ?? 0;
    const semanticTotal = guided.decisions.semanticDecisionsTotal ?? 0;
    const baselineRationales = baseline.decisions.rationalesPassed ?? 0;
    const guidedRationales = guided.decisions.rationalesPassed ?? 0;
    const rationaleTotal = guided.decisions.rationalesTotal ?? 0;
    const baselineRouting = baseline.decisions.cardRoutingPassedCount ?? 0;
    const guidedRouting = guided.decisions.cardRoutingPassedCount ?? 0;
    const routingTotal = guided.decisions.cardRoutingTotal ?? 0;
    if (semanticTotal === 0 || rationaleTotal === 0 || routingTotal === 0) {
        throw new Error("Behavior comparison metrics are incomplete");
    }
    return {
        baselineSemanticDecisionsPassed: baselineSemantic,
        guidedSemanticDecisionsPassed: guidedSemantic,
        semanticDecisionsTotal: semanticTotal,
        baselineRationalesPassed: baselineRationales,
        guidedRationalesPassed: guidedRationales,
        rationalesTotal: rationaleTotal,
        baselineCardRoutingPassed: baselineRouting,
        guidedCardRoutingPassed: guidedRouting,
        cardRoutingTotal: routingTotal,
        observedSemanticDelta: guidedSemantic - baselineSemantic,
        observedCardRoutingDelta: guidedRouting - baselineRouting,
        observedSemanticImprovement: guidedSemantic > baselineSemantic,
    };
};
const scoreDecisions = ({ output, fixtures, selections, }) => {
    const cases = [];
    try {
        const parsed = DecisionBatchOutputSchema.parse(output);
        for (const fixture of fixtures.cases) {
            const selected = selections[fixture.id];
            const result = parsed.cases.find((candidate) => candidate.id === fixture.id);
            const errors = [];
            let routingDiagnostics = [];
            let contractPassed = false;
            let semanticDecisionPassed = false;
            let cardRoutingPassed = false;
            if (selected === undefined)
                errors.push("Selected knowledge was unavailable");
            if (result === undefined)
                errors.push("Model omitted the case");
            if (selected !== undefined && result !== undefined) {
                const dimensions = evaluateDecisionDimensions({ fixture, selected, output: result });
                contractPassed = dimensions.contractErrors.length === 0;
                semanticDecisionPassed = dimensions.semanticErrors.length === 0;
                cardRoutingPassed = dimensions.cardRoutingErrors.length === 0;
                routingDiagnostics = dimensions.cardRoutingErrors;
                errors.push(...dimensions.contractErrors, ...dimensions.semanticErrors);
            }
            cases.push({
                id: fixture.id,
                passed: errors.length === 0,
                contractPassed,
                semanticDecisionPassed,
                cardRoutingPassed,
                routingDiagnostics,
                errors,
            });
        }
        if (!exactIds({
            expected: fixtures.cases.map((fixture) => fixture.id),
            received: parsed.cases.map((item) => item.id),
        })) {
            cases.push({
                id: "batch-envelope",
                passed: false,
                errors: ["Decision response had missing, duplicate, or unknown case IDs"],
            });
        }
    }
    catch (error) {
        cases.push({ id: "batch-envelope", passed: false, errors: [String(error)] });
    }
    return {
        passed: cases.length === fixtures.cases.length && cases.every((result) => result.passed),
        contractPassed: cases.length === fixtures.cases.length &&
            cases.every((result) => result.contractPassed === true),
        semanticDecisionPassed: cases.length === fixtures.cases.length &&
            cases.every((result) => result.semanticDecisionPassed === true),
        cardRoutingPassed: cases.length === fixtures.cases.length &&
            cases.every((result) => result.cardRoutingPassed === true),
        semanticDecisionsPassed: cases.filter((result) => result.semanticDecisionPassed === true)
            .length,
        semanticDecisionsTotal: fixtures.cases.length,
        cardRoutingPassedCount: cases.filter((result) => result.cardRoutingPassed === true).length,
        cardRoutingTotal: fixtures.cases.length,
        cases,
    };
};
export function rescoreBehaviorEvaluation({ directory, root, profile, }) {
    const resolvedDirectory = resolve(directory);
    const sourcePath = join(resolvedDirectory, `${profile}.json`);
    const source = ProofSchema.parse(JSON.parse(readFileSync(sourcePath, "utf8")));
    const { digest: sourceDigest, ...sourceBase } = source;
    if (proofDigest(sourceBase) !== sourceDigest) {
        throw new Error("Knowledge behavior source proof digest is invalid");
    }
    if (source.evaluationRevision !== 2 &&
        source.evaluationRevision !== 3 &&
        source.evaluationRevision !== 4 &&
        source.evaluationRevision !== 5 &&
        source.evaluationRevision !== 6) {
        throw new Error("Knowledge behavior rescore requires a prior revision two through six receipt");
    }
    const resolvedRoot = resolve(root);
    const knowledge = loadKnowledge({ root: resolvedRoot });
    const digests = inputDigests({ root: resolvedRoot });
    if (source.knowledgeDigest !== knowledge.digest ||
        source.behaviorFixtureDigest !== digests.behaviorFixtureDigest ||
        source.codeFixtureDigest !== digests.codeFixtureDigest ||
        source.releaseManifestDigest !== digests.releaseManifestDigest ||
        source.promptSchemaDigest !== digests.promptSchemaDigest) {
        throw new Error("Knowledge behavior source proof is stale for non-evaluator inputs");
    }
    const runRoot = findRunRoot({
        directory: resolvedDirectory,
        digest: source.sourceProofDigest ?? sourceDigest,
    });
    for (const invocation of source.invocations) {
        const prompt = rawEvidence({ runRoot, id: invocation.id, kind: "prompts" });
        const response = rawEvidence({ runRoot, id: invocation.id, kind: "responses" });
        if (sha256(prompt) !== invocation.promptDigest ||
            sha256(response) !== invocation.responseDigest) {
            throw new Error(`Raw evidence digest mismatch for ${invocation.id}`);
        }
    }
    const executableObservation = historicalExecutableObservation({
        runRoot,
        executable: source.runtime.executable,
        invocationIds: source.invocations.map((invocation) => invocation.id),
    });
    const fixtures = parseFixture({ root: resolvedRoot });
    const selections = selectedForCases({ root: resolvedRoot, fixtures });
    const conditions = conditionNames.map((condition) => {
        const sourceCondition = source.conditions.find((candidate) => candidate.condition === condition);
        if (sourceCondition === undefined || !sourceCondition.implementation.passed) {
            throw new Error(`Source implementation evidence did not pass for ${condition}`);
        }
        const scoredDecisions = scoreDecisions({
            output: parseJson(rawEvidence({ runRoot, id: `${condition}-decisions`, kind: "responses" })),
            fixtures,
            selections,
        });
        const review = scoreReview(parseJson(rawEvidence({ runRoot, id: `${condition}-review`, kind: "responses" })));
        const judgeOutput = parseJson(rawEvidence({ runRoot, id: `${condition}-semantic-judge`, kind: "responses" }));
        const semanticJudge = scoreJudge({
            output: judgeOutput,
            fixtures,
        });
        const decisions = attachRationaleMetrics({ decisions: scoredDecisions, judgeOutput });
        const guidedConformancePassed = decisions.passed &&
            sourceCondition.implementation.passed &&
            review.passed &&
            semanticJudge.passed;
        return ConditionResultSchema.parse({
            ...sourceCondition,
            decisions,
            review,
            semanticJudge,
            guidedConformancePassed,
            passed: guidedConformancePassed,
        });
    });
    const modelVerification = modelEvidence({
        invocations: source.invocations,
        expectedModels: source.runtime.requestedModels,
    });
    const guidedConformancePassed = conditions.find((condition) => condition.condition === "guided")?.passed === true;
    const comparison = behaviorComparison({ conditions });
    const semanticPassed = guidedConformancePassed;
    const failures = [];
    if (!guidedConformancePassed)
        failures.push("Guided conformance did not pass every lane");
    if (!modelVerification.valid) {
        failures.push("Native requested-model binding or fresh-session identity was invalid");
    }
    const base = ProofBaseSchema.parse({
        ...sourceBase,
        evaluationRevision: 7,
        rescoredAt: new Date().toISOString(),
        previousReceiptDigest: sourceDigest,
        sourceProofDigest: source.sourceProofDigest ?? sourceDigest,
        sourceSelectorEvaluatorDigest: source.sourceSelectorEvaluatorDigest ?? source.selectorEvaluatorDigest,
        modelEvidenceStatus: modelVerification.status,
        selectorEvaluatorDigest: digests.selectorEvaluatorDigest,
        runtime: {
            ...source.runtime,
            executable: executableObservation.path,
            executableDigest: executableObservation.digest,
            executableDigestEvidence: {
                basis: "assessment-observation-with-preexisting-file-times",
                observedAt: executableObservation.observedAt,
                fileMtimeMs: executableObservation.fileMtimeMs,
                fileCtimeMs: executableObservation.fileCtimeMs,
                earliestInvocationStartedAt: executableObservation.earliestInvocationStartedAt,
            },
        },
        conditions,
        comparison,
        guidedConformancePassed,
        semanticPassed,
        passed: guidedConformancePassed &&
            modelVerification.valid &&
            source.runtime.nativeVersion !== null &&
            source.invocations.length === invocationPlan.length,
        failures,
    });
    const proof = ProofSchema.parse({ ...base, digest: proofDigest(base) });
    writePrivate({
        path: join(runRoot, "digest-rescored-result.json"),
        content: `${JSON.stringify(proof, null, 2)}\n`,
    });
    writePrivate({ path: sourcePath, content: `${JSON.stringify(proof, null, 2)}\n` });
    return proof;
}
export async function runBehaviorEvaluation(input, services = defaultServices) {
    const root = resolve(input.root);
    const directory = resolve(input.directory);
    const runId = randomUUID();
    const runRoot = join(directory, "runs", runId);
    const workspaceRoot = join(runRoot, "workspaces");
    const runtimeArtifacts = join(runRoot, "runtime-artifacts");
    mkdirSync(workspaceRoot, { recursive: true, mode: 0o700 });
    const fixtures = parseFixture({ root });
    const knowledge = loadKnowledge({ root });
    const digests = inputDigests({ root });
    const decisionSelections = selectedForCases({ root, fixtures });
    const implementationSelection = selectedCards({ root, topics: ["storage", "types"] });
    const reviewSelection = selectedCards({ root, topics: ["cache", "query"] });
    const selectedDigest = selectionDigest({
        decisionSelections,
        implementationSelection,
        reviewSelection,
    });
    const requestedModels = {
        planner: runtimeProfiles[input.profile].planner.model,
        implementer: runtimeProfiles[input.profile].implementer.model,
        reviewer: runtimeProfiles[input.profile].reviewer.model,
        planCritic: runtimeProfiles[input.profile].planCritic.model,
    };
    const executableBefore = observeRuntimeExecutable(input.executable);
    const probe = await services.probe({
        profile: input.profile,
        executable: input.executable,
        cwd: root,
    });
    const invocations = [];
    const prompts = [];
    const failures = [];
    const invoke = async ({ condition, lane, role, cwd, prompt, }) => {
        if (invocations.length >= 8) {
            throw new Error("Behavior evaluation call ceiling exceeded");
        }
        const id = `${condition}-${lane}`;
        prompts.push({ id, prompt });
        writePrivate({ path: join(runRoot, "prompts", `${id}.txt`), content: `${prompt}\n` });
        const before = Date.now();
        const result = await services.start({
            profile: input.profile,
            role,
            executable: input.executable,
            cwd,
            prompt,
            invocationId: id,
            artifactDirectory: runtimeArtifacts,
            deadlineMs: 5 * 60 * 1_000,
            ...(input.signal === undefined ? {} : { signal: input.signal }),
        });
        const latencyMs = Math.max(0, Date.now() - before);
        const rawResponse = result.output === null ? null : responseText(result.output);
        if (rawResponse !== null) {
            writePrivate({
                path: join(runRoot, "responses", `${id}.txt`),
                content: `${rawResponse}\n`,
            });
        }
        invocations.push({
            id,
            condition,
            lane,
            role,
            status: result.status,
            requestedModel: result.requestedModel,
            actualModel: result.actualModel,
            nativeSessionId: result.nativeSessionId,
            promptDigest: sha256(prompt),
            responseDigest: rawResponse === null ? null : sha256(rawResponse),
            latencyMs,
            costUsd: null,
            costReason: "native-runtime-did-not-report-cost",
            reason: result.reason,
        });
        return result;
    };
    const conditionResults = [];
    if (!probe.available || probe.version === null) {
        failures.push(probe.reason ?? "Native runtime probe did not provide a usable identity");
    }
    else {
        for (const condition of conditionNames) {
            const conditionResult = emptyCondition({ condition, digest: selectedDigest });
            const decisionWorkspace = join(workspaceRoot, `${condition}-decisions`);
            await initializeGit(decisionWorkspace);
            const decisionRun = await invoke({
                condition,
                lane: "decisions",
                role: "planner",
                cwd: decisionWorkspace,
                prompt: decisionPrompt({ condition, fixtures, selections: decisionSelections }),
            });
            let decisionParsed = null;
            if (decisionRun.status === "completed") {
                try {
                    decisionParsed = parseJson(decisionRun.output);
                    conditionResult.decisions = scoreDecisions({
                        output: decisionParsed,
                        fixtures,
                        selections: decisionSelections,
                    });
                }
                catch (error) {
                    conditionResult.decisions = {
                        passed: false,
                        cases: [{ id: "batch-envelope", passed: false, errors: [String(error)] }],
                    };
                }
            }
            else {
                conditionResult.decisions = {
                    passed: false,
                    cases: [
                        {
                            id: "runtime",
                            passed: false,
                            errors: [decisionRun.reason ?? `Runtime status was ${decisionRun.status}`],
                        },
                    ],
                };
            }
            if (decisionRun.status !== "completed") {
                failures.push(`Evaluation stopped after ${condition} decisions: ${decisionRun.status}`);
                conditionResults.push(conditionResult);
                break;
            }
            if (isAborted(input.signal)) {
                failures.push(`Evaluation cancelled during ${condition} decisions`);
                conditionResults.push(conditionResult);
                break;
            }
            const implementationWorkspace = join(workspaceRoot, `${condition}-implementation`);
            cpSync(join(root, "knowledge/fixtures/code/implementation"), implementationWorkspace, {
                recursive: true,
            });
            await initializeGit(implementationWorkspace);
            const protectedBefore = digestFiles({
                root: implementationWorkspace,
                paths: [
                    join(implementationWorkspace, "package.json"),
                    join(implementationWorkspace, "preference-store.test.js"),
                    join(implementationWorkspace, "TASK.md"),
                ],
            });
            const sourceBefore = sha256(readFileSync(join(implementationWorkspace, "preference-store.js")));
            const seedTest = await commandResult({
                executable: input.nodeExecutable,
                args: ["--test", "preference-store.test.js"],
                cwd: implementationWorkspace,
            });
            const implementationRun = await invoke({
                condition,
                lane: "implementation",
                role: "implementer",
                cwd: implementationWorkspace,
                prompt: implementationPrompt({
                    condition,
                    task: readFileSync(join(implementationWorkspace, "TASK.md"), "utf8"),
                    cards: implementationSelection.cards,
                    nodeExecutable: input.nodeExecutable,
                }),
            });
            const status = await commandResult({
                executable: "git",
                args: ["status", "--porcelain"],
                cwd: implementationWorkspace,
            });
            const diff = await commandResult({
                executable: "git",
                args: ["diff", "--no-ext-diff", "--binary", "--", "preference-store.js"],
                cwd: implementationWorkspace,
            });
            writePrivate({
                path: join(runRoot, "results", `${condition}-implementation.diff`),
                content: diff.stdout,
            });
            const changedFiles = status.stdout
                .split("\n")
                .map((line) => line.slice(3).trim())
                .filter((path) => path.length > 0)
                .sort();
            const protectedAfter = digestFiles({
                root: implementationWorkspace,
                paths: [
                    join(implementationWorkspace, "package.json"),
                    join(implementationWorkspace, "preference-store.test.js"),
                    join(implementationWorkspace, "TASK.md"),
                ],
            });
            const sourceAfter = sha256(readFileSync(join(implementationWorkspace, "preference-store.js")));
            const finalTest = await commandResult({
                executable: input.nodeExecutable,
                args: ["--test", "preference-store.test.js"],
                cwd: implementationWorkspace,
            });
            const protectedFilesUnchanged = protectedBefore === protectedAfter;
            const sourceChanged = sourceBefore !== sourceAfter;
            conditionResult.implementation = {
                passed: implementationRun.status === "completed" &&
                    seedTest.exitCode !== 0 &&
                    finalTest.exitCode === 0 &&
                    protectedFilesUnchanged &&
                    sourceChanged &&
                    changedFiles.length === 1 &&
                    changedFiles[0] === "preference-store.js",
                changedFiles,
                protectedFilesUnchanged,
                sourceChanged,
                sourceBeforeDigest: sourceBefore,
                sourceAfterDigest: sourceAfter,
                diffDigest: sha256(diff.stdout),
                seedTest,
                finalTest,
            };
            if (isAborted(input.signal)) {
                failures.push(`Evaluation cancelled during ${condition} implementation`);
                conditionResults.push(conditionResult);
                break;
            }
            const reviewWorkspace = join(workspaceRoot, `${condition}-review`);
            cpSync(join(root, "knowledge/fixtures/code/review"), reviewWorkspace, { recursive: true });
            await initializeGit(reviewWorkspace);
            const reviewContext = readFileSync(join(reviewWorkspace, "CONTEXT.md"), "utf8");
            const reviewSource = readFileSync(join(reviewWorkspace, "cache-keys.js"), "utf8");
            const reviewRun = await invoke({
                condition,
                lane: "review",
                role: "reviewer",
                cwd: reviewWorkspace,
                prompt: reviewPrompt({
                    condition,
                    context: reviewContext,
                    source: reviewSource,
                    cards: reviewSelection.cards,
                }),
            });
            let reviewParsed = null;
            const reviewErrors = [];
            if (reviewRun.status === "completed") {
                try {
                    reviewParsed = parseJson(reviewRun.output);
                    const output = ReviewOutputSchema.parse(reviewParsed);
                    if (!exactIds({
                        expected: reviewCandidates.map((candidate) => candidate.candidateCode),
                        received: output.assessments.map((assessment) => assessment.candidateCode),
                    })) {
                        reviewErrors.push("Review response had missing, duplicate, or unknown candidates");
                    }
                    const account = output.assessments.find((assessment) => assessment.candidateCode === "account-cache-collision");
                    const local = output.assessments.find((assessment) => assessment.candidateCode === "local-resource-key");
                    if (account?.verdict !== "finding") {
                        reviewErrors.push("Account-scoped cache collision was not identified");
                    }
                    if (local?.verdict !== "valid") {
                        reviewErrors.push("Valid local resource-only key was reported as a defect");
                    }
                }
                catch (error) {
                    reviewErrors.push(String(error));
                }
            }
            else {
                reviewErrors.push(reviewRun.reason ?? `Runtime status was ${reviewRun.status}`);
            }
            conditionResult.review = { passed: reviewErrors.length === 0, errors: reviewErrors };
            if (isAborted(input.signal)) {
                failures.push(`Evaluation cancelled during ${condition} review`);
                conditionResults.push(conditionResult);
                break;
            }
            const judgeWorkspace = join(workspaceRoot, `${condition}-judge`);
            await initializeGit(judgeWorkspace);
            const judgeRun = await invoke({
                condition,
                lane: "semantic-judge",
                role: "planCritic",
                cwd: judgeWorkspace,
                prompt: judgePrompt({
                    condition,
                    fixtures,
                    selections: decisionSelections,
                    decisionOutput: decisionParsed,
                    reviewOutput: reviewParsed,
                    reviewContext,
                    reviewSource,
                }),
            });
            const judgeErrors = [];
            let judgeParsed = null;
            if (judgeRun.status === "completed") {
                try {
                    judgeParsed = parseJson(judgeRun.output);
                    const output = JudgeOutputSchema.parse(judgeParsed);
                    if (!exactIds({
                        expected: fixtures.cases.map((fixture) => fixture.id),
                        received: output.decisionAssessments.map((assessment) => assessment.id),
                    })) {
                        judgeErrors.push("Semantic judge had missing, duplicate, or unknown decision IDs");
                    }
                    if (!exactIds({
                        expected: reviewCandidates.map((candidate) => candidate.candidateCode),
                        received: output.reviewAssessments.map((assessment) => assessment.candidateCode),
                    })) {
                        judgeErrors.push("Semantic judge had missing, duplicate, or unknown review candidates");
                    }
                    for (const assessment of output.decisionAssessments) {
                        if (!assessment.semanticallySound) {
                            judgeErrors.push(`Decision rationale was semantically unsound: ${assessment.id}`);
                        }
                    }
                    for (const assessment of output.reviewAssessments) {
                        if (!assessment.semanticallySound) {
                            judgeErrors.push(`Review rationale was semantically unsound: ${assessment.candidateCode}`);
                        }
                    }
                }
                catch (error) {
                    judgeErrors.push(String(error));
                }
            }
            else {
                judgeErrors.push(judgeRun.reason ?? `Runtime status was ${judgeRun.status}`);
            }
            conditionResult.semanticJudge = { passed: judgeErrors.length === 0, errors: judgeErrors };
            conditionResult.decisions = attachRationaleMetrics({
                decisions: conditionResult.decisions,
                judgeOutput: judgeParsed,
            });
            conditionResult.guidedConformancePassed =
                conditionResult.decisions.passed &&
                    conditionResult.implementation.passed &&
                    conditionResult.review.passed &&
                    conditionResult.semanticJudge.passed;
            conditionResult.passed = conditionResult.guidedConformancePassed;
            conditionResults.push(conditionResult);
            if (isAborted(input.signal)) {
                failures.push(`Evaluation cancelled during ${condition} semantic judgment`);
                break;
            }
        }
    }
    const promptSetDigest = digestValue(prompts.map(({ id, prompt }) => ({ id, digest: sha256(prompt) })));
    const guided = conditionResults.find((result) => result.condition === "guided");
    const modelVerification = modelEvidence({ invocations, expectedModels: requestedModels });
    const executableAfter = observeRuntimeExecutable(input.executable);
    const executableStable = executableBefore.path === executableAfter.path &&
        executableBefore.digest === executableAfter.digest;
    if (!modelVerification.valid) {
        failures.push("Native requested-model binding or fresh-session identity was invalid");
    }
    if (!executableStable) {
        failures.push("Runtime executable changed during behavior evaluation");
    }
    const guidedConformancePassed = guided?.passed === true;
    const comparison = conditionResults.length === conditionNames.length
        ? behaviorComparison({ conditions: conditionResults })
        : undefined;
    const semanticPassed = guidedConformancePassed;
    if (!guidedConformancePassed)
        failures.push("Guided conformance did not pass every lane");
    const base = ProofBaseSchema.parse({
        schemaVersion: 1,
        evaluationRevision: 7,
        modelEvidenceStatus: modelVerification.status,
        profile: input.profile,
        sourceRoot: root,
        createdAt: new Date().toISOString(),
        knowledgeDigest: knowledge.digest,
        coverageStatus: "independent-audit-required",
        ...digests,
        promptSetDigest,
        runtime: {
            executable: executableBefore.path,
            executableDigest: executableBefore.digest,
            executableDigestEvidence: {
                basis: "captured-before-and-after-invocations",
                observedAt: executableAfter.observedAt,
                beforeObservedAt: executableBefore.observedAt,
                afterObservedAt: executableAfter.observedAt,
                fileMtimeMs: executableAfter.fileMtimeMs,
                fileCtimeMs: executableAfter.fileCtimeMs,
            },
            nativeVersion: probe.version,
            requestedModels,
        },
        invocations,
        conditions: conditionResults,
        ...(comparison === undefined ? {} : { comparison }),
        guidedConformancePassed,
        semanticPassed,
        passed: probe.available &&
            probe.version !== null &&
            guidedConformancePassed &&
            modelVerification.valid &&
            executableStable,
        failures: unique(failures),
    });
    const proof = ProofSchema.parse({ ...base, digest: proofDigest(base) });
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    writePrivate({
        path: join(runRoot, "result.json"),
        content: `${JSON.stringify(proof, null, 2)}\n`,
    });
    writePrivate({
        path: join(directory, `${input.profile}.json`),
        content: `${JSON.stringify(proof, null, 2)}\n`,
    });
    return proof;
}
export async function readBehaviorEvaluation({ directory, knowledgeDigest, profile, currentRoot, executable, }, services = defaultServices) {
    const path = join(resolve(directory), `${profile}.json`);
    if (!existsSync(path))
        throw new Error("Knowledge behavior evaluation has not run");
    const proof = ProofSchema.parse(JSON.parse(readFileSync(path, "utf8")));
    const { digest, ...base } = proof;
    if (proofDigest(base) !== digest)
        throw new Error("Knowledge behavior proof digest is invalid");
    if (proof.evaluationRevision !== 7 ||
        proof.modelEvidenceStatus === undefined ||
        proof.comparison === undefined ||
        proof.guidedConformancePassed !== true ||
        proof.runtime.executableDigest === undefined ||
        proof.runtime.executableDigestEvidence === undefined) {
        throw new Error("Knowledge behavior proof requires the current evaluator revision");
    }
    if (!proof.passed || !proof.semanticPassed) {
        throw new Error("Knowledge behavior proof records failed guided conformance");
    }
    if (proof.profile !== profile || proof.knowledgeDigest !== knowledgeDigest) {
        throw new Error("Knowledge behavior proof belongs to another profile or knowledge release");
    }
    const activeRoot = resolve(currentRoot);
    const currentKnowledge = loadKnowledge({ root: activeRoot });
    const currentDigests = inputDigests({ root: activeRoot });
    const currentFixtures = parseFixture({ root: activeRoot });
    const currentSelectionDigest = selectionDigest({
        decisionSelections: selectedForCases({ root: activeRoot, fixtures: currentFixtures }),
        implementationSelection: selectedCards({
            root: activeRoot,
            topics: ["storage", "types"],
        }),
        reviewSelection: selectedCards({ root: activeRoot, topics: ["cache", "query"] }),
    });
    if (currentKnowledge.digest !== knowledgeDigest ||
        currentDigests.behaviorFixtureDigest !== proof.behaviorFixtureDigest ||
        currentDigests.codeFixtureDigest !== proof.codeFixtureDigest ||
        currentDigests.selectorEvaluatorDigest !== proof.selectorEvaluatorDigest ||
        currentDigests.releaseManifestDigest !== proof.releaseManifestDigest ||
        currentDigests.promptSchemaDigest !== proof.promptSchemaDigest ||
        proof.conditions.length !== conditionNames.length ||
        proof.conditions.some((condition) => condition.selectionDigest !== currentSelectionDigest)) {
        throw new Error("Knowledge behavior proof is stale for the current evaluator inputs");
    }
    if (stableJson(behaviorComparison({ conditions: proof.conditions })) !==
        stableJson(proof.comparison)) {
        throw new Error("Knowledge behavior comparison metrics do not match condition evidence");
    }
    const expectedModels = {
        planner: runtimeProfiles[profile].planner.model,
        implementer: runtimeProfiles[profile].implementer.model,
        reviewer: runtimeProfiles[profile].reviewer.model,
        planCritic: runtimeProfiles[profile].planCritic.model,
    };
    if (stableJson(expectedModels) !== stableJson(proof.runtime.requestedModels)) {
        throw new Error("Knowledge behavior proof is stale for the current runtime role models");
    }
    const configuredExecutable = resolveRuntimeExecutable(executable);
    if (configuredExecutable !== proof.runtime.executable) {
        throw new Error("Knowledge behavior proof belongs to a different runtime executable");
    }
    if (sha256(readFileSync(configuredExecutable)) !== proof.runtime.executableDigest) {
        throw new Error("Knowledge behavior runtime executable bytes changed since evaluation");
    }
    const promptSetDigest = digestValue(proof.invocations.map(({ id, promptDigest }) => ({ id, digest: promptDigest })));
    const invocationPlanMatches = invocationPlan.every((planned, index) => {
        const invocation = proof.invocations[index];
        return (invocation !== undefined &&
            invocation.id === planned.id &&
            invocation.role === planned.role &&
            invocation.lane === planned.lane &&
            invocation.responseDigest !== null);
    });
    if (promptSetDigest !== proof.promptSetDigest || !invocationPlanMatches) {
        throw new Error("Knowledge behavior proof is not bound to the complete prompt plan");
    }
    const evidenceDigest = proof.sourceProofDigest ?? proof.digest;
    const runRoot = findRunRoot({ directory: resolve(directory), digest: evidenceDigest });
    for (const invocation of proof.invocations) {
        const prompt = rawEvidence({ runRoot, id: invocation.id, kind: "prompts" });
        const response = rawEvidence({ runRoot, id: invocation.id, kind: "responses" });
        if (sha256(prompt) !== invocation.promptDigest ||
            sha256(response) !== invocation.responseDigest) {
            throw new Error(`Knowledge behavior raw evidence changed for ${invocation.id}`);
        }
    }
    const modelVerification = modelEvidence({ invocations: proof.invocations, expectedModels });
    if (!modelVerification.valid ||
        modelVerification.status !== proof.modelEvidenceStatus ||
        proof.runtime.nativeVersion === null) {
        throw new Error("Knowledge behavior proof lacks valid requested-model or session evidence");
    }
    const probe = await services.probe({
        profile,
        executable,
        cwd: activeRoot,
    });
    if (!probe.available || probe.version !== proof.runtime.nativeVersion) {
        throw new Error("Native runtime changed since knowledge behavior evaluation");
    }
    return { digest, semanticPassed: true, coverageStatus: "independent-audit-required" };
}
