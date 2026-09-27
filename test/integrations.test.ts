import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { z } from "zod";
import {
  configTemplate,
  type Project,
  type WorkspaceConfig,
  workspaceConfigSchema,
} from "../src/config.js";
import { createGithubAdapter, createLinearAdapter } from "../src/integrations/index.js";

process.env.DELIVERY_TEST_TOKEN = "fixture-token";

const HEAD = "a".repeat(40);
const BASE = "b".repeat(40);
const PREVIEW = "c".repeat(40);

function fixture(): { config: WorkspaceConfig; project: Project } {
  const root = mkdtempSync(join(tmpdir(), "delivery-integrations-"));
  const raw = configTemplate({
    root,
    stateDirectory: join(root, "state"),
    knowledgeRoot: join(root, "knowledge"),
  });
  const editable = z
    .object({
      authority: z.object({ grantReference: z.string() }).passthrough(),
      projects: z
        .array(
          z
            .object({
              remote: z.string(),
              teamIds: z.array(z.string()),
              release: z.object({ requiredChecks: z.array(z.string()) }).passthrough(),
            })
            .passthrough(),
        )
        .min(1),
    })
    .passthrough()
    .parse(raw);
  editable.authority.grantReference = "fixture-authority";
  const editableProject = editable.projects[0];
  assert.ok(editableProject);
  editableProject.remote = "https://github.com/example/delivery.git";
  editableProject.teamIds = ["team"];
  editableProject.release.requiredChecks = ["test"];
  Object.assign(editableProject, {
    gitIdentity: { name: "Fixture", email: "fixture@example.invalid" },
  });
  const config = workspaceConfigSchema.parse(editable);
  config.workspaceId = "fixture";
  config.linear.workspaceId = "linear-workspace";
  config.linear.assigneeId = "owner";
  config.linear.readyLabel = "AI-ready";
  config.linear.credential = { kind: "environment", name: "DELIVERY_TEST_TOKEN" };
  config.github.credential = { kind: "environment", name: "DELIVERY_TEST_TOKEN" };
  Object.defineProperty(config.github, "login", {
    value: "delivery-bot",
    enumerable: true,
    configurable: true,
  });
  config.authority.updateOwnedIssues = true;
  config.authority.createScopedChildren = true;
  config.authority.openPullRequests = true;
  config.authority.mergeDevelopment = true;
  const project = config.projects[0];
  assert.ok(project);
  project.repository = "example/delivery";
  project.remote = "https://github.com/example/delivery.git";
  project.teamIds = ["team"];
  project.projectIds = ["linear-project"];
  project.environment.mutations = "non-production";
  project.release.targetBranch = "main";
  project.release.requiredChecks = ["test"];
  return { config, project };
}

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const requestBodySchema = z.object({
  query: z.string(),
  variables: z.record(z.string(), z.unknown()),
});
function graphRequest(init: RequestInit | undefined) {
  if (typeof init?.body !== "string") throw new Error("Expected a JSON request body");
  return requestBodySchema.parse(JSON.parse(init.body));
}

function rawIssue(overrides: Record<string, unknown> = {}) {
  return {
    id: "issue-id",
    identifier: "DEL-1",
    title: "Deliver the adapter",
    description: "Original human description",
    url: "https://linear.app/example/issue/DEL-1",
    team: { id: "team" },
    project: { id: "linear-project" },
    assignee: { id: "owner" },
    labels: { nodes: [{ name: "AI-ready" }] },
    state: { id: "state-progress", name: "In Progress" },
    ...overrides,
  };
}

function rawPull(overrides: Record<string, unknown> = {}) {
  return {
    number: 7,
    node_id: "PR_fixture",
    html_url: "https://github.com/example/delivery/pull/7",
    head: { sha: HEAD, ref: "feature" },
    base: { sha: BASE, ref: "main" },
    draft: false,
    merged: false,
    merge_commit_sha: PREVIEW,
    body: "Pull body",
    state: "open",
    mergeable: true,
    mergeable_state: "clean",
    ...overrides,
  };
}

test("Linear identity is bound to the configured workspace and assignee", async () => {
  const { config, project } = fixture();
  const scriptedFetch: typeof fetch = async () =>
    json({ data: { organization: { id: "other" }, viewer: { id: "owner" } } });
  await assert.rejects(
    createLinearAdapter({ config, project, fetch: scriptedFetch }).verifyIdentity(),
    /workspace.*assignee identity/i,
  );
});

