import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { writeArtifact } from "../src/artifacts.js";
import type { Binding, Issue, Requirement, Role } from "../src/domain.js";
import { Store } from "../src/store.js";

const issue = (id: string): Issue => ({
  id,
  identifier: id,
  title: "Improve a documented flow",
  description: "An accepted bounded task",
  teamId: "team",
  projectId: "project",
  assigneeId: "owner",
  labels: ["AI-ready"],
  state: "started",
  url: "https://example.invalid/issue",
});
const binding: Binding = {
  planDigest: "plan",
  knowledgeDigest: "knowledge",
  configDigest: "config",
  head: "a".repeat(40),
  base: "b".repeat(40),
  environmentDigest: "environment",
};
const requirement: Requirement = {
  id: "review",
  description: "Independent code acceptance",
  kind: "code-review",
  commandId: null,
};
function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "delivery-store-"));
  const path = join(directory, "state.sqlite");
  const store = new Store({ path, workspaceId: "fixture" });
  return { directory, path, store };
}
function accepted(store: Store, id = "issue") {
  const initiative = store.claim({ issue: issue(id), projectId: "project", profile: "codex" });
  store.recordPlan({ id: initiative.id, digest: "plan" });
  store.acceptPlan({ id: initiative.id, digest: "plan" });
  return initiative;
}
function invocation(input: {
  store: Store;
  id: string;
  initiativeId: string;
  role: Role;
  directory: string;
  session?: string;
}) {
  input.store.beginInvocation({
    id: input.id,
    initiativeId: input.initiativeId,
    role: input.role,
    worktree: join(input.directory, "worktree"),
    model: "requested-model",
  });
  const artifact = writeArtifact({
    directory: input.directory,
    content: JSON.stringify({ findings: [] }),
  });
  input.store.finishInvocation({
    id: input.id,
    status: "completed",
    nativeSessionId: input.session ?? input.id,
    actualModel: null,
    result: artifact,
    terminationConfirmed: true,
  });
  return artifact;
}

test("duplicate issue claims reuse one owner and reject conflicting parent or profile", () => {
  const { store } = fixture();
  const first = store.claim({ issue: issue("one"), projectId: "project", profile: "codex" });
  const second = store.claim({ issue: issue("one"), projectId: "project", profile: "codex" });
  assert.equal(first.owner_id, second.owner_id);
  assert.equal(store.list().length, 1);
  assert.throws(
    () => store.claim({ issue: issue("one"), projectId: "project", profile: "cursor" }),
    /claimed/,
  );
  assert.throws(
    () =>
      store.claim({
        issue: issue("one"),
        projectId: "project",
        profile: "codex",
        parentId: first.id,
      }),
    /claimed/,
  );
  store.close();
});

test("workspace capacity includes all runtime profiles and children share their parent owner", () => {
  const { store } = fixture();
  const parent = store.claim({ issue: issue("one"), projectId: "project", profile: "codex" });
  store.claim({ issue: issue("two"), projectId: "other", profile: "cursor" });
  assert.throws(
    () => store.claim({ issue: issue("three"), projectId: "other", profile: "claude-code" }),
    /capacity/,
  );
  const child = store.claim({
    issue: issue("child"),
    projectId: "project",
    profile: "codex",
    parentId: parent.id,
  });
  assert.equal(child.owner_id, parent.owner_id);
  store.close();
});

test("different workspaces cannot open the same state file", () => {
  const { store, path } = fixture();
  assert.throws(() => new Store({ path, workspaceId: "foreign" }), /another workspace/);
  store.close();
});

