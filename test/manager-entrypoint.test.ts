import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";
import { configTemplate } from "../src/config.js";
import { defaultAdapterFiles, installManagedDistribution } from "../src/distribution/managed.js";
import { managerContract } from "../src/distribution/manager-contract.js";

test("manager bootstrap is available before configuring provider credentials", () => {
  const result = spawnSync(process.execPath, ["--import", "tsx", "src/cli.ts", "manager-guide"], {
    cwd: resolve(import.meta.dirname, ".."),
    env: { PATH: process.env.PATH },
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).contract, managerContract);
});

test("managed install gives all clients the same manager entrypoint and preserves team files", (context) => {
  const root = mkdtempSync(join(tmpdir(), "manager-entrypoints-"));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  const source = join(root, "source");
  mkdirSync(join(source, "dist"), { recursive: true });
  writeFileSync(join(source, "package.json"), '{"name":"fixture"}\n');
  writeFileSync(join(source, "dist", "cli.js"), "export {};\n");
  const teamFile = join(root, "AGENTS.md");
  writeFileSync(teamFile, "Team-owned instructions\n");
  const adapterFiles = defaultAdapterFiles().map((file) => ({
    ...file,
    path: join(root, "home", relative(homedir(), file.path)),
  }));
  const manifest = installManagedDistribution({
    sourceRoot: source,
    managedRoot: join(root, "managed"),
    adapterFiles,
    commandFile: join(root, "delivery"),
  });
  const installed = [".codex", ".claude", ".cursor"].map((client) => {
    const path = join(root, "home", client, "skills", "agent-delivery", "SKILL.md");
    assert.ok(manifest.adapterFiles.some((file) => file.path === path));
    return readFileSync(path, "utf8");
  });
  assert.equal(new Set(installed).size, 1);
  assert.equal(readFileSync(teamFile, "utf8"), "Team-owned instructions\n");
});

test("new workspace starts with explicit private intake and no automatic backlog dispatch", () => {
  const template = configTemplate({
    root: "/repository",
    stateDirectory: "./state",
    knowledgeRoot: ".",
  });
  const config = JSON.parse(JSON.stringify(template));
  assert.deepEqual(config.linear.intake, { mode: "private", automaticOthers: false });
  assert.equal(config.intakeRuntimeProfile, "codex");
});
