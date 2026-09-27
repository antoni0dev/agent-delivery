import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import { mkdirSync, mkdtempSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import { z } from "zod";
import { writeArtifact } from "../src/artifacts.js";
import { configDigest, type Project, workspaceConfigSchema } from "../src/config.js";
import { type Issue, issueSchema } from "../src/domain.js";
import { commitImplementation } from "../src/git.js";
import { acquireExecutionLock } from "../src/host/execution-lock.js";
import { processGroupAlive } from "../src/runtime/process.js";
import { Store } from "../src/store.js";
import { createControllerFixture } from "./controller-fixture.test.js";

function issue(id: string): Issue {
  return issueSchema.parse({
    id,
    identifier: id.toUpperCase(),
    title: "Harden an accepted delivery",
    description: "Exercise the persisted acceptance boundary.",
    teamId: "team",
    projectId: "project",
    assigneeId: "owner",
    labels: ["AI-ready"],
    state: "In Progress",
    url: `https://issues.example.test/${id}`,
  });
}

function createStoreFixture() {
  const root = mkdtempSync(join(tmpdir(), "acceptance-store-"));
  const path = join(root, "state.sqlite");
  const store = new Store({ path, workspaceId: "acceptance-fixture" });
  store.activate({
    hostId: "fixture-host",
    configDigest: "fixture-config",
    profile: "codex",
    conformanceDigest: "fixture-proof",
  });
  return {
    root,
    path,
    store,
    cleanup: () => {
      store.close();
      rmSync(root, { recursive: true, force: true });
    },
  };
}

function accepted(store: Store, id: string) {
  const task = store.claim({ issue: issue(id), projectId: "project", profile: "codex" });
  store.recordPlan({ id: task.id, digest: `plan-${id}` });
  store.acceptPlan({ id: task.id, digest: `plan-${id}` });
  return task;
}

test("a live recorded process retains invocation and host resource ownership", async (context) => {
  const fixture = createStoreFixture();
  context.after(fixture.cleanup);
  const owner = accepted(fixture.store, "owner");
  const contender = accepted(fixture.store, "contender");
  fixture.store.beginInvocation({
    id: "owner-run",
    initiativeId: owner.id,
    role: "browserVerifier",
    worktree: join(fixture.root, "owner-worktree"),
    model: "fixture-model",
  });
  fixture.store.reserveHeavy("owner-run");
  const child = spawn(process.execPath, ["-e", "setInterval(() => undefined, 1000)"], {
    detached: true,
    stdio: "ignore",
  });
  await once(child, "spawn");
  const pid = child.pid;
  assert.ok(pid);
  context.after(() => {
    if (processGroupAlive(pid)) process.kill(-pid, "SIGKILL");
  });
  fixture.store.started({ id: "owner-run", pid });
  fixture.store.beginInvocation({
    id: "contender-run",
    initiativeId: contender.id,
    role: "reviewer",
    worktree: join(fixture.root, "contender-worktree"),
    model: "fixture-model",
  });
  const artifact = writeArtifact({
    directory: join(fixture.root, "artifacts"),
    content: JSON.stringify({ result: "finished" }),
  });

  assert.throws(
    () =>
      fixture.store.finishInvocation({
        id: "owner-run",
        status: "completed",
        nativeSessionId: "owner-session",
        actualModel: "fixture-model",
        result: artifact,
        terminationConfirmed: true,
      }),
    /still alive.*reservation retained/,
  );
  assert.equal(
    fixture.store.runningInvocations().some(({ id }) => id === "owner-run"),
    true,
  );
  assert.throws(() => fixture.store.reserveHeavy("contender-run"), /occupied/);

  process.kill(-pid, "SIGTERM");
  await once(child, "exit");
  assert.equal(processGroupAlive(pid), false);
  fixture.store.finishInvocation({
    id: "owner-run",
    status: "completed",
    nativeSessionId: "owner-session",
    actualModel: "fixture-model",
    result: artifact,
    terminationConfirmed: true,
  });
  fixture.store.reserveHeavy("contender-run");
  fixture.store.finishInvocation({
    id: "contender-run",
    status: "completed",
    nativeSessionId: "contender-session",
    actualModel: "fixture-model",
    result: artifact,
    terminationConfirmed: true,
  });
});

test("cancellation wins before merge dispatch and fences cancellation after dispatch", async (context) => {
  await context.test("before dispatch", (subcontext) => {
    const fixture = createStoreFixture();
    subcontext.after(fixture.cleanup);
    const task = accepted(fixture.store, "before-dispatch");
    const key = "merge-before-dispatch";
    fixture.store.beginOperation({ key, payload: { initiativeId: task.id } });

    assert.deepEqual(fixture.store.cancel(task.id), []);
    assert.equal(fixture.store.get(task.id).state, "cancelled");
    assert.throws(
      () => fixture.store.dispatchMerge({ key, initiativeId: task.id }),
      /revoked before dispatch/,
    );
    assert.equal(fixture.store.operation(key)?.status, "pending");
  });

  await context.test("after dispatch", (subcontext) => {
    const fixture = createStoreFixture();
    subcontext.after(fixture.cleanup);
    const task = accepted(fixture.store, "after-dispatch");
    const key = "merge-after-dispatch";
    fixture.store.beginOperation({ key, payload: { initiativeId: task.id } });
    fixture.store.dispatchMerge({ key, initiativeId: task.id });

    assert.throws(() => fixture.store.cancel(task.id), /already dispatched merge/);
    assert.equal(fixture.store.get(task.id).state, "blocked");
    assert.equal(fixture.store.hasCancellationFence(task.id), true);
    assert.equal(fixture.store.operation(key)?.status, "dispatched");
  });
});

test("family cancellation preserves independently dispatched and coupled parent merges", async (context) => {
  await context.test("independent child merge", (subcontext) => {
    const fixture = createStoreFixture();
    subcontext.after(fixture.cleanup);
    const parent = accepted(fixture.store, "independent-parent");
    const child = fixture.store.claim({
      issue: issue("independent-child"),
      projectId: "project",
      profile: "codex",
      parentId: parent.id,
    });
    const key = "independent-child-merge";
    fixture.store.beginOperation({ key, payload: { initiativeId: child.id } });
    fixture.store.dispatchMerge({ key, initiativeId: child.id });

    assert.throws(() => fixture.store.cancel(parent.id), /already dispatched merge/);
    assert.equal(fixture.store.get(parent.id).state, "cancelled");
    assert.equal(fixture.store.get(child.id).state, "blocked");
    assert.equal(fixture.store.hasCancellationFence(parent.id), false);
    assert.equal(fixture.store.hasCancellationFence(child.id), true);
  });

  await context.test("coupled child redirects to parent", (subcontext) => {
    const fixture = createStoreFixture();
    subcontext.after(fixture.cleanup);
    const parent = accepted(fixture.store, "coupled-parent");
    const child = fixture.store.claim({
      issue: issue("coupled-child"),
      projectId: "project",
      profile: "codex",
      parentId: parent.id,
    });
    fixture.store.update({
      id: child.id,
      state: "waiting",
      stage: "accept",
      reason: "Managed by parent candidate",
      checkpoint: { managedByParent: true },
    });
    const key = "coupled-parent-merge";
    fixture.store.beginOperation({ key, payload: { initiativeId: parent.id } });
    fixture.store.dispatchMerge({ key, initiativeId: parent.id });

    assert.throws(() => fixture.store.cancel(child.id), /already dispatched merge/);
    assert.equal(fixture.store.get(parent.id).state, "blocked");
    assert.equal(fixture.store.get(child.id).state, "blocked");
    assert.equal(fixture.store.hasCancellationFence(parent.id), true);
    assert.equal(fixture.store.hasCancellationFence(child.id), false);
    assert.match(fixture.store.get(child.id).reason ?? "", /awaits in-flight merge/);
  });
});

test("the host execution database serializes one anonymous slot and releases it", () => {
  const root = mkdtempSync(join(tmpdir(), "host-execution-lock-"));
  const path = join(root, "execution.sqlite");
  let firstReleased = false;
  const first = acquireExecutionLock({ token: "first-anonymous-run", path });
  try {
    assert.throws(
      () => acquireExecutionLock({ token: "second-anonymous-run", path }),
      /slot is occupied/,
    );
    const db = new Database(path, { readonly: true });
    const count = z
      .object({ count: z.number() })
      .parse(db.prepare("SELECT COUNT(*) AS count FROM execution").get()).count;
    db.close();
    assert.equal(count, 1);
    first.release();
    firstReleased = true;
    const second = acquireExecutionLock({ token: "second-anonymous-run", path });
    second.release();
  } finally {
    if (!firstReleased) first.release();
    rmSync(root, { recursive: true, force: true });
  }
});

type GitFixture = {
  root: string;
  repository: string;
  worktree: string;
  project: Project;
  cleanup: () => void;
};

function runGit(cwd: string, args: string[], env?: NodeJS.ProcessEnv): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...(env === undefined ? {} : { env }),
  }).trim();
}

