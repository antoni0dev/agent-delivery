import { runCommand } from "./commands.js";
import { type Project, type WorkspaceConfig } from "./config.js";
import { readConformance } from "./conformance.js";
import { type Profile } from "./domain.js";
import * as gitServices from "./git.js";
import { acquireExecutionLock } from "./host/execution-lock.js";
import { notifyDesktop } from "./host/notification.js";
import { createGithubAdapter, createLinearAdapter } from "./integrations/index.js";
import { readKnowledgeEligibility } from "./knowledge/eligibility.js";
import { loadKnowledge, selectKnowledge } from "./knowledge/index.js";
import { readBehaviorEvaluation } from "./knowledge/model-evaluation.js";
import { startRuntime } from "./runtime/index.js";
import type { Store } from "./store.js";
type LinearPort = ReturnType<typeof createLinearAdapter>;
type GithubPort = ReturnType<typeof createGithubAdapter>;
export type ControllerServices = {
    runtime: typeof startRuntime;
    command: typeof runCommand;
    git: typeof gitServices;
    linear: (project: Project) => LinearPort;
    github: (project: Project) => GithubPort;
    knowledge: {
        load: typeof loadKnowledge;
        select: typeof selectKnowledge;
    };
    conformance: typeof readConformance;
    acquireHeavy: typeof acquireExecutionLock;
    knowledgeEligibility: typeof readKnowledgeEligibility;
    behavior: typeof readBehaviorEvaluation;
    desktop: typeof notifyDesktop;
};
export declare class Controller {
    private readonly input;
    private readonly services;
    private readonly intakeIntervalMs;
    private readonly heavyLocks;
    private readonly abortControllers;
    constructor(input: {
        config: WorkspaceConfig;
        store: Store;
        hostId: string;
        services?: Partial<ControllerServices>;
        intakeIntervalMs?: number;
    });
    private runtimeCredential;
    private project;
    private transition;
    private artifact;
    private plan;
    private assertPacket;
    private binding;
    private assertAdmission;
    private invoke;
    doctor({ live }?: {
        live?: boolean;
    }): Promise<unknown>;
    conform({ profile }: {
        profile: Profile;
    }): Promise<unknown>;
    activate(): Promise<unknown>;
    status(): unknown;
    pause(): void;
    replan(id: string): Promise<void>;
    resume(id: string): void;
    manual(input: {
        issueId: string;
        projectId: string;
        action: "reserve" | "release";
    }): Promise<unknown>;
    cancel(id: string): Promise<unknown>;
    handoff({ id, newOwner, profile, }: {
        id: string;
        newOwner: string;
        profile: Profile;
    }): Promise<unknown>;
    manage(input: {
        issueId: string;
        projectId: string;
        profile?: Profile;
    }): Promise<unknown>;
    approvePlan(input: {
        id: string;
        digest: string;
    }): void;
    run({ issueId, projectId, profile, humanApproval, }: {
        humanApproval?: "required";
        issueId: string;
        projectId: string;
        profile: Profile;
    }): Promise<unknown>;
    tick(): Promise<unknown>;
    private refreshIntake;
    private runnable;
    private taskSignature;
    private dispatchRunnable;
    private waitForDrainEvent;
    private drain;
    private advance;
    private reconcileCancelledMerges;
    private recover;
    private validate;
    private planTask;
    private approvalContext;
    private assertApprovalContext;
    private challenge;
    private dispatchPlan;
    private implement;
    private prepareQa;
    private publishCandidate;
    private review;
    private verify;
    private merge;
    private accept;
    private recordApprovalNotification;
    private notifyDecision;
    private notifyCompletion;
}
export {};