test("Linear eligible intake consumes every page and filters project scope", async () => {
  const { config, project } = fixture();
  const cursors: unknown[] = [];
  const scriptedFetch: typeof fetch = async (_url, init) => {
    const body = graphRequest(init);
    if (body.query.includes("query Identity"))
      return json({
        data: {
          organization: { id: "linear-workspace" },
          viewer: { id: "owner" },
        },
      });
    cursors.push(body.variables.after);
    const firstPage = body.variables.after === null;
    return json({
      data: {
        issues: {
          nodes: firstPage
            ? [rawIssue(), rawIssue({ id: "foreign", project: { id: "other" } })]
            : [rawIssue({ id: "second", identifier: "DEL-2" })],
          pageInfo: firstPage
            ? { hasNextPage: true, endCursor: "next" }
            : { hasNextPage: false, endCursor: null },
        },
      },
    });
  };
  const issues = await createLinearAdapter({
    config,
    project,
    fetch: scriptedFetch,
  }).listEligible();
  assert.deepEqual(
    issues.map(({ id }) => id),
    ["issue-id", "second"],
  );
  assert.deepEqual(cursors, [null, "next"]);
});

test("publishing a plan adds a versioned comment and preserves human issue text", async () => {
  const { config, project } = fixture();
  const operations: string[] = [];
  let commentCreated = false;
  const scriptedFetch: typeof fetch = async (_url, init) => {
    const body = graphRequest(init);
    operations.push(body.query);
    if (body.query.includes("query Identity"))
      return json({
        data: {
          organization: { id: "linear-workspace" },
          viewer: { id: "owner" },
        },
      });
    if (body.query.includes("query Issue")) return json({ data: { issue: rawIssue() } });
    if (body.query.includes("query Comments"))
      return json({
        data: {
          issue: {
            comments: {
              nodes: commentCreated
                ? [
                    {
                      id: "comment",
                      body: "## Delivery plan\n\nVersion: digest\n\nThe complete plan\n\n<!-- agent-delivery:publish -->",
                    },
                  ]
                : [],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        },
      });
    if (body.query.includes("mutation Comment")) {
      commentCreated = true;
      const inputSchema = z.object({ input: z.object({ body: z.string() }).passthrough() });
      const variables = inputSchema.parse(body.variables);
      assert.match(variables.input.body, /Version: digest/);
      assert.match(variables.input.body, /The complete plan/);
      return json({
        data: {
          commentCreate: { success: true, comment: { id: "comment", body: variables.input.body } },
        },
      });
    }
    throw new Error("Unexpected Linear request");
  };
  const result = await createLinearAdapter({ config, project, fetch: scriptedFetch }).publishPlan({
    issueId: "issue-id",
    planDigest: "digest",
    fullPlan: "The complete plan",
    operationKey: "publish",
  });
  assert.equal(result.id, "comment");
  assert.equal(
    operations.some((operation) => operation.includes("issueUpdate")),
    false,
  );
});

test("Linear scope changes deny a pending write", async () => {
  const { config, project } = fixture();
  let mutations = 0;
  const scriptedFetch: typeof fetch = async (_url, init) => {
    const body = graphRequest(init);
    if (body.query.includes("query Identity"))
      return json({
        data: {
          organization: { id: "linear-workspace" },
          viewer: { id: "owner" },
        },
      });
    if (body.query.includes("mutation")) mutations += 1;
    return json({ data: { issue: rawIssue({ assignee: { id: "someone-else" } }) } });
  };
  await assert.rejects(
    createLinearAdapter({ config, project, fetch: scriptedFetch }).notify({
      issueId: "issue-id",
      body: "Notice",
      operationKey: "notice",
    }),
    /outside.*scope/i,
  );
  assert.equal(mutations, 0);
});

test("Linear mutation network loss is uncertain and is never retried", async () => {
  const { config, project } = fixture();
  let mutationAttempts = 0;
  const scriptedFetch: typeof fetch = async (_url, init) => {
    const body = graphRequest(init);
    if (body.query.includes("query Identity"))
      return json({
        data: {
          organization: { id: "linear-workspace" },
          viewer: { id: "owner" },
        },
      });
    if (body.query.includes("query Issue")) return json({ data: { issue: rawIssue() } });
    if (body.query.includes("query Comments"))
      return json({
        data: {
          issue: {
            comments: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } },
          },
        },
      });
    mutationAttempts += 1;
    throw new Error("connection lost after send");
  };
  await assert.rejects(
    createLinearAdapter({ config, project, fetch: scriptedFetch }).notify({
      issueId: "issue-id",
      body: "Notice",
      operationKey: "notice",
    }),
    (error: unknown) =>
      error instanceof Error && error.message.includes("remote outcome is uncertain"),
  );
  assert.equal(mutationAttempts, 1);
});

