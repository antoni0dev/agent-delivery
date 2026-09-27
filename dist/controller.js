import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { z } from "zod";
import { readArtifact, writeArtifact } from "./artifacts.js";
import { runCommand } from "./commands.js";
import { configDigest, credentialValue, environmentDigest, readProjectInstructions, } from "./config.js";
import { readConformance, runConformance } from "./conformance.js";
import { bindingSchema, DeliveryError, ensurePresent, hasBlockingFindings, issueSchema, parseStructuredOutput, planSchema, reviewSchema, } from "./domain.js";
import * as gitServices from "./git.js";
import { acquireExecutionLock } from "./host/execution-lock.js";
import { notifyDesktop } from "./host/notification.js";
import { createGithubAdapter, createLinearAdapter } from "./integrations/index.js";
import { readKnowledgeEligibility } from "./knowledge/eligibility.js";
import { loadKnowledge, selectKnowledge } from "./knowledge/index.js";
import { readBehaviorEvaluation } from "./knowledge/model-evaluation.js";
import { reconcileOperation } from "./operations.js";
import { terminateRecordedProcess } from "./process-identity.js";
import { cancelRuntime, probeRuntime, selectRuntimeRole, startRuntime, } from "./runtime/index.js";
import { processGroupAlive } from "./runtime/process.js";
import { journeyReportSchema, verifyJourneys } from "./verification.js";
const implementationResultSchema = z
    .object({ summary: z.string().min(1).nullable(), blocked: z.string().min(1).nullable() })
    .strict()
    .refine((result) => Number(result.summary !== null) + Number(result.blocked !== null) === 1, "Return exactly one summary or blocker");
const outputSchemas = {
    planner: planSchema,
    planCritic: reviewSchema,
    implementer: implementationResultSchema,
    reviewer: reviewSchema,
    browserVerifier: reviewSchema,
};
const artifactSchema = z.object({ path: z.string(), digest: z.string() });
const checkpointSchema = z
    .object({
    worktree: z.string().optional(),
    branch: z.string().optional(),
    plan: artifactSchema.optional(),
    packet: artifactSchema.optional(),
    pr: z.number().optional(),
    parentAcceptance: z.boolean().optional(),
    managedByParent: z.boolean().optional(),
    children: z
        .array(z.object({
        key: z.string(),
        issueId: z.string(),
        initiativeId: z.string().nullable(),
        dependencies: z.array(z.string()),
    }))
        .optional(),
    dependencies: z.array(z.string()).optional(),
    critique: z.unknown().optional(),
    reviewerRun: z.string().optional(),
    verifierRun: z.string().optional(),
    binding: z.unknown().optional(),
    mergedCommit: z.string().optional(),
    notified: z.boolean().optional(),
    desktopNotified: z.boolean().optional(),
    waitingNotice: z.string().optional(),
})
    .strict();
