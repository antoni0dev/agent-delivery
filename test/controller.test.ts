import assert from "node:assert/strict";
import { join } from "node:path";
import test from "node:test";
import { z } from "zod";
import { writeArtifact } from "../src/artifacts.js";
import { configDigest, environmentDigest, readProjectInstructions, sha256 } from "../src/config.js";
import { bindingSchema, planSchema, type Requirement } from "../src/domain.js";
import type { Role } from "../src/runtime/index.js";
import {
  type ControllerFixture,
  createControllerFixture,
  createPlan,
  fixtureBase,
  fixtureHead,
} from "./controller-fixture.test.js";

const checkpointBindingSchema = z.object({ binding: bindingSchema }).passthrough();

test("delivers one admitted issue through independent evidence and confirmed completion", async (context) => {
  const plan = createPlan();
  const fixture = createControllerFixture({ planForIssue: () => plan });
  context.after(fixture.cleanup);

  const result = await fixture.controller.run({
    profile: "codex",
    issueId: fixture.issue.id,
    projectId: "project",
  });
  const task = fixture.store.findByIssue(fixture.issue.id);

  assert.ok(task);
  assert.equal(task.state, "completed");
  assert.equal(task.stage, "accept");
  assert.deepEqual(
    fixture.runtimeCalls.map(({ role }) => role),
    ["planner", "planCritic", "implementer", "implementer", "reviewer", "browserVerifier"],
  );
  assert.deepEqual(
    fixture.commandCalls.map(({ command, requireStructuredReport }) => ({
      commandId: command.args[0],
      requireStructuredReport,
    })),
    [
      { commandId: "unit", requireStructuredReport: true },
      { commandId: "browser", requireStructuredReport: true },
    ],
  );
  assert.equal(fixture.publishedPlans[0]?.planDigest, task.plan_digest);
  assert.ok(fixture.publishedPlans[0]?.fullPlan.includes(plan.fullPlan));
  assert.ok(fixture.publishedPlans[0]?.fullPlan.includes(JSON.stringify(plan, null, 2)));
  assert.deepEqual(fixture.githubCalls.markedReady, [{ number: 10, head: fixtureHead }]);
  assert.deepEqual(fixture.githubCalls.requiredChecks, [
    { number: 10, head: fixtureHead, base: fixtureBase },
  ]);
  assert.deepEqual(fixture.githubCalls.merged, [
    { number: 10, head: fixtureHead, base: fixtureBase },
  ]);
  assert.deepEqual(fixture.completedIssues, [fixture.issue.id]);
  assert.equal(
    fixture.store.readiness({
      initiativeId: task.id,
      requirements: plan.requirements,
      binding: checkpointBindingSchema.parse(JSON.parse(task.checkpoint)).binding,
      maxAgeMs: fixture.config.liveEvidenceMaxAgeMs,
    }).passed,
    true,
  );
  assert.equal(
    z
      .object({ state: z.literal("completed") })
      .passthrough()
      .parse(result).state,
    "completed",
  );
});

test("withdrawn AI-ready admission cancels the issued pull request before review", async (context) => {
  const fixture = createControllerFixture();
  context.after(fixture.cleanup);
  fixture.setRuntimeHook((input) => {
    if (input.role === "implementer") fixture.withdraw(fixture.issue.id);
  });

  await fixture.controller.run({
    profile: "codex",
    issueId: fixture.issue.id,
    projectId: "project",
  });
  const task = fixture.store.findByIssue(fixture.issue.id);

  assert.ok(task);
  assert.equal(task.state, "cancelled");
  assert.equal(task.stage, "implement");
  assert.deepEqual(fixture.githubCalls.disabled, []);
  assert.deepEqual(fixture.githubCalls.merged, []);
  assert.deepEqual(fixture.completedIssues, []);
});

