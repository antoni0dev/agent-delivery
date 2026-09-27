import assert from "node:assert/strict";
import { join } from "node:path";
import test from "node:test";
import { writeArtifact } from "../src/artifacts.js";
import { issueSchema } from "../src/domain.js";
import { readKnowledgeEligibility } from "../src/knowledge/eligibility.js";
import { createControllerFixture, fixtureBase, fixtureHead } from "./controller-fixture.test.js";

test("a recorded destination cannot be rebound through a renamed config", (context) => {
  const fixture = createControllerFixture();
  context.after(fixture.cleanup);
  assert.throws(
    () =>
      fixture.store.bindDestination({
        tracker: "other-workspace",
        organization: "example",
        projects: [],
      }),
    /another tracker/,
  );
  assert.throws(
    () =>
      fixture.store.bindDestination({
        tracker: fixture.config.linear.workspaceId,
        organization: "another-organization",
        projects: [],
      }),
    /another tracker/,
  );
  assert.throws(
    () =>
      fixture.store.bindDestination({
        tracker: fixture.config.linear.workspaceId,
        organization: "example",
        projects: [{ id: "project", repository: "example/different" }],
      }),
    /different repository/,
  );
});

test("a dispatched merge cannot be abandoned by replanning", (context) => {
  const fixture = createControllerFixture();
  context.after(fixture.cleanup);
  const task = fixture.store.claim({
    issue: fixture.issue,
    projectId: "project",
    profile: "codex",
  });
  fixture.store.beginOperation({
    key: "merge",
    payload: { initiativeId: task.id, head: "candidate", base: "base" },
  });
  fixture.store.dispatchMerge({ key: "merge", initiativeId: task.id });
  assert.throws(
    () => fixture.store.replan({ id: task.id, issue: fixture.issue, checkpoint: {} }),
    /Reconcile the dispatched merge/,
  );
});

test("terminal child history survives an explicitly requested parent replan", (context) => {
  const fixture = createControllerFixture();
  context.after(fixture.cleanup);
  const parent = fixture.store.claim({
    issue: fixture.issue,
    projectId: "project",
    profile: "codex",
  });
  const child = fixture.store.claim({
    issue: issueSchema.parse({ ...fixture.issue, id: "child" }),
    projectId: "project",
    profile: "codex",
    parentId: parent.id,
  });
  fixture.store.update({ id: child.id, state: "completed", stage: "accept", reason: null });
  fixture.store.replan({ id: parent.id, issue: fixture.issue, checkpoint: {} });
  assert.equal(fixture.store.get(parent.id).stage, "plan");
  assert.equal(fixture.store.get(child.id).state, "completed");
  assert.throws(() => fixture.store.cancel(child.id), /history cannot be cancelled/);
});

test("semantic source approval alone cannot authorize portability", (context) => {
  const fixture = createControllerFixture();
  context.after(fixture.cleanup);
  writeArtifact({
    directory: join(fixture.root, "artifacts"),
    content: JSON.stringify({ approved: true }),
  });
  assert.throws(
    () => readKnowledgeEligibility({ root: fixture.root }),
    /permitted-use review is unresolved/,
  );
});

test("cancelled in-flight merge records the confirmed remote operation before completion", async (context) => {
  const fixture = createControllerFixture();
  context.after(fixture.cleanup);
  fixture.setMergeHook(() => {
    const task = fixture.store.findByIssue(fixture.issue.id);
    assert.ok(task);
    assert.throws(() => fixture.store.cancel(task.id), /already dispatched/);
    throw new Error("Response lost after merge");
  });
  await fixture.controller.run({
    profile: "codex",
    issueId: fixture.issue.id,
    projectId: "project",
  });
  const task = fixture.store.findByIssue(fixture.issue.id);
  assert.ok(task);
  assert.equal(task.state, "blocked");
  const key = `${fixture.config.workspaceId}:${task.id}:merge:${fixtureHead}:${fixtureBase}`;
  assert.equal(fixture.store.operation(key)?.status, "uncertain");
  await fixture.controller.tick();
  assert.equal(fixture.store.get(task.id).state, "completed");
  assert.equal(fixture.store.operation(key)?.status, "confirmed");
  assert.equal(fixture.store.operation(key)?.remote_id, "d".repeat(40));
  assert.equal(fixture.githubCalls.merged.length, 1);
});

test("a required command failure is repaired and rerun before delivery", async (context) => {
  const fixture = createControllerFixture({ failFirstCommand: true });
  context.after(fixture.cleanup);
  await fixture.controller.run({
    profile: "codex",
    issueId: fixture.issue.id,
    projectId: "project",
  });
  const task = fixture.store.findByIssue(fixture.issue.id);
  assert.ok(task);
  assert.equal(task.state, "completed");
  assert.equal(task.repair_rounds, 1);
  assert.equal(fixture.runtimeCalls.filter(({ role }) => role === "browserVerifier").length, 2);
  assert.equal(fixture.commandCalls.filter(({ command }) => command.args[0] === "unit").length, 2);
  assert.equal(fixture.githubCalls.merged.length, 1);
});