test("activation binds the host and configuration; handoff leaves destination inactive", () => {
  const { store } = fixture();
  store.activate({
    hostId: "host-a",
    configDigest: "config",
    profile: "codex",
    conformanceDigest: "proof",
  });
  store.assertActive({ hostId: "host-a", configDigest: "config" });
  assert.throws(() => store.assertActive({ hostId: "host-b", configDigest: "config" }), /inactive/);
  assert.throws(
    () => store.assertActive({ hostId: "host-a", configDigest: "changed" }),
    /configuration/,
  );
  store.pause();
  assert.throws(
    () =>
      store.activate({
        hostId: "host-b",
        configDigest: "config",
        profile: "codex",
        conformanceDigest: "proof",
      }),
    /handoff/,
  );
  store.transferHost({ oldHostId: "host-a", newHostId: "host-b" });
  assert.equal(store.settings().active, 0);
  store.close();
});

test("a changed plan cannot be implemented until accepted again", () => {
  const { store, directory } = fixture();
  const task = accepted(store);
  store.recordPlan({ id: task.id, digest: "changed" });
  assert.throws(
    () =>
      store.beginInvocation({
        id: "writer",
        initiativeId: task.id,
        role: "implementer",
        worktree: directory,
        model: "model",
      }),
    /accepted plan/,
  );
  assert.throws(() => store.acceptPlan({ id: task.id, digest: "plan" }), /stale/);
  store.close();
});

test("termination must be confirmed before reservations or ownership are released", () => {
  const { store, directory } = fixture();
  const task = accepted(store);
  store.beginInvocation({
    id: "writer",
    initiativeId: task.id,
    role: "implementer",
    worktree: directory,
    model: "model",
  });
  store.reserveHeavy("writer");
  const artifact = writeArtifact({ directory, content: "{}" });
  store.finishInvocation({
    id: "writer",
    status: "timed-out",
    nativeSessionId: null,
    actualModel: null,
    result: artifact,
    terminationConfirmed: false,
  });
  assert.equal(store.runningInvocations().length, 1);
  assert.throws(
    () =>
      store.handoff({
        id: task.id,
        previousOwner: task.owner_id,
        newOwner: "new",
        profile: "cursor",
        checkpoint: {},
      }),
    /Stop owned/,
  );
  store.finishInvocation({
    id: "writer",
    status: "timed-out",
    nativeSessionId: null,
    actualModel: null,
    result: artifact,
    terminationConfirmed: true,
  });
  assert.equal(store.runningInvocations().length, 0);
  store.handoff({
    id: task.id,
    previousOwner: task.owner_id,
    newOwner: "new",
    profile: "cursor",
    checkpoint: { next: "resume" },
  });
  assert.equal(store.get(task.id).profile, "cursor");
  store.close();
});

test("new pending and failed attempts supersede old passing evidence", () => {
  const { store, directory } = fixture();
  const task = accepted(store);
  const artifact = invocation({
    store,
    id: "reviewer",
    initiativeId: task.id,
    role: "reviewer",
    directory,
  });
  const first = store.beginEvidence({
    initiativeId: task.id,
    requirement,
    binding,
    producerId: "reviewer",
  });
  store.finishEvidence({ id: first.id, passed: true, artifact });
  const assess = () =>
    store.readiness({
      initiativeId: task.id,
      requirements: [requirement],
      binding,
      maxAgeMs: 10_000,
    });
  assert.equal(assess().passed, true);
  const second = store.beginEvidence({
    initiativeId: task.id,
    requirement,
    binding,
    producerId: "reviewer",
  });
  assert.equal(assess().passed, false);
  store.finishEvidence({ id: second.id, passed: false, artifact });
  assert.equal(assess().passed, false);
  assert.throws(() => store.finishEvidence({ id: second.id, passed: true, artifact }), /immutable/);
  store.close();
});