test("merge rejects missing evidence and a newer failed result", async (context) => {
  await context.test("missing required evidence", async (subcontext) => {
    const fixture = createControllerFixture();
    subcontext.after(fixture.cleanup);
    const taskId = stageAtMerge({ fixture, plan: minimalMergePlan() });

    await fixture.controller.tick();

    const task = fixture.store.get(taskId);
    assert.equal(task.state, "blocked");
    assert.match(task.reason ?? "", /missing evidence/);
    assert.deepEqual(fixture.githubCalls.markedReady, []);
    assert.deepEqual(fixture.githubCalls.merged, []);
  });

  await context.test("newer failed evidence supersedes an earlier pass", async (subcontext) => {
    const fixture = createControllerFixture();
    subcontext.after(fixture.cleanup);
    const plan = minimalMergePlan();
    const taskId = stageAtMerge({ fixture, plan });
    const binding = checkpointBindingSchema.parse(
      JSON.parse(fixture.store.get(taskId).checkpoint),
    ).binding;
    const review = plan.requirements[0];
    const unit = plan.requirements[1];
    assert.ok(review);
    assert.ok(unit);
    recordEvidence({
      fixture,
      taskId,
      requirement: review,
      binding,
      role: "reviewer",
      passed: true,
    });
    recordEvidence({
      fixture,
      taskId,
      requirement: unit,
      binding,
      role: "browserVerifier",
      passed: true,
    });
    recordEvidence({
      fixture,
      taskId,
      requirement: unit,
      binding,
      role: "browserVerifier",
      passed: false,
    });

    await fixture.controller.tick();

    const task = fixture.store.get(taskId);
    assert.equal(task.state, "blocked");
    assert.match(task.reason ?? "", /latest evidence is stale or not passing/);
    assert.deepEqual(fixture.githubCalls.markedReady, []);
    assert.deepEqual(fixture.githubCalls.merged, []);
  });
});

test("an implementing native context cannot certify independent review", async (context) => {
  const fixture = createControllerFixture({ reuseImplementerSession: true });
  context.after(fixture.cleanup);

  await fixture.controller.run({
    profile: "codex",
    issueId: fixture.issue.id,
    projectId: "project",
  });
  const task = fixture.store.findByIssue(fixture.issue.id);

  assert.ok(task);
  assert.equal(task.state, "blocked");
  assert.equal(task.stage, "review");
  assert.match(task.reason ?? "", /Implementing context cannot certify independent evidence/);
  assert.deepEqual(fixture.commandCalls, []);
  assert.deepEqual(fixture.githubCalls.merged, []);
});

test("independent planned children remain owned children during later discovery", async (context) => {
  const parentPlan = createPlan({
    children: [
      {
        key: "child-slice",
        title: "Deliver the independent child",
        description: "Implement and verify the independently releasable child slice.",
        dependencies: [],
        coupled: false,
      },
    ],
  });
  const fixture = createControllerFixture({
    planForIssue: (issueId) => (issueId === "issue-parent" ? parentPlan : createPlan()),
  });
  context.after(fixture.cleanup);

  await fixture.controller.run({
    profile: "codex",
    issueId: fixture.issue.id,
    projectId: "project",
  });
  await fixture.controller.tick();
  await fixture.controller.tick();

  const initiatives = fixture.store.list();
  const parent = initiatives.find(({ issue_id }) => issue_id === fixture.issue.id);
  const child = initiatives.find(({ issue_id }) => issue_id === "issue-child-1");
  assert.ok(parent);
  assert.ok(child);
  assert.equal(initiatives.length, 2);
  assert.equal(new Set(initiatives.map(({ issue_id }) => issue_id)).size, 2);
  assert.equal(child.parent_id, parent.id);
  assert.equal(child.state, "completed");
  assert.equal(parent.state, "completed");
  assert.equal(fixture.runtimeCalls.filter(({ role }) => role === "implementer").length, 2);
});

test("coupled children do not start a second implementation before parent acceptance", async (context) => {
  const fixture = createControllerFixture({
    planForIssue: () =>
      createPlan({
        children: [
          {
            key: "coupled-child",
            title: "Track the coupled child",
            description: "This child is accepted only with the parent candidate.",
            dependencies: [],
            coupled: true,
          },
        ],
      }),
  });
  context.after(fixture.cleanup);

  await fixture.controller.run({
    profile: "codex",
    issueId: fixture.issue.id,
    projectId: "project",
  });

  const initiatives = fixture.store.list();
  const parent = initiatives.find(({ issue_id }) => issue_id === fixture.issue.id);
  const child = initiatives.find(({ issue_id }) => issue_id === "issue-child-1");
  assert.ok(parent);
  assert.ok(child);
  assert.equal(parent.state, "completed");
  assert.equal(child.state, "completed");
  assert.equal(child.parent_id, parent.id);
  assert.deepEqual(
    fixture.runtimeCalls.filter(({ role }) => role === "implementer").map(({ cwd }) => cwd),
    [
      z.object({ worktree: z.string() }).passthrough().parse(JSON.parse(parent.checkpoint))
        .worktree,
      z.object({ worktree: z.string() }).passthrough().parse(JSON.parse(parent.checkpoint))
        .worktree,
    ],
  );
  assert.deepEqual(fixture.completedIssues, [child.issue_id, parent.issue_id]);
});

