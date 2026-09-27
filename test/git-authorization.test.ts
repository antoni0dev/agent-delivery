import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { z } from "zod";
import { workspaceConfigSchema } from "../src/config.js";
import { fetchBase, pushFeature, updateBase } from "../src/git.js";
import type { GitAuthorization } from "../src/integrations/github.js";

const authorization: GitAuthorization = {
  repository: "example/delivery",
  login: "delivery-bot",
  header: "AUTHORIZATION: basic Zml4dHVyZS1hdXRob3JpemF0aW9u",
};

function fixture({ remote = "git@github.com:example/delivery.git" }: { remote?: string } = {}) {
  const root = mkdtempSync(join(tmpdir(), "delivery-git-auth-"));
  const bin = join(root, "bin");
  const recordsPath = join(root, "records.jsonl");
  mkdirSync(bin);
  execFileSync("/usr/bin/git", ["init", "-q", root]);
  writeFileSync(
    join(root, ".git", "hooks", "pre-push"),
    "#!/bin/sh\nprintf hook-ran > .git/hook-observation\n",
    { mode: 0o700 },
  );
  const branch = "delivery/task";
  const script = `#!/usr/bin/env node
const { appendFileSync, existsSync, readFileSync } = require("node:fs");
const { join } = require("node:path");
const args = process.argv.slice(2);
const same = (...expected) => expected.every((value, index) => args[index] === value);
if (same("remote", "get-url", "origin")) process.stdout.write(${JSON.stringify(remote)});
else if (same("config", "user.name")) process.stdout.write("Fixture Author");
else if (same("config", "user.email")) process.stdout.write("fixture@example.invalid");
else if (same("status", "--porcelain", "--untracked-files=all")) process.stdout.write("");
else if (same("branch", "--show-current")) process.stdout.write(${JSON.stringify(branch)});
else if (same("config", "--get-regexp")) {
  if (existsSync(join(process.cwd(), ".rewrite"))) {
    const kind = readFileSync(join(process.cwd(), ".rewrite"), "utf8").trim();
    const key = kind === "push" ? "pushinsteadof" : "insteadof";
    process.stdout.write("url.ssh://example.invalid/." + key + " https://github.com/\\n");
    process.exit(0);
  }
  process.exit(1);
}
if (args[0] === "fetch" || args[0] === "push") {
  require("node:child_process").execFileSync("/usr/bin/git", ["hook", "run", "--ignore-missing", "pre-push"], { cwd: process.cwd(), env: process.env });
  const count = Number(process.env.GIT_CONFIG_COUNT ?? "0");
  const entries = Array.from({ length: count }, (_, index) => ({
    key: process.env["GIT_CONFIG_KEY_" + index],
    value: process.env["GIT_CONFIG_VALUE_" + index],
  }));
  appendFileSync(${JSON.stringify(recordsPath)}, JSON.stringify({
    args,
    authorizationConfigured: entries.some((entry) => entry.key === "http.https://github.com/.extraheader" && entry.value === ${JSON.stringify(authorization.header)}),
    helperCleared: entries.some((entry) => entry.key === "credential.helper" && entry.value === ""),
    extraHeadersCleared: entries.some((entry) => entry.key === "http.extraheader" && entry.value === "") && entries.some((entry) => entry.key === "http.https://github.com/.extraheader" && entry.value === ""),
    ignoresSystem: process.env.GIT_CONFIG_NOSYSTEM === "1",
    ignoresGlobal: process.env.GIT_CONFIG_GLOBAL === "/dev/null",
    promptsDisabled: process.env.GIT_TERMINAL_PROMPT === "0" && process.env.GIT_ASKPASS === "/usr/bin/false",
    secretInArguments: args.some((arg) => arg.includes("fixture-authorization")),
    hookRan: existsSync(join(process.cwd(), ".git", "hook-observation")),
  }) + "\\n");
}
`;
  writeFileSync(join(bin, "git"), script, { mode: 0o700 });
  writeFileSync(
    join(bin, "ssh"),
    `#!/usr/bin/env node
const fs = require('node:fs');
const host = fs.existsSync('.ssh-hostname') ? fs.readFileSync('.ssh-hostname','utf8').trim() : 'github.com';
process.stdout.write('hostname '+host+'\\nuser git\\n');
`,
    { mode: 0o700 },
  );
  const config = workspaceConfigSchema.parse({
    schemaVersion: 1,
    workspaceId: "fixture",
    stateDirectory: join(root, "state"),
    knowledgeRoot: join(root, "knowledge"),
    intakeRuntimeProfile: "codex",
    runtimes: { codex: "codex", "claude-code": "claude", cursor: "cursor" },
    linear: {
      workspaceId: "linear",
      assigneeId: "owner",
      readyLabel: "ready",
      credential: { kind: "environment", name: "LINEAR_TOKEN" },
    },
    github: {
      hostname: "github.com",
      login: "delivery-bot",
      credential: { kind: "environment", name: "GITHUB_TOKEN" },
    },
    authority: {
      grantReference: "fixture",
      updateOwnedIssues: false,
      createScopedChildren: false,
      pushFeatureBranches: true,
      openPullRequests: false,
      mergeDevelopment: false,
    },
    capacity: { initiatives: 1, writers: 1 },
    projects: [
      {
        id: "project",
        root,
        repository: "example/delivery",
        remote,
        defaultBranch: "main",
        gitIdentity: { name: "Fixture Author", email: "fixture@example.invalid" },
        teamIds: ["team"],
        projectIds: [],
        instructions: [],
        commands: {},
        environment: {
          name: "fixture",
          production: false,
          mainnet: false,
          authentication: "none",
          mutations: "non-production",
          allowedChainIds: [],
          configurationFiles: [],
          variables: [],
        },
        release: {
          targetBranch: "main",
          method: "squash",
          deploysProduction: false,
          strictCurrentBase: true,
          requiredChecks: ["test"],
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
    bin,
    branch,
    recordsPath,
    config,
    project,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

const recordSchema = z.object({
  args: z.array(z.string()),
  authorizationConfigured: z.boolean(),
  helperCleared: z.boolean(),
  extraHeadersCleared: z.boolean(),
  ignoresSystem: z.boolean(),
  ignoresGlobal: z.boolean(),
  promptsDisabled: z.boolean(),
  secretInArguments: z.boolean(),
  hookRan: z.boolean(),
});

function records(path: string): z.infer<typeof recordSchema>[] {
  const content = readFileSync(path, "utf8").trim();
  return content === ""
    ? []
    : content.split("\n").map((line) => recordSchema.parse(JSON.parse(line)));
}

test("verified authorization drives canonical HTTPS fetch and owned-branch pushes", () => {
  const value = fixture();
  const previousPath = process.env.PATH;
  const previousConfigCount = process.env.GIT_CONFIG_COUNT;
  process.env.PATH = `${value.bin}:${previousPath ?? ""}`;
  process.env.GIT_CONFIG_COUNT = "99";
  try {
    fetchBase({ config: value.config, project: value.project, authorization });
    pushFeature({
      config: value.config,
      project: value.project,
      cwd: value.root,
      branch: value.branch,
      authorization,
    });
    updateBase({
      config: value.config,
      project: value.project,
      cwd: value.root,
      branch: value.branch,
      authorization,
    });
    const calls = records(value.recordsPath);
    assert.deepEqual(
      calls.map(({ args }) => args),
      [
        [
          "fetch",
          "--no-tags",
          "https://github.com/example/delivery.git",
          "+refs/heads/main:refs/remotes/origin/main",
        ],
        [
          "push",
          "https://github.com/example/delivery.git",
          "refs/heads/delivery/task:refs/heads/delivery/task",
        ],
        [
          "push",
          "https://github.com/example/delivery.git",
          "refs/heads/delivery/task:refs/heads/delivery/task",
        ],
      ],
    );
    for (const call of calls) {
      assert.equal(call.authorizationConfigured, true);
      assert.equal(call.helperCleared, true);
      assert.equal(call.extraHeadersCleared, true);
      assert.equal(call.ignoresSystem, true);
      assert.equal(call.ignoresGlobal, true);
      assert.equal(call.promptsDisabled, true);
      assert.equal(call.secretInArguments, false);
      assert.equal(call.hookRan, false);
    }
  } finally {
    if (previousPath === undefined) delete process.env.PATH;
    else process.env.PATH = previousPath;
    if (previousConfigCount === undefined) delete process.env.GIT_CONFIG_COUNT;
    else process.env.GIT_CONFIG_COUNT = previousConfigCount;
    value.cleanup();
  }
});

test("Git transport rejects scope drift and local URL rewrites before network access", () => {
  const value = fixture();
  const previousPath = process.env.PATH;
  process.env.PATH = `${value.bin}:${previousPath ?? ""}`;
  try {
    assert.throws(
      () =>
        fetchBase({
          config: value.config,
          project: value.project,
          authorization: { ...authorization, repository: "example/other" },
        }),
      /authorization does not match/,
    );
    assert.throws(
      () =>
        fetchBase({
          config: value.config,
          project: value.project,
          authorization: { ...authorization, login: "other-user" },
        }),
      /authorization does not match/,
    );
    for (const rewrite of ["fetch", "push"]) {
      writeFileSync(join(value.root, ".rewrite"), `${rewrite}\n`);
      assert.throws(
        () => fetchBase({ config: value.config, project: value.project, authorization }),
        /URL rewrite configuration is not permitted/,
      );
    }
    assert.equal(existsSync(value.recordsPath), false);
  } finally {
    if (previousPath === undefined) delete process.env.PATH;
    else process.env.PATH = previousPath;
    value.cleanup();
  }
});

test("a verified GitHub SSH alias preserves the configured remote and uses scoped HTTPS transport", () => {
  const value = fixture({ remote: "git@github-work:example/delivery.git" });
  const previousPath = process.env.PATH;
  process.env.PATH = `${value.bin}:${previousPath ?? ""}`;
  try {
    fetchBase({ config: value.config, project: value.project, authorization });
    assert.equal(records(value.recordsPath)[0]?.args[2], "https://github.com/example/delivery.git");
    writeFileSync(join(value.root, ".ssh-hostname"), "untrusted.example\n");
    assert.throws(
      () => fetchBase({ config: value.config, project: value.project, authorization }),
      /identity and remote disagree/,
    );
    assert.equal(records(value.recordsPath).length, 1);
  } finally {
    if (previousPath === undefined) delete process.env.PATH;
    else process.env.PATH = previousPath;
    value.cleanup();
  }
});
