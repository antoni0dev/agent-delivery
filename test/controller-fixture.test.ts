import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import { configDigest, type WorkspaceConfig, workspaceConfigSchema } from "../src/config.js";
import { Controller, type ControllerServices } from "../src/controller.js";
import {
  ensurePresent,
  type Issue,
  issueSchema,
  type Plan,
  planSchema,
  type Review,
  reviewSchema,
} from "../src/domain.js";
import type { Pull } from "../src/integrations/github.js";
import type { LoadedKnowledge, SelectedKnowledge } from "../src/knowledge/index.js";
import { selectRuntimeRole } from "../src/runtime/index.js";
import { Store } from "../src/store.js";

type RuntimeInput = Parameters<ControllerServices["runtime"]>[0];
type CommandInput = Parameters<ControllerServices["command"]>[0];
type LinearPort = ReturnType<ControllerServices["linear"]>;
type GithubPort = ReturnType<ControllerServices["github"]>;

const HEAD = "a".repeat(40);
const BASE = "b".repeat(40);
const TREE = "c".repeat(40);
const NOW = "2026-09-26T10:00:00.000Z";

export const cleanReview: Review = reviewSchema.parse({
  summary: "The independently inspected scope satisfies the declared contract.",
  findings: [],
  unresolvedDecisions: [],
});

export function createPlan({
  children = [],
  complexOrMoney = false,
}: {
  children?: Plan["children"];
  complexOrMoney?: boolean;
} = {}): Plan {
  return planSchema.parse({
    summary: "Implement the admitted issue and verify the resulting candidate.",
    fullPlan:
      "Validate the admitted issue, preserve the complete accepted scope, implement it once, independently review the candidate, execute declared checks, and merge only the fully bound evidence.",
    sourceOfTruth: "The admitted issue and repository instructions",
    boundaries: ["Only the configured non-production repository and issue are in scope."],
    interfaces: ["Controller lifecycle", "Destination adapters"],
    decisions: ["Use the declared unit and browser verification commands."],
    nonGoals: ["No production deployment"],
    topics: ["delivery"],
    exceptions: [],
    requirements: [
      {
        id: "review",
        description: "Independent code review",
        kind: "code-review",
        commandId: null,
      },
      {
        id: "unit",
        description: "Configured unit verification",
        kind: "unit",
        commandId: "unit",
      },
      {
        id: "browser",
        description: "Main browser journey",
        kind: "browser",
        commandId: "browser",
      },
    ],
    children,
    unresolvedDecisions: [],
    complexOrMoney,
  });
}

export type ControllerFixture = {
  root: string;
  config: WorkspaceConfig;
  store: Store;
  controller: Controller;
  issue: Issue;
  runtimeCalls: RuntimeInput[];
  commandCalls: CommandInput[];
  gitCalls: string[];
  publishedPlans: Array<{ planDigest: string; fullPlan: string }>;
  completedIssues: string[];
  githubCalls: {
    markedReady: Array<{ number: number; head: string }>;
    markedDraft: Array<{ number: number; head: string }>;
    requiredChecks: Array<{ number: number; head: string; base: string }>;
    merged: Array<{ number: number; head: string; base: string }>;
    disabled: number[];
  };
  setChecksPassed: (passed: boolean) => void;
  setMergeHook: (hook: () => void) => void;
  setBase: (base: string) => void;
  setDirty: (dirty: boolean) => void;
  admitIssue: (issue: Issue) => void;
  setIntakeHook: (hook: () => void) => void;
  setIssueReadHook: (hook: () => void) => void;
  withdraw: (issueId: string) => void;
  setRuntimeGate: (gate: (input: RuntimeInput) => Promise<void>) => void;
  setRuntimeHook: (hook: (input: RuntimeInput) => void) => void;
  cleanup: () => void;
};

