import { z } from "zod";
import { type RuntimeProbe, type RuntimeProfile, type RuntimeResult, type StartRuntimeInput } from "../runtime/index.js";
declare const ProofSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    evaluationRevision: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>, z.ZodLiteral<5>, z.ZodLiteral<6>, z.ZodLiteral<7>]>>;
    rescoredAt: z.ZodOptional<z.ZodString>;
    previousReceiptDigest: z.ZodOptional<z.ZodString>;
    sourceProofDigest: z.ZodOptional<z.ZodString>;
    sourceSelectorEvaluatorDigest: z.ZodOptional<z.ZodString>;
    modelEvidenceStatus: z.ZodOptional<z.ZodEnum<{
        "actual-reported-and-matched": "actual-reported-and-matched";
        "partially-reported-all-matched": "partially-reported-all-matched";
        "requested-pinned-actual-unreported": "requested-pinned-actual-unreported";
    }>>;
    profile: z.ZodEnum<{
        "claude-code": "claude-code";
        codex: "codex";
        cursor: "cursor";
    }>;
    sourceRoot: z.ZodString;
    createdAt: z.ZodString;
    knowledgeDigest: z.ZodString;
    coverageStatus: z.ZodLiteral<"independent-audit-required">;
    behaviorFixtureDigest: z.ZodString;
    codeFixtureDigest: z.ZodString;
    selectorEvaluatorDigest: z.ZodString;
    releaseManifestDigest: z.ZodString;
    promptSchemaDigest: z.ZodString;
    promptSetDigest: z.ZodString;
    runtime: z.ZodObject<{
        executable: z.ZodString;
        executableDigest: z.ZodOptional<z.ZodString>;
        executableDigestEvidence: z.ZodOptional<z.ZodObject<{
            basis: z.ZodEnum<{
                "assessment-observation-with-preexisting-file-times": "assessment-observation-with-preexisting-file-times";
                "captured-before-and-after-invocations": "captured-before-and-after-invocations";
            }>;
            observedAt: z.ZodString;
            beforeObservedAt: z.ZodOptional<z.ZodString>;
            afterObservedAt: z.ZodOptional<z.ZodString>;
            fileMtimeMs: z.ZodNumber;
            fileCtimeMs: z.ZodNumber;
            earliestInvocationStartedAt: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        nativeVersion: z.ZodNullable<z.ZodString>;
        requestedModels: z.ZodObject<{
            planner: z.ZodString;
            implementer: z.ZodString;
            reviewer: z.ZodString;
            planCritic: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>;
    invocations: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        condition: z.ZodEnum<{
            baseline: "baseline";
            guided: "guided";
        }>;
        lane: z.ZodEnum<{
            decisions: "decisions";
            implementation: "implementation";
            review: "review";
            "semantic-judge": "semantic-judge";
        }>;
        role: z.ZodEnum<{
            implementer: "implementer";
            planCritic: "planCritic";
            planner: "planner";
            reviewer: "reviewer";
        }>;
        status: z.ZodEnum<{
            blocked: "blocked";
            cancelled: "cancelled";
            completed: "completed";
            failed: "failed";
            "timed-out": "timed-out";
        }>;
        requestedModel: z.ZodString;
        actualModel: z.ZodNullable<z.ZodString>;
        nativeSessionId: z.ZodNullable<z.ZodString>;
        promptDigest: z.ZodString;
        responseDigest: z.ZodNullable<z.ZodString>;
        latencyMs: z.ZodNumber;
        costUsd: z.ZodNull;
        costReason: z.ZodLiteral<"native-runtime-did-not-report-cost">;
        reason: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>>;
    conditions: z.ZodArray<z.ZodObject<{
        condition: z.ZodEnum<{
            baseline: "baseline";
            guided: "guided";
        }>;
        selectionDigest: z.ZodString;
        decisions: z.ZodObject<{
            passed: z.ZodBoolean;
            contractPassed: z.ZodOptional<z.ZodBoolean>;
            semanticDecisionPassed: z.ZodOptional<z.ZodBoolean>;
            rationalePassed: z.ZodOptional<z.ZodBoolean>;
            cardRoutingPassed: z.ZodOptional<z.ZodBoolean>;
            semanticDecisionsPassed: z.ZodOptional<z.ZodNumber>;
            semanticDecisionsTotal: z.ZodOptional<z.ZodNumber>;
            rationalesPassed: z.ZodOptional<z.ZodNumber>;
            rationalesTotal: z.ZodOptional<z.ZodNumber>;
            cardRoutingPassedCount: z.ZodOptional<z.ZodNumber>;
            cardRoutingTotal: z.ZodOptional<z.ZodNumber>;
            cases: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                passed: z.ZodBoolean;
                contractPassed: z.ZodOptional<z.ZodBoolean>;
                semanticDecisionPassed: z.ZodOptional<z.ZodBoolean>;
                rationalePassed: z.ZodOptional<z.ZodBoolean>;
                cardRoutingPassed: z.ZodOptional<z.ZodBoolean>;
                routingDiagnostics: z.ZodOptional<z.ZodArray<z.ZodString>>;
                errors: z.ZodArray<z.ZodString>;
            }, z.core.$strip>>;
        }, z.core.$strip>;
        implementation: z.ZodObject<{
            passed: z.ZodBoolean;
            changedFiles: z.ZodArray<z.ZodString>;
            protectedFilesUnchanged: z.ZodBoolean;
            sourceChanged: z.ZodBoolean;
            sourceBeforeDigest: z.ZodNullable<z.ZodString>;
            sourceAfterDigest: z.ZodNullable<z.ZodString>;
            diffDigest: z.ZodNullable<z.ZodString>;
            seedTest: z.ZodObject<{
                exitCode: z.ZodNullable<z.ZodNumber>;
                stdout: z.ZodString;
                stderr: z.ZodString;
            }, z.core.$strip>;
            finalTest: z.ZodObject<{
                exitCode: z.ZodNullable<z.ZodNumber>;
                stdout: z.ZodString;
                stderr: z.ZodString;
            }, z.core.$strip>;
        }, z.core.$strip>;
        review: z.ZodObject<{
            passed: z.ZodBoolean;
            errors: z.ZodArray<z.ZodString>;
        }, z.core.$strip>;
        semanticJudge: z.ZodObject<{
            passed: z.ZodBoolean;
            errors: z.ZodArray<z.ZodString>;
        }, z.core.$strip>;
        guidedConformancePassed: z.ZodOptional<z.ZodBoolean>;
        passed: z.ZodBoolean;
    }, z.core.$strip>>;
    comparison: z.ZodOptional<z.ZodObject<{
        baselineSemanticDecisionsPassed: z.ZodNumber;
        guidedSemanticDecisionsPassed: z.ZodNumber;
        semanticDecisionsTotal: z.ZodNumber;
        baselineRationalesPassed: z.ZodNumber;
        guidedRationalesPassed: z.ZodNumber;
        rationalesTotal: z.ZodNumber;
        baselineCardRoutingPassed: z.ZodNumber;
        guidedCardRoutingPassed: z.ZodNumber;
        cardRoutingTotal: z.ZodNumber;
        observedSemanticDelta: z.ZodNumber;
        observedCardRoutingDelta: z.ZodNumber;
        observedSemanticImprovement: z.ZodBoolean;
    }, z.core.$strip>>;
    guidedConformancePassed: z.ZodOptional<z.ZodBoolean>;
    semanticPassed: z.ZodBoolean;
    passed: z.ZodBoolean;
    failures: z.ZodArray<z.ZodString>;
    digest: z.ZodString;
}, z.core.$strip>;
type Proof = z.infer<typeof ProofSchema>;
export type BehaviorEvaluationServices = Readonly<{
    probe: (input: {
        profile: RuntimeProfile;
        executable: string;
        cwd: string;
    }) => Promise<RuntimeProbe>;
    start: (input: StartRuntimeInput) => Promise<RuntimeResult>;
}>;
export type RunBehaviorEvaluationInput = Readonly<{
    root: string;
    directory: string;
    executable: string;
    nodeExecutable: string;
    profile: RuntimeProfile;
    signal?: AbortSignal;
}>;
export declare function rescoreBehaviorEvaluation({ directory, root, profile, }: {
    directory: string;
    root: string;
    profile: RuntimeProfile;
}): Proof;
export declare function runBehaviorEvaluation(input: RunBehaviorEvaluationInput, services?: BehaviorEvaluationServices): Promise<Proof>;
export declare function readBehaviorEvaluation({ directory, knowledgeDigest, profile, currentRoot, executable, }: {
    directory: string;
    knowledgeDigest: string;
    profile: RuntimeProfile;
    currentRoot: string;
    executable: string;
}, services?: Pick<BehaviorEvaluationServices, "probe">): Promise<{
    digest: string;
    semanticPassed: true;
    coverageStatus: "independent-audit-required";
}>;
export {};
