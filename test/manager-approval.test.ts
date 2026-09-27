import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { configDigest } from "../src/config.js";
import { profiles } from "../src/domain.js";
import { createControllerFixture, createPlan } from "./controller-fixture.test.js";

test("manager publishes challenged plan and dispatches no children or writers before exact approval", async (context) => {
  const fixture = createControllerFixture({
    planForIssue: () =>
      createPlan({
        children: [
          {
            key: "slice",
            title: "Bounded slice",
            description: "Implement the bounded slice",
            dependencies: [],
            coupled: true,
          },
        ],
      }),
  });
  context.after(fixture.cleanup);
  await fixture.controller.manage({ issueId: fixture.issue.id, projectId: "project" });
  const task = fixture.store.findByIssue(fixture.issue.id);
  assert.ok(task);
  assert.equal(task.stage, "approve-plan");
  assert.equal(task.state, "waiting");
  assert.ok(task.accepted_plan_digest);
  assert.equal(fixture.publishedPlans[0]?.planDigest, task.accepted_plan_digest);
  assert.equal(fixture.store.list().length, 1);
  assert.deepEqual(
    fixture.runtimeCalls.map((call) => call.role),
    ["planner", "planCritic"],
  );
  await fixture.controller.tick();
  fixture.controller.resume(task.id);
  await fixture.controller.tick();
  assert.deepEqual(
    fixture.runtimeCalls.map((call) => call.role),
    ["planner", "planCritic"],
  );
  assert.throws(
    () => fixture.controller.approvePlan({ id: task.id, digest: "stale" }),
    /matching published plan/,
  );
  fixture.controller.approvePlan({ id: task.id, digest: task.accepted_plan_digest });
  await fixture.controller.tick();
  assert.equal(fixture.store.list().length, 2);
  assert.ok(fixture.runtimeCalls.some((call) => call.role === "implementer"));
});

test("approval rejects other hosts, changed configuration and cancelled work", async (context) => {
  const fixture = createControllerFixture();
  context.after(fixture.cleanup);
  await fixture.controller.manage({ issueId: fixture.issue.id, projectId: "project" });
  const task = fixture.store.findByIssue(fixture.issue.id);
  assert.ok(task?.accepted_plan_digest);
  const input = {
    id: task.id,
    digest: task.accepted_plan_digest,
    hostId: "fixture-host",
    configDigest: configDigest(fixture.config),
  };
  assert.throws(() => fixture.store.approvePlan({ ...input, hostId: "another-host" }));
  assert.throws(() => fixture.store.approvePlan({ ...input, configDigest: "stale-config" }));
  await fixture.controller.cancel(task.id);
  assert.throws(() => fixture.store.approvePlan(input), /matching published plan/);
});

test("replanning clears human approval and rejects the superseded plan", async (context) => {
  let round = 0;
  const fixture = createControllerFixture({
    planForIssue: () => ({
      ...createPlan(),
      fullPlan: `${createPlan().fullPlan} Revision ${++round}`,
    }),
  });
  context.after(fixture.cleanup);
  await fixture.controller.manage({ issueId: fixture.issue.id, projectId: "project" });
  const task = fixture.store.findByIssue(fixture.issue.id);
  assert.ok(task?.accepted_plan_digest);
  fixture.controller.approvePlan({ id: task.id, digest: task.accepted_plan_digest });
  await fixture.controller.replan(task.id);
  assert.equal(fixture.store.planApproval(task.id)?.approved_at, null);
  assert.throws(() =>
    fixture.controller.approvePlan({ id: task.id, digest: task.accepted_plan_digest ?? "" }),
  );
  await fixture.controller.tick();
  assert.equal(
    fixture.store.get(task.id).state,
    "waiting",
    fixture.store.get(task.id).reason ?? "",
  );
  assert.equal(fixture.store.get(task.id).stage, "approve-plan");
  assert.throws(() =>
    fixture.controller.approvePlan({ id: task.id, digest: task.accepted_plan_digest ?? "" }),
  );
  assert.equal(fixture.runtimeCalls.filter((call) => call.role === "implementer").length, 0);
});