test("terminal CI failure enters bounded repair instead of waiting forever", async (context) => {
  const fixture = createControllerFixture({ failFirstCi: true });
  context.after(fixture.cleanup);
  await fixture.controller.run({
    profile: "codex",
    issueId: fixture.issue.id,
    projectId: "project",
  });
  const task = fixture.store.findByIssue(fixture.issue.id);
  assert.ok(task);
  assert.equal(task.state, "completed");
  assert.equal(task.repair_rounds, 1);
  assert.equal(fixture.githubCalls.requiredChecks.length, 2);
  assert.equal(fixture.githubCalls.markedDraft.length, 1);
  assert.equal(fixture.githubCalls.merged.length, 1);
  assert.equal(fixture.runtimeCalls.filter(({ role }) => role === "reviewer").length, 2);
});

test("handoff cannot transfer a dispatched merge to a second owner", (context) => {
  const fixture = createControllerFixture();
  context.after(fixture.cleanup);
  const task = fixture.store.claim({
    issue: fixture.issue,
    projectId: "project",
    profile: "codex",
  });
  fixture.store.beginOperation({ key: "merge-handoff", payload: { initiativeId: task.id } });
  fixture.store.dispatchMerge({ key: "merge-handoff", initiativeId: task.id });
  assert.throws(
    () =>
      fixture.store.handoff({
        id: task.id,
        previousOwner: task.owner_id,
        newOwner: "new-owner",
        profile: "cursor",
        checkpoint: {},
      }),
    /in-flight merge/,
  );
  assert.equal(fixture.store.get(task.id).owner_id, task.owner_id);
});

test("plan publication must read back its complete frozen contract", async (context) => {
  const fixture = createControllerFixture({ truncatePublishedPlan: true });
  context.after(fixture.cleanup);
  await fixture.controller.run({
    profile: "codex",
    issueId: fixture.issue.id,
    projectId: "project",
  });
  const task = fixture.store.findByIssue(fixture.issue.id);
  assert.ok(task);
  assert.equal(task.state, "blocked");
  assert.match(task.reason ?? "", /read back/);
  assert.equal(
    fixture.runtimeCalls.some(({ role }) => role === "implementer"),
    false,
  );
});

test("verification cannot accept a dirty tree with an unchanged head", async (context) => {
  const fixture = createControllerFixture();
  context.after(fixture.cleanup);
  fixture.setRuntimeHook(({ role }) => {
    if (role === "browserVerifier") fixture.setDirty(true);
  });
  await fixture.controller.run({
    profile: "codex",
    issueId: fixture.issue.id,
    projectId: "project",
  });
  const task = fixture.store.findByIssue(fixture.issue.id);
  assert.ok(task);
  assert.equal(task.state, "blocked");
  assert.equal(task.stage, "verify");
  assert.equal(fixture.githubCalls.merged.length, 0);
});

test("related open work blocks duplicate planning and branch creation", async (context) => {
  const fixture = createControllerFixture({
    relatedPullRequests: [
      {
        number: 17,
        url: "https://github.com/example/controller-fixture/pull/17",
        head: fixtureHead,
        base: fixtureBase,
        headBranch: "existing-work",
        baseBranch: "development",
        draft: true,
        merged: false,
        mergeCommit: null,
      },
    ],
  });
  context.after(fixture.cleanup);
  await fixture.controller.run({
    profile: "codex",
    issueId: fixture.issue.id,
    projectId: "project",
  });
  const task = fixture.store.findByIssue(fixture.issue.id);
  assert.ok(task);
  assert.equal(task.state, "blocked");
  assert.match(task.reason ?? "", /pull\/17/);
  assert.equal(fixture.runtimeCalls.length, 0);
  assert.equal(fixture.gitCalls.length, 0);
  assert.equal(fixture.githubCalls.merged.length, 0);
});

test("pause during scheduled intake prevents a new ownership claim", async (context) => {
  const fixture = createControllerFixture();
  context.after(fixture.cleanup);
  fixture.setIntakeHook(() => fixture.store.pause());
  await assert.rejects(fixture.controller.tick(), /Workspace inactive/);
  assert.equal(fixture.store.list().length, 0);
  assert.equal(fixture.runtimeCalls.length, 0);
});

test("pause during an explicit issue read prevents a new ownership claim", async (context) => {
  const fixture = createControllerFixture();
  context.after(fixture.cleanup);
  fixture.setIssueReadHook(() => fixture.store.pause());
  await assert.rejects(
    fixture.controller.run({ profile: "codex", issueId: fixture.issue.id, projectId: "project" }),
    /Workspace inactive/,
  );
  assert.equal(fixture.store.list().length, 0);
  assert.equal(fixture.runtimeCalls.length, 0);
});
