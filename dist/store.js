import { randomUUID } from "node:crypto";
import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import Database from "better-sqlite3";
import { z } from "zod";
import { readArtifact } from "./artifacts.js";
import { sha256 } from "./config.js";
import { bindingSchema, DeliveryError, ensurePresent, profiles, roles, stages, states, } from "./domain.js";
import { processIdentity, sameProcess } from "./process-identity.js";
import { processGroupAlive } from "./runtime/process.js";
const initiativeSchema = z.object({
    id: z.string(),
    issue_id: z.string(),
    project_id: z.string(),
    parent_id: z.string().nullable(),
    owner_id: z.string(),
    profile: z.enum(profiles),
    state: z.enum(states),
    stage: z.enum(stages),
    reason: z.string().nullable(),
    plan_digest: z.string().nullable(),
    accepted_plan_digest: z.string().nullable(),
    plan_rounds: z.number(),
    repair_rounds: z.number(),
    no_progress: z.number(),
    checkpoint: z.string(),
    issue_snapshot: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
});
const invocationSchema = z.object({
    id: z.string(),
    initiative_id: z.string(),
    role: z.enum(roles),
    profile: z.enum(profiles),
    worktree: z.string(),
    status: z.enum(["running", "completed", "failed", "cancelled", "timed-out", "blocked"]),
    pid: z.number().nullable(),
    process_start: z.string().nullable(),
    native_session: z.string().nullable(),
    requested_model: z.string(),
    actual_model: z.string().nullable(),
    started_at: z.string(),
    finished_at: z.string().nullable(),
    termination_confirmed: z.number(),
    result_path: z.string().nullable(),
    result_digest: z.string().nullable(),
});
const evidenceSchema = z.object({
    id: z.string(),
    initiative_id: z.string(),
    requirement_id: z.string(),
    kind: z.string(),
    sequence: z.number(),
    binding_digest: z.string(),
    binding: z.string(),
    producer_id: z.string(),
    status: z.enum(["pending", "passed", "failed"]),
    artifact_path: z.string().nullable(),
    artifact_digest: z.string().nullable(),
    started_at: z.string(),
    completed_at: z.string().nullable(),
});
const operationSchema = z.object({
    key: z.string(),
    intent_digest: z.string(),
    status: z.enum(["pending", "dispatched", "uncertain", "confirmed"]),
    remote_id: z.string().nullable(),
    payload: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
});
const settingsSchema = z.object({
    workspace_id: z.string(),
    host_id: z.string().nullable(),
    active: z.number(),
    config_digest: z.string().nullable(),
    profile: z.enum(profiles).nullable(),
    conformance_digest: z.string().nullable(),
});
const countSchema = z.object({ count: z.number() });
export class Store {
    options;
    db;
    constructor(options) {
        this.options = options;
        mkdirSync(dirname(options.path), { recursive: true, mode: 0o700 });
        this.db = new Database(options.path);
        chmodSync(options.path, 0o600);
        this.db.pragma("foreign_keys = ON");
        this.db.pragma("busy_timeout = 5000");
        try {
            this.db
                .transaction(() => {
                const version = z.number().parse(this.db.pragma("user_version", { simple: true }));
                if (version > 3)
                    throw new DeliveryError("State database was created by a newer release");
                if (version > 0) {
                    const workspace = settingsSchema.parse(this.db.prepare("SELECT * FROM settings").get());
                    if (workspace.workspace_id !== options.workspaceId)
                        throw new DeliveryError("State belongs to another workspace");
                    if (version < 3) {
                        const hasControllerLock = this.db
                            .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='controller_lock'")
                            .get() !== undefined &&
                            this.db.prepare("SELECT 1 FROM controller_lock LIMIT 1").get() !== undefined;
                        const unfinished = this.db
                            .prepare("SELECT 1 FROM invocations WHERE termination_confirmed=0 LIMIT 1")
                            .get() !== undefined;
                        if (workspace.active !== 0 || unfinished || hasControllerLock)
                            throw new DeliveryError("State migration requires the previous release to pause intake and drain all controllers and invocations", "blocked");
                        const backupDirectory = join(dirname(options.path), "migration-backups");
                        mkdirSync(backupDirectory, { recursive: true, mode: 0o700 });
                        chmodSync(backupDirectory, 0o700);
                        const backupPath = join(backupDirectory, `${basename(options.path)}.v${version}-to-v3.${randomUUID()}.sqlite`);
                        writeFileSync(backupPath, this.db.serialize(), { mode: 0o600, flag: "wx" });
                        const backup = new Database(backupPath);
                        try {
                            backup.pragma("journal_mode = DELETE");
                            if (backup.pragma("integrity_check", { simple: true }) !== "ok")
                                throw new DeliveryError("Pre-migration snapshot failed integrity validation");
                        }
                        finally {
                            backup.close();
                        }
                    }
                }
                this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (workspace_id TEXT PRIMARY KEY, host_id TEXT, active INTEGER NOT NULL DEFAULT 0, config_digest TEXT, profile TEXT, conformance_digest TEXT);
      CREATE TABLE IF NOT EXISTS initiatives (id TEXT PRIMARY KEY, issue_id TEXT NOT NULL UNIQUE, project_id TEXT NOT NULL, parent_id TEXT REFERENCES initiatives(id), owner_id TEXT NOT NULL, profile TEXT NOT NULL, state TEXT NOT NULL, stage TEXT NOT NULL, reason TEXT, plan_digest TEXT, accepted_plan_digest TEXT, plan_rounds INTEGER NOT NULL DEFAULT 0, repair_rounds INTEGER NOT NULL DEFAULT 0, no_progress INTEGER NOT NULL DEFAULT 0, checkpoint TEXT NOT NULL DEFAULT '{}', issue_snapshot TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS invocations (id TEXT PRIMARY KEY, initiative_id TEXT NOT NULL REFERENCES initiatives(id), role TEXT NOT NULL, profile TEXT NOT NULL, worktree TEXT NOT NULL, status TEXT NOT NULL, pid INTEGER, native_session TEXT, requested_model TEXT NOT NULL, actual_model TEXT, started_at TEXT NOT NULL, finished_at TEXT, termination_confirmed INTEGER NOT NULL DEFAULT 0, result_path TEXT, result_digest TEXT);
      CREATE UNIQUE INDEX IF NOT EXISTS one_running_writer ON invocations(worktree) WHERE role='implementer' AND termination_confirmed=0;
      CREATE TABLE IF NOT EXISTS worktrees (path TEXT PRIMARY KEY, initiative_id TEXT NOT NULL REFERENCES initiatives(id));
      CREATE TABLE IF NOT EXISTS resources (name TEXT PRIMARY KEY, invocation_id TEXT NOT NULL REFERENCES invocations(id));
      CREATE TABLE IF NOT EXISTS evidence (id TEXT PRIMARY KEY, initiative_id TEXT NOT NULL REFERENCES initiatives(id), requirement_id TEXT NOT NULL, kind TEXT NOT NULL, sequence INTEGER NOT NULL, binding_digest TEXT NOT NULL, binding TEXT NOT NULL, producer_id TEXT NOT NULL REFERENCES invocations(id), status TEXT NOT NULL, artifact_path TEXT, artifact_digest TEXT, started_at TEXT NOT NULL, completed_at TEXT, UNIQUE(initiative_id,requirement_id,sequence));
      CREATE TABLE IF NOT EXISTS operations (key TEXT PRIMARY KEY, intent_digest TEXT NOT NULL, status TEXT NOT NULL, remote_id TEXT, payload TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS plan_approvals (initiative_id TEXT PRIMARY KEY REFERENCES initiatives(id), plan_digest TEXT, config_digest TEXT, approved_at TEXT);
      CREATE TABLE IF NOT EXISTS events (sequence INTEGER PRIMARY KEY AUTOINCREMENT, initiative_id TEXT, kind TEXT NOT NULL, detail TEXT NOT NULL, at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS workspace_identity (slot INTEGER PRIMARY KEY CHECK(slot=1),tracker TEXT NOT NULL,organization TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS project_bindings (project_id TEXT PRIMARY KEY,repository TEXT NOT NULL UNIQUE);
      CREATE TABLE IF NOT EXISTS manual_reservations (issue_id TEXT PRIMARY KEY, project_id TEXT NOT NULL, identifier TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS automatic_exclusions (issue_id TEXT PRIMARY KEY);
      CREATE TABLE IF NOT EXISTS intake_baselines (scope TEXT PRIMARY KEY);
      CREATE TABLE IF NOT EXISTS intake_observations (scope TEXT NOT NULL, issue_id TEXT NOT NULL, pending INTEGER NOT NULL, PRIMARY KEY(scope,issue_id));
      CREATE TABLE IF NOT EXISTS controller_lock (slot INTEGER PRIMARY KEY CHECK(slot=1), host_id TEXT NOT NULL, pid INTEGER NOT NULL, identity TEXT NOT NULL);
    `);
                const columns = z
                    .array(z.object({ name: z.string() }))
                    .parse(this.db.prepare("PRAGMA table_info(invocations)").all());
                if (!columns.some((column) => column.name === "process_start"))
                    this.db.exec("ALTER TABLE invocations ADD COLUMN process_start TEXT");
                this.db.pragma("user_version=3");
                const workspace = this.db.prepare("SELECT * FROM settings").get();
                if (workspace) {
                    if (settingsSchema.parse(workspace).workspace_id !== options.workspaceId)
                        throw new DeliveryError("State belongs to another workspace");
                }
                else
                    this.db
                        .prepare("INSERT INTO settings(workspace_id) VALUES (?)")
                        .run(options.workspaceId);
            })
                .immediate();
            this.db.pragma("journal_mode = WAL");
        }
        catch (error) {
            this.db.close();
            throw error;
        }
    }
    close() {
        this.db.close();
    }
    bindDestination({ tracker, organization, projects, }) {
        this.db
            .transaction(() => {
            const existing = this.db
                .prepare("SELECT tracker,organization FROM workspace_identity WHERE slot=1")
                .get();
            if (existing) {
                const bound = z.object({ tracker: z.string(), organization: z.string() }).parse(existing);
                if (bound.tracker !== tracker || bound.organization !== organization)
                    throw new DeliveryError("Ownership store belongs to another tracker workspace or organization");
            }
            else
                this.db
                    .prepare("INSERT INTO workspace_identity(slot,tracker,organization) VALUES(1,?,?)")
                    .run(tracker, organization);
            for (const project of projects) {
                const previous = this.db
                    .prepare("SELECT repository FROM project_bindings WHERE project_id=?")
                    .get(project.id);
                if (previous &&
                    z.object({ repository: z.string() }).parse(previous).repository !== project.repository)
                    throw new DeliveryError("Project identity belongs to a different repository");
                this.db
                    .prepare("INSERT OR IGNORE INTO project_bindings(project_id,repository) VALUES(?,?)")
                    .run(project.id, project.repository);
            }
        })
            .immediate();
    }
    acquireController(hostId) {
        this.db
            .transaction(() => {
            const raw = this.db.prepare("SELECT * FROM controller_lock WHERE slot=1").get();
            if (raw) {
                const lock = z
                    .object({ host_id: z.string(), pid: z.number(), identity: z.string() })
                    .parse(raw);
                if (lock.host_id !== hostId || sameProcess({ pid: lock.pid, identity: lock.identity }))
                    throw new DeliveryError("Another controller owns this workspace", "capacity");
                this.db.prepare("DELETE FROM controller_lock WHERE slot=1").run();
            }
            this.db
                .prepare("INSERT INTO controller_lock(slot,host_id,pid,identity) VALUES(1,?,?,?)")
                .run(hostId, process.pid, ensurePresent(processIdentity(process.pid), "Controller process identity unavailable"));
        })
            .immediate();
    }
    releaseController() {
        this.db
            .prepare("DELETE FROM controller_lock WHERE slot=1 AND pid=? AND identity=?")
            .run(process.pid, processIdentity(process.pid));
    }
    async backup(path) {
        await this.db.backup(path);
    }
    settings() {
        return settingsSchema.parse(this.db.prepare("SELECT * FROM settings").get());
    }
    activate(input) {
        this.db
            .transaction(() => {
            const current = this.settings();
            if (current.host_id !== null && current.host_id !== input.hostId)
                throw new DeliveryError("Explicit host handoff required before activation");
            this.db
                .prepare("UPDATE settings SET active=1,host_id=?,config_digest=?,profile=?,conformance_digest=?")
                .run(input.hostId, input.configDigest, input.profile, input.conformanceDigest);
        })
            .immediate();
    }
    assertActive(input) {
        const settings = this.settings();
        if (settings.active !== 1 ||
            settings.host_id !== input.hostId ||
            settings.config_digest !== input.configDigest)
            throw new DeliveryError("Workspace inactive, configuration changed, or host identity differs");
    }
    pause() {
        this.db.prepare("UPDATE settings SET active=0").run();
    }
    transferHost(input) {
        this.db
            .transaction(() => {
            if (this.settings().host_id !== input.oldHostId)
                throw new DeliveryError("Host handoff source does not own this workspace");
            if (this.runningInvocations().length > 0)
                throw new DeliveryError("Drain all invocations before host handoff");
            this.db
                .prepare("UPDATE settings SET active=0,host_id=?,conformance_digest=NULL")
                .run(input.newHostId);
        })
            .immediate();
    }
    list() {
        return this.db
            .prepare("SELECT * FROM initiatives ORDER BY created_at,id")
            .all()
            .map((row) => initiativeSchema.parse(row));
    }
    get(id) {
        return initiativeSchema.parse(ensurePresent(this.db.prepare("SELECT * FROM initiatives WHERE id=?").get(id), "Expected an existing initiative"));
    }
    findByIssue(issueId) {
        const row = this.db.prepare("SELECT * FROM initiatives WHERE issue_id=?").get(issueId);
        return row ? initiativeSchema.parse(row) : null;
    }
    claim(input) {
        return this.db
            .transaction(() => {
            if (this.isManual(input.issue.id))
                throw new DeliveryError("Issue is reserved for manual work");
            const previous = this.findByIssue(input.issue.id);
            if (previous) {
                if (input.humanApproval === "required" && this.planApproval(previous.id) === null)
                    throw new DeliveryError("Existing initiative was not started with human approval; do not change its execution contract implicitly");
                if (previous.project_id !== input.projectId ||
                    previous.profile !== input.profile ||
                    previous.parent_id !== (input.parentId ?? null))
                    throw new DeliveryError("Issue is already claimed under another project, parent or runtime");
                return previous;
            }
            const parentId = input.parentId ?? null;
            if (parentId === null) {
                const { count } = countSchema.parse(this.db
                    .prepare("SELECT COUNT(*) AS count FROM initiatives WHERE parent_id IS NULL AND state NOT IN ('completed','cancelled')")
                    .get());
                if (count >= (this.options.maxInitiatives ?? 2))
                    throw new DeliveryError("Initiative capacity is full", "capacity");
            }
            else {
                const parent = this.get(parentId);
                if (parent.project_id !== input.projectId ||
                    parent.profile !== input.profile ||
                    ["cancelled", "completed"].includes(parent.state))
                    throw new DeliveryError("Invalid parent ownership");
            }
            const id = randomUUID();
            const now = new Date().toISOString();
            this.db
                .prepare("INSERT INTO initiatives(id,issue_id,project_id,parent_id,owner_id,profile,state,stage,issue_snapshot,checkpoint,created_at,updated_at) VALUES(?,?,?,?,?,?,?,'validate',?,?,?,?)")
                .run(id, input.issue.id, input.projectId, parentId, parentId === null ? randomUUID() : this.get(parentId).owner_id, input.profile, parentId === null ? "queued" : "waiting", JSON.stringify(input.issue), JSON.stringify(parentId === null ? {} : { managedByParent: true }), now, now);
            if (input.humanApproval === "required")
                this.db.prepare("INSERT INTO plan_approvals(initiative_id) VALUES (?)").run(id);
            return this.get(id);
        })
            .immediate();
    }
    isManual(issueId) {
        return (this.db.prepare("SELECT issue_id FROM manual_reservations WHERE issue_id=?").get(issueId) !==
            undefined);
    }
    hasManualOwner(id) {
        const task = this.get(id);
        return (this.db
            .prepare("SELECT 1 FROM initiatives JOIN manual_reservations USING(issue_id) WHERE owner_id=? LIMIT 1")
            .get(task.owner_id) !== undefined);
    }
    reserveManual(input) {
        this.db
            .transaction(() => {
            this.db
                .prepare("INSERT OR IGNORE INTO manual_reservations(issue_id,project_id,identifier) VALUES(?,?,?)")
                .run(input.issueId, input.projectId, input.identifier ?? input.issueId);
            this.db
                .prepare("INSERT OR IGNORE INTO automatic_exclusions(issue_id) VALUES(?)")
                .run(input.issueId);
        })
            .immediate();
    }
    releaseManual(input) {
        const matches = z
            .array(z.object({ issue_id: z.string() }))
            .parse(this.db
            .prepare("SELECT issue_id FROM manual_reservations WHERE project_id=? AND (issue_id=? OR identifier=?)")
            .all(input.projectId, input.issueId, input.issueId));
        if (matches.length > 1)
            throw new DeliveryError("Ambiguous manual reservation; use the exact issue UUID");
        const match = matches[0];
        if (match === undefined)
            return;
        const issueId = match.issue_id;
        this.db
            .transaction(() => {
            this.db.prepare("UPDATE intake_observations SET pending=0 WHERE issue_id=?").run(issueId);
            this.db.prepare("DELETE FROM manual_reservations WHERE issue_id=?").run(issueId);
        })
            .immediate();
    }
    observeIntake(input) {
        return this.db
            .transaction(() => {
            const baseline = this.db
                .prepare("SELECT scope FROM intake_baselines WHERE scope=?")
                .get(input.scope);
            for (const issue of input.issues) {
                const otherCreator = issue.creatorId !== undefined &&
                    issue.creatorId !== null &&
                    issue.creatorId !== input.assigneeId;
                this.db
                    .prepare("INSERT OR IGNORE INTO intake_observations(scope,issue_id,pending) VALUES(?,?,?)")
                    .run(input.scope, issue.id, Number(baseline !== undefined &&
                    otherCreator &&
                    !this.isManual(issue.id) &&
                    this.db
                        .prepare("SELECT issue_id FROM automatic_exclusions WHERE issue_id=?")
                        .get(issue.id) === undefined));
                if (this.isManual(issue.id))
                    this.db
                        .prepare("UPDATE intake_observations SET pending=0 WHERE scope=? AND issue_id=?")
                        .run(input.scope, issue.id);
            }
            this.db.prepare("INSERT OR IGNORE INTO intake_baselines(scope) VALUES(?)").run(input.scope);
            return input.issues
                .filter((issue) => {
                const row = this.db
                    .prepare("SELECT pending FROM intake_observations WHERE scope=? AND issue_id=?")
                    .get(input.scope, issue.id);
                return z.object({ pending: z.number() }).parse(row).pending === 1;
            })
                .map((issue) => issue.id);
        })
            .immediate();
    }
    claimActive(input) {
        return this.db
            .transaction(() => {
            this.assertActive(input.activation);
            return this.claim(input);
        })
            .immediate();
    }
    update(input) {
        const current = this.get(input.id);
        if (["completed", "cancelled"].includes(current.state) && current.state !== input.state)
            throw new DeliveryError("Terminal initiative cannot resume implicitly");
        this.db
            .prepare("UPDATE initiatives SET state=?,stage=?,reason=?,checkpoint=?,updated_at=? WHERE id=?")
            .run(input.state, input.stage, input.reason, input.checkpoint === undefined ? current.checkpoint : JSON.stringify(input.checkpoint), new Date().toISOString(), input.id);
    }
    recordApprovalNotification(input) {
        const path = input.channel === "desktop" ? "$.approvalDesktopNotified" : "$.approvalLinearNotified";
        this.db
            .prepare("UPDATE initiatives SET checkpoint=json_set(checkpoint,?,json('true')) WHERE id=? AND owner_id=? AND accepted_plan_digest=? AND json_extract(checkpoint,'$.approvalContext.digest')=?")
            .run(path, input.id, input.ownerId, input.planDigest, input.contextDigest);
    }
    planApproval(id) {
        const row = this.db
            .prepare("SELECT plan_digest,config_digest,approved_at FROM plan_approvals WHERE initiative_id=?")
            .get(id);
        return row === undefined
            ? null
            : z
                .object({
                plan_digest: z.string().nullable(),
                config_digest: z.string().nullable(),
                approved_at: z.string().nullable(),
            })
                .parse(row);
    }
    approvePlan(input) {
        this.db
            .transaction(() => {
            this.assertActive(input);
            const task = this.get(input.id);
            if (task.state !== "waiting" ||
                task.stage !== "approve-plan" ||
                task.accepted_plan_digest !== input.digest ||
                task.plan_digest !== input.digest ||
                this.planApproval(input.id)?.plan_digest !== input.digest ||
                this.planApproval(input.id)?.config_digest !== input.configDigest)
                throw new DeliveryError("No matching published plan awaits human approval");
            this.db
                .prepare("UPDATE plan_approvals SET plan_digest=?,config_digest=?,approved_at=? WHERE initiative_id=?")
                .run(input.digest, input.configDigest, new Date().toISOString(), input.id);
            this.update({ id: input.id, state: "queued", stage: "approve-plan", reason: null });
            this.event({
                initiativeId: input.id,
                kind: "human-plan-approved",
                detail: { digest: input.digest, configDigest: input.configDigest },
            });
        })
            .immediate();
    }
    recordPlan(input) {
        this.db
            .transaction(() => {
            const initiative = this.get(input.id);
            if (initiative.plan_rounds >= 2)
                throw new DeliveryError("Planning round limit reached");
            if (this.runningInvocations().some((run) => run.initiative_id === input.id))
                throw new DeliveryError("Cannot change plan while an invocation is running");
            this.db
                .prepare("UPDATE plan_approvals SET plan_digest=NULL,config_digest=NULL,approved_at=NULL WHERE initiative_id=?")
                .run(input.id);
            this.db
                .prepare("UPDATE initiatives SET plan_digest=?,accepted_plan_digest=NULL,plan_rounds=plan_rounds+1 WHERE id=?")
                .run(input.digest, input.id);
        })
            .immediate();
    }
    acceptPlan(input) {
        if (this.get(input.id).plan_digest !== input.digest)
            throw new DeliveryError("Cannot accept a stale plan");
        this.db
            .prepare("UPDATE initiatives SET accepted_plan_digest=? WHERE id=?")
            .run(input.digest, input.id);
        if (input.configDigest !== undefined)
            this.db
                .prepare("UPDATE plan_approvals SET plan_digest=?,config_digest=?,approved_at=NULL WHERE initiative_id=?")
                .run(input.digest, input.configDigest, input.id);
    }
    repair(id) {
        const current = this.get(id);
        if (current.repair_rounds >= 2)
            throw new DeliveryError("Repair round limit reached");
        this.db.prepare("UPDATE initiatives SET repair_rounds=repair_rounds+1 WHERE id=?").run(id);
    }
    progress(input) {
        const count = input.changed ? 0 : this.get(input.id).no_progress + 1;
        this.db.prepare("UPDATE initiatives SET no_progress=? WHERE id=?").run(count, input.id);
        if (count >= 3)
            this.update({
                id: input.id,
                state: "blocked",
                stage: this.get(input.id).stage,
                reason: "Three iterations without meaningful progress",
            });
    }
    runningInvocations() {
        return this.db
            .prepare("SELECT * FROM invocations WHERE termination_confirmed=0")
            .all()
            .map((row) => invocationSchema.parse(row));
    }
    invocation(id) {
        return invocationSchema.parse(ensurePresent(this.db.prepare("SELECT * FROM invocations WHERE id=?").get(id), "Expected a recorded invocation"));
    }
    beginInvocation(input) {
        return this.db
            .transaction(() => {
            const initiative = this.get(input.initiativeId);
            if (this.hasManualOwner(initiative.id) ||
                ["completed", "cancelled", "blocked"].includes(initiative.state))
                throw new DeliveryError("Initiative is not runnable");
            const running = this.runningInvocations();
            if (running.some((run) => run.initiative_id === input.initiativeId))
                throw new DeliveryError("Initiative already has an active invocation");
            if (input.role === "implementer") {
                if (initiative.accepted_plan_digest === null)
                    throw new DeliveryError("Implementation requires an accepted plan");
                if (running.filter((run) => run.role === "implementer").length >=
                    (this.options.maxWriters ?? 3))
                    throw new DeliveryError("Writer capacity is full", "capacity");
                const owner = this.db
                    .prepare("SELECT initiative_id FROM worktrees WHERE path=?")
                    .get(input.worktree);
                if (owner &&
                    z.object({ initiative_id: z.string() }).parse(owner).initiative_id !==
                        input.initiativeId)
                    throw new DeliveryError("Worktree belongs to another initiative");
                this.db
                    .prepare("INSERT OR IGNORE INTO worktrees(path,initiative_id) VALUES(?,?)")
                    .run(input.worktree, input.initiativeId);
            }
            this.db
                .prepare("INSERT INTO invocations(id,initiative_id,role,profile,worktree,status,requested_model,started_at) VALUES(?,?,?,?,?,'running',?,?)")
                .run(input.id, input.initiativeId, input.role, initiative.profile, input.worktree, input.model, new Date().toISOString());
            return this.invocation(input.id);
        })
            .immediate();
    }
    started(input) {
        this.db
            .prepare("UPDATE invocations SET pid=?,process_start=? WHERE id=? AND termination_confirmed=0")
            .run(input.pid, processIdentity(input.pid), input.id);
    }
    finishInvocation(input) {
        this.db
            .transaction(() => {
            const run = this.invocation(input.id);
            if (run.termination_confirmed === 1)
                throw new DeliveryError("Invocation already finished");
            if (input.terminationConfirmed && run.pid !== null && processGroupAlive(run.pid))
                throw new DeliveryError("Recorded process group is still alive; reservation retained");
            readArtifact(input.result);
            this.db
                .prepare("UPDATE invocations SET status=?,native_session=?,actual_model=?,finished_at=?,termination_confirmed=?,result_path=?,result_digest=? WHERE id=?")
                .run(input.status, input.nativeSessionId, input.actualModel, new Date().toISOString(), Number(input.terminationConfirmed), input.result.path, input.result.digest, input.id);
            if (input.terminationConfirmed)
                this.db.prepare("DELETE FROM resources WHERE invocation_id=?").run(input.id);
        })
            .immediate();
    }
    reserveHeavy(invocationId) {
        if (this.invocation(invocationId).termination_confirmed !== 0)
            throw new DeliveryError("Cannot reserve resources for a terminated invocation");
        try {
            this.db
                .prepare("INSERT INTO resources(name,invocation_id) VALUES('heavy',?)")
                .run(invocationId);
        }
        catch {
            throw new DeliveryError("Heavy execution slot is occupied", "capacity");
        }
    }
    hasCancellationFence(id) {
        return Boolean(this.db
            .prepare("SELECT sequence FROM events WHERE initiative_id=? AND kind='cancel-after-merge-dispatch' LIMIT 1")
            .get(id));
    }
    dispatchMerge({ key, initiativeId }) {
        this.db
            .transaction(() => {
            const task = this.get(initiativeId);
            if (this.settings().active !== 1 ||
                this.hasManualOwner(initiativeId) ||
                ["cancelled", "blocked", "completed"].includes(task.state) ||
                this.hasCancellationFence(initiativeId))
                throw new DeliveryError("Merge admission was revoked before dispatch");
            this.dispatchOperation(key);
        })
            .immediate();
    }
    cancel(id) {
        const requested = this.get(id);
        if (requested.state === "completed")
            throw new DeliveryError("Completed delivery history cannot be cancelled");
        const managed = z
            .object({ managedByParent: z.boolean().optional() })
            .passthrough()
            .parse(JSON.parse(requested.checkpoint)).managedByParent === true;
        const rootId = managed && requested.parent_id !== null ? requested.parent_id : id;
        const tasks = this.list().filter((entry) => entry.id === rootId || entry.parent_id === rootId);
        const pendingIds = this.db
            .transaction(() => {
            const activeMerges = new Set(tasks
                .filter((entry) => entry.state !== "completed" &&
                Boolean(this.db
                    .prepare("SELECT key FROM operations WHERE status IN ('dispatched','uncertain','confirmed') AND json_extract(payload,'$.initiativeId')=?")
                    .get(entry.id)))
                .map((entry) => entry.id));
            for (const task of tasks) {
                if (["completed", "cancelled"].includes(task.state))
                    continue;
                const coupled = z
                    .object({ managedByParent: z.boolean().optional() })
                    .passthrough()
                    .parse(JSON.parse(task.checkpoint)).managedByParent === true;
                const awaiting = activeMerges.has(task.id) ||
                    (coupled && task.parent_id !== null && activeMerges.has(task.parent_id));
                this.event({
                    initiativeId: task.id,
                    kind: "cancellation-requested",
                    detail: { requestedRoot: rootId },
                });
                if (activeMerges.has(task.id))
                    this.event({
                        initiativeId: task.id,
                        kind: "cancel-after-merge-dispatch",
                        detail: { reason: "Await remote merge reconciliation" },
                    });
                this.db
                    .prepare("UPDATE initiatives SET state=?,reason=?,updated_at=? WHERE id=?")
                    .run(awaiting ? "blocked" : "cancelled", awaiting
                    ? "Cancellation awaits in-flight merge reconciliation"
                    : "Cancellation requested", new Date().toISOString(), task.id);
            }
            return activeMerges;
        })
            .immediate();
        if (pendingIds.size > 0)
            throw new DeliveryError("Cancellation stopped new work; an already dispatched merge still requires remote reconciliation", "merge-in-flight");
        const ids = new Set(tasks.map((task) => task.id));
        return this.runningInvocations().filter((run) => ids.has(run.initiative_id));
    }
    replan({ id, issue, checkpoint }) {
        this.db
            .transaction(() => {
            const task = this.get(id);
            if (["completed", "cancelled"].includes(task.state) ||
                this.runningInvocations().some((run) => run.initiative_id === id))
                throw new DeliveryError("Stop active work before revising its plan");
            if (this.hasCancellationFence(id) ||
                this.db
                    .prepare("SELECT key FROM operations WHERE status IN ('dispatched','uncertain','confirmed') AND json_extract(payload,'$.initiativeId')=?")
                    .get(id))
                throw new DeliveryError("Reconcile the dispatched merge before revising its plan");
            if (this.list().some((entry) => entry.parent_id === id && !["completed", "cancelled"].includes(entry.state)))
                throw new DeliveryError("Existing child assignments must be reconciled before parent replanning");
            this.db
                .prepare("UPDATE plan_approvals SET plan_digest=NULL,config_digest=NULL,approved_at=NULL WHERE initiative_id=?")
                .run(id);
            this.event({
                initiativeId: id,
                kind: "plan-invalidated",
                detail: {
                    previousIssue: JSON.parse(task.issue_snapshot),
                    previousPlan: task.accepted_plan_digest,
                    newIssue: issue,
                },
            });
            this.db
                .prepare("UPDATE initiatives SET issue_snapshot=?,plan_digest=NULL,accepted_plan_digest=NULL,plan_rounds=0,repair_rounds=0,no_progress=0,state='queued',stage='plan',reason=NULL,checkpoint=? WHERE id=?")
                .run(JSON.stringify(issue), JSON.stringify(checkpoint), id);
        })
            .immediate();
    }
    handoff(input) {
        this.db
            .transaction(() => {
            const current = this.get(input.id);
            if (current.owner_id !== input.previousOwner)
                throw new DeliveryError("Handoff source no longer owns initiative");
            if (this.db
                .prepare("SELECT key FROM operations WHERE status IN ('dispatched','uncertain') AND json_extract(payload,'$.initiativeId') IN (SELECT id FROM initiatives WHERE id=? OR parent_id=?)")
                .get(input.id, input.id))
                throw new DeliveryError("Reconcile the in-flight merge before transferring ownership");
            const children = this.list()
                .filter((entry) => entry.parent_id === input.id)
                .map((entry) => entry.id);
            if (this.runningInvocations().some((run) => run.initiative_id === input.id || children.includes(run.initiative_id)))
                throw new DeliveryError("Stop owned invocations before handoff");
            if (current.state === "completed" || current.state === "cancelled")
                throw new DeliveryError("Cannot hand off terminal work");
            this.db
                .prepare("UPDATE initiatives SET owner_id=?,profile=?,checkpoint=?,updated_at=? WHERE id=?")
                .run(input.newOwner, input.profile, JSON.stringify(input.checkpoint), new Date().toISOString(), input.id);
            this.db
                .prepare("UPDATE initiatives SET owner_id=?,profile=?,updated_at=? WHERE parent_id=? AND state NOT IN ('completed','cancelled')")
                .run(input.newOwner, input.profile, new Date().toISOString(), input.id);
        })
            .immediate();
    }
    beginEvidence(input) {
        return this.db
            .transaction(() => {
            const run = this.invocation(input.producerId);
            if (run.initiative_id !== input.initiativeId)
                throw new DeliveryError("Evidence producer belongs to another initiative");
            const independent = [
                "code-review",
                "browser",
                "authenticated",
                "nonproduction-write",
                "parent-acceptance",
            ].includes(input.requirement.kind);
            if (input.requirement.kind === "code-review" && run.role !== "reviewer")
                throw new DeliveryError("Code review requires a reviewer assignment");
            if (independent &&
                input.requirement.kind !== "code-review" &&
                run.role !== "browserVerifier")
                throw new DeliveryError("Runtime acceptance requires an independent verifier assignment");
            if (independent && run.native_session !== null) {
                const reused = this.db
                    .prepare("SELECT id FROM invocations WHERE initiative_id=? AND role='implementer' AND native_session=?")
                    .get(input.initiativeId, run.native_session);
                if (reused)
                    throw new DeliveryError("Implementing context cannot certify independent evidence");
            }
            const latest = countSchema.parse(this.db
                .prepare("SELECT COALESCE(MAX(sequence),0) AS count FROM evidence WHERE initiative_id=? AND requirement_id=?")
                .get(input.initiativeId, input.requirement.id)).count;
            const id = randomUUID();
            const binding = JSON.stringify(bindingSchema.parse(input.binding));
            this.db
                .prepare("INSERT INTO evidence(id,initiative_id,requirement_id,kind,sequence,binding_digest,binding,producer_id,status,started_at) VALUES(?,?,?,?,?,?,?,?,'pending',?)")
                .run(id, input.initiativeId, input.requirement.id, input.requirement.kind, latest + 1, sha256(binding), binding, input.producerId, new Date().toISOString());
            return this.evidence(id);
        })
            .immediate();
    }
    evidence(id) {
        return evidenceSchema.parse(this.db.prepare("SELECT * FROM evidence WHERE id=?").get(id));
    }
    assertIndependent(evidence) {
        const run = this.invocation(evidence.producer_id);
        const requiredRole = evidence.kind === "code-review" ? "reviewer" : "browserVerifier";
        if (run.role !== requiredRole || run.native_session === null)
            throw new DeliveryError("Independent evidence requires an observed fresh native reviewer context");
        const reused = this.db
            .prepare("SELECT id FROM invocations WHERE initiative_id=? AND role='implementer' AND native_session=?")
            .get(evidence.initiative_id, run.native_session);
        if (reused)
            throw new DeliveryError("Implementing context cannot certify independent evidence");
    }
    finishEvidence(input) {
        const evidence = this.evidence(input.id);
        if (evidence.status !== "pending")
            throw new DeliveryError("Evidence is immutable after completion");
        const run = this.invocation(evidence.producer_id);
        if (run.termination_confirmed !== 1)
            throw new DeliveryError("Producer must finish before evidence is accepted");
        if (input.passed && run.status !== "completed")
            throw new DeliveryError("An unsuccessful invocation cannot create passing evidence");
        if (input.passed)
            this.assertIndependent(evidence);
        readArtifact(input.artifact);
        this.db
            .prepare("UPDATE evidence SET status=?,artifact_path=?,artifact_digest=?,completed_at=? WHERE id=?")
            .run(input.passed ? "passed" : "failed", input.artifact.path, input.artifact.digest, new Date().toISOString(), input.id);
    }
    readiness(input) {
        const failures = [];
        const initiative = this.get(input.initiativeId);
        if (initiative.state === "cancelled" || initiative.state === "blocked")
            failures.push("Initiative is not authorized to proceed");
        if (initiative.accepted_plan_digest !== input.binding.planDigest)
            failures.push("Accepted plan does not match candidate");
        if (this.runningInvocations().some((run) => run.initiative_id === input.initiativeId))
            failures.push("An invocation still owns the candidate");
        const bindingDigest = sha256(JSON.stringify(bindingSchema.parse(input.binding)));
        if (input.requirements.length === 0)
            failures.push("No acceptance requirements declared");
        for (const requirement of input.requirements) {
            const raw = this.db
                .prepare("SELECT * FROM evidence WHERE initiative_id=? AND requirement_id=? ORDER BY sequence DESC LIMIT 1")
                .get(input.initiativeId, requirement.id);
            if (!raw) {
                failures.push(`${requirement.id}: missing evidence`);
                continue;
            }
            const row = evidenceSchema.parse(raw);
            if (row.binding_digest !== bindingDigest ||
                row.kind !== requirement.kind ||
                row.status !== "passed") {
                failures.push(`${requirement.id}: latest evidence is stale or not passing`);
                continue;
            }
            try {
                readArtifact({
                    path: ensurePresent(row.artifact_path, "Missing evidence artifact"),
                    digest: ensurePresent(row.artifact_digest, "Missing evidence digest"),
                });
            }
            catch {
                failures.push(`${requirement.id}: evidence artifact failed integrity verification`);
            }
            try {
                this.assertIndependent(row);
            }
            catch {
                failures.push(`${requirement.id}: independent provenance is invalid`);
            }
            const run = this.invocation(row.producer_id);
            if (run.status !== "completed" || run.termination_confirmed !== 1)
                failures.push(`${requirement.id}: producer did not finish successfully`);
            if (["browser", "authenticated", "nonproduction-write", "parent-acceptance"].includes(requirement.kind) &&
                (row.completed_at === null ||
                    (input.now ?? Date.now()) - Date.parse(row.completed_at) > input.maxAgeMs))
                failures.push(`${requirement.id}: live evidence expired`);
        }
        return { passed: failures.length === 0, failures };
    }
    beginOperation(input) {
        const payload = JSON.stringify(input.payload);
        const digest = sha256(payload);
        return this.db
            .transaction(() => {
            const old = this.operation(input.key);
            if (old) {
                if (old.intent_digest !== digest)
                    throw new DeliveryError("Operation key reused for different intent");
                return old;
            }
            const now = new Date().toISOString();
            this.db
                .prepare("INSERT INTO operations(key,intent_digest,status,payload,created_at,updated_at) VALUES(?,?,'pending',?,?,?)")
                .run(input.key, digest, payload, now, now);
            return ensurePresent(this.operation(input.key), "Expected persisted operation intent");
        })
            .immediate();
    }
    operation(key) {
        const row = this.db.prepare("SELECT * FROM operations WHERE key=?").get(key);
        return row ? operationSchema.parse(row) : null;
    }
    uncertainOperation(key) {
        this.db
            .prepare("UPDATE operations SET status='uncertain',updated_at=? WHERE key=? AND status<>'confirmed'")
            .run(new Date().toISOString(), key);
    }
    dispatchOperation(key) {
        const result = this.db
            .prepare("UPDATE operations SET status='dispatched',updated_at=? WHERE key=? AND status='pending'")
            .run(new Date().toISOString(), key);
        if (result.changes !== 1)
            throw new DeliveryError("Operation was already dispatched; reconcile before retry");
    }
    confirmOperation(input) {
        const old = ensurePresent(this.operation(input.key), "Expected existing operation");
        if (old.remote_id !== null && old.remote_id !== input.remoteId)
            throw new DeliveryError("Operation has a different remote identity");
        this.db
            .prepare("UPDATE operations SET status='confirmed',remote_id=?,updated_at=? WHERE key=?")
            .run(input.remoteId, new Date().toISOString(), input.key);
    }
    event(input) {
        this.db
            .prepare("INSERT INTO events(initiative_id,kind,detail,at) VALUES(?,?,?,?)")
            .run(input.initiativeId, input.kind, JSON.stringify(input.detail), new Date().toISOString());
    }
}