test("Linear completion reuses the completed state without another mutation", async () => {
  const { config, project } = fixture();
  let mutationAttempts = 0;
  const scriptedFetch: typeof fetch = async (_url, init) => {
    const body = graphRequest(init);
    if (body.query.includes("query Identity"))
      return json({
        data: {
          organization: { id: "linear-workspace" },
          viewer: { id: "owner" },
        },
      });
    if (body.query.includes("query Issue"))
      return json({
        data: { issue: rawIssue({ state: { id: "state-done", name: "Done" } }) },
      });
    if (body.query.includes("query CompletedState"))
      return json({ data: { team: { states: { nodes: [{ id: "state-done" }] } } } });
    mutationAttempts += 1;
    throw new Error("Completion should not be written twice");
  };
  await createLinearAdapter({ config, project, fetch: scriptedFetch }).completeIssue({
    issueId: "issue-id",
  });
  assert.equal(mutationAttempts, 0);
});

test("Linear completion reconciles a committed response loss without retrying", async () => {
  const { config, project } = fixture();
  let completed = false;
  let mutationAttempts = 0;
  const scriptedFetch: typeof fetch = async (_url, init) => {
    const body = graphRequest(init);
    if (body.query.includes("query Identity"))
      return json({
        data: {
          organization: { id: "linear-workspace" },
          viewer: { id: "owner" },
        },
      });
    if (body.query.includes("query Issue"))
      return json({
        data: {
          issue: rawIssue({
            state: completed
              ? { id: "state-done", name: "Done" }
              : { id: "state-progress", name: "In Progress" },
          }),
        },
      });
    if (body.query.includes("query CompletedState"))
      return json({ data: { team: { states: { nodes: [{ id: "state-done" }] } } } });
    mutationAttempts += 1;
    completed = true;
    throw new Error("connection lost after commit");
  };
  await createLinearAdapter({ config, project, fetch: scriptedFetch }).completeIssue({
    issueId: "issue-id",
  });
  assert.equal(mutationAttempts, 1);
});

test("GitHub identity is bound to both repository and configured login", async () => {
  const { config, project } = fixture();
  const repositoryMismatch: typeof fetch = async (url) => {
    const path = String(url);
    return path.endsWith("/user")
      ? json({ login: "delivery-bot" })
      : json({ full_name: "example/other" });
  };
  await assert.rejects(
    createGithubAdapter({ config, project, fetch: repositoryMismatch }).verifyIdentity(),
    /repository.*user identity/i,
  );
  const loginMismatch: typeof fetch = async (url) => {
    const path = String(url);
    return path.endsWith("/user")
      ? json({ login: "wrong-user" })
      : json({ full_name: "example/delivery" });
  };
  await assert.rejects(
    createGithubAdapter({ config, project, fetch: loginMismatch }).verifyIdentity(),
    /repository.*user identity/i,
  );
});

test("GitHub Git authorization reuses the verified scoped identity", async () => {
  const { config, project } = fixture();
  const scriptedFetch: typeof fetch = async (url) => {
    const path = String(url);
    return path.endsWith("/user")
      ? json({ login: "delivery-bot" })
      : json({ full_name: "example/delivery" });
  };
  const authorization = await createGithubAdapter({
    config,
    project,
    fetch: scriptedFetch,
  }).gitAuthorization();
  assert.equal(authorization.repository, "example/delivery");
  assert.equal(authorization.login, "delivery-bot");
  assert.equal(
    authorization.header,
    `AUTHORIZATION: basic ${Buffer.from("delivery-bot:fixture-token").toString("base64")}`,
  );
  assert.doesNotMatch(authorization.header, /fixture-token/);
});

