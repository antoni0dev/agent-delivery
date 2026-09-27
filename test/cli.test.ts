import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { assertUpgradeOwnership, workspaceActiveHere } from "../src/cli.js";

const repositoryRoot = resolve(import.meta.dirname, "..");

const runCli = (args: string[]) =>
  spawnSync(process.execPath, ["--import", "tsx", "src/cli.ts", ...args], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });

test("CLI help lists the explicit replan and inactive-safe install commands", () => {
  const result = runCli(["help"]);
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.match(output.usage, /delivery replan --config <path> --initiative <id>/u);
  assert.match(output.usage, /delivery install --config <path>/u);
});

test("CLI init writes a disabled template and rejects positional ambiguity", () => {
  const directory = mkdtempSync(join(tmpdir(), "delivery-cli-"));
  const configPath = join(directory, "workspace.json");
  try {
    const initialized = runCli(["init", "--config", configPath, "--root", directory]);
    assert.equal(initialized.status, 0, initialized.stderr);
    const output = JSON.parse(initialized.stdout);
    const config = JSON.parse(readFileSync(configPath, "utf8"));
    assert.equal(output.active, false);
    assert.equal(config.authority.grantReference, "");
    assert.equal(config.authority.openPullRequests, false);

    const ambiguous = runCli(["help", "unexpected"]);
    assert.notEqual(ambiguous.status, 0);
    assert.equal(ambiguous.stdout, "");
    assert.doesNotMatch(ambiguous.stderr, new RegExp(directory, "u"));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("inactive or foreign-host installation keeps its scheduler disabled", () => {
  assert.equal(
    workspaceActiveHere({
      active: 0,
      boundHostId: "first-host",
      currentHostId: "second-host",
      boundConfigDigest: "old-config",
      currentConfigDigest: "new-config",
    }),
    false,
  );
  assert.equal(
    workspaceActiveHere({
      active: 1,
      boundHostId: "current-host",
      currentHostId: "current-host",
      boundConfigDigest: "current-config",
      currentConfigDigest: "current-config",
    }),
    true,
  );
});

test("interactive run requires an explicit runtime profile before loading a workspace", () => {
  const result = runCli([
    "run",
    "--config",
    "/unused/workspace.json",
    "--issue",
    "issue",
    "--project",
    "project",
  ]);
  assert.notEqual(result.status, 0);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /Missing required option --profile/);
});

test("paused upgrade remains retryable only for its bound host and config", () => {
  assert.doesNotThrow(() =>
    assertUpgradeOwnership({
      boundHostId: "current-host",
      currentHostId: "current-host",
      boundConfigDigest: "current-config",
      currentConfigDigest: "current-config",
    }),
  );
  assert.throws(
    () =>
      assertUpgradeOwnership({
        boundHostId: "other-host",
        currentHostId: "current-host",
        boundConfigDigest: "current-config",
        currentConfigDigest: "current-config",
      }),
    /owning host/u,
  );
});
