import { z } from "zod";
import { type Artifact } from "./artifacts.js";
import { type Binding, type Issue, type Profile, type Requirement, type Role, type Stage, type State } from "./domain.js";
declare const initiativeSchema: z.ZodObject<{
    id: z.ZodString;
    issue_id: z.ZodString;
    project_id: z.ZodString;
    parent_id: z.ZodNullable<z.ZodString>;
    owner_id: z.ZodString;
    profile: z.ZodEnum<{
        "claude-code": "claude-code";
        codex: "codex";
        cursor: "cursor";
    }>;
    state: z.ZodEnum<{
        blocked: "blocked";
        cancelled: "cancelled";
        completed: "completed";
        queued: "queued";
        running: "running";
        waiting: "waiting";
    }>;
    stage: z.ZodEnum<{
        accept: "accept";
        challenge: "challenge";
        implement: "implement";
        merge: "merge";
        plan: "plan";
        "prepare-qa": "prepare-qa";
        review: "review";
        validate: "validate";
        verify: "verify";
    }>;
    reason: z.ZodNullable<z.ZodString>;
    plan_digest: z.ZodNullable<z.ZodString>;
    accepted_plan_digest: z.ZodNullable<z.ZodString>;
    plan_rounds: z.ZodNumber;
    repair_rounds: z.ZodNumber;
    no_progress: z.ZodNumber;
    checkpoint: z.ZodString;
    issue_snapshot: z.ZodString;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, z.core.$strip>;
export type Initiative = z.infer<typeof initiativeSchema>;
declare const invocationSchema: z.ZodObject<{
    id: z.ZodString;
    initiative_id: z.ZodString;
    role: z.ZodEnum<{
        browserVerifier: "browserVerifier";
        implementer: "implementer";
        planCritic: "planCritic";
        planner: "planner";
        reviewer: "reviewer";
    }>;
    profile: z.ZodEnum<{
        "claude-code": "claude-code";
        codex: "codex";
        cursor: "cursor";
    }>;
    worktree: z.ZodString;
    status: z.ZodEnum<{
        blocked: "blocked";
        cancelled: "cancelled";
        completed: "completed";
        failed: "failed";
        running: "running";
        "timed-out": "timed-out";
    }>;
    pid: z.ZodNullable<z.ZodNumber>;
    process_start: z.ZodNullable<z.ZodString>;
    native_session: z.ZodNullable<z.ZodString>;
    requested_model: z.ZodString;
    actual_model: z.ZodNullable<z.ZodString>;
    started_at: z.ZodString;
    finished_at: z.ZodNullable<z.ZodString>;
    termination_confirmed: z.ZodNumber;
    result_path: z.ZodNullable<z.ZodString>;
    result_digest: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export type Invocation = z.infer<typeof invocationSchema>;
declare const evidenceSchema: z.ZodObject<{
    id: z.ZodString;
    initiative_id: z.ZodString;
    requirement_id: z.ZodString;
    kind: z.ZodString;
    sequence: z.ZodNumber;
    binding_digest: z.ZodString;
    binding: z.ZodString;
    producer_id: z.ZodString;
    status: z.ZodEnum<{
        failed: "failed";
        passed: "passed";
        pending: "pending";
    }>;
    artifact_path: z.ZodNullable<z.ZodString>;
    artifact_digest: z.ZodNullable<z.ZodString>;
    started_at: z.ZodString;
    completed_at: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export type Evidence = z.infer<typeof evidenceSchema>;
declare const operationSchema: z.ZodObject<{
    key: z.ZodString;
    intent_digest: z.ZodString;
    status: z.ZodEnum<{
        confirmed: "confirmed";
        dispatched: "dispatched";
        pending: "pending";
        uncertain: "uncertain";
    }>;
    remote_id: z.ZodNullable<z.ZodString>;
    payload: z.ZodString;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, z.core.$strip>;
export type Operation = z.infer<typeof operationSchema>;
declare const settingsSchema: z.ZodObject<{
    workspace_id: z.ZodString;
    host_id: z.ZodNullable<z.ZodString>;
    active: z.ZodNumber;
    config_digest: z.ZodNullable<z.ZodString>;
    profile: z.ZodNullable<z.ZodEnum<{
        "claude-code": "claude-code";
        codex: "codex";
        cursor: "cursor";
    }>>;
    conformance_digest: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export declare class Store {
    private readonly options;
    private readonly db;
    constructor(options: {
        path: string;
        workspaceId: string;
        maxInitiatives?: number;
        maxWriters?: number;
    });
    close(): void;
    bindDestination({ tracker, organization, projects, }: {
        tracker: string;
        organization: string;
        projects: Array<{
            id: string;
            repository: string;
        }>;
    }): void;
    acquireController(hostId: string): void;
    releaseController(): void;
    backup(path: string): Promise<void>;
    settings(): z.infer<typeof settingsSchema>;
    activate(input: {
        hostId: string;
        configDigest: string;
        profile: Profile;
        conformanceDigest: string;
    }): void;
    assertActive(input: {
        hostId: string;
        configDigest: string;
    }): void;
    pause(): void;
    transferHost(input: {
        oldHostId: string;
        newHostId: string;
    }): void;
    list(): Initiative[];
    get(id: string): Initiative;
    findByIssue(issueId: string): Initiative | null;
    claim(input: {
        issue: Issue;
        projectId: string;
        profile: Profile;
        parentId?: string;
    }): Initiative;
    isManual(issueId: string): boolean;
    hasManualOwner(id: string): boolean;
    reserveManual(input: {
        issueId: string;
        projectId: string;
        identifier?: string;
    }): void;
    releaseManual(input: {
        issueId: string;
        projectId: string;
    }): void;
    observeIntake(input: {
        scope: string;
        issues: Issue[];
        assigneeId: string;
    }): string[];
    claimActive(input: {
        issue: Issue;
        projectId: string;
        profile: Profile;
        activation: {
            hostId: string;
            configDigest: string;
        };
    }): Initiative;
    update(input: {
        id: string;
        state: State;
        stage: Stage;
        reason: string | null;
        checkpoint?: unknown;
    }): void;
    recordPlan(input: {
        id: string;
        digest: string;
    }): void;
    acceptPlan(input: {
        id: string;
        digest: string;
    }): void;
    repair(id: string): void;
    progress(input: {
        id: string;
        changed: boolean;
    }): void;
    runningInvocations(): Invocation[];
    invocation(id: string): Invocation;
    beginInvocation(input: {
        id: string;
        initiativeId: string;
        role: Role;
        worktree: string;
        model: string;
    }): Invocation;
    started(input: {
        id: string;
        pid: number;
    }): void;
    finishInvocation(input: {
        id: string;
        status: Exclude<Invocation["status"], "running">;
        nativeSessionId: string | null;
        actualModel: string | null;
        result: Artifact;
        terminationConfirmed: boolean;
    }): void;
    reserveHeavy(invocationId: string): void;
    hasCancellationFence(id: string): boolean;
    dispatchMerge({ key, initiativeId }: {
        key: string;
        initiativeId: string;
    }): void;
    cancel(id: string): Invocation[];
    replan({ id, issue, checkpoint }: {
        id: string;
        issue: Issue;
        checkpoint: unknown;
    }): void;
    handoff(input: {
        id: string;
        previousOwner: string;
        newOwner: string;
        profile: Profile;
        checkpoint: unknown;
    }): void;
    beginEvidence(input: {
        initiativeId: string;
        requirement: Requirement;
        binding: Binding;
        producerId: string;
    }): Evidence;
    evidence(id: string): Evidence;
    private assertIndependent;
    finishEvidence(input: {
        id: string;
        passed: boolean;
        artifact: Artifact;
    }): void;
    readiness(input: {
        initiativeId: string;
        requirements: Requirement[];
        binding: Binding;
        maxAgeMs: number;
        now?: number;
    }): {
        passed: boolean;
        failures: string[];
    };
    beginOperation(input: {
        key: string;
        payload: unknown;
    }): Operation;
    operation(key: string): Operation | null;
    uncertainOperation(key: string): void;
    dispatchOperation(key: string): void;
    confirmOperation(input: {
        key: string;
        remoteId: string;
    }): void;
    event(input: {
        initiativeId: string | null;
        kind: string;
        detail: unknown;
    }): void;
}
export {};