test("GitHub finds open pull requests linked to the canonical Linear issue URL", async () => {
  const { config, project } = fixture();
  const requestedPages: number[] = [];
  const firstPage = Array.from({ length: 100 }, (_, index) =>
    rawPull({
      number: index + 1,
      body:
        [
          "https://linear.app/acme/issue/DEL-10/prefix-collision",
          "Mentions DEL-1 without a link",
          "https://linear.app/other/issue/DEL-1/different-workspace",
          "https://linear.app/acme/issue/DEL-1extra/not-an-identifier",
        ][index] ?? "https://linear.app/acme/issue/DEL-2/unrelated",
    }),
  );
  const secondPage = [
    rawPull({
      number: 101,
      body: "Fixes [DEL-1](https://linear.app/acme/issue/DEL-1/new-title-slug).",
    }),
    rawPull({
      number: 102,
      body: "Tracked at https://linear.app/acme/issue/DEL-1",
    }),
    rawPull({
      number: 103,
      body: "https://linear.app/acme/issue/DEL-100/not-related",
    }),
  ];
  const scriptedFetch: typeof fetch = async (url) => {
    const path = String(url);
    if (path.endsWith("/user")) return json({ login: "delivery-bot" });
    if (path.endsWith("/repos/example/delivery")) return json({ full_name: "example/delivery" });
    if (path.includes("/pulls?")) {
      const query = new URL(path).searchParams;
      assert.equal(query.get("state"), "open");
      assert.equal(query.get("per_page"), "100");
      const page = Number(query.get("page"));
      requestedPages.push(page);
      return json(page === 1 ? firstPage : secondPage);
    }
    throw new Error(`Unexpected GitHub request: ${path}`);
  };
  const related = await createGithubAdapter({
    config,
    project,
    fetch: scriptedFetch,
  }).relatedPullRequests({
    issueUrl: "https://linear.app/acme/issue/DEL-1/old-title-slug",
  });
  assert.deepEqual(requestedPages, [1, 2]);
  assert.deepEqual(
    related.map(({ number }) => number),
    [101, 102],
  );
  assert.deepEqual(Object.keys(related[0] ?? {}).sort(), [
    "base",
    "baseBranch",
    "draft",
    "head",
    "headBranch",
    "mergeCommit",
    "merged",
    "number",
    "url",
  ]);
});

test("GitHub read failures retry within a fixed attempt bound", async () => {
  const { config, project } = fixture();
  let repositoryAttempts = 0;
  const scriptedFetch: typeof fetch = async (url) => {
    const path = String(url);
    if (path.endsWith("/user")) return json({ login: "delivery-bot" });
    repositoryAttempts += 1;
    return repositoryAttempts < 3
      ? json({ message: "temporarily unavailable" }, 503)
      : json({ full_name: "example/delivery" });
  };
  await createGithubAdapter({ config, project, fetch: scriptedFetch }).verifyIdentity();
  assert.equal(repositoryAttempts, 3);
});

test("GitHub converts an exact-head pull request to draft and reads it back", async () => {
  const { config, project } = fixture();
  let draft = false;
  let mutationAttempts = 0;
  const scriptedFetch: typeof fetch = async (url, init) => {
    const path = String(url);
    if (path.endsWith("/user")) return json({ login: "delivery-bot" });
    if (path.endsWith("/repos/example/delivery")) return json({ full_name: "example/delivery" });
    if (path.endsWith("/pulls/7")) return json(rawPull({ draft }));
    if (path.endsWith("/graphql") && init?.method === "POST") {
      mutationAttempts += 1;
      const request = graphRequest(init);
      assert.match(request.query, /convertPullRequestToDraft/);
      assert.equal(request.variables.id, "PR_fixture");
      draft = true;
      return json({
        data: {
          convertPullRequestToDraft: { pullRequest: { isDraft: true } },
        },
      });
    }
    throw new Error(`Unexpected GitHub request: ${path}`);
  };
  await createGithubAdapter({ config, project, fetch: scriptedFetch }).markDraft({
    number: 7,
    head: HEAD,
  });
  assert.equal(draft, true);
  assert.equal(mutationAttempts, 1);
});