test("changed candidate, missing journey and changed artifacts fail readiness", () => {
  const { store, directory } = fixture();
  const task = accepted(store);
  const artifact = invocation({
    store,
    id: "reviewer",
    initiativeId: task.id,
    role: "reviewer",
    directory,
  });
  const evidence = store.beginEvidence({
    initiativeId: task.id,
    requirement,
    binding,
    producerId: "reviewer",
  });
  store.finishEvidence({ id: evidence.id, passed: true, artifact });
  assert.equal(
    store.readiness({
      initiativeId: task.id,
      requirements: [requirement],
      binding: { ...binding, base: "c".repeat(40) },
      maxAgeMs: 10_000,
    }).passed,
    false,
  );
  assert.equal(
    store.readiness({
      initiativeId: task.id,
      requirements: [requirement, { ...requirement, id: "another" }],
      binding,
      maxAgeMs: 10_000,
    }).passed,
    false,
  );
  writeFileSync(artifact.path, "changed");
  assert.equal(
    store.readiness({
      initiativeId: task.id,
      requirements: [requirement],
      binding,
      maxAgeMs: 10_000,
    }).passed,
    false,
  );
  store.close();
});

test("an implementing session cannot become an independent reviewer", () => {
  const { store, directory } = fixture();
  const task = accepted(store);
  invocation({
    store,
    id: "writer",
    initiativeId: task.id,
    role: "implementer",
    directory,
    session: "reused",
  });
  invocation({
    store,
    id: "reviewer",
    initiativeId: task.id,
    role: "reviewer",
    directory,
    session: "reused",
  });
  assert.throws(
    () =>
      store.beginEvidence({ initiativeId: task.id, requirement, binding, producerId: "writer" }),
    /reviewer assignment/,
  );
  assert.throws(
    () =>
      store.beginEvidence({ initiativeId: task.id, requirement, binding, producerId: "reviewer" }),
    /Implementing context/,
  );
  store.close();
});

test("cancellation preserves process ownership and prevents new dispatch", () => {
  const { store, directory } = fixture();
  const task = accepted(store);
  store.beginInvocation({
    id: "writer",
    initiativeId: task.id,
    role: "implementer",
    worktree: directory,
    model: "model",
  });
  assert.equal(store.cancel(task.id).length, 1);
  assert.equal(store.runningInvocations().length, 1);
  assert.throws(
    () =>
      store.beginInvocation({
        id: "new",
        initiativeId: task.id,
        role: "reviewer",
        worktree: directory,
        model: "model",
      }),
    /not runnable/,
  );
  store.close();
});

test("unknown external outcomes retain intent and cannot reuse keys for different writes", () => {
  const { store } = fixture();
  store.beginOperation({ key: "operation", payload: { title: "original" } });
  store.uncertainOperation("operation");
  assert.equal(
    store.beginOperation({ key: "operation", payload: { title: "original" } }).status,
    "uncertain",
  );
  assert.throws(
    () => store.beginOperation({ key: "operation", payload: { title: "different" } }),
    /different intent/,
  );
  store.confirmOperation({ key: "operation", remoteId: "remote" });
  assert.equal(store.operation("operation")?.remote_id, "remote");
  assert.throws(
    () => store.confirmOperation({ key: "operation", remoteId: "different" }),
    /different remote/,
  );
  store.close();
});

test("concurrent processes claiming one issue receive one persistent identity", async () => {
  const { store, path } = fixture();
  const module = resolve("src/store.ts");
  const script = `import {Store} from ${JSON.stringify(module)}; const s=new Store({path:${JSON.stringify(path)},workspaceId:'fixture'}); const r=s.claim({issue:${JSON.stringify(issue("race"))},projectId:'project',profile:'codex'}); process.stdout.write(r.id); s.close();`;
  const run = () =>
    new Promise<string>((done, reject) => {
      const child = spawn(
        process.execPath,
        ["--import", "tsx", "--input-type=module", "-e", script],
        { stdio: ["ignore", "pipe", "pipe"] },
      );
      let output = "";
      let error = "";
      child.stdout.on("data", (data: Buffer) => {
        output += data.toString();
      });
      child.stderr.on("data", (data: Buffer) => {
        error += data.toString();
      });
      child.on("error", reject);
      child.on("close", (code) => {
        if (code === 0) done(output);
        else reject(new Error(error));
      });
    });
  const ids = await Promise.all([run(), run(), run()]);
  assert.equal(new Set(ids).size, 1);
  assert.equal(store.list().length, 1);
  store.close();
});
