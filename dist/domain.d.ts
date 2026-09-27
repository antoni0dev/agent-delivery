import { z } from "zod";
export declare const profiles: readonly ["codex", "claude-code", "cursor"];
export declare const roles: readonly ["planner", "planCritic", "implementer", "reviewer", "browserVerifier"];
export declare const states: readonly ["queued", "running", "waiting", "blocked", "completed", "cancelled"];
export declare const stages: readonly ["validate", "plan", "challenge", "approve-plan", "implement", "prepare-qa", "review", "verify", "merge", "accept"];
export type Profile = (typeof profiles)[number];
export type Role = (typeof roles)[number];
export type State = (typeof states)[number];
export type Stage = (typeof stages)[number];
export declare const MAX_INVOCATION_MS: number;
export declare const MAX_PLAN_ROUNDS = 2;
export declare const MAX_REPAIR_ROUNDS = 2;
export declare const MAX_NO_PROGRESS = 3;
export declare const commandSchema: z.ZodObject<{
    executable: z.ZodString;
    args: z.ZodArray<z.ZodString>;
}, z.core.$strict>;
export type Command = z.infer<typeof commandSchema>;
export declare const credentialSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    kind: z.ZodLiteral<"environment">;
    name: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    kind: z.ZodLiteral<"command">;
    command: z.ZodObject<{
        executable: z.ZodString;
        args: z.ZodArray<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>], "kind">;
export type CredentialReference = z.infer<typeof credentialSchema>;
export declare const bindingSchema: z.ZodObject<{
    planDigest: z.ZodString;
    knowledgeDigest: z.ZodString;
    configDigest: z.ZodString;
    head: z.ZodString;
    base: z.ZodString;
    environmentDigest: z.ZodString;
}, z.core.$strict>;
export type Binding = z.infer<typeof bindingSchema>;
export declare const requirementSchema: z.ZodObject<{
    id: z.ZodString;
    description: z.ZodString;
    kind: z.ZodEnum<{
        authenticated: "authenticated";
        browser: "browser";
        "code-review": "code-review";
        integration: "integration";
        "nonproduction-write": "nonproduction-write";
        "parent-acceptance": "parent-acceptance";
        static: "static";
        unit: "unit";
    }>;
    commandId: z.ZodNullable<z.ZodString>;
}, z.core.$strict>;
export type Requirement = z.infer<typeof requirementSchema>;
export declare const planSchema: z.ZodObject<{
    summary: z.ZodString;
    fullPlan: z.ZodString;
    sourceOfTruth: z.ZodString;
    boundaries: z.ZodArray<z.ZodString>;
    interfaces: z.ZodArray<z.ZodString>;
    decisions: z.ZodArray<z.ZodString>;
    nonGoals: z.ZodArray<z.ZodString>;
    topics: z.ZodArray<z.ZodString>;
    exceptions: z.ZodArray<z.ZodString>;
    requirements: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        description: z.ZodString;
        kind: z.ZodEnum<{
            authenticated: "authenticated";
            browser: "browser";
            "code-review": "code-review";
            integration: "integration";
            "nonproduction-write": "nonproduction-write";
            "parent-acceptance": "parent-acceptance";
            static: "static";
            unit: "unit";
        }>;
        commandId: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>>;
    children: z.ZodArray<z.ZodObject<{
        key: z.ZodString;
        title: z.ZodString;
        description: z.ZodString;
        dependencies: z.ZodArray<z.ZodString>;
        coupled: z.ZodBoolean;
    }, z.core.$strict>>;
    unresolvedDecisions: z.ZodArray<z.ZodString>;
    complexOrMoney: z.ZodBoolean;
}, z.core.$strict>;
export type Plan = z.infer<typeof planSchema>;
export declare const findingSchema: z.ZodObject<{
    impact: z.ZodEnum<{
        deferred: "deferred";
        "main-path": "main-path";
        money: "money";
    }>;
    blocking: z.ZodBoolean;
    summary: z.ZodString;
    evidence: z.ZodString;
}, z.core.$strict>;
export declare const reviewSchema: z.ZodObject<{
    summary: z.ZodString;
    findings: z.ZodArray<z.ZodObject<{
        impact: z.ZodEnum<{
            deferred: "deferred";
            "main-path": "main-path";
            money: "money";
        }>;
        blocking: z.ZodBoolean;
        summary: z.ZodString;
        evidence: z.ZodString;
    }, z.core.$strict>>;
    unresolvedDecisions: z.ZodArray<z.ZodString>;
}, z.core.$strict>;
export type Review = z.infer<typeof reviewSchema>;
export declare const issueSchema: z.ZodObject<{
    id: z.ZodString;
    identifier: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    teamId: z.ZodString;
    projectId: z.ZodNullable<z.ZodString>;
    assigneeId: z.ZodNullable<z.ZodString>;
    creatorId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    stateType: z.ZodOptional<z.ZodString>;
    labels: z.ZodArray<z.ZodString>;
    state: z.ZodString;
    url: z.ZodString;
}, z.core.$strict>;
export type Issue = z.infer<typeof issueSchema>;
export declare class DeliveryError extends Error {
    readonly code: string;
    constructor(message: string, code?: string);
}
export declare function ensurePresent<T>(value: T | null | undefined, message: string): T;
export declare function hasBlockingFindings(review: Review): boolean;
export declare function parseStructuredOutput(output: unknown): unknown;