test("GitHub draft conversion is idempotent and rejects changed or merged pulls", async () => {
  const { config, project } = fixture();
  let mutationAttempts = 0;
  const adapterFor = (pull: ReturnType<typeof rawPull>) =>
    createGithubAdapter({
      config,
      project,
      fetch: async (url, init) => {
        const path = String(url);
        if (path.endsWith("/user")) return json({ login: "delivery-bot" });
        if (path.endsWith("/repos/example/delivery"))
          return json({ full_name: "example/delivery" });
        if (path.endsWith("/pulls/7")) return json(pull);
        if (path.endsWith("/graphql") && init?.method === "POST") mutationAttempts += 1;
        throw new Error(`Unexpected GitHub request: ${path}`);
      },
    });
  await adapterFor(rawPull({ draft: true })).markDraft({ number: 7, head: HEAD });
  await assert.rejects(
    adapterFor(rawPull({ head: { sha: "d".repeat(40), ref: "feature" } })).markDraft({
      number: 7,
      head: HEAD,
    }),
    /Head changed/,
  );
  await assert.rejects(
    adapterFor(rawPull({ state: "closed", merged: true })).markDraft({
      number: 7,
      head: HEAD,
    }),
    /Merged pull request/,
  );
  assert.equal(mutationAttempts, 0);
});

test("GitHub draft conversion reconciles a committed response loss without retrying", async () => {
  const { config, project } = fixture();
  let draft = false;
  let mutationAttempts = 0;
  const scriptedFetch: typeof fetch = async (url, init) => {
    const path = String(url);
    if (path.endsWith("/user")) return json({ login: "delivery-bot" });
    if (path.endsWith("/repos/example/delivery")) return json({ full_name: "example/delivery" });
    if (path.endsWith("/pulls/7")) return json(rawPull({ draft }));
    if (path.endsWith("/graphql") && init?.method === "POST") {
      mutationAttempts += 1;
      draft = true;
      throw new Error("connection lost after draft conversion");
    }
    throw new Error(`Unexpected GitHub request: ${path}`);
  };
  await createGithubAdapter({ config, project, fetch: scriptedFetch }).markDraft({
    number: 7,
    head: HEAD,
  });
  assert.equal(draft, true);
  assert.equal(mutationAttempts, 1);
});

test("GitHub pull request lookup requires the operation marker", async () => {
  const { config, project } = fixture();
  const unmarkedFetch: typeof fetch = async (url) => {
    const path = String(url);
    if (path.endsWith("/user")) return json({ login: "delivery-bot" });
    if (path.endsWith("/repos/example/delivery")) return json({ full_name: "example/delivery" });
    if (path.includes("/pulls?")) return json([rawPull({ body: "Human-authored pull request" })]);
    throw new Error(`Unexpected GitHub request: ${path}`);
  };
  await assert.rejects(
    createGithubAdapter({ config, project, fetch: unmarkedFetch }).findPullRequest({
      headBranch: "feature",
      operationKey: "open-pr",
    }),
    /without this operation marker/,
  );
  const markedFetch: typeof fetch = async (url) => {
    const path = String(url);
    if (path.endsWith("/user")) return json({ login: "delivery-bot" });
    if (path.endsWith("/repos/example/delivery")) return json({ full_name: "example/delivery" });
    if (path.includes("/pulls?"))
      return json([rawPull({ body: "<!-- agent-delivery:open-pr -->" })]);
    throw new Error(`Unexpected GitHub request: ${path}`);
  };
  const reconciled = await createGithubAdapter({
    config,
    project,
    fetch: markedFetch,
  }).findPullRequest({ headBranch: "feature", operationKey: "open-pr" });
  assert.equal(reconciled?.number, 7);
});

