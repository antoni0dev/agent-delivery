import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { loadConfig } from "../src/config.js";
import { locateWorkspace, registerWorkspace } from "../src/host/workspace-registry.js";

function fixture() {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), "delivery-registry-")));
  const managedRoot = join(directory, "managed");
  const add = (workspaceId: string, projectRoot = join(directory, workspaceId)) => {
    mkdirSync(projectRoot, { recursive: true });
    const configPath = join(directory, `${workspaceId}.json`);
    const value = {
      schemaVersion: 1,
      workspaceId,
      stateDirectory: join(directory, "state"),
      knowledgeRoot: directory,
      intakeRuntimeProfile: "codex",
      runtimes: { codex: "codex", "claude-code": "claude", cursor: "agent" },
      linear: {
        workspaceId,
        assigneeId: "owner",
        readyLabel: "ready",
        credential: { kind: "environment", name: "PRIVATE_TOKEN" },
      },
      github: {
        hostname: "github.com",
        login: workspaceId,
        credential: { kind: "environment", name: "PRIVATE_TOKEN" },
      },
      authority: {
        grantReference: "test",
        updateOwnedIssues: false,
        createScopedChildren: false,
        pushFeatureBranches: false,
        openPullRequests: false,
        mergeDevelopment: false,
      },
      capacity: { initiatives: 2, writers: 3 },
      notifications: { linear: false, desktop: false },
      liveEvidenceMaxAgeMs: 1000,
      projects: [
        {
          id: "app",
          root: projectRoot,
          repository: `example/${workspaceId}`,
          remote: `https://github.com/example/${workspaceId}.git`,
          defaultBranch: "main",
          gitIdentity: { name: "Test", email: "test@example.test" },
          teamIds: ["team"],
          projectIds: [],
          instructions: [],
          commands: {},
          environment: {
            name: "test",
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
            requiredChecks: ["test"],
          },
        },
      ],
    };
    writeFileSync(configPath, JSON.stringify(value));
    registerWorkspace({ managedRoot, configPath, config: loadConfig(configPath) });
    return { configPath, projectRoot, value };
  };
  return {
    directory,
    managedRoot,
    add,
    close: () => rmSync(directory, { recursive: true, force: true }),
  };
}

test("discovery selects only the current workspace and stores no credentials", () => {
  const f = fixture();
  try {
    const first = f.add("first");
    const second = f.add("second");
    const nested = join(first.projectRoot, "src");
    mkdirSync(nested);
    assert.equal(
      locateWorkspace({ managedRoot: f.managedRoot, root: nested }).configPath,
      first.configPath,
    );
    assert.equal(
      locateWorkspace({ managedRoot: f.managedRoot, root: second.projectRoot }).workspaceId,
      "second",
    );
    const registry = join(f.managedRoot, "workspaces", "first.json");
    assert.doesNotMatch(readFileSync(registry, "utf8"), /PRIVATE_TOKEN|credential|assignee/);
    assert.equal(statSync(registry).mode & 0o777, 0o600);
    rmSync(second.configPath);
    assert.equal(
      locateWorkspace({ managedRoot: f.managedRoot, root: nested }).workspaceId,
      "first",
    );
  } finally {
    f.close();
  }
});

test("discovery refuses ambiguous and stale registrations", () => {
  const f = fixture();
  try {
    const first = f.add("first");
    const project = first.value.projects[0];
    assert.ok(project);
    project.repository = "example/changed";
    writeFileSync(first.configPath, JSON.stringify(first.value));
    assert.throws(
      () => locateWorkspace({ managedRoot: f.managedRoot, root: first.projectRoot }),
      /stale/,
    );
    registerWorkspace({
      managedRoot: f.managedRoot,
      configPath: first.configPath,
      config: loadConfig(first.configPath),
    });
    assert.equal(
      locateWorkspace({ managedRoot: f.managedRoot, root: first.projectRoot }).workspaceId,
      "first",
    );
    first.value.linear.workspaceId = "another-destination";
    writeFileSync(first.configPath, JSON.stringify(first.value));
    assert.throws(
      () =>
        registerWorkspace({
          managedRoot: f.managedRoot,
          configPath: first.configPath,
          config: loadConfig(first.configPath),
        }),
      /another destination/,
    );
    first.value.linear.workspaceId = "first";
    writeFileSync(first.configPath, JSON.stringify(first.value));
    f.add("second", first.projectRoot);
    assert.throws(
      () => locateWorkspace({ managedRoot: f.managedRoot, root: first.projectRoot }),
      /Multiple/,
    );
    assert.throws(
      () => locateWorkspace({ managedRoot: f.managedRoot, root: f.directory }),
      /No registered/,
    );
  } finally {
    f.close();
  }
});

test("linked worktrees resolve through git ownership while nested repositories do not", () => {
  const f = fixture();
  try {
    const root = join(f.directory, "repository");
    mkdirSync(root);
    const git = (args: string[]) => execFileSync("git", args, { cwd: root, stdio: "ignore" });
    git(["init"]);
    git([
      "-c",
      "user.name=Test",
      "-c",
      "user.email=test@example.test",
      "-c",
      "core.hooksPath=/dev/null",
      "commit",
      "--allow-empty",
      "-m",
      "test",
    ]);
    f.add("first", root);
    const worktree = join(f.directory, "worktree");
    git(["worktree", "add", "--detach", worktree]);
    assert.equal(
      locateWorkspace({ managedRoot: f.managedRoot, root: worktree }).workspaceId,
      "first",
    );
    const nested = join(root, "nested");
    mkdirSync(nested);
    execFileSync("git", ["init"], { cwd: nested, stdio: "ignore" });
    assert.throws(
      () => locateWorkspace({ managedRoot: f.managedRoot, root: nested }),
      /No registered/,
    );
  } finally {
    f.close();
  }
});