function createGitFixture(): GitFixture {
  const root = mkdtempSync(join(tmpdir(), "commit-hardening-"));
  const repository = join(root, "repository");
  const worktree = join(root, "worktree");
  mkdirSync(repository);
  runGit(repository, ["init", "-b", "main"]);
  runGit(repository, ["config", "user.name", "Configured Author"]);
  runGit(repository, ["config", "user.email", "configured@example.test"]);
  runGit(repository, ["config", "extensions.worktreeConfig", "true"]);
  runGit(repository, ["remote", "add", "origin", "git@github.com:example/hardening.git"]);
  writeFileSync(join(repository, "kept.txt"), "base\n");
  writeFileSync(join(repository, "removed.txt"), "remove me\n");
  mkdirSync(join(repository, ".private"));
  writeFileSync(join(repository, ".private", "tracked.txt"), "remove private file\n");
  runGit(repository, ["add", "--", "kept.txt", "removed.txt", ".private/tracked.txt"]);
  runGit(repository, ["commit", "-m", "chore: create fixture"]);
  runGit(repository, ["update-ref", "refs/remotes/origin/main", "HEAD"]);
  runGit(repository, [
    "worktree",
    "add",
    "-b",
    "delivery/hardening",
    worktree,
    "refs/remotes/origin/main",
  ]);
  const config = workspaceConfigSchema.parse({
    schemaVersion: 1,
    workspaceId: "git-fixture",
    stateDirectory: join(root, "state"),
    knowledgeRoot: join(root, "knowledge"),
    intakeRuntimeProfile: "codex",
    runtimes: { codex: "codex", "claude-code": "claude", cursor: "cursor" },
    linear: {
      workspaceId: "workspace",
      assigneeId: "owner",
      readyLabel: "AI-ready",
      credential: { kind: "environment", name: "FIXTURE_LINEAR_TOKEN" },
    },
    github: {
      hostname: "github.com",
      login: "configured-login",
      credential: { kind: "environment", name: "FIXTURE_GITHUB_TOKEN" },
    },
    authority: {
      grantReference: "fixture",
      updateOwnedIssues: true,
      createScopedChildren: true,
      pushFeatureBranches: true,
      openPullRequests: true,
      mergeDevelopment: true,
    },
    capacity: { initiatives: 1, writers: 1 },
    projects: [
      {
        id: "project",
        root: repository,
        repository: "example/hardening",
        remote: "git@github.com:example/hardening.git",
        defaultBranch: "main",
        gitIdentity: { name: "Configured Author", email: "configured@example.test" },
        teamIds: ["team"],
        projectIds: [],
        instructions: [],
        commands: { check: { executable: "true", args: [] } },
        environment: {
          name: "fixture",
          production: false,
          mainnet: false,
          authentication: "none",
          mutations: "disabled",
          allowedChainIds: [],
          configurationFiles: [],
          variables: [],
        },
        release: {
          targetBranch: "main",
          method: "squash",
          deploysProduction: false,
          strictCurrentBase: true,
          requiredChecks: ["check"],
        },
      },
    ],
    notifications: { linear: false, desktop: false },
    liveEvidenceMaxAgeMs: 60_000,
  });
  const project = config.projects[0];
  assert.ok(project);
  return {
    root,
    repository,
    worktree,
    project,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

test("controller commit hooks cannot add unreviewed files to the candidate", (context) => {
  const fixture = createGitFixture();
  context.after(fixture.cleanup);
  const hook = join(fixture.repository, ".git", "hooks", "pre-commit");
  writeFileSync(hook, "#!/bin/sh\nprintf fixture > .env\ngit add .env\n", { mode: 0o700 });
  writeFileSync(join(fixture.worktree, "kept.txt"), "approved change\n");
  commitImplementation({
    project: fixture.project,
    cwd: fixture.worktree,
    title: "update fixture",
  });
  assert.equal(runGit(fixture.worktree, ["ls-tree", "--name-only", "HEAD", ".env"]), "");
  assert.equal(runGit(fixture.worktree, ["status", "--porcelain"]), "");
});

test("commitImplementation stages deletions, permits private removal, and pins author identity", async (context) => {
  await context.test("deleted tracked paths", (subcontext) => {
    const fixture = createGitFixture();
    subcontext.after(fixture.cleanup);
    unlinkSync(join(fixture.worktree, "removed.txt"));
    unlinkSync(join(fixture.worktree, ".private", "tracked.txt"));

    const head = commitImplementation({
      project: fixture.project,
      cwd: fixture.worktree,
      title: "Remove obsolete files",
    });

    assert.equal(runGit(fixture.worktree, ["status", "--porcelain"]), "");
    assert.equal(runGit(fixture.worktree, ["rev-parse", "HEAD"]), head);
    assert.doesNotMatch(
      runGit(fixture.worktree, ["ls-tree", "-r", "--name-only", "HEAD"]),
      /removed|tracked/,
    );
  });

  await context.test("environment cannot override configured author", (subcontext) => {
    const fixture = createGitFixture();
    subcontext.after(fixture.cleanup);
    writeFileSync(join(fixture.worktree, "kept.txt"), "feature\n");
    const previousName = process.env.GIT_AUTHOR_NAME;
    const previousEmail = process.env.GIT_AUTHOR_EMAIL;
    process.env.GIT_AUTHOR_NAME = "Injected Author";
    process.env.GIT_AUTHOR_EMAIL = "injected@example.test";
    try {
      commitImplementation({
        project: fixture.project,
        cwd: fixture.worktree,
        title: "Pin commit identity",
      });
    } finally {
      restoreEnvironment("GIT_AUTHOR_NAME", previousName);
      restoreEnvironment("GIT_AUTHOR_EMAIL", previousEmail);
    }
    assert.equal(
      runGit(fixture.worktree, ["show", "-s", "--format=%an|%ae|%cn|%ce", "HEAD"]),
      "Configured Author|configured@example.test|Configured Author|configured@example.test",
    );
  });
});

test("commitImplementation rejects worktree identity drift and private candidate content", async (context) => {
  await context.test("worktree-local identity mismatch", (subcontext) => {
    const fixture = createGitFixture();
    subcontext.after(fixture.cleanup);
    runGit(fixture.worktree, ["config", "--worktree", "user.email", "wrong@example.test"]);
    writeFileSync(join(fixture.worktree, "kept.txt"), "changed\n");

    assert.throws(
      () =>
        commitImplementation({
          project: fixture.project,
          cwd: fixture.worktree,
          title: "Reject identity drift",
        }),
      /commit identity differs/,
    );
  });

  await context.test("precommitted private artifact", (subcontext) => {
    const fixture = createGitFixture();
    subcontext.after(fixture.cleanup);
    writeFileSync(join(fixture.worktree, ".env"), "PRIVATE=value\n");
    runGit(fixture.worktree, ["add", ".env"]);
    runGit(fixture.worktree, ["commit", "-m", "test: precommit private fixture"]);

    assert.throws(
      () =>
        commitImplementation({
          project: fixture.project,
          cwd: fixture.worktree,
          title: "Reject precommitted private content",
        }),
      /private artifact/,
    );
  });

  await context.test("staged private artifact", (subcontext) => {
    const fixture = createGitFixture();
    subcontext.after(fixture.cleanup);
    writeFileSync(join(fixture.worktree, ".env.local"), "PRIVATE=value\n");
    runGit(fixture.worktree, ["add", ".env.local"]);

    assert.throws(
      () =>
        commitImplementation({
          project: fixture.project,
          cwd: fixture.worktree,
          title: "Reject staged private content",
        }),
      /private artifact/,
    );
  });
  await context.test("untracked credential configuration", (subcontext) => {
    const fixture = createGitFixture();
    subcontext.after(fixture.cleanup);
    writeFileSync(join(fixture.worktree, ".mcp.json"), "{}\n");
    assert.throws(
      () =>
        commitImplementation({
          project: fixture.project,
          cwd: fixture.worktree,
          title: "Reject private config",
        }),
      /private artifact/,
    );
    assert.equal(runGit(fixture.worktree, ["diff", "--cached", "--name-only"]), "");
  });
});

test("controller replan preserves the invalidation record and clears the frozen plan", async (context) => {
  const fixture = createControllerFixture();
  context.after(fixture.cleanup);
  const task = fixture.store.claim({
    issue: fixture.issue,
    projectId: "project",
    profile: "codex",
  });
  fixture.store.recordPlan({ id: task.id, digest: "accepted-plan" });
  fixture.store.acceptPlan({ id: task.id, digest: "accepted-plan" });
  fixture.store.update({
    id: task.id,
    state: "blocked",
    stage: "implement",
    reason: "Released guidance changed after acceptance",
    checkpoint: {
      worktree: join(fixture.root, "worktree"),
      branch: "delivery/replan",
      pr: 23,
    },
  });

  await fixture.controller.replan(task.id);

  const replanned = fixture.store.get(task.id);
  assert.equal(replanned.state, "queued");
  assert.equal(replanned.stage, "plan");
  assert.equal(replanned.plan_digest, null);
  assert.equal(replanned.accepted_plan_digest, null);
  assert.equal(replanned.plan_rounds, 0);
  assert.deepEqual(JSON.parse(replanned.checkpoint), {
    worktree: join(fixture.root, "worktree"),
    branch: "delivery/replan",
    pr: 23,
  });
  const db = new Database(join(fixture.config.stateDirectory, "controller.sqlite"), {
    readonly: true,
  });
  const event = z
    .object({ kind: z.string(), detail: z.string() })
    .parse(
      db
        .prepare("SELECT kind,detail FROM events WHERE initiative_id=? AND kind='plan-invalidated'")
        .get(task.id),
    );
  db.close();
  const detail = z
    .object({
      previousIssue: issueSchema,
      previousPlan: z.string(),
      newIssue: issueSchema,
    })
    .parse(JSON.parse(event.detail));
  assert.equal(event.kind, "plan-invalidated");
  assert.deepEqual(detail.previousIssue, fixture.issue);
  assert.equal(detail.previousPlan, "accepted-plan");
  assert.deepEqual(detail.newIssue, fixture.issue);
});

test("verification setup failure leaves pending evidence from a failed producer", async (context) => {
  const variable = "MISSING_ACCEPTANCE_HARDENING_VALUE";
  const fixture = createControllerFixture();
  context.after(fixture.cleanup);
  delete process.env[variable];
  const project = fixture.config.projects[0];
  assert.ok(project);
  project.environment.variables.push(variable);
  fixture.store.activate({
    hostId: "fixture-host",
    profile: fixture.config.intakeRuntimeProfile,
    configDigest: configDigest(fixture.config),
    conformanceDigest: "fixture-conformance",
  });

  await fixture.controller.run({
    profile: "codex",
    issueId: fixture.issue.id,
    projectId: project.id,
  });

  const task = fixture.store.findByIssue(fixture.issue.id);
  assert.ok(task);
  assert.equal(task.state, "blocked");
  assert.equal(task.stage, "verify");
  assert.match(task.reason ?? "", /Missing configured verification variable/);
  assert.deepEqual(fixture.commandCalls, []);
  assert.deepEqual(fixture.githubCalls.merged, []);
  const db = new Database(join(fixture.config.stateDirectory, "controller.sqlite"), {
    readonly: true,
  });
  const evidence = z
    .array(
      z.object({
        requirement_id: z.string(),
        status: z.string(),
        producer_status: z.string(),
      }),
    )
    .parse(
      db
        .prepare(
          "SELECT evidence.requirement_id,evidence.status,invocations.status AS producer_status FROM evidence JOIN invocations ON invocations.id=evidence.producer_id WHERE evidence.initiative_id=? AND evidence.kind<>'code-review' ORDER BY evidence.requirement_id",
        )
        .all(task.id),
    );
  db.close();
  assert.deepEqual(evidence, [
    { requirement_id: "browser", status: "pending", producer_status: "failed" },
    { requirement_id: "unit", status: "pending", producer_status: "failed" },
  ]);
});

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
