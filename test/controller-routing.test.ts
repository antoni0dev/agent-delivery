import assert from "node:assert/strict";
import test from "node:test";
import { roleNames, runtimeProfileNames, runtimeProfiles } from "../src/runtime/index.js";
import { createControllerFixture, createPlan } from "./controller-fixture.test.js";

test("controller records the pinned model for every actor role and runtime profile", async (context) => {
  for (const profile of runtimeProfileNames) {
    await context.test(profile, async (subcontext) => {
      const fixture = createControllerFixture({
        profile,
        planForIssue: () => createPlan({ complexOrMoney: true }),
      });
      subcontext.after(fixture.cleanup);

      await fixture.controller.run({ issueId: fixture.issue.id, projectId: "project", profile });

      assert.deepEqual(
        fixture.runtimeCalls.map(({ role }) => role),
        ["planner", "planCritic", "implementer", "implementer", "reviewer", "browserVerifier"],
      );
      assert.ok(fixture.runtimeCalls.every((call) => call.profile === profile));
      assert.deepEqual(
        fixture.runtimeCalls.map(({ invocationId, role }) => ({
          role,
          requestedModel: fixture.store.invocation(invocationId).requested_model,
        })),
        [...roleNames.slice(0, 3), "implementer", ...roleNames.slice(3)].map((role) => ({
          role,
          requestedModel:
            runtimeProfiles[profile][roleNames.find((entry) => entry === role) ?? "implementer"]
              .model,
        })),
      );
      assert.deepEqual(
        fixture.runtimeCalls
          .filter(({ complexOrMoney }) => complexOrMoney === true)
          .map(({ role }) => role),
        ["implementer", "implementer"],
      );
      assert.equal(
        new Set(
          fixture.runtimeCalls.map(
            ({ invocationId }) => fixture.store.invocation(invocationId).native_session,
          ),
        ).size,
        roleNames.length + 1,
      );
    });
  }
});