for (const profile of profiles) {
  test(`manager gate survives controller restart for ${profile}`, async (context) => {
    const fixture = createControllerFixture({ profile });
    context.after(fixture.cleanup);
    await fixture.controller.manage({ issueId: fixture.issue.id, projectId: "project" });
    const task = fixture.store.findByIssue(fixture.issue.id);
    assert.ok(task?.accepted_plan_digest);
    assert.equal(task.profile, profile);
    const restarted = fixture.restartController();
    await restarted.tick();
    await restarted.tick();
    assert.equal(fixture.runtimeCalls.length, 2);
    assert.equal(fixture.store.get(task.id).state, "waiting");
    await assert.rejects(
      restarted.manage({
        issueId: fixture.issue.id,
        projectId: "project",
        profile: profile === "codex" ? "cursor" : "codex",
      }),
      /already claimed/,
    );
    restarted.approvePlan({ id: task.id, digest: task.accepted_plan_digest });
    await restarted.tick();
    assert.equal(fixture.store.get(task.id).state, "completed");
  });
}

test("reactivating changed configuration cannot approve a plan prepared under old configuration", async (context) => {
  const fixture = createControllerFixture();
  context.after(fixture.cleanup);
  await fixture.controller.manage({ issueId: fixture.issue.id, projectId: "project" });
  const task = fixture.store.findByIssue(fixture.issue.id);
  assert.ok(task?.accepted_plan_digest);
  fixture.store.pause();
  fixture.store.activate({
    hostId: "fixture-host",
    configDigest: "new-config",
    profile: "codex",
    conformanceDigest: "new-conformance",
  });
  assert.throws(
    () =>
      fixture.store.approvePlan({
        id: task.id,
        digest: task.accepted_plan_digest ?? "",
        hostId: "fixture-host",
        configDigest: "new-config",
      }),
    /matching published plan/,
  );
});

test("approval notices persist successful channels and retry failed desktop delivery without agents", async (context) => {
  let desktopCalls = 0;
  let linearCalls = 0;
  const fixture = createControllerFixture({
    notifications: { linear: true, desktop: true },
    desktop: () => {
      if (++desktopCalls === 1) throw new Error("temporary failure");
    },
    onNotify: () => {
      linearCalls++;
    },
  });
  context.after(fixture.cleanup);
  await fixture.controller.manage({ issueId: fixture.issue.id, projectId: "project" });
  assert.equal(desktopCalls, 1);
  assert.equal(linearCalls, 1);
  const restarted = fixture.restartController();
  await restarted.tick();
  await restarted.tick();
  assert.equal(desktopCalls, 2);
  assert.equal(linearCalls, 1);
  assert.equal(fixture.runtimeCalls.length, 2);
});
test("changed repository instructions reject approval and dispatch until replanned", async (context) => {
  const fixture = createControllerFixture();
  context.after(fixture.cleanup);
  await fixture.controller.manage({ issueId: fixture.issue.id, projectId: "project" });
  const task = fixture.store.findByIssue(fixture.issue.id);
  assert.ok(task?.accepted_plan_digest);
  const project = fixture.config.projects[0];
  assert.ok(project);
  writeFileSync(join(project.root, "AGENTS.md"), "Changed architecture contract");
  assert.throws(
    () => fixture.controller.approvePlan({ id: task.id, digest: task.accepted_plan_digest ?? "" }),
    /replan required/,
  );
  fixture.store.approvePlan({
    id: task.id,
    digest: task.accepted_plan_digest,
    hostId: "fixture-host",
    configDigest: configDigest(fixture.config),
  });
  await fixture.controller.tick();
  assert.equal(fixture.store.get(task.id).state, "blocked");
  assert.match(fixture.store.get(task.id).reason ?? "", /replan required/);
  assert.equal(fixture.runtimeCalls.length, 2);
});

for (const action of ["approve", "cancel"] as const) {
  test(`notification completion preserves concurrent ${action}`, async (context) => {
    const fixture = createControllerFixture({
      notifications: { linear: true, desktop: false },
      onNotify: () => {
        const task = fixture.store.findByIssue(fixture.issue.id);
        assert.ok(task?.accepted_plan_digest);
        if (action === "approve")
          fixture.controller.approvePlan({ id: task.id, digest: task.accepted_plan_digest });
        else fixture.store.cancel(task.id);
      },
    });
    context.after(fixture.cleanup);
    await fixture.controller.manage({ issueId: fixture.issue.id, projectId: "project" });
    const task = fixture.store.findByIssue(fixture.issue.id);
    assert.ok(task);
    assert.equal(task.state, action === "approve" ? "completed" : "cancelled");
  });
}