function githubChecksFetch(input: {
  pull?: ReturnType<typeof rawPull>;
  conclusion?: string;
  headConclusions?: readonly string[];
  previewConclusions?: readonly string[];
  includeCheck?: boolean;
  rulePages?: readonly (readonly unknown[])[];
  rulesStatus?: number;
  checkStatus?: string;
  checkSummary?: string;
  requiredReviews?: number;
  strictPolicy?: boolean;
  mergeQueue?: boolean;
}): typeof fetch {
  return async (url) => {
    const path = String(url);
    if (path.endsWith("/user")) return json({ login: "delivery-bot" });
    if (path.endsWith("/repos/example/delivery")) return json({ full_name: "example/delivery" });
    if (path.endsWith("/pulls/7")) return json(input.pull ?? rawPull());
    if (path.includes("/rules/branches/main?")) {
      if (input.rulesStatus !== undefined)
        return json({ message: "rules unavailable" }, input.rulesStatus);
      const page = Number(new URL(path).searchParams.get("page"));
      const defaultRules = [
        {
          type: "required_status_checks",
          parameters: {
            strict_required_status_checks_policy: input.strictPolicy ?? true,
            required_status_checks: [{ context: "test", integration_id: null }],
          },
        },
        ...(input.requiredReviews
          ? [
              {
                type: "pull_request",
                parameters: { required_approving_review_count: input.requiredReviews },
              },
            ]
          : []),
        ...(input.mergeQueue ? [{ type: "merge_queue" }] : []),
      ];
      return json(input.rulePages?.[page - 1] ?? (page === 1 ? defaultRules : []));
    }
    if (path.endsWith("/branches/main/protection"))
      return json({
        required_status_checks: {
          strict: input.strictPolicy ?? true,
          contexts: ["test"],
        },
        required_pull_request_reviews: input.requiredReviews
          ? { required_approving_review_count: input.requiredReviews }
          : null,
      });
    if (path.endsWith("/branches/main")) return json({ commit: { sha: BASE } });
    if (path.includes("/pulls/7/reviews")) return json([]);
    if (path.endsWith("/git/ref/pulls/7/merge")) return json({ object: { sha: PREVIEW } });
    if (path.endsWith(`/git/commits/${PREVIEW}`))
      return json({ parents: [{ sha: BASE }, { sha: HEAD }] });
    if (path.includes("/check-runs")) {
      const ref = path.includes(PREVIEW) ? PREVIEW : HEAD;
      const conclusions = path.includes(PREVIEW)
        ? (input.previewConclusions ?? [input.conclusion ?? "success"])
        : (input.headConclusions ?? [input.conclusion ?? "success"]);
      return json({
        total_count: input.includeCheck === false ? 0 : conclusions.length,
        check_runs:
          input.includeCheck === false
            ? []
            : conclusions.map((conclusion, index) => ({
                id: (path.includes(PREVIEW) ? 200 : 100) + index,
                name: "test",
                head_sha: ref,
                status: input.checkStatus ?? "completed",
                conclusion: (input.checkStatus ?? "completed") === "completed" ? conclusion : null,
                started_at: `2026-01-01T00:00:0${index}Z`,
                completed_at:
                  (input.checkStatus ?? "completed") === "completed"
                    ? `2026-01-01T00:00:0${index + 1}Z`
                    : null,
                app: { id: 1 },
                output: { summary: input.checkSummary ?? "Check summary" },
              })),
      });
    }
    if (path.includes("/status?")) return json({ statuses: [] });
    throw new Error(`Unexpected GitHub request: ${path}`);
  };
}

test("GitHub rejects stale pull head and base bindings", async () => {
  const { config, project } = fixture();
  const result = await createGithubAdapter({
    config,
    project,
    fetch: githubChecksFetch({}),
  }).requiredChecks({ number: 7, head: "d".repeat(40), base: "e".repeat(40) });
  assert.equal(result.passed, false);
  assert.deepEqual(result.failures.slice(0, 3), [
    "pull request head changed",
    "pull request base changed",
    "base branch changed",
  ]);
});

test("GitHub blocks skipped and missing required checks", async () => {
  const { config, project } = fixture();
  const skipped = await createGithubAdapter({
    config,
    project,
    fetch: githubChecksFetch({ conclusion: "skipped", checkSummary: "x".repeat(600) }),
  }).requiredChecks({ number: 7, head: HEAD, base: BASE });
  const missing = await createGithubAdapter({
    config,
    project,
    fetch: githubChecksFetch({ includeCheck: false }),
  }).requiredChecks({ number: 7, head: HEAD, base: BASE });
  assert.equal(skipped.passed, false);
  assert.equal(missing.passed, false);
  assert.match(skipped.failures.join(" "), /required check not successful/);
  assert.deepEqual(skipped.testedRefs, [HEAD, PREVIEW]);
  assert.equal(skipped.nextAction, "repair");
  assert.equal(missing.nextAction, "wait");
  assert.deepEqual(skipped.details[0], {
    context: "test",
    ref: PREVIEW,
    source: "check-run",
    status: "completed",
    conclusion: "skipped",
    summary: "x".repeat(500),
  });
  assert.deepEqual(missing.details[0], {
    context: "test",
    ref: PREVIEW,
    source: "missing",
    status: "missing",
    conclusion: null,
    summary: null,
  });
});

test("GitHub classifies pending required checks as wait", async () => {
  const { config, project } = fixture();
  const result = await createGithubAdapter({
    config,
    project,
    fetch: githubChecksFetch({ checkStatus: "in_progress" }),
  }).requiredChecks({ number: 7, head: HEAD, base: BASE });
  assert.equal(result.passed, false);
  assert.equal(result.nextAction, "wait");
  assert.deepEqual(result.details[0], {
    context: "test",
    ref: PREVIEW,
    source: "check-run",
    status: "in_progress",
    conclusion: null,
    summary: "Check summary",
  });
});