export function createControllerFixture({
  profile = "codex",
  planForIssue = () => createPlan(),
  reuseImplementerSession = false,
  failFirstCommand = false,
  failFirstCi = false,
  truncatePublishedPlan = false,
  relatedPullRequests = [],
  intakeIntervalMs,
  intake,
}: {
  profile?: WorkspaceConfig["intakeRuntimeProfile"];
  planForIssue?: (issueId: string) => Plan;
  reuseImplementerSession?: boolean;
  failFirstCommand?: boolean;
  failFirstCi?: boolean;
  truncatePublishedPlan?: boolean;
  relatedPullRequests?: Pull[];
  intakeIntervalMs?: number;
  intake?: WorkspaceConfig["linear"]["intake"];
} = {}): ControllerFixture {
  const root = mkdtempSync(join(tmpdir(), "controller-lifecycle-"));
  const projectRoot = join(root, "repository");
  const stateDirectory = join(root, "state");
  const knowledgeRoot = join(root, "released-knowledge");
  mkdirSync(projectRoot, { recursive: true });
  mkdirSync(knowledgeRoot, { recursive: true });
  writeFileSync(join(projectRoot, "AGENTS.md"), "# Fixture\n\nKeep the change scoped.\n");

  const config = workspaceConfigSchema.parse({
    schemaVersion: 1,
    workspaceId: "controller-fixture",
    stateDirectory,
    knowledgeRoot,
    intakeRuntimeProfile: profile,
    runtimes: { codex: "fake-codex", "claude-code": "fake-claude", cursor: "fake-cursor" },
    linear: {
      workspaceId: "linear-workspace",
      assigneeId: "actor-owner",
      readyLabel: "AI-ready",
      ...(intake === undefined ? {} : { intake }),
      credential: { kind: "environment", name: "FIXTURE_LINEAR_TOKEN" },
    },
    github: {
      hostname: "github.com",
      login: "destination-login",
      credential: { kind: "environment", name: "FIXTURE_GITHUB_TOKEN" },
    },
    authority: {
      grantReference: "fixture-authority",
      updateOwnedIssues: true,
      createScopedChildren: true,
      pushFeatureBranches: true,
      openPullRequests: true,
      mergeDevelopment: true,
    },
    capacity: { initiatives: 2, writers: 3 },
    projects: [
      {
        id: "project",
        root: projectRoot,
        repository: "example/controller-fixture",
        remote: "git@github.com:example/controller-fixture.git",
        defaultBranch: "main",
        gitIdentity: { name: "Destination Actor", email: "destination@example.test" },
        teamIds: ["team"],
        projectIds: ["linear-project"],
        instructions: ["AGENTS.md"],
        commands: {
          unit: { executable: "fixture-check", args: ["unit"] },
          browser: { executable: "fixture-check", args: ["browser"] },
        },
        environment: {
          name: "fixture",
          production: false,
          mainnet: false,
          authentication: "none",
          mutations: "disabled",
          allowedChainIds: [],
          configurationFiles: [],
        },
        release: {
          targetBranch: "main",
          method: "squash",
          deploysProduction: false,
          strictCurrentBase: true,
          requiredChecks: ["ci"],
        },
      },
    ],
    notifications: { linear: false, desktop: false },
    liveEvidenceMaxAgeMs: 60 * 60 * 1000,
  });

  const issue = issueSchema.parse({
    id: "issue-parent",
    identifier: "DEL-1",
    title: "Exercise controller lifecycle",
    description: "Deliver the admitted fixture through every required gate.",
    teamId: "team",
    projectId: "linear-project",
    assigneeId: "actor-owner",
    labels: ["AI-ready"],
    state: "In Progress",
    url: "https://linear.example.test/DEL-1",
  });
  const issues = new Map<string, Issue>([[issue.id, issue]]);
  const runtimeCalls: RuntimeInput[] = [];
  const commandCalls: CommandInput[] = [];
  const gitCalls: string[] = [];
  const publishedPlans: Array<{ planDigest: string; fullPlan: string }> = [];
  const completedIssues: string[] = [];
  const markedDraft: Array<{ number: number; head: string }> = [];
  const markedReady: Array<{ number: number; head: string }> = [];
  const requiredChecksCalls: Array<{ number: number; head: string; base: string }> = [];
  const mergedCalls: Array<{ number: number; head: string; base: string }> = [];
  const disabled: number[] = [];
  const pulls = new Map<number, Pull>();
  let nextPull = 10;
  let nextChild = 1;
  let checksPassed = true;
  let mergeHook = () => {};
  let currentBase = BASE;
  let dirty = false;
  let intakeHook = () => {};
  let issueReadHook = () => {};
  let runtimeGate = async (_input: RuntimeInput): Promise<void> => undefined;
  let runtimeHook = (_input: RuntimeInput): void => undefined;

  const knowledge: LoadedKnowledge = {
    digest: "knowledge-digest",
    complete: true,
    cards: [
      {
        id: "delivery-card",
        topics: ["delivery"],
        content:
          "A complete delivery binds independent review and verification evidence to the exact candidate before a merge can proceed safely.",
        digest: "card-digest",
      },
    ],
    sourceSnapshotDigest: "snapshot-digest",
    coverage: {
      total: 1,
      pending: 0,
      excluded: 0,
      incorporated: 1,
      covered: 0,
      reconciled: 0,
      superseded: 0,
    },
    audit: "approved",
  };
  const selectedKnowledge: SelectedKnowledge = {
    releaseDigest: knowledge.digest,
    complete: true,
    cards: knowledge.cards,
  };

  const runtime: ControllerServices["runtime"] = async (input) => {
    runtimeCalls.push(input);
    const selected = selectRuntimeRole(
      input.complexOrMoney === undefined
        ? { profile: input.profile, role: input.role }
        : { profile: input.profile, role: input.role, complexOrMoney: input.complexOrMoney },
    );
    const parsedPrompt: unknown = JSON.parse(input.prompt);
    const prompt = z
      .object({ issue: z.object({ id: z.string() }).passthrough() })
      .passthrough()
      .safeParse(parsedPrompt);
    const outputByRole: Record<RuntimeInput["role"], unknown> = {
      planner: planForIssue(prompt.success ? prompt.data.issue.id : issue.id),
      planCritic: cleanReview,
      implementer: { summary: "Implemented the frozen packet exactly once.", blocked: null },
      reviewer: cleanReview,
      browserVerifier: cleanReview,
    };
    const implementer = runtimeCalls.find((call) => call.role === "implementer");
    const nativeSessionId =
      reuseImplementerSession && input.role === "reviewer" && implementer !== undefined
        ? "implementing-context"
        : input.role === "implementer" && reuseImplementerSession
          ? "implementing-context"
          : `${input.role}-${runtimeCalls.length}`;
    runtimeHook(input);
    await runtimeGate(input);
    return {
      status: "completed",
      output: outputByRole[input.role],
      requestedModel: selected.model,
      actualModel: selected.model,
      nativeSessionId,
      startedAt: NOW,
      finishedAt: NOW,
      exitCode: 0,
      artifactPath: join(root, "unused-runtime-artifact.json"),
      pid: null,
      reason: null,
    };
  };

  const command: ControllerServices["command"] = async (input) => {
    commandCalls.push(input);
    const commandId = ensurePresent(input.command.args[0], "Fixture command has no identifier");
    const report = ["browser", "unit"].includes(commandId)
      ? {
          head: HEAD,
          environment: "fixture",
          authentication: "none",
          production: false,
          mainnet: false,
          tests: [
            {
              requirementId: commandId,
              status: "passed",
              assertions: 2,
              proof: "fixture-proof",
              chainId: null,
              destinationVerified: true,
            },
          ],
        }
      : null;
    return {
      exitCode: 0,
      passed: !(failFirstCommand && commandCalls.length === 1),
      timedOut: false,
      report,
      reportPath: join(input.artifactDirectory, "command.json"),
      startedAt: NOW,
      completedAt: NOW,
    };
  };

  const git: ControllerServices["git"] = {
    updateBase: () => {
      gitCalls.push("updateBase");
    },
    assertRepository: () => undefined,
    assertIdentity: () => undefined,
    assertClean: () => {
      if (dirty) throw new Error("Candidate was modified outside its commit");
    },
    fetchBase: () => {
      gitCalls.push("fetchBase");
    },
    ensureWorktree: ({ initiativeId }) => ({
      path: join(root, "worktrees", initiativeId),
      branch: `delivery/${initiativeId}`,
    }),
    commitImplementation: () => {
      gitCalls.push("commitImplementation");
      return HEAD;
    },
    pushFeature: () => {
      gitCalls.push("pushFeature");
    },
    candidate: () => ({ head: HEAD, base: currentBase, tree: TREE }),
    git: ({ args }) => {
      gitCalls.push(args.join(" "));
      return "";
    },
  };

  const linear: LinearPort = {
    verifyIdentity: async () => undefined,
    listEligible: async () => {
      intakeHook();
      return [...issues.values()].filter(
        (entry) =>
          (config.linear.intake?.mode === "private" || entry.labels.includes("AI-ready")) &&
          entry.state !== "Completed",
      );
    },
    getIssue: async (id) => {
      issueReadHook();
      return ensurePresent(issues.get(id), `Unknown fixture issue ${id}`);
    },
    findComment: async () => null,
    publishPlan: async ({ planDigest, fullPlan }) => {
      publishedPlans.push({ planDigest, fullPlan });
      return {
        id: `comment-${publishedPlans.length}`,
        body: truncatePublishedPlan
          ? `Version: ${planDigest}`
          : `Version: ${planDigest}\n\n${fullPlan}`,
      };
    },
    findChild: async () => null,
    createChild: async ({ title, description }) => {
      const child = issueSchema.parse({
        ...issue,
        id: `issue-child-${nextChild}`,
        identifier: `DEL-${nextChild + 1}`,
        title,
        description,
        url: `https://linear.example.test/DEL-${nextChild + 1}`,
      });
      nextChild += 1;
      issues.set(child.id, child);
      return child;
    },
    completeIssue: async ({ issueId }) => {
      completedIssues.push(issueId);
      const current = ensurePresent(issues.get(issueId), "Expected a known issue to complete");
      issues.set(issueId, issueSchema.parse({ ...current, labels: [], state: "Completed" }));
    },
    notify: async ({ body }) => ({ id: "notification", body }),
  };

  const github: GithubPort = {
    verifyIdentity: async () => undefined,
    relatedPullRequests: async () => relatedPullRequests,
    gitAuthorization: async () => ({
      repository: config.projects[0]?.repository ?? "example/delivery",
      login: config.github.login,
      header: "AUTHORIZATION: basic Zml4dHVyZQ==",
    }),
    findPullRequest: async ({ headBranch }) =>
      [...pulls.values()].find((pull) => pull.headBranch === headBranch && !pull.merged) ?? null,
    createPullRequest: async ({ headBranch }) => {
      const pull: Pull = {
        number: nextPull,
        url: `https://github.example.test/pull/${nextPull}`,
        head: HEAD,
        base: currentBase,
        headBranch,
        baseBranch: "main",
        draft: true,
        merged: false,
        mergeCommit: null,
      };
      nextPull += 1;
      pulls.set(pull.number, pull);
      return pull;
    },
    readPullRequest: async (number) =>
      ensurePresent(pulls.get(number), "Expected a known pull request"),
    requiredChecks: async (args) => {
      requiredChecksCalls.push(args);
      if (failFirstCi && requiredChecksCalls.length === 1)
        return {
          passed: false,
          failures: ["required check not successful: ci"],
          testedRefs: [args.head],
          nextAction: "repair",
          details: [],
        };
      return {
        passed: checksPassed,
        failures: checksPassed ? [] : ["required check not successful: ci"],
        testedRefs: [args.head],
        details: [],
      };
    },
    merge: async (args) => {
      mergedCalls.push(args);
      const pull = ensurePresent(pulls.get(args.number), "Expected a pull request to merge");
      pulls.set(args.number, { ...pull, merged: true, mergeCommit: "d".repeat(40) });
      mergeHook();
      return { merged: true, commit: "d".repeat(40) };
    },
    disableAutoMerge: async ({ number }) => {
      disabled.push(number);
    },
    markDraft: async (args) => {
      markedDraft.push(args);
      const pull = ensurePresent(pulls.get(args.number), "Expected owned PR");
      pulls.set(args.number, { ...pull, draft: true });
    },
    markReady: async (args) => {
      markedReady.push(args);
      const pull = ensurePresent(pulls.get(args.number), "Expected a pull request to mark ready");
      pulls.set(args.number, { ...pull, draft: false });
    },
  };

  const store = new Store({
    path: join(stateDirectory, "controller.sqlite"),
    workspaceId: config.workspaceId,
    maxInitiatives: config.capacity.initiatives,
    maxWriters: config.capacity.writers,
  });
  store.activate({
    hostId: "fixture-host",
    profile,
    configDigest: configDigest(config),
    conformanceDigest: "fixture-conformance",
  });
  const controller = new Controller({
    config,
    store,
    hostId: "fixture-host",
    ...(intakeIntervalMs === undefined ? {} : { intakeIntervalMs }),
    services: {
      runtime,
      command,
      acquireHeavy: () => ({ started: () => undefined, release: () => undefined }),
      git,
      linear: () => linear,
      github: () => github,
      knowledge: { load: () => knowledge, select: () => selectedKnowledge },
      conformance: async () => ({ digest: "fixture-conformance" }),
      knowledgeEligibility: () => ({ digest: "fixture-eligibility" }),
      behavior: async () => ({
        digest: "fixture-behavior",
        semanticPassed: true,
        coverageStatus: "independent-audit-required",
      }),
    },
  });

  return {
    root,
    config,
    store,
    controller,
    issue,
    runtimeCalls,
    commandCalls,
    gitCalls,
    publishedPlans,
    completedIssues,
    githubCalls: {
      markedReady,
      markedDraft,
      requiredChecks: requiredChecksCalls,
      merged: mergedCalls,
      disabled,
    },
    setMergeHook: (hook) => {
      mergeHook = hook;
    },
    setChecksPassed: (passed) => {
      checksPassed = passed;
    },
    setDirty: (value) => {
      dirty = value;
    },
    setBase: (base) => {
      currentBase = base;
    },
    admitIssue: (admitted) => {
      issues.set(admitted.id, admitted);
    },
    setIntakeHook: (hook) => {
      intakeHook = hook;
    },
    setIssueReadHook: (hook) => {
      issueReadHook = hook;
    },
    withdraw: (issueId) => {
      const current = ensurePresent(issues.get(issueId), "Expected a known issue to withdraw");
      issues.set(issueId, issueSchema.parse({ ...current, labels: [] }));
    },
    setRuntimeGate: (gate) => {
      runtimeGate = gate;
    },
    setRuntimeHook: (hook) => {
      runtimeHook = hook;
    },
    cleanup: () => {
      store.close();
      rmSync(root, { recursive: true, force: true });
    },
  };
}

export const fixtureHead = HEAD;
export const fixtureBase = BASE;
