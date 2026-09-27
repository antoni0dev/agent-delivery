import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import { issueSchema } from "../src/domain.js";
import { createControllerFixture, createPlan } from "./controller-fixture.test.js";

function deferred() {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((done) => {
    resolve = () => done();
  });
  return { promise, resolve };
}

async function within<T>(promise: Promise<T>, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out waiting for ${label}`)), 2000);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

test("active drain refreshes intake and starts a newly admitted issue", async (context) => {
  const fixture = createControllerFixture({ intakeIntervalMs: 10 });
  context.after(fixture.cleanup);
  const firstStarted = deferred();
  const firstRelease = deferred();
  const secondStarted = deferred();
  let plannerCount = 0;
  let firstWasReleased = false;
  fixture.setRuntimeGate(async (input) => {
    if (input.role !== "planner") return;
    plannerCount += 1;
    if (plannerCount === 1) {
      firstStarted.resolve();
      await firstRelease.promise;
      return;
    }
    secondStarted.resolve();
  });
  const running = fixture.controller.tick();
  try {
    await within(firstStarted.promise, "the first planner");
    fixture.admitIssue(
      issueSchema.parse({
        ...fixture.issue,
        id: "issue-second",
        identifier: "DEL-2",
        title: "Deliver the second admitted issue",
        url: "https://linear.example.test/DEL-2",
      }),
    );

    await within(secondStarted.promise, "the second planner");
    assert.equal(firstWasReleased, false);
    assert.equal(fixture.runtimeCalls.filter(({ role }) => role === "planner").length, 2);
  } finally {
    firstWasReleased = true;
    firstRelease.resolve();
    await running;
  }
  await fixture.controller.tick();
  assert.equal(fixture.store.findByIssue("issue-parent")?.state, "completed");
  assert.equal(fixture.store.findByIssue("issue-second")?.state, "completed");
});

test("concurrent explicit run claims before the controller lock and returns queued", async (context) => {
  const fixture = createControllerFixture({ intakeIntervalMs: 50 });
  context.after(fixture.cleanup);
  const firstStarted = deferred();
  const firstRelease = deferred();
  const secondStarted = deferred();
  let plannerCount = 0;
  fixture.setRuntimeGate(async (input) => {
    if (input.role !== "planner") return;
    plannerCount += 1;
    if (plannerCount === 1) {
      firstStarted.resolve();
      await firstRelease.promise;
      return;
    }
    secondStarted.resolve();
  });
  const firstRun = fixture.controller.run({
    profile: "codex",
    issueId: fixture.issue.id,
    projectId: "project",
  });
  try {
    await within(firstStarted.promise, "the first explicit planner");
    fixture.admitIssue(
      issueSchema.parse({
        ...fixture.issue,
        id: "issue-explicit-second",
        identifier: "DEL-3",
        title: "Deliver the concurrently requested issue",
        url: "https://linear.example.test/DEL-3",
      }),
    );
    const claimed = z
      .object({ issue_id: z.string(), state: z.string(), stage: z.string() })
      .passthrough()
      .parse(
        await within(
          fixture.controller.run({
            profile: "codex",
            issueId: "issue-explicit-second",
            projectId: "project",
          }),
          "the concurrent explicit claim",
        ),
      );
    assert.deepEqual(
      { issueId: claimed.issue_id, state: claimed.state, stage: claimed.stage },
      { issueId: "issue-explicit-second", state: "queued", stage: "validate" },
    );
    await within(secondStarted.promise, "the active owner's second planner");
  } finally {
    firstRelease.resolve();
    await firstRun;
  }
  assert.equal(fixture.store.findByIssue("issue-explicit-second")?.state, "completed");
});

test("a waiting CI phase runs once per controller drain", async (context) => {
  const fixture = createControllerFixture({ intakeIntervalMs: 5 });
  context.after(fixture.cleanup);
  fixture.setChecksPassed(false);

  await fixture.controller.run({
    profile: "codex",
    issueId: fixture.issue.id,
    projectId: "project",
  });

  const task = fixture.store.findByIssue(fixture.issue.id);
  assert.ok(task);
  assert.equal(task.state, "waiting");
  assert.equal(task.stage, "merge");
  assert.equal(fixture.githubCalls.requiredChecks.length, 1);
  assert.equal(fixture.githubCalls.merged.length, 0);
});

test("state changes dispatch a dependent child and its parent acceptance", async (context) => {
  const parentPlan = createPlan({
    children: [
      {
        key: "dependent-child",
        title: "Deliver the dependent child",
        description: "Complete this independently releasable slice before parent acceptance.",
        dependencies: [],
        coupled: false,
      },
    ],
  });
  const fixture = createControllerFixture({
    intakeIntervalMs: 10,
    planForIssue: (issueId) => (issueId === "issue-parent" ? parentPlan : createPlan()),
  });
  context.after(fixture.cleanup);

  await fixture.controller.run({
    profile: "codex",
    issueId: fixture.issue.id,
    projectId: "project",
  });

  assert.equal(fixture.store.findByIssue(fixture.issue.id)?.state, "completed");
  assert.equal(fixture.store.findByIssue("issue-child-1")?.state, "completed");
});

test("an intake failure drains the active initiative before releasing ownership", async (context) => {
  const fixture = createControllerFixture({ intakeIntervalMs: 10 });
  context.after(fixture.cleanup);
  const plannerStarted = deferred();
  const plannerRelease = deferred();
  const refreshFailed = deferred();
  fixture.setRuntimeGate(async (input) => {
    if (input.role !== "planner") return;
    plannerStarted.resolve();
    await plannerRelease.promise;
  });
  let settled = false;
  const running = fixture.controller.tick().then(
    (result) => {
      settled = true;
      return result;
    },
    (error: unknown) => {
      settled = true;
      throw error;
    },
  );
  await within(plannerStarted.promise, "the active planner");
  fixture.setIntakeHook(() => {
    refreshFailed.resolve();
    throw new Error("fixture intake refresh failed");
  });
  await within(refreshFailed.promise, "the failing intake refresh");
  await Promise.resolve();
  assert.equal(settled, false);

  plannerRelease.resolve();
  await assert.rejects(
    () => within(running, "the drained intake failure"),
    /intake refresh failed/,
  );
  assert.equal(fixture.store.findByIssue(fixture.issue.id)?.state, "completed");

  fixture.setIntakeHook(() => undefined);
  await fixture.controller.tick();
});