test("GitHub bounds required check details", async () => {
  const { config, project } = fixture();
  project.release.requiredChecks = Array.from({ length: 25 }, (_, index) => `check-${index}`);
  const result = await createGithubAdapter({
    config,
    project,
    fetch: githubChecksFetch({ includeCheck: false }),
  }).requiredChecks({ number: 7, head: HEAD, base: BASE });
  assert.equal(result.nextAction, "wait");
  assert.equal(result.details.length, 20);
});

test("GitHub uses the newest preview attempt instead of an older head success", async () => {
  const { config, project } = fixture();
  const result = await createGithubAdapter({
    config,
    project,
    fetch: githubChecksFetch({
      headConclusions: ["success"],
      previewConclusions: ["success", "failure"],
    }),
  }).requiredChecks({ number: 7, head: HEAD, base: BASE });
  assert.equal(result.passed, false);
  assert.match(result.failures.join(" "), /required check not successful/);
  assert.equal(result.nextAction, "repair");
});

test("GitHub reports the selected exact-ref commit status", async () => {
  const { config, project } = fixture();
  const baseFetch = githubChecksFetch({ includeCheck: false });
  const scriptedFetch: typeof fetch = async (url, init) => {
    const path = String(url);
    if (path.includes("/status?") && path.includes(PREVIEW))
      return json({
        statuses: [
          {
            id: 302,
            context: "test",
            state: "failure",
            updated_at: "2026-01-01T00:00:03Z",
            description: "Integration suite failed",
          },
        ],
      });
    if (path.includes("/status?") && path.includes(HEAD))
      return json({
        statuses: [
          {
            id: 301,
            context: "test",
            state: "success",
            updated_at: "2026-01-01T00:00:01Z",
            description: "Earlier head run passed",
          },
        ],
      });
    return baseFetch(url, init);
  };
  const result = await createGithubAdapter({
    config,
    project,
    fetch: scriptedFetch,
  }).requiredChecks({ number: 7, head: HEAD, base: BASE });
  assert.equal(result.nextAction, "repair");
  assert.deepEqual(result.details[0], {
    context: "test",
    ref: PREVIEW,
    source: "commit-status",
    status: "failure",
    conclusion: "failure",
    summary: "Integration suite failed",
  });
});

test("GitHub distinguishes human review and blocked policy actions", async () => {
  const { config, project } = fixture();
  const review = await createGithubAdapter({
    config,
    project,
    fetch: githubChecksFetch({
      requiredReviews: 1,
      pull: rawPull({ mergeable: true, mergeable_state: "blocked" }),
    }),
  }).requiredChecks({ number: 7, head: HEAD, base: BASE });
  assert.equal(review.passed, false);
  assert.equal(review.nextAction, "human-review");
  assert.match(review.failures[0] ?? "", /pull request is not mergeable/);
  assert.match(review.failures[1] ?? "", /required reviews missing/);

  const strict = await createGithubAdapter({
    config,
    project,
    fetch: githubChecksFetch({ strictPolicy: false }),
  }).requiredChecks({ number: 7, head: HEAD, base: BASE });
  assert.equal(strict.nextAction, "blocked-policy");
  assert.equal(strict.failures[0], "required status checks are not strict");

  const mergeQueue = await createGithubAdapter({
    config,
    project,
    fetch: githubChecksFetch({ mergeQueue: true }),
  }).requiredChecks({ number: 7, head: HEAD, base: BASE });
  assert.equal(mergeQueue.nextAction, "blocked-policy");
  assert.equal(mergeQueue.failures.at(-1), "merge queue is not supported");
});