test("a changed base requires branch update and fresh review before merging", async (context) => {
  const fixture = createControllerFixture();
  context.after(fixture.cleanup);
  fixture.setChecksPassed(false);
  await fixture.controller.run({
    profile: "codex",
    issueId: fixture.issue.id,
    projectId: "project",
  });
  const waiting = fixture.store.findByIssue(fixture.issue.id);
  assert.ok(waiting);
  assert.equal(waiting.state, "waiting");
  assert.equal(waiting.stage, "merge");

  fixture.setBase("e".repeat(40));
  fixture.setChecksPassed(true);
  await fixture.controller.tick();

  const after = fixture.store.get(waiting.id);
  assert.equal(after.state, "completed");
  assert.ok(fixture.gitCalls.includes("updateBase"));
  assert.equal(fixture.runtimeCalls.filter(({ role }) => role === "reviewer").length, 2);
  assert.equal(fixture.githubCalls.merged[0]?.base, "e".repeat(40));
});

function minimalMergePlan() {
  const base = createPlan();
  return planSchema.parse({
    ...base,
    requirements: [
      base.requirements[0],
      {
        id: "unit",
        description: "Configured unit verification",
        kind: "unit",
        commandId: "unit",
      },
    ],
  });
}

function stageAtMerge({
  fixture,
  plan,
}: {
  fixture: ControllerFixture;
  plan: ReturnType<typeof createPlan>;
}) {
  const task = fixture.store.claim({
    issue: fixture.issue,
    projectId: "project",
    profile: fixture.config.intakeRuntimeProfile,
  });
  const planArtifact = writeArtifact({
    directory: join(fixture.config.stateDirectory, "artifacts"),
    content: JSON.stringify(plan),
  });
  fixture.store.recordPlan({ id: task.id, digest: planArtifact.digest });
  fixture.store.acceptPlan({ id: task.id, digest: planArtifact.digest });
  const project = fixture.config.projects[0];
  assert.ok(project);
  const binding = bindingSchema.parse({
    planDigest: planArtifact.digest,
    knowledgeDigest: "knowledge-digest",
    configDigest: configDigest(fixture.config),
    head: fixtureHead,
    base: fixtureBase,
    environmentDigest: environmentDigest(project),
  });
  fixture.store.update({
    id: task.id,
    state: "queued",
    stage: "merge",
    reason: null,
    checkpoint: {
      worktree: join(fixture.root, "worktrees", task.id),
      branch: `delivery/${task.id}`,
      plan: planArtifact,
      packet: writeArtifact({
        directory: join(fixture.config.stateDirectory, "artifacts"),
        content: JSON.stringify({
          plan,
          knowledge: { releaseDigest: "knowledge-digest" },
          configDigest: configDigest(fixture.config),
          instructionsDigest: sha256(JSON.stringify(readProjectInstructions(project))),
        }),
      }),
      pr: 10,
      binding,
    },
  });
  return task.id;
}

function recordEvidence({
  fixture,
  taskId,
  requirement,
  binding,
  role,
  passed,
}: {
  fixture: ControllerFixture;
  taskId: string;
  requirement: Requirement;
  binding: z.infer<typeof bindingSchema>;
  role: Role;
  passed: boolean;
}): void {
  const invocationId = `manual-${requirement.id}-${role}-${fixture.runtimeCalls.length}-${passed}`;
  fixture.store.beginInvocation({
    id: invocationId,
    initiativeId: taskId,
    role,
    worktree: join(fixture.root, "worktrees", taskId),
    model: "fixture-model",
  });
  const artifact = writeArtifact({
    directory: join(fixture.config.stateDirectory, "manual-evidence"),
    content: JSON.stringify({ invocationId, passed }),
  });
  fixture.store.finishInvocation({
    id: invocationId,
    status: passed ? "completed" : "failed",
    nativeSessionId: `${invocationId}-session`,
    actualModel: "fixture-model",
    result: artifact,
    terminationConfirmed: true,
  });
  const evidence = fixture.store.beginEvidence({
    initiativeId: taskId,
    requirement,
    binding,
    producerId: invocationId,
  });
  fixture.store.finishEvidence({ id: evidence.id, passed, artifact });
}