const DEFAULT_INTAKE_INTERVAL_MS = 5 * 60 * 1000;
function checkpoint(task) {
    return checkpointSchema.parse(JSON.parse(task.checkpoint));
}
function eligible({ issue, project, config, }) {
    return (issue.assigneeId === config.linear.assigneeId &&
        project.teamIds.includes(issue.teamId) &&
        (project.projectIds.length === 0 ||
            (issue.projectId !== null && project.projectIds.includes(issue.projectId))) &&
        (config.linear.intake?.mode === "private" || issue.labels.includes(config.linear.readyLabel)) &&
        !["completed", "canceled", "cancelled"].includes((issue.stateType ?? issue.state).toLowerCase()));
}
export class Controller {
    input;
    services;
    intakeIntervalMs;
    heavyLocks = new Map();
    abortControllers = new Map();
    constructor(input) {
        this.input = input;
        this.intakeIntervalMs = input.intakeIntervalMs ?? DEFAULT_INTAKE_INTERVAL_MS;
        if (!Number.isFinite(this.intakeIntervalMs) || this.intakeIntervalMs <= 0)
            throw new DeliveryError("Intake interval must be a positive finite duration");
        const organizations = [
            ...new Set(input.config.projects.map((project) => ensurePresent(project.repository.split("/")[0], "Missing repository organization").toLowerCase())),
        ];
        if (organizations.length !== 1)
            throw new DeliveryError("A workspace cannot mix repository organizations");
        input.store.bindDestination({
            tracker: input.config.linear.workspaceId,
            organization: ensurePresent(organizations[0], "Missing organization"),
            projects: input.config.projects.map(({ id, repository }) => ({
                id,
                repository: repository.toLowerCase(),
            })),
        });
        this.services = {
            runtime: startRuntime,
            command: runCommand,
            git: gitServices,
            linear: (project) => {
                gitServices.assertRepository(project);
                return createLinearAdapter({ config: input.config, project });
            },
            github: (project) => {
                gitServices.assertRepository(project);
                return createGithubAdapter({ config: input.config, project });
            },
            knowledge: { load: loadKnowledge, select: selectKnowledge },
            conformance: readConformance,
            acquireHeavy: acquireExecutionLock,
            knowledgeEligibility: readKnowledgeEligibility,
            behavior: readBehaviorEvaluation,
            desktop: notifyDesktop,
            ...input.services,
        };
    }
    runtimeCredential(profile) {
        const reference = this.input.config.runtimeCredentials?.cursor;
        if (profile !== "cursor" || reference === undefined)
            return {};
        return {
            cursorApiKey: credentialValue({
                reference,
                cwd: ensurePresent(this.input.config.projects[0], "Missing configured project").root,
            }),
        };
    }
    project(task) {
        return ensurePresent(this.input.config.projects.find((project) => project.id === task.project_id), "Initiative project is not configured");
    }
    transition(task, stage, value, state = "queued", reason = null) {
        if (this.input.store.get(task.id).owner_id !== task.owner_id)
            throw new DeliveryError("Initiative ownership changed; stale context cannot advance it");
        this.input.store.update({ id: task.id, state, stage, reason, checkpoint: value });
    }
    artifact(content) {
        return writeArtifact({
            directory: join(this.input.config.stateDirectory, "artifacts"),
            content: JSON.stringify(content),
        });
    }
    plan(value) {
        return planSchema.parse(JSON.parse(readArtifact(ensurePresent(value.plan, "Missing planned artifact"))));
    }
    assertPacket(task, value) {
        const packet = z
            .object({
            knowledge: z.object({ releaseDigest: z.string() }),
            configDigest: z.string(),
            instructionsDigest: z.string(),
        })
            .passthrough()
            .parse(JSON.parse(readArtifact(ensurePresent(value.packet, "Missing frozen packet"))));
        const knowledge = this.services.knowledge.load({ root: this.input.config.knowledgeRoot });
        if (!knowledge.complete ||
            packet.knowledge.releaseDigest !== knowledge.digest ||
            packet.configDigest !== configDigest(this.input.config) ||
            packet.instructionsDigest !==
                this.artifact(readProjectInstructions(this.project(task))).digest)
            throw new DeliveryError("Frozen guidance or configuration changed; a revised accepted plan is required");
    }
    binding(task, value) {
        const project = this.project(task);
        const candidate = this.services.git.candidate({
            cwd: ensurePresent(value.worktree, "Missing worktree"),
            project,
        });
        return {
            planDigest: ensurePresent(task.accepted_plan_digest, "Missing accepted plan"),
            knowledgeDigest: this.services.knowledge.load({ root: this.input.config.knowledgeRoot })
                .digest,
            configDigest: configDigest(this.input.config),
            head: candidate.head,
            base: candidate.base,
            environmentDigest: environmentDigest(project),
        };
    }
    async assertAdmission(task) {
        if (this.input.store.hasCancellationFence(task.id) &&
            task.stage !== "merge" &&
            task.stage !== "accept")
            throw new DeliveryError("Cancellation was requested; only merge reconciliation is permitted");
        this.input.store.assertActive({
            hostId: this.input.hostId,
            configDigest: configDigest(this.input.config),
        });
        const current = this.input.store.get(task.id);
        if (current.owner_id !== task.owner_id)
            throw new DeliveryError("Stale owner cannot dispatch delivery actions");
        if (current.state === "cancelled" || current.state === "blocked")
            throw new DeliveryError("Initiative no longer admitted");
        const project = this.project(task);
        const issue = await this.services.linear(project).getIssue(task.issue_id);
        const finishing = task.stage === "accept" &&
            checkpoint(task).mergedCommit !== undefined &&
            issue.assigneeId === this.input.config.linear.assigneeId &&
            project.teamIds.includes(issue.teamId);
        if (this.input.store.hasManualOwner(task.id) ||
            (!finishing && !eligible({ issue, project, config: this.input.config }))) {
            await this.cancel(task.id);
            throw new DeliveryError("Issue admission was withdrawn");
        }
        if (task.parent_id !== null &&
            this.input.store.get(task.parent_id).state === "cancelled" &&
            !(["merge", "accept"].includes(task.stage) && this.input.store.hasCancellationFence(task.id)))
            throw new DeliveryError("Parent initiative was cancelled");
        const original = JSON.parse(task.issue_snapshot);
        if (original.title !== issue.title || original.description !== issue.description)
            throw new DeliveryError("Issue scope changed after admission; refresh the accepted request before resuming");
        return issue;
    }
    async invoke({ task, value, role, prompt, complexOrMoney = false, onAssigned, }) {
        this.services.knowledgeEligibility({ root: this.input.config.knowledgeRoot });
        const knowledge = this.services.knowledge.load({ root: this.input.config.knowledgeRoot });
        if (!knowledge.complete)
            throw new DeliveryError("The active knowledge release lacks source coverage approval");
        try {
            await this.services.behavior({
                currentRoot: this.input.config.knowledgeRoot,
                executable: this.input.config.runtimes[task.profile],
                directory: join(this.input.config.stateDirectory, "behavior"),
                profile: task.profile,
                knowledgeDigest: knowledge.digest,
            });
        }
        catch {
            throw new DeliveryError("The selected runtime knowledge evaluation is missing, failed or stale", "capability");
        }
        await this.services.conformance({
            directory: join(this.input.config.stateDirectory, "conformance"),
            profile: task.profile,
            executable: this.input.config.runtimes[task.profile],
            hostId: this.input.hostId,
        });
        const id = randomUUID();
        const cwd = ensurePresent(value.worktree, "Invocation requires an isolated worktree");
        const model = selectRuntimeRole({ profile: task.profile, role, complexOrMoney }).model;
        this.input.store.beginInvocation({ id, initiativeId: task.id, role, worktree: cwd, model });
        const abort = new AbortController();
        this.abortControllers.set(id, abort);
        const deadline = setTimeout(() => abort.abort(), 60 * 60 * 1000);
        deadline.unref();
        const cancelled = setInterval(() => {
            if (["cancelled", "blocked"].includes(this.input.store.get(task.id).state))
                abort.abort();
        }, 1000);
        cancelled.unref();
        let result;
        let heavy;
        try {
            if (role === "browserVerifier") {
                heavy = this.services.acquireHeavy({ token: id });
                this.input.store.reserveHeavy(id);
                this.heavyLocks.set(id, heavy);
            }
            onAssigned?.(id);
            const preparation = this.project(task).preparation;
            if (preparation !== undefined && (role === "implementer" || role === "browserVerifier")) {
                const preparationLock = heavy ?? this.services.acquireHeavy({ token: id });
                try {
                    const prepared = await this.services.command({
                        command: preparation,
                        cwd,
                        artifactDirectory: join(this.input.config.stateDirectory, "preparation", task.id, id),
                        requireStructuredReport: false,
                        signal: abort.signal,
                        onStarted: (pid) => {
                            this.input.store.started({ id, pid });
                            preparationLock.started(pid);
                        },
                    });
                    if (!prepared.passed)
                        throw new DeliveryError("Workspace preparation failed; restore the configured setup command before resuming");
                }
                finally {
                    if (heavy === undefined)
                        preparationLock.release();
                }
            }
            const resolvedPrompt = typeof prompt === "string" ? prompt : await prompt({ id, signal: abort.signal });
            const selectedRole = selectRuntimeRole({ profile: task.profile, role, complexOrMoney });
            this.input.store.event({
                initiativeId: task.id,
                kind: "invocation-issued",
                detail: {
                    id,
                    role,
                    configuration: configDigest(this.input.config),
                    packet: this.artifact({
                        cwd,
                        prompt: resolvedPrompt,
                        selectedRole,
                        profile: task.profile,
                    }),
                },
            });
            result = await this.services.runtime({
                profile: task.profile,
                role,
                ...this.runtimeCredential(task.profile),
                executable: this.input.config.runtimes[task.profile],
                cwd,
                prompt: resolvedPrompt,
                outputSchema: z.toJSONSchema(outputSchemas[role]),
                invocationId: id,
                artifactDirectory: join(this.input.config.stateDirectory, "runtime"),
                complexOrMoney,
                signal: abort.signal,
                onStarted: (pid) => {
                    this.input.store.started({ id, pid });
                    heavy?.started(pid);
                },
            });
        }
        catch (error) {
            const artifact = this.artifact({ error: "Runtime invocation could not complete" });
            if (this.input.store.invocation(id).termination_confirmed === 0)
                this.input.store.finishInvocation({
                    id,
                    status: "failed",
                    nativeSessionId: null,
                    actualModel: null,
                    result: artifact,
                    terminationConfirmed: this.input.store.invocation(id).pid === null ||
                        !processGroupAlive(ensurePresent(this.input.store.invocation(id).pid, "Missing invocation process")),
                });
            throw error;
        }
        finally {
            clearTimeout(deadline);
            clearInterval(cancelled);
            this.abortControllers.delete(id);
            this.heavyLocks.delete(id);
            heavy?.release();
        }
        const artifact = this.artifact(result);
        if (this.input.store.invocation(id).termination_confirmed === 0)
            this.input.store.finishInvocation({
                id,
                status: result.status,
                nativeSessionId: result.nativeSessionId,
                actualModel: result.actualModel,
                result: artifact,
                terminationConfirmed: result.pid === null || !processGroupAlive(result.pid),
            });
        if (result.pid !== null && processGroupAlive(result.pid))
            throw new DeliveryError("Native process group has not terminated; ownership retained");
        if (result.status !== "completed")
            throw new DeliveryError(result.reason ?? "Runtime did not complete", result.status);
        return { id, result, artifact };
    }
    async doctor({ live = false } = {}) {
        const runtime = await probeRuntime({
            profile: this.input.config.intakeRuntimeProfile,
            executable: this.input.config.runtimes[this.input.config.intakeRuntimeProfile],
            cwd: this.input.config.projects[0]?.root ?? process.cwd(),
        });
        const knowledge = this.services.knowledge.load({ root: this.input.config.knowledgeRoot });
        const projects = [];
        for (const project of this.input.config.projects) {
            this.services.git.assertRepository(project);
            this.services.git.assertIdentity(project);
            if (live) {
                await this.services.linear(project).verifyIdentity();
                await this.services.github(project).verifyIdentity();
            }
            projects.push({ id: project.id, verifiedRemote: true, liveIdentity: live });
        }
        let sourceEligibility = {
            status: "approved",
            reason: null,
        };
        try {
            this.services.knowledgeEligibility({ root: this.input.config.knowledgeRoot });
        }
        catch (error) {
            sourceEligibility = {
                status: "blocked",
                reason: error instanceof DeliveryError ? error.message : "Source eligibility proof is invalid",
            };
        }
        return {
            runtime,
            sourceEligibility,
            knowledge: {
                complete: knowledge.complete,
                digest: knowledge.digest,
                coverage: knowledge.coverage,
            },
            projects,
            active: this.input.store.settings().active === 1,
        };
    }
    async conform({ profile }) {
        return runConformance({
            profile,
            executable: this.input.config.runtimes[profile],
            directory: join(this.input.config.stateDirectory, "conformance"),
            hostId: this.input.hostId,
            ...this.runtimeCredential(profile),
        });
    }
    async activate() {
        if (this.input.store.runningInvocations().length > 0)
            throw new DeliveryError("Active executions must drain before activation changes");
        await this.doctor({ live: true });
        const config = this.input.config;
        if (!this.services.knowledge.load({ root: config.knowledgeRoot }).complete)
            throw new DeliveryError("Knowledge release requires completed independent coverage approval");
        this.services.knowledgeEligibility({ root: config.knowledgeRoot });
        await this.services.behavior({
            currentRoot: this.input.config.knowledgeRoot,
            directory: join(config.stateDirectory, "behavior"),
            executable: config.runtimes[config.intakeRuntimeProfile],
            profile: config.intakeRuntimeProfile,
            knowledgeDigest: this.services.knowledge.load({ root: config.knowledgeRoot }).digest,
        });
        const proof = await this.services.conformance({
            directory: join(config.stateDirectory, "conformance"),
            profile: config.intakeRuntimeProfile,
            executable: config.runtimes[config.intakeRuntimeProfile],
            hostId: this.input.hostId,
        });
        if (!config.authority.updateOwnedIssues ||
            !config.authority.pushFeatureBranches ||
            !config.authority.openPullRequests ||
            !config.authority.mergeDevelopment)
            throw new DeliveryError("Required destination standing authority is incomplete");
        this.input.store.activate({
            hostId: this.input.hostId,
            profile: config.intakeRuntimeProfile,
            configDigest: configDigest(config),
            conformanceDigest: proof.digest,
        });
        return { active: true, profile: config.intakeRuntimeProfile };
    }
    status() {
        return {
            workspaceId: this.input.config.workspaceId,
            settings: this.input.store.settings(),
            initiatives: this.input.store
                .list()
                .map(({ id, issue_id, project_id, parent_id, profile, state, stage, reason }) => ({
                id,
                issueId: issue_id,
                projectId: project_id,
                parentId: parent_id,
                profile,
                state,
                stage,
                reason,
            })),
            invocations: this.input.store.runningInvocations(),
        };
    }
    pause() {
        this.input.store.pause();
    }
    async replan(id) {
        const task = this.input.store.get(id);
        const issue = await this.services.linear(this.project(task)).getIssue(task.issue_id);
        if (!eligible({ issue, project: this.project(task), config: this.input.config }))
            throw new DeliveryError("Revised issue is outside admitted scope");
        const value = checkpoint(task);
        this.input.store.replan({
            id,
            issue,
            checkpoint: {
                ...(value.worktree === undefined ? {} : { worktree: value.worktree }),
                ...(value.branch === undefined ? {} : { branch: value.branch }),
                ...(value.pr === undefined ? {} : { pr: value.pr }),
                ...(value.children === undefined ? {} : { children: value.children }),
            },
        });
    }
    resume(id) {
        const task = this.input.store.get(id);
        if (task.state !== "blocked" && task.state !== "waiting")
            throw new DeliveryError("Only blocked or waiting work can resume");
        if (this.input.store.runningInvocations().some((run) => run.initiative_id === id))
            throw new DeliveryError("A prior invocation still owns this initiative");
        this.transition(task, task.stage, checkpoint(task));
    }
    async manual(input) {
        const project = ensurePresent(this.input.config.projects.find((project) => project.id === input.projectId), "Unknown configured project");
        if (input.action === "release") {
            this.input.store.releaseManual({ issueId: input.issueId, projectId: project.id });
            return { issueId: input.issueId, manual: false, resumed: false };
        }
        const issue = await this.services.linear(project).getIssue(input.issueId);
        if (issue.assigneeId !== this.input.config.linear.assigneeId ||
            !project.teamIds.includes(issue.teamId) ||
            (project.projectIds.length > 0 &&
                (issue.projectId === null || !project.projectIds.includes(issue.projectId))))
            throw new DeliveryError("Manual reservation is outside configured scope");
        this.input.store.reserveManual({
            issueId: issue.id,
            projectId: project.id,
            identifier: issue.identifier,
        });
        const task = this.input.store.findByIssue(issue.id);
        if (task !== null && !["completed", "cancelled"].includes(task.state))
            await this.cancel(task.id);
        const running = this.input.store
            .runningInvocations()
            .filter((run) => task !== null && this.input.store.get(run.initiative_id).owner_id === task.owner_id);
        if (running.length > 0)
            throw new DeliveryError("Manual reservation saved; prior execution has not confirmed termination. Do not edit its worktree yet.");
        return { issueId: issue.id, manual: true };
    }
    async cancel(id) {
        const task = this.input.store.get(id);
        const value = checkpoint(task);
        const runs = this.input.store.cancel(id);
        for (const run of runs) {
            this.abortControllers.get(run.id)?.abort();
            if (run.pid !== null) {
                const confirmed = (await cancelRuntime({ pid: run.pid })) ||
                    (await terminateRecordedProcess({ pid: run.pid, identity: run.process_start }));
                if (confirmed &&
                    this.input.store.invocation(run.id).termination_confirmed === 0 &&
                    this.abortControllers.get(run.id) === undefined)
                    this.input.store.finishInvocation({
                        id: run.id,
                        status: "cancelled",
                        nativeSessionId: run.native_session,
                        actualModel: run.actual_model,
                        result: this.artifact({ cancelled: true }),
                        terminationConfirmed: true,
                    });
            }
        }
        if (value.pr !== undefined)
            await this.services.github(this.project(task)).disableAutoMerge({ number: value.pr });
        return { cancelled: true, running: runs.length };
    }
    async handoff({ id, newOwner, profile, }) {
        const task = this.input.store.get(id);
        await this.services.conformance({
            directory: join(this.input.config.stateDirectory, "conformance"),
            profile,
            executable: this.input.config.runtimes[profile],
            hostId: this.input.hostId,
        });
        await this.services.behavior({
            currentRoot: this.input.config.knowledgeRoot,
            directory: join(this.input.config.stateDirectory, "behavior"),
            executable: this.input.config.runtimes[profile],
            profile,
            knowledgeDigest: this.services.knowledge.load({ root: this.input.config.knowledgeRoot })
                .digest,
        });
        const family = this.input.store
            .list()
            .filter((entry) => (entry.id === id || entry.parent_id === id) &&
            !["completed", "cancelled"].includes(entry.state));
        for (const entry of family)
            this.transition(entry, entry.stage, checkpoint(entry), "blocked", "Handoff is stopping prior executions");
        const ids = new Set(family.map((entry) => entry.id));
        for (const run of this.input.store
            .runningInvocations()
            .filter((entry) => ids.has(entry.initiative_id))) {
            this.abortControllers.get(run.id)?.abort();
            if (run.pid === null)
                throw new DeliveryError("Handoff awaits confirmation of an unstarted or orphan invocation");
            const stopped = (await cancelRuntime({ pid: run.pid })) ||
                (await terminateRecordedProcess({ pid: run.pid, identity: run.process_start }));
            if (!stopped)
                throw new DeliveryError("Handoff could not confirm prior process termination");
            if (this.input.store.invocation(run.id).termination_confirmed === 0)
                this.input.store.finishInvocation({
                    id: run.id,
                    status: "cancelled",
                    nativeSessionId: run.native_session,
                    actualModel: run.actual_model,
                    result: this.artifact({ handoff: true }),
                    terminationConfirmed: true,
                });
        }
        this.input.store.handoff({
            id,
            previousOwner: task.owner_id,
            newOwner,
            profile,
            checkpoint: checkpoint(this.input.store.get(id)),
        });
        for (const entry of family) {
            const current = this.input.store.get(entry.id);
            this.transition(current, current.stage, checkpoint(current), checkpoint(current).managedByParent === true ? "waiting" : "queued");
        }
        return { id, owner: newOwner, profile };
    }
    async run({ issueId, projectId, profile, }) {
        this.input.store.assertActive({
            hostId: this.input.hostId,
            configDigest: configDigest(this.input.config),
        });
        const project = ensurePresent(this.input.config.projects.find((project) => project.id === projectId), "Unknown configured project");
        const selected = profile;
        await this.services.conformance({
            directory: join(this.input.config.stateDirectory, "conformance"),
            profile: selected,
            executable: this.input.config.runtimes[selected],
            hostId: this.input.hostId,
        });
        await this.services.behavior({
            currentRoot: this.input.config.knowledgeRoot,
            directory: join(this.input.config.stateDirectory, "behavior"),
            executable: this.input.config.runtimes[selected],
            profile: selected,
            knowledgeDigest: this.services.knowledge.load({ root: this.input.config.knowledgeRoot })
                .digest,
        });
        const issue = await this.services.linear(project).getIssue(issueId);
        if (!eligible({ issue, project, config: this.input.config }))
            throw new DeliveryError("Issue is outside admitted scope");
        const task = this.input.store.claimActive({
            issue,
            projectId,
            profile: selected,
            activation: {
                hostId: this.input.hostId,
                configDigest: configDigest(this.input.config),
            },
        });
        try {
            this.input.store.acquireController(this.input.hostId);
        }
        catch (error) {
            if (error instanceof DeliveryError && error.code === "capacity")
                return this.input.store.get(task.id);
            throw error;
        }
        try {
            this.input.store.assertActive({
                hostId: this.input.hostId,
                configDigest: configDigest(this.input.config),
            });
            await this.drain();
            return this.input.store.get(task.id);
        }
        finally {
            this.input.store.releaseController();
        }
    }
    async tick() {
        this.input.store.acquireController(this.input.hostId);
        try {
            this.input.store.assertActive({
                hostId: this.input.hostId,
                configDigest: configDigest(this.input.config),
            });
            await this.recover();
            await this.reconcileCancelledMerges();
            for (const task of this.input.store
                .list()
                .filter((task) => task.state === "completed" && checkpoint(task).notified !== true))
                await this.notifyCompletion(task, checkpoint(task));
            await this.refreshIntake();
            await this.drain();
            return this.status();
        }
        finally {
            this.input.store.releaseController();
        }
    }
    async refreshIntake() {
        this.input.store.assertActive({
            hostId: this.input.hostId,
            configDigest: configDigest(this.input.config),
        });
        const discovered = new Map();
        const scans = [];
        for (const project of this.input.config.projects) {
            const issues = await this.services.linear(project).listEligible();
            for (const issue of issues) {
                const prior = discovered.get(issue.id);
                if (prior !== undefined && prior !== project.id)
                    throw new DeliveryError("Issue matches more than one repository; refine intake scope");
                discovered.set(issue.id, project.id);
            }
            scans.push({ project, issues });
        }
        for (const { project, issues } of scans) {
            const privateIntake = this.input.config.linear.intake?.mode === "private";
            const automatic = privateIntake && this.input.config.linear.intake?.automaticOthers === true;
            const pending = automatic
                ? new Set(this.input.store.observeIntake({
                    scope: `${configDigest(this.input.config)}:${project.id}`,
                    issues,
                    assigneeId: this.input.config.linear.assigneeId,
                }))
                : new Set();
            for (const issue of issues) {
                if (!eligible({ issue, project, config: this.input.config }) ||
                    this.input.store.isManual(issue.id) ||
                    (privateIntake && !pending.has(issue.id)))
                    continue;
                const existing = this.input.store.findByIssue(issue.id);
                if (existing !== null) {
                    if (existing.project_id !== project.id)
                        throw new DeliveryError("Existing issue belongs to another configured project");
                    continue;
                }
                try {
                    this.input.store.claimActive({
                        issue,
                        projectId: project.id,
                        profile: this.input.config.intakeRuntimeProfile,
                        activation: {
                            hostId: this.input.hostId,
                            configDigest: configDigest(this.input.config),
                        },
                    });
                }
                catch (error) {
                    if (!(error instanceof DeliveryError && error.code === "capacity"))
                        throw error;
                }
            }
        }
    }
    runnable() {
        return this.input.store.list().filter((task) => {
            const value = checkpoint(task);
            return (["queued", "waiting"].includes(task.state) &&
                value.managedByParent !== true &&
                !(value.dependencies ?? []).some((dependency) => this.input.store.get(dependency).state !== "completed") &&
                !(task.stage === "accept" &&
                    value.parentAcceptance === true &&
                    (value.children ?? []).some((child) => child.initiativeId !== null &&
                        this.input.store.get(child.initiativeId).state !== "completed")));
        });
    }
    taskSignature(task) {
        const value = checkpoint(task);
        return JSON.stringify({
            state: task.state,
            stage: task.stage,
            checkpoint: task.checkpoint,
            updatedAt: task.updated_at,
            dependencies: (value.dependencies ?? []).map((id) => ({
                id,
                state: this.input.store.get(id).state,
            })),
            children: (value.children ?? []).map((child) => ({
                id: child.initiativeId,
                state: child.initiativeId === null ? null : this.input.store.get(child.initiativeId).state,
            })),
        });
    }
    dispatchRunnable({ active, attempted, }) {
        const available = this.input.config.capacity.writers - active.size;
        if (available <= 0)
            return;
        const tasks = this.runnable()
            .filter((task) => !active.has(task.id) && attempted.get(task.id) !== this.taskSignature(task))
            .slice(0, available);
        for (const task of tasks) {
            const execution = this.advance(task.id).then(() => ({ kind: "initiative", id: task.id, failed: false }), (error) => ({ kind: "initiative", id: task.id, failed: true, error }));
            active.set(task.id, execution);
        }
    }
    waitForDrainEvent({ active, intakeAt, }) {
        let timer;
        const intake = new Promise((resolve) => {
            timer = setTimeout(() => resolve({ kind: "intake" }), Math.max(0, intakeAt - Date.now()));
        });
        return Promise.race([...active.values(), intake]).finally(() => {
            if (timer !== undefined)
                clearTimeout(timer);
        });
    }
    async drain() {
        const active = new Map();
        const attempted = new Map();
        let intakeAt = Date.now() + this.intakeIntervalMs;
        let failure;
        let failed = false;
        this.dispatchRunnable({ active, attempted });
        while (active.size > 0) {
            const event = !failed
                ? await this.waitForDrainEvent({ active, intakeAt })
                : await Promise.race(active.values());
            if (event.kind === "initiative") {
                active.delete(event.id);
                attempted.set(event.id, this.taskSignature(this.input.store.get(event.id)));
                if (event.failed && !failed) {
                    failed = true;
                    failure = event.error;
                }
            }
            else {
                try {
                    await this.refreshIntake();
                    attempted.clear();
                }
                catch (error) {
                    failed = true;
                    failure = error;
                }
                intakeAt = Date.now() + this.intakeIntervalMs;
            }
            if (!failed)
                this.dispatchRunnable({ active, attempted });
        }
        if (failed)
            throw failure;
    }
    async advance(id) {
        for (let transitions = 0; transitions < 16; transitions++) {
            const task = this.input.store.get(id);
            if (["blocked", "cancelled", "completed", "running"].includes(task.state))
                return;
            try {
                const value = checkpoint(task);
                if (value.managedByParent === true)
                    return;
                if (value.dependencies?.some((dependency) => this.input.store.get(dependency).state !== "completed"))
                    return;
                if (["implement", "prepare-qa", "review", "verify", "merge"].includes(task.stage))
                    this.services.knowledgeEligibility({ root: this.input.config.knowledgeRoot });
                const issue = await this.assertAdmission(task);
                const next = {
                    validate: () => this.validate(task, value),
                    plan: () => this.planTask(task, value, issue),
                    challenge: () => this.challenge(task, value),
                    implement: () => this.implement(task, value, issue),
                    "prepare-qa": () => this.prepareQa(task, value, issue),
                    review: () => this.review(task, value),
                    verify: () => this.verify(task, value),
                    merge: () => this.merge(task, value),
                    accept: () => this.accept(task, value),
                };
                await next[task.stage]();
                const after = this.input.store.get(id);
                if (after.state === "waiting" || after.state === "completed")
                    return;
                this.input.store.progress({
                    id,
                    changed: after.stage !== task.stage || after.checkpoint !== task.checkpoint,
                });
            }
            catch (error) {
                const current = this.input.store.get(id);
                if (current.owner_id !== task.owner_id)
                    return;
                if (current.state !== "cancelled")
                    this.input.store.update({
                        id,
                        state: error instanceof DeliveryError && error.code === "capacity" ? "waiting" : "blocked",
                        stage: current.stage,
                        reason: error instanceof DeliveryError
                            ? error.message
                            : "Execution failed; inspect private run evidence",
                    });
                this.input.store.event({
                    initiativeId: id,
                    kind: "blocked",
                    detail: { code: error instanceof DeliveryError ? error.code : "execution" },
                });
                if (this.input.store.get(id).state === "blocked")
                    await this.notifyDecision(this.input.store.get(id));
                return;
            }
        }
    }
    async reconcileCancelledMerges() {
        for (const task of this.input.store
            .list()
            .filter((task) => task.state === "blocked" &&
            task.no_progress < 3 &&
            this.input.store.hasCancellationFence(task.id))) {
            const value = checkpoint(task);
            if (value.pr === undefined)
                continue;
            try {
                const pull = await this.services.github(this.project(task)).readPullRequest(value.pr);
                const expected = bindingSchema.parse(value.binding);
                if (pull.merged && pull.head === expected.head && pull.mergeCommit !== null) {
                    this.input.store.confirmOperation({
                        key: `${this.input.config.workspaceId}:${task.id}:merge:${expected.head}:${expected.base}`,
                        remoteId: pull.mergeCommit,
                    });
                    this.transition(task, "accept", { ...value, mergedCommit: pull.mergeCommit });
                    await this.advance(task.id);
                }
                else
                    this.input.store.progress({ id: task.id, changed: false });
            }
            catch {
                this.input.store.progress({ id: task.id, changed: false });
                this.input.store.event({
                    initiativeId: task.id,
                    kind: "merge-reconciliation-pending",
                    detail: {},
                });
            }
        }
    }
    async recover() {
        for (const run of this.input.store.runningInvocations()) {
            const confirmed = run.pid !== null &&
                (await terminateRecordedProcess({ pid: run.pid, identity: run.process_start }));
            if (!confirmed) {
                const task = this.input.store.get(run.initiative_id);
                if (task.state !== "cancelled")
                    this.input.store.update({
                        id: task.id,
                        state: "blocked",
                        stage: task.stage,
                        reason: "Orphan process termination could not be verified; ownership retained",
                    });
                continue;
            }
            this.input.store.finishInvocation({
                id: run.id,
                status: "failed",
                nativeSessionId: run.native_session,
                actualModel: run.actual_model,
                result: this.artifact({ interrupted: true }),
                terminationConfirmed: true,
            });
        }
        const active = new Set(this.input.store.runningInvocations().map((run) => run.initiative_id));
        for (const task of this.input.store.list())
            if (task.state === "running" && !active.has(task.id)) {
                this.transition(task, task.stage, checkpoint(task));
                this.input.store.event({
                    initiativeId: task.id,
                    kind: "recovered",
                    detail: { stage: task.stage },
                });
            }
    }
    async validate(task, value) {
        const project = this.project(task);
        const knowledge = this.services.knowledge.load({ root: this.input.config.knowledgeRoot });
        if (!knowledge.complete)
            throw new DeliveryError("Knowledge release is incomplete");
        const issue = issueSchema.parse(JSON.parse(task.issue_snapshot));
        const related = await this.services
            .github(project)
            .relatedPullRequests({ issueUrl: issue.url });
        if (related.length > 0)
            throw new DeliveryError(`Existing work needs ownership reconciliation before dispatch: ${related.map((pull) => pull.url).join(", ")}`);
        this.services.git.fetchBase({
            config: this.input.config,
            project,
            authorization: await this.services.github(project).gitAuthorization(),
        });
        const worktree = this.services.git.ensureWorktree({
            config: this.input.config,
            project,
            initiativeId: task.id,
        });
        this.transition(task, "plan", { ...value, worktree: worktree.path, branch: worktree.branch });
    }
    async planTask(task, value, issue) {
        const project = this.project(task);
        const knowledge = this.services.knowledge.load({ root: this.input.config.knowledgeRoot });
        const prompt = JSON.stringify({
            instruction: "Validate the issue against the current code. Return only JSON for the required plan contract. Read relevant code and knowledge cards. Do not invent product decisions. Include code-review plus concrete command IDs for every executable requirement. All writes are reserved for the implementation role.",
            issue,
            repositoryInstructions: readProjectInstructions(project),
            knowledgeIndex: knowledge.cards.map(({ id, topics }) => ({ id, topics })),
            knowledgeFile: join(this.input.config.knowledgeRoot, "knowledge", "cards.json"),
            availableCommands: project.commands,
            verificationProtocol: {
                report: z.toJSONSchema(journeyReportSchema),
                headVariable: "DELIVERY_CANDIDATE_HEAD",
                environmentVariable: "DELIVERY_ENVIRONMENT",
                artifactDirectoryVariable: "DELIVERY_REPORT_DIRECTORY",
                output: "Emit exactly one journey-report JSON object on stdout. Send command logs to stderr. The controller writes its own command.json receipt.",
            },
            deliveredChildren: this.input.store
                .list()
                .filter((entry) => entry.parent_id === task.id && ["completed", "cancelled"].includes(entry.state))
                .map((entry) => ({
                issue: JSON.parse(entry.issue_snapshot),
                outcome: entry.state,
                planDigest: entry.accepted_plan_digest,
            })),
            parentContract: task.parent_id === null
                ? null
                : JSON.parse(readArtifact(ensurePresent(checkpoint(this.input.store.get(task.parent_id)).packet, "Parent contract is missing"))),
            priorCritique: value.critique ?? null,
            contract: {
                summary: "string",
                fullPlan: "complete plan",
                sourceOfTruth: "string",
                boundaries: ["string"],
                interfaces: ["string"],
                decisions: ["string"],
                nonGoals: [],
                topics: ["existing exact topic"],
                exceptions: [],
                requirements: [
                    {
                        id: "review",
                        description: "Independent code review",
                        kind: "code-review",
                        commandId: null,
                    },
                ],
                children: [],
                unresolvedDecisions: [],
                complexOrMoney: false,
            },
        });
        this.transition(task, "plan", value, "running");
        const run = await this.invoke({ task, value, role: "planner", prompt });
        const parsedPlan = planSchema.safeParse(parseStructuredOutput(run.result.output));
        if (!parsedPlan.success)
            throw new DeliveryError(`Planner output violated its contract: ${parsedPlan.error.issues.map((issue) => `${issue.path.join(".")} (${issue.code})`).join(", ")}`);
        const plan = parsedPlan.data;
        if (plan.unresolvedDecisions.length > 0)
            throw new DeliveryError(`Planning needs a decision: ${plan.unresolvedDecisions.join("; ")}`);
        if (!plan.requirements.some((requirement) => requirement.kind === "code-review"))
            throw new DeliveryError("Plan omitted independent code review");
        if (task.parent_id !== null && plan.children.length > 0)
            throw new DeliveryError("Child assignments must remain bounded; decomposition belongs to the initiative owner");
        for (const requirement of plan.requirements)
            if ((requirement.kind === "code-review" && requirement.commandId !== null) ||
                (requirement.kind !== "code-review" &&
                    (requirement.commandId === null ||
                        !Object.hasOwn(project.commands, requirement.commandId))))
                throw new DeliveryError("Plan referenced an unconfigured verification command");
        const artifact = this.artifact(plan);
        this.input.store.recordPlan({ id: task.id, digest: artifact.digest });
        this.transition(task, "challenge", { ...value, plan: artifact });
    }
    async challenge(task, value) {
        const plan = this.plan(value);
        const project = this.project(task);
        this.transition(task, "challenge", value, "running");
        const run = await this.invoke({
            task,
            value,
            role: "planCritic",
            prompt: JSON.stringify({
                instruction: "Independently challenge the plan against the original request, repository contracts and applicable source guidance. Return only JSON {summary,findings:[{impact:'main-path'|'money'|'deferred',blocking:boolean,summary,evidence}],unresolvedDecisions:[]}. Do not implement.",
                issue: JSON.parse(task.issue_snapshot),
                plan,
                knowledge: this.services.knowledge.select({
                    root: this.input.config.knowledgeRoot,
                    topics: plan.topics,
                }),
                repositoryInstructions: readProjectInstructions(project),
            }),
        });
        const review = reviewSchema.parse(parseStructuredOutput(run.result.output));
        if (hasBlockingFindings(review)) {
            if (task.plan_rounds >= 2)
                throw new DeliveryError("Plan challenge did not converge within two rounds");
            this.transition(task, "plan", { ...value, critique: review });
            return;
        }
        const selected = this.services.knowledge.select({
            root: this.input.config.knowledgeRoot,
            topics: plan.topics,
        });
        if (selected.cards.length === 0)
            throw new DeliveryError("Plan selected no applicable guidance");
        const digest = ensurePresent(task.plan_digest, "Missing plan revision");
        const operationKey = `${this.input.config.workspaceId}:${task.id}:plan:${digest}`;
        const linear = this.services.linear(project);
        const fullPublishedPlan = `${plan.fullPlan}\n\nFrozen contract:\n\n\`\`\`json\n${JSON.stringify(plan, null, 2)}\n\`\`\``;
        const published = await reconcileOperation({
            store: this.input.store,
            key: operationKey,
            payload: { issueId: task.issue_id, digest },
            lookup: () => linear.findComment({ issueId: task.issue_id, operationKey }),
            create: async () => {
                await this.assertAdmission(task);
                return linear.publishPlan({
                    issueId: task.issue_id,
                    planDigest: digest,
                    fullPlan: fullPublishedPlan,
                    operationKey,
                });
            },
            remoteId: (comment) => comment.id,
        });
        if (!published.body.includes(digest) || !published.body.includes(fullPublishedPlan))
            throw new DeliveryError("Published plan revision did not read back correctly");
        this.input.store.acceptPlan({ id: task.id, digest });
        const packet = this.artifact({
            issue: JSON.parse(task.issue_snapshot),
            plan,
            planDigest: digest,
            verification: {
                commands: project.commands,
                environment: project.environment,
                reportSchema: z.toJSONSchema(journeyReportSchema),
                headVariable: "DELIVERY_CANDIDATE_HEAD",
                environmentVariable: "DELIVERY_ENVIRONMENT",
                artifactDirectoryVariable: "DELIVERY_REPORT_DIRECTORY",
                output: "Emit exactly one journey-report JSON object on stdout. Send command logs to stderr. The controller writes its own command.json receipt.",
            },
            parentPlanDigest: task.parent_id === null ? null : this.input.store.get(task.parent_id).accepted_plan_digest,
            knowledge: selected,
            repositoryInstructions: readProjectInstructions(project),
            exceptions: plan.exceptions,
            configDigest: configDigest(this.input.config),
            instructionsDigest: this.artifact(readProjectInstructions(project)).digest,
        });
        const children = [];
        if (plan.children.length > 0) {
            if (!this.input.config.authority.createScopedChildren)
                throw new DeliveryError("Child creation is not authorized");
            const coupled = plan.children.some((child) => child.coupled);
            for (const child of plan.children) {
                const key = `${this.input.config.workspaceId}:${task.id}:child:${child.key}`;
                const created = await reconcileOperation({
                    store: this.input.store,
                    key,
                    payload: child,
                    lookup: () => linear.findChild({ parentId: task.issue_id, operationKey: key }),
                    create: async () => {
                        await this.assertAdmission(task);
                        return linear.createChild({
                            parentId: task.issue_id,
                            title: child.title,
                            description: child.description,
                            operationKey: key,
                        });
                    },
                    remoteId: (issue) => issue.id,
                });
                const claimed = this.input.store.claim({
                    issue: created,
                    projectId: task.project_id,
                    profile: task.profile,
                    parentId: task.id,
                });
                children.push({
                    key: child.key,
                    issueId: created.id,
                    initiativeId: claimed.id,
                    dependencies: child.dependencies,
                });
            }
            for (const child of children) {
                if (child.initiativeId !== null) {
                    const claimed = this.input.store.get(child.initiativeId);
                    if (["completed", "cancelled"].includes(claimed.state))
                        continue;
                    this.transition(claimed, coupled ? "accept" : "validate", {
                        managedByParent: coupled,
                        dependencies: child.dependencies.map((key) => ensurePresent(children.find((entry) => entry.key === key)?.initiativeId, "Missing dependent child")),
                    }, coupled ? "waiting" : "queued");
                }
            }
            if (!coupled) {
                this.transition(task, "accept", { ...value, packet, children, parentAcceptance: true }, "waiting", "Waiting for independently releasable children");
                return;
            }
        }
        this.transition(task, "implement", { ...value, packet, children });
    }
    async implement(task, value, issue) {
        this.assertPacket(task, value);
        const plan = this.plan(value);
        if (value.pr !== undefined) {
            const github = this.services.github(this.project(task));
            const pull = await github.readPullRequest(value.pr);
            await github.markDraft({ number: value.pr, head: pull.head });
        }
        this.transition(task, "implement", value, "running");
        const implementation = await this.invoke({
            task,
            value,
            role: "implementer",
            complexOrMoney: plan.complexOrMoney,
            prompt: JSON.stringify({
                instruction: "Implement the frozen task packet. Stay in planned scope. Author meaningful tests. Do not run heavy builds or browsers; the controller serializes declared verification commands. Do not push, open a PR, merge or modify tracker state. Return JSON {summary:string,blocked:null}. If architecture or product assumptions fail, return JSON {summary:null,blocked:string} without inventing a solution.",
                packet: JSON.parse(readArtifact(ensurePresent(value.packet, "Missing packet"))),
                critique: value.critique ?? null,
            }),
        });
        const implementationOutput = implementationResultSchema.parse(parseStructuredOutput(implementation.result.output));
        if (implementationOutput.blocked !== null)
            throw new DeliveryError(implementationOutput.blocked);
        const project = this.project(task);
        const cwd = ensurePresent(value.worktree, "Missing worktree");
        await this.assertAdmission(task);
        this.services.git.commitImplementation({ project, cwd, title: issue.title });
        if (plan.requirements.some((requirement) => ["unit", "integration", "browser", "authenticated", "nonproduction-write"].includes(requirement.kind))) {
            this.transition(task, "prepare-qa", value);
            return;
        }
        await this.publishCandidate(task, value, issue);
    }
    async prepareQa(task, value, issue) {
        this.assertPacket(task, value);
        this.transition(task, "prepare-qa", value, "running");
        const run = await this.invoke({
            task,
            value,
            role: "implementer",
            complexOrMoney: true,
            prompt: JSON.stringify({
                instruction: "You are a fresh QA test author. Independently inspect the candidate and accepted journeys. Author or repair committed verification tests and deterministic fixtures for every applicable journey, including real non-production authentication and authoritative write outcome assertions where required. Do not change product code or product semantics, push, run browsers or heavy builds. Existing meaningful tests may be retained when they cover the exact journeys. Return JSON {summary:string,blocked:null} or {summary:null,blocked:string} for a required product/architecture decision. A different fresh context will review and execute the final tests.",
                packet: JSON.parse(readArtifact(ensurePresent(value.packet, "Missing packet"))),
                candidate: this.binding(task, value),
            }),
        });
        const output = implementationResultSchema.parse(parseStructuredOutput(run.result.output));
        if (output.blocked !== null)
            throw new DeliveryError(output.blocked);
        await this.assertAdmission(task);
        this.services.git.commitImplementation({
            project: this.project(task),
            cwd: ensurePresent(value.worktree, "Missing worktree"),
            title: "prepare acceptance tests",
        });
        await this.publishCandidate(task, value, issue);
    }
    async publishCandidate(task, value, issue) {
        const project = this.project(task);
        const plan = this.plan(value);
        const cwd = ensurePresent(value.worktree, "Missing worktree");
        const candidate = this.services.git.candidate({ cwd, project });
        if (candidate.head === candidate.base) {
            this.transition(task, "review", { ...value, parentAcceptance: true });
            return;
        }
        await this.assertAdmission(task);
        this.services.git.pushFeature({
            authorization: await this.services.github(project).gitAuthorization(),
            config: this.input.config,
            project,
            cwd,
            branch: ensurePresent(value.branch, "Missing branch"),
        });
        const github = this.services.github(project);
        const key = `${this.input.config.workspaceId}:${task.id}:pr`;
        const pull = await reconcileOperation({
            store: this.input.store,
            key,
            payload: { branch: value.branch },
            lookup: () => github.findPullRequest({
                headBranch: ensurePresent(value.branch, "Missing branch"),
                operationKey: key,
            }),
            create: async () => {
                await this.assertAdmission(task);
                return github.createPullRequest({
                    headBranch: ensurePresent(value.branch, "Missing branch"),
                    title: `feat: ${issue.title}`,
                    body: `${plan.summary}\n\n${issue.url}`,
                    operationKey: key,
                });
            },
            remoteId: (pull) => String(pull.number),
        });
        this.transition(task, "review", { ...value, pr: pull.number });
    }
    async review(task, value) {
        this.assertPacket(task, value);
        const plan = this.plan(value);
        const binding = this.binding(task, value);
        this.services.git.assertClean(ensurePresent(value.worktree, "Missing worktree"));
        this.transition(task, "review", value, "running");
        const attempts = [];
        const run = await this.invoke({
            task,
            value,
            role: "reviewer",
            onAssigned: (producerId) => {
                for (const requirement of plan.requirements.filter((entry) => entry.kind === "code-review"))
                    attempts.push(this.input.store.beginEvidence({
                        initiativeId: task.id,
                        requirement,
                        binding,
                        producerId,
                    }).id);
            },
            prompt: JSON.stringify({
                instruction: "Independently review changed code and affected consumers, including original acceptance, selected guidance, tests, authorization, money risks, artifacts and unnecessary complexity. Return JSON {summary,findings:[{impact,blocking,summary,evidence}],unresolvedDecisions:[]}. Do not implement or rely on an implementer's narrative.",
                packet: JSON.parse(readArtifact(ensurePresent(value.packet, "Missing packet"))),
                candidate: binding,
            }),
        });
        this.services.git.assertClean(ensurePresent(value.worktree, "Missing worktree"));
        const review = reviewSchema.parse(parseStructuredOutput(run.result.output));
        if (hasBlockingFindings(review)) {
            for (const id of attempts)
                this.input.store.finishEvidence({ id, passed: false, artifact: run.artifact });
            this.input.store.repair(task.id);
            this.transition(task, "implement", { ...value, critique: review });
            return;
        }
        if (JSON.stringify(binding) !== JSON.stringify(this.binding(task, value)))
            throw new DeliveryError("Candidate changed during review");
        for (const id of attempts)
            this.input.store.finishEvidence({ id, passed: true, artifact: run.artifact });
        this.transition(task, "verify", { ...value, reviewerRun: run.id, binding });
    }
    async verify(task, value) {
        this.assertPacket(task, value);
        const plan = this.plan(value);
        const project = this.project(task);
        this.services.git.assertClean(ensurePresent(value.worktree, "Missing worktree"));
        const binding = this.binding(task, value);
        const executable = plan.requirements.filter((requirement) => requirement.kind !== "code-review");
        const reports = [];
        const attempts = [];
        let checksPassed = true;
        this.transition(task, "verify", value, "running");
        const run = await this.invoke({
            task,
            value,
            role: "browserVerifier",
            onAssigned: (producerId) => {
                for (const requirement of executable)
                    attempts.push(this.input.store.beginEvidence({
                        initiativeId: task.id,
                        requirement,
                        binding,
                        producerId,
                    }).id);
            },
            prompt: async ({ id, signal }) => {
                for (const commandId of new Set(executable.map((requirement) => ensurePresent(requirement.commandId, "Acceptance requirement has no configured command")))) {
                    const requirements = executable.filter((requirement) => requirement.commandId === commandId);
                    const structured = requirements.some((requirement) => requirement.kind !== "static");
                    const environment = {
                        DELIVERY_CANDIDATE_HEAD: binding.head,
                        DELIVERY_ENVIRONMENT: project.environment.name,
                    };
                    for (const name of project.environment.variables)
                        environment[name] = ensurePresent(process.env[name], `Missing configured verification variable: ${name}`);
                    const result = await this.services.command({
                        command: ensurePresent(project.commands[commandId], "Missing configured acceptance command"),
                        cwd: ensurePresent(value.worktree, "Missing worktree"),
                        artifactDirectory: join(this.input.config.stateDirectory, "checks", task.id, randomUUID()),
                        requireStructuredReport: structured,
                        signal,
                        environment,
                        onStarted: (pid) => {
                            this.input.store.started({ id, pid });
                            this.heavyLocks.get(id)?.started(pid);
                        },
                    });
                    let validationError = null;
                    if (!result.passed)
                        validationError = `Required command failed: ${commandId}`;
                    if (result.passed && structured) {
                        try {
                            verifyJourneys({
                                project,
                                head: binding.head,
                                requirements: requirements.filter((requirement) => requirement.kind !== "static"),
                                report: result.report,
                            });
                        }
                        catch (error) {
                            validationError =
                                error instanceof DeliveryError
                                    ? error.message
                                    : "Required report does not satisfy the verification contract";
                        }
                    }
                    reports.push({ requirements, result, validationError });
                    if (validationError !== null &&
                        requirements.some((requirement) => requirement.kind === "nonproduction-write"))
                        throw new DeliveryError("Non-production write outcome requires reconciliation before another test mutation", "ambiguous");
                    if (validationError !== null) {
                        checksPassed = false;
                        break;
                    }
                }
                return JSON.stringify({
                    instruction: "Independently assess committed tests, actual command reports and requirement coverage. Inspect missing authenticated/main journeys and false positives. Return JSON {summary,findings:[{impact,blocking,summary,evidence}],unresolvedDecisions:[]}. Never treat mocked authentication, empty or skipped tests as real acceptance.",
                    packet: JSON.parse(readArtifact(ensurePresent(value.packet, "Missing packet"))),
                    candidate: binding,
                    reports,
                });
            },
        });
        this.services.git.assertClean(ensurePresent(value.worktree, "Missing worktree"));
        const review = reviewSchema.parse(parseStructuredOutput(run.result.output));
        const passed = checksPassed && !hasBlockingFindings(review);
        if (JSON.stringify(binding) !== JSON.stringify(this.binding(task, value)))
            throw new DeliveryError("Candidate changed during runtime verification");
        for (const id of attempts)
            this.input.store.finishEvidence({
                id,
                passed,
                artifact: this.artifact({ reports, verifier: run.id, review }),
            });
        if (!passed) {
            this.input.store.repair(task.id);
            this.transition(task, "implement", { ...value, critique: { review, reports } });
            return;
        }
        this.transition(task, value.parentAcceptance === true ? "accept" : "merge", {
            ...value,
            verifierRun: run.id,
            binding,
        });
    }
    async merge(task, value) {
        const project = this.project(task);
        this.services.git.fetchBase({
            config: this.input.config,
            project,
            authorization: await this.services.github(project).gitAuthorization(),
        });
        const binding = this.binding(task, value);
        this.assertPacket(task, value);
        const plan = this.plan(value);
        const github = this.services.github(project);
        const number = ensurePresent(value.pr, "Missing PR");
        const recordedBinding = bindingSchema.parse(value.binding);
        const operationKey = `${this.input.config.workspaceId}:${task.id}:merge:${recordedBinding.head}:${recordedBinding.base}`;
        const existingOperation = this.input.store.operation(operationKey);
        if (existingOperation !== null) {
            const pull = await github.readPullRequest(number);
            const intent = z
                .object({ head: z.string(), base: z.string() })
                .passthrough()
                .parse(JSON.parse(existingOperation.payload));
            if (pull.merged && pull.head === intent.head && pull.mergeCommit !== null) {
                this.input.store.confirmOperation({ key: operationKey, remoteId: pull.mergeCommit });
                this.transition(task, "accept", { ...value, mergedCommit: pull.mergeCommit });
                return;
            }
            if (existingOperation.status !== "pending")
                throw new DeliveryError("Merge outcome is unresolved; reconcile before retrying", "ambiguous");
        }
        const acceptedBinding = bindingSchema.parse(value.binding);
        if (acceptedBinding.base !== binding.base) {
            await github.markDraft({ number, head: acceptedBinding.head });
            this.services.git.updateBase({
                authorization: await github.gitAuthorization(),
                config: this.input.config,
                project,
                cwd: ensurePresent(value.worktree, "Missing worktree"),
                branch: ensurePresent(value.branch, "Missing branch"),
            });
            this.transition(task, "review", { ...value, binding });
            return;
        }
        const ready = this.input.store.readiness({
            initiativeId: task.id,
            requirements: plan.requirements,
            binding,
            maxAgeMs: this.input.config.liveEvidenceMaxAgeMs,
        });
        if (!ready.passed)
            throw new DeliveryError(ready.failures.join("; "));
        await github.markReady({ number, head: binding.head });
        for (const child of value.children ?? []) {
            if (child.initiativeId !== null &&
                checkpoint(this.input.store.get(child.initiativeId)).managedByParent === true) {
                const childIssue = await this.services.linear(project).getIssue(child.issueId);
                if (!eligible({ issue: childIssue, project, config: this.input.config })) {
                    await this.cancel(child.initiativeId);
                    throw new DeliveryError("Coupled child admission was withdrawn");
                }
            }
        }
        const checks = await github.requiredChecks({ number, head: binding.head, base: binding.base });
        if (!checks.passed) {
            if (checks.nextAction === "repair") {
                this.input.store.repair(task.id);
                this.transition(task, "implement", {
                    ...value,
                    critique: {
                        reason: "Required CI failed on the candidate",
                        candidate: binding,
                        details: checks.details,
                        failures: checks.failures,
                    },
                });
                return;
            }
            if (checks.nextAction === "blocked-policy")
                throw new DeliveryError(checks.failures.join("; "));
            const reason = checks.failures.join("; ");
            const notice = this.artifact({ reason }).digest;
            this.transition(task, "merge", { ...value, waitingNotice: notice }, "waiting", reason);
            if (checks.nextAction === "human-review" && value.waitingNotice !== notice)
                await this.notifyDecision(this.input.store.get(task.id));
            return;
        }
        await this.assertAdmission(task);
        const confirmed = await reconcileOperation({
            store: this.input.store,
            key: operationKey,
            payload: { initiativeId: task.id, head: binding.head, base: binding.base },
            dispatch: () => this.input.store.dispatchMerge({ key: operationKey, initiativeId: task.id }),
            lookup: async () => {
                const pull = await github.readPullRequest(number);
                return pull.merged && pull.head === binding.head && pull.mergeCommit !== null ? pull : null;
            },
            create: async () => {
                await this.assertAdmission(task);
                if (JSON.stringify(binding) !== JSON.stringify(this.binding(task, value)))
                    throw new DeliveryError("Candidate changed immediately before merge");
                const merged = await github.merge({ number, head: binding.head, base: binding.base });
                if (!merged.merged)
                    throw new DeliveryError("GitHub did not confirm the merge");
                const pull = await github.readPullRequest(number);
                if (!pull.merged || pull.head !== binding.head || pull.mergeCommit === null)
                    throw new DeliveryError("Merge outcome is not confirmed");
                return pull;
            },
            remoteId: (pull) => ensurePresent(pull.mergeCommit, "Missing confirmed merge commit"),
        });
        this.transition(task, "accept", {
            ...value,
            mergedCommit: ensurePresent(confirmed.mergeCommit, "Missing confirmed merge"),
        });
    }
    async accept(task, value) {
        const project = this.project(task);
        const children = value.children ?? [];
        if (value.parentAcceptance === true) {
            if (children.some((child) => child.initiativeId !== null &&
                this.input.store.get(child.initiativeId).state !== "completed")) {
                this.transition(task, "accept", value, "waiting", "Waiting for children");
                return;
            }
            if (value.verifierRun === undefined) {
                this.services.git.fetchBase({
                    config: this.input.config,
                    project,
                    authorization: await this.services.github(project).gitAuthorization(),
                });
                const cwd = ensurePresent(value.worktree, "Missing integration worktree");
                this.services.git.assertClean(cwd);
                this.services.git.git({
                    cwd,
                    args: ["merge", "--ff-only", `origin/${project.release.targetBranch}`],
                });
                this.transition(task, "review", value);
                return;
            }
            this.services.git.fetchBase({
                config: this.input.config,
                project,
                authorization: await this.services.github(project).gitAuthorization(),
            });
            const ready = this.input.store.readiness({
                initiativeId: task.id,
                requirements: this.plan(value).requirements,
                binding: this.binding(task, value),
                maxAgeMs: this.input.config.liveEvidenceMaxAgeMs,
            });
            if (!ready.passed)
                throw new DeliveryError("Integrated parent acceptance is incomplete");
        }
        const linear = this.services.linear(project);
        for (const child of children) {
            if (child.initiativeId !== null) {
                const childTask = this.input.store.get(child.initiativeId);
                if (checkpoint(childTask).managedByParent === true) {
                    await linear.completeIssue({ issueId: child.issueId });
                    this.transition(childTask, "accept", checkpoint(childTask), "completed");
                }
            }
        }
        await linear.completeIssue({ issueId: task.issue_id });
        this.transition(task, "accept", value, "completed");
        await this.notifyCompletion(this.input.store.get(task.id), value);
    }
    async notifyDecision(task) {
        const reason = task.reason ?? "Inspect the private execution evidence";
        const body = `Delivery is blocked: ${reason}`;
        if (this.input.config.notifications.desktop) {
            try {
                this.services.desktop({ message: body });
            }
            catch {
                this.input.store.event({
                    initiativeId: task.id,
                    kind: "desktop-notification-failed",
                    detail: {},
                });
            }
        }
        if (!this.input.config.notifications.linear)
            return;
        try {
            const linear = this.services.linear(this.project(task));
            const key = `${this.input.config.workspaceId}:${task.id}:blocked:${this.artifact({ reason }).digest}`;
            await reconcileOperation({
                store: this.input.store,
                key,
                payload: { body },
                lookup: () => linear.findComment({ issueId: task.issue_id, operationKey: key }),
                create: () => linear.notify({ issueId: task.issue_id, body, operationKey: key }),
                remoteId: (comment) => comment.id,
            });
        }
        catch {
            this.input.store.event({
                initiativeId: task.id,
                kind: "decision-notification-pending",
                detail: {},
            });
        }
    }
    async notifyCompletion(task, value) {
        let notificationCheckpoint = value;
        let desktopPassed = !this.input.config.notifications.desktop || value.desktopNotified === true;
        if (!desktopPassed) {
            try {
                this.services.desktop({
                    message: this.input.store.hasCancellationFence(task.id)
                        ? "The verified change merged after dispatch began, before cancellation could stop it."
                        : "The requested outcome is verified. See the owned issue for details.",
                });
                desktopPassed = true;
                notificationCheckpoint = { ...value, desktopNotified: true };
                this.transition(task, "accept", notificationCheckpoint, "completed");
            }
            catch {
                this.input.store.event({
                    initiativeId: task.id,
                    kind: "desktop-notification-pending",
                    detail: {},
                });
            }
        }
        try {
            if (this.input.config.notifications.linear) {
                const linear = this.services.linear(this.project(task));
                const key = `${this.input.config.workspaceId}:${task.id}:complete`;
                let body = value.pr === undefined
                    ? "The requested outcome is verified on the development branch."
                    : "The accepted change is merged and required verification is complete.";
                if (this.input.store.hasCancellationFence(task.id))
                    body =
                        "The verified change merged after dispatch had already begun. Cancellation could not stop that in-flight merge.";
                await reconcileOperation({
                    store: this.input.store,
                    key,
                    payload: { body },
                    lookup: () => linear.findComment({ issueId: task.issue_id, operationKey: key }),
                    create: () => linear.notify({ issueId: task.issue_id, body, operationKey: key }),
                    remoteId: (comment) => comment.id,
                });
            }
            this.transition(task, "accept", { ...notificationCheckpoint, notified: desktopPassed }, "completed");
        }
        catch {
            this.input.store.event({
                initiativeId: task.id,
                kind: "notification-pending",
                detail: { reason: "Completion confirmed; notification awaits provider reconciliation" },
            });
        }
    }
}