test("GitHub effective rules paginate fully and fail closed on a 404", async () => {
  const { config, project } = fixture();
  const requiredRule = {
    type: "required_status_checks",
    parameters: {
      strict_required_status_checks_policy: true,
      required_status_checks: [{ context: "test", integration_id: null }],
    },
  };
  const firstPage = [
    requiredRule,
    ...Array.from({ length: 99 }, () => ({ type: "non_fast_forward" })),
  ];
  const ruleRequests: string[] = [];
  const paginatedBase = githubChecksFetch({ rulePages: [firstPage, []] });
  const paginatedFetch: typeof fetch = async (url, init) => {
    const path = String(url);
    if (path.includes("/rules/branches/main?")) ruleRequests.push(path);
    return paginatedBase(url, init);
  };
  const passing = await createGithubAdapter({
    config,
    project,
    fetch: paginatedFetch,
  }).requiredChecks({ number: 7, head: HEAD, base: BASE });
  assert.equal(passing.passed, true);
  assert.equal(passing.nextAction, undefined);
  assert.equal(ruleRequests.length, 2);
  assert.match(ruleRequests[0] ?? "", /per_page=100.*page=1/);
  assert.match(ruleRequests[1] ?? "", /per_page=100.*page=2/);

  await assert.rejects(
    createGithubAdapter({
      config,
      project,
      fetch: githubChecksFetch({ rulesStatus: 404 }),
    }).requiredChecks({ number: 7, head: HEAD, base: BASE }),
    /HTTP 404/,
  );
});

test("GitHub merge reconciles a committed response loss without retrying", async () => {
  const { config, project } = fixture();
  const mergeCommit = "d".repeat(40);
  let committed = false;
  let mutationAttempts = 0;
  const baseFetch = githubChecksFetch({});
  const scriptedFetch: typeof fetch = async (url, init) => {
    const path = String(url);
    if (path.endsWith("/pulls/7") && committed)
      return json(
        rawPull({
          state: "closed",
          merged: true,
          merge_commit_sha: mergeCommit,
          mergeable: false,
          mergeable_state: "unknown",
        }),
      );
    if (path.endsWith("/pulls/7/merge") && init?.method === "PUT") {
      mutationAttempts += 1;
      committed = true;
      throw new Error("connection lost after merge");
    }
    return baseFetch(url, init);
  };
  const result = await createGithubAdapter({
    config,
    project,
    fetch: scriptedFetch,
  }).merge({ number: 7, head: HEAD, base: BASE });
  assert.deepEqual(result, { merged: true, commit: mergeCommit });
  assert.equal(mutationAttempts, 1);
});

test("GitHub mutation network loss is uncertain and is never retried", async () => {
  const { config, project } = fixture();
  let createAttempts = 0;
  const scriptedFetch: typeof fetch = async (url, init) => {
    const path = String(url);
    if (path.endsWith("/user")) return json({ login: "delivery-bot" });
    if (path.endsWith("/repos/example/delivery")) return json({ full_name: "example/delivery" });
    if (path.includes("/pulls?") && init?.method === "GET") return json([]);
    if (path.endsWith("/pulls") && init?.method === "POST") {
      createAttempts += 1;
      throw new Error("connection lost after send");
    }
    throw new Error(`Unexpected GitHub request: ${path}`);
  };
  await assert.rejects(
    createGithubAdapter({ config, project, fetch: scriptedFetch }).createPullRequest({
      headBranch: "feature",
      title: "feat: delivery",
      body: "Body",
      operationKey: "open-pr",
    }),
    (error: unknown) =>
      error instanceof Error && error.message.includes("remote outcome is uncertain"),
  );
  assert.equal(createAttempts, 1);
});

test("GraphQL intake filters terminal history at the server and preserves label mode", async () => {
  const { config, project } = fixture();
  const filters: unknown[] = [];
  const scriptedFetch: typeof fetch = async (_url, init) => {
    const body = graphRequest(init);
    if (body.query.includes("query Identity"))
      return json({
        data: {
          organization: { id: config.linear.workspaceId },
          viewer: { id: config.linear.assigneeId },
        },
      });
    const filter = z
      .object({
        state: z.object({ type: z.object({ nin: z.array(z.string()) }) }),
        labels: z.unknown().optional(),
      })
      .parse(body.variables.filter);
    assert.deepEqual(filter.state.type.nin, ["completed", "canceled"]);
    filters.push(filter);
    return json({
      data: {
        issues: {
          nodes: [rawIssue({ creator: { id: "colleague" } })],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      },
    });
  };
  const adapter = createLinearAdapter({ config, project, fetch: scriptedFetch });
  assert.equal((await adapter.listEligible())[0]?.creatorId, "colleague");
  assert.ok(z.object({ labels: z.unknown() }).parse(filters[0]).labels);
  config.linear.intake = { mode: "private", automaticOthers: true };
  await adapter.listEligible();
  assert.equal(z.object({ labels: z.unknown().optional() }).parse(filters[1]).labels, undefined);
});
