import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { issueSchema } from "../src/domain.js";
import { createControllerFixture } from "./controller-fixture.test.js";

const intake = { mode: "private", automaticOthers: true } as const;

test("private intake baselines backlog and only delivers newly observed other-created assignments", async (context) => {
  const f = createControllerFixture({ intake });
  context.after(f.cleanup);
  f.admitIssue({ ...f.issue, creatorId: "colleague", labels: [] });
  await f.controller.tick();
  assert.equal(f.store.list().length, 0);
  for (const [id, creatorId, stateType] of [
    ["new-other", "colleague", "unstarted"],
    ["new-self", f.config.linear.assigneeId, "unstarted"],
    ["new-unknown", null, "unstarted"],
    ["new-done", "colleague", "completed"],
  ]) {
    f.admitIssue(issueSchema.parse({ ...f.issue, id, creatorId, labels: [], stateType }));
  }
  await f.controller.tick();
  assert.equal(f.store.findByIssue("new-other")?.state, "completed");
  for (const id of [f.issue.id, "new-self", "new-unknown", "new-done"])
    assert.equal(f.store.findByIssue(id), null);
});

test("explicit private start delivers an unlabeled self-created issue", async (context) => {
  const f = createControllerFixture({ intake: { mode: "private", automaticOthers: false } });
  context.after(f.cleanup);
  f.admitIssue({ ...f.issue, labels: [], creatorId: f.config.linear.assigneeId });
  await f.controller.tick();
  assert.equal(f.store.list().length, 0);
  await f.controller.run({ issueId: f.issue.id, projectId: "project", profile: "codex" });
  assert.equal(f.store.findByIssue(f.issue.id)?.state, "completed");
});

test("manual reservation blocks automatic and explicit claims; release does not auto-start", async (context) => {
  const f = createControllerFixture({ intake });
  context.after(f.cleanup);
  await f.controller.tick();
  const issue = { ...f.issue, id: "manual", labels: [], creatorId: "colleague" };
  f.admitIssue(issue);
  await f.controller.manual({ issueId: issue.id, projectId: "project", action: "reserve" });
  await f.controller.tick();
  await assert.rejects(
    f.controller.run({ issueId: issue.id, projectId: "project", profile: "codex" }),
    /manual/,
  );
  assert.equal(f.store.findByIssue(issue.id), null);
  await f.controller.manual({ issueId: issue.id, projectId: "project", action: "release" });
  await f.controller.tick();
  assert.equal(f.store.findByIssue(issue.id), null);
  await f.controller.run({ issueId: issue.id, projectId: "project", profile: "codex" });
  assert.equal(f.store.findByIssue(issue.id)?.state, "completed");
});

test("manual ownership fences invocation and merge dispatch for the entire initiative", (context) => {
  const f = createControllerFixture({ intake });
  context.after(f.cleanup);
  const parent = f.store.claim({ issue: f.issue, projectId: "project", profile: "codex" });
  const child = f.store.claim({
    issue: { ...f.issue, id: "child" },
    projectId: "project",
    profile: "codex",
    parentId: parent.id,
  });
  f.store.reserveManual({ issueId: child.issue_id, projectId: "project" });
  assert.throws(
    () =>
      f.store.beginInvocation({
        id: randomUUID(),
        initiativeId: parent.id,
        role: "planner",
        model: "fixture",
        worktree: f.root,
      }),
    /not runnable/,
  );
  assert.throws(
    () => f.store.dispatchMerge({ key: "not-dispatched", initiativeId: parent.id }),
    /revoked/,
  );
});

test("observed eligible work survives capacity delay and reservations clear pending intent", (context) => {
  const f = createControllerFixture({ intake });
  context.after(f.cleanup);
  const input = { scope: "scope", assigneeId: f.config.linear.assigneeId };
  const issue = { ...f.issue, creatorId: "colleague" };
  assert.deepEqual(f.store.observeIntake({ ...input, issues: [] }), []);
  assert.deepEqual(f.store.observeIntake({ ...input, issues: [issue] }), [issue.id]);
  assert.deepEqual(f.store.observeIntake({ ...input, issues: [issue] }), [issue.id]);
  f.store.reserveManual({ issueId: issue.id, projectId: "project" });
  f.store.releaseManual({ issueId: issue.id, projectId: "project" });
  assert.deepEqual(f.store.observeIntake({ ...input, issues: [issue] }), []);
  assert.deepEqual(
    f.store.observeIntake({ ...input, scope: "changed-scope", issues: [issue] }),
    [],
  );
});

test("manual takeover cancels queued ownership and never implicitly resumes it", async (context) => {
  const f = createControllerFixture({ intake });
  context.after(f.cleanup);
  const task = f.store.claim({ issue: f.issue, projectId: "project", profile: "codex" });
  await f.controller.manual({ issueId: f.issue.id, projectId: "project", action: "reserve" });
  assert.equal(f.store.get(task.id).state, "cancelled");
  await f.controller.manual({ issueId: f.issue.id, projectId: "project", action: "release" });
  assert.equal(f.store.get(task.id).state, "cancelled");
});

test("manual release before discovery never creates automatic intent", (context) => {
  const f = createControllerFixture({ intake });
  context.after(f.cleanup);
  const input = { scope: "scope", assigneeId: f.config.linear.assigneeId };
  f.store.observeIntake({ ...input, issues: [] });
  f.store.reserveManual({ issueId: f.issue.id, projectId: "project" });
  f.store.releaseManual({ issueId: f.issue.id, projectId: "project" });
  assert.deepEqual(
    f.store.observeIntake({ ...input, issues: [{ ...f.issue, creatorId: "colleague" }] }),
    [],
  );
});

test("manual release uses local project ownership after remote reassignment", async (context) => {
  const f = createControllerFixture({ intake });
  context.after(f.cleanup);
  await f.controller.manual({ issueId: f.issue.id, projectId: "project", action: "reserve" });
  f.admitIssue({
    ...f.issue,
    assigneeId: "other-owner",
    teamId: "other-team",
    state: "Done",
    stateType: "completed",
  });
  await f.controller.manual({
    issueId: f.issue.identifier,
    projectId: "project",
    action: "release",
  });
  assert.equal(f.store.isManual(f.issue.id), false);
});
