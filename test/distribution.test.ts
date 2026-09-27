import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createPortableExport } from "../src/distribution/export.js";
import { collectPortableFiles, copyDistributionFiles } from "../src/distribution/files.js";
import {
  currentManagedInstallation,
  installManagedDistribution,
  installNodeDependencies,
  upgradeManagedDistribution,
} from "../src/distribution/managed.js";

function createSourceFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "delivery-source-"));
  mkdirSync(join(root, "src"));
  mkdirSync(join(root, "dist"));
  mkdirSync(join(root, "knowledge"));
  mkdirSync(join(root, "docs"));
  mkdirSync(join(root, "test"));
  writeFileSync(join(root, "package.json"), '{"name":"portable-delivery","version":"1.0.0"}\n');
  writeFileSync(join(root, "package-lock.json"), '{"lockfileVersion":3}\n');
  writeFileSync(join(root, "src", "index.ts"), 'export const value = "portable";\n');
  writeFileSync(join(root, "dist", "cli.js"), "#!/usr/bin/env node\n");
  writeFileSync(join(root, "knowledge", "cards.json"), "[]\n");
  writeFileSync(join(root, "docs", "operations.md"), "# Operations\n");
  writeFileSync(join(root, "test", "portable.test.ts"), "export {};\n");
  writeFileSync(join(root, "README.md"), "# Portable delivery\n");
  writeFileSync(join(root, "biome.json"), "{}\n");
  writeFileSync(join(root, "tsconfig.json"), "{}\n");
  writeFileSync(join(root, "tsconfig.build.json"), "{}\n");
  return root;
}

test("managed install preserves an unknown adapter file", () => {
  const sourceRoot = createSourceFixture();
  const directory = mkdtempSync(join(tmpdir(), "delivery-managed-"));
  const adapterPath = join(directory, "runtime", "SKILL.md");
  mkdirSync(join(directory, "runtime"));
  writeFileSync(adapterPath, "local custom instructions\n");
  try {
    assert.throws(
      () =>
        installManagedDistribution({
          sourceRoot,
          managedRoot: join(directory, "managed"),
          adapterFiles: [{ path: adapterPath, content: "managed instructions\n" }],
          commandFile: join(directory, "bin", "delivery"),
        }),
      /unknown or locally changed managed file/u,
    );
    assert.equal(readFileSync(adapterPath, "utf8"), "local custom instructions\n");
    assert.equal(existsSync(join(directory, "managed", "current.json")), false);
  } finally {
    rmSync(sourceRoot, { recursive: true, force: true });
    rmSync(directory, { recursive: true, force: true });
  }
});

test("portable file collection rejects symlinks and destination traversal", () => {
  const sourceRoot = createSourceFixture();
  const destination = mkdtempSync(join(tmpdir(), "delivery-destination-"));
  const outside = join(destination, "outside.txt");
  writeFileSync(outside, "outside\n");
  symlinkSync(outside, join(sourceRoot, "src", "escape.ts"));
  try {
    assert.throws(() => collectPortableFiles({ sourceRoot }), /Symbolic links/u);
    assert.throws(
      () =>
        copyDistributionFiles({
          destinationRoot: join(destination, "target"),
          files: [
            {
              relativePath: "../escaped.txt",
              sourcePath: outside,
              digest: "0".repeat(64),
              size: 8,
            },
          ],
        }),
      /not portable/u,
    );
    assert.equal(existsSync(join(destination, "escaped.txt")), false);
  } finally {
    rmSync(sourceRoot, { recursive: true, force: true });
    rmSync(destination, { recursive: true, force: true });
  }
});

test("portable archive contains only allowlisted source and no local state", () => {
  const sourceRoot = createSourceFixture();
  const directory = mkdtempSync(join(tmpdir(), "delivery-export-"));
  const outputPath = join(directory, "release.tar.gz");
  mkdirSync(join(sourceRoot, ".local"));
  writeFileSync(join(sourceRoot, ".local", "state.sqlite"), "state");
  writeFileSync(join(sourceRoot, "workspace.config.json"), '{"token":"secret"}\n');
  writeFileSync(join(sourceRoot, "untracked-secret.txt"), "private\n");
  try {
    createPortableExport({
      sourceRoot,
      outputPath,
      knowledgeComplete: () => true,
      knowledgeEligible: () => ({ digest: "fixture-eligible" }),
    });
    const listing = execFileSync("tar", ["-tzf", outputPath], { encoding: "utf8" });
    assert.match(listing, /\.\/src\/index\.ts/u);
    assert.match(listing, /\.\/EXPORT-MANIFEST\.json/u);
    assert.match(listing, /\.\/tsconfig\.json/u);
    assert.match(listing, /\.\/biome\.json/u);
    assert.match(listing, /\.\/test\/portable\.test\.ts/u);
    assert.doesNotMatch(listing, /state\.sqlite|workspace\.config|untracked-secret/u);
  } finally {
    rmSync(sourceRoot, { recursive: true, force: true });
    rmSync(directory, { recursive: true, force: true });
  }
});

test("failed upgrade keeps the previous version selected and pauses the workspace", async () => {
  const sourceRoot = createSourceFixture();
  const directory = mkdtempSync(join(tmpdir(), "delivery-upgrade-"));
  const managedRoot = join(directory, "managed");
  const adapterPath = join(directory, "runtime", "SKILL.md");
  const configPath = join(directory, "config.json");
  const databasePath = join(directory, "state.sqlite");
  writeFileSync(configPath, "{}\n");
  writeFileSync(databasePath, "database\n");
  try {
    const first = installManagedDistribution({
      sourceRoot,
      managedRoot,
      adapterFiles: [{ path: adapterPath, content: "managed instructions\n" }],
      commandFile: join(directory, "bin", "delivery"),
    });
    writeFileSync(join(sourceRoot, "src", "index.ts"), 'export const value = "upgrade";\n');
    let paused = false;
    await assert.rejects(
      upgradeManagedDistribution({
        sourceRoot,
        configPath,
        stateDatabasePath: databasePath,
        pause: () => {
          paused = true;
        },
        activeProcessCount: () => 0,
        backupDatabase: async (destination) => copyFileSync(databasePath, destination),
        managedRoot,
        adapterFiles: [{ path: adapterPath, content: "managed instructions\n" }],
        commandFile: join(directory, "bin", "delivery"),
        installDependencies: () => {
          throw new Error("dependency verification failed");
        },
      }),
      /dependency verification failed/u,
    );
    assert.equal(paused, true);
    assert.equal(currentManagedInstallation({ managedRoot })?.version, first.version);
  } finally {
    rmSync(sourceRoot, { recursive: true, force: true });
    rmSync(directory, { recursive: true, force: true });
  }
});

test("managed install writes an executable owned delivery command", () => {
  const sourceRoot = createSourceFixture();
  const directory = mkdtempSync(join(tmpdir(), "delivery-command-"));
  const commandFile = join(directory, "bin", "delivery");
  try {
    const manifest = installManagedDistribution({
      sourceRoot,
      managedRoot: join(directory, "managed"),
      adapterFiles: [],
      commandFile,
      nodeBinary: process.execPath,
    });
    assert.equal(manifest.commandFile, commandFile);
    assert.equal(statSync(commandFile).mode & 0o111, 0o111);
    const content = readFileSync(commandFile, "utf8");
    assert.match(content, /^#!\/bin\/sh/u);
    assert.match(content, new RegExp(manifest.cliFile.replaceAll("/", "\\/"), "u"));
  } finally {
    rmSync(sourceRoot, { recursive: true, force: true });
    rmSync(directory, { recursive: true, force: true });
  }
});

test("staged dependency install probes the native database and CLI", () => {
  const calls: Array<{ executable: string; args: string[]; cwd: string }> = [];
  installNodeDependencies({
    directory: "/tmp/staged-delivery",
    nodeBinary: "/opt/node/bin/node",
    npmExecutable: "/opt/node/bin/npm",
    run: (executable, args, options) => {
      calls.push({ executable, args, cwd: options.cwd });
      return args.includes("help") ? Buffer.from('{"usage":"delivery install"}') : Buffer.from("");
    },
  });
  assert.equal(calls.length, 3);
  assert.deepEqual(calls[0]?.args, ["ci", "--omit=dev"]);
  assert.match(calls[1]?.args.join(" ") ?? "", /better-sqlite3/u);
  assert.deepEqual(calls[2]?.args, ["/tmp/staged-delivery/dist/cli.js", "help"]);
  assert.equal(
    calls.every((call) => call.cwd === "/tmp/staged-delivery"),
    true,
  );
});

test("dependency mutation fails digest verification and removes staging", () => {
  const sourceRoot = createSourceFixture();
  const directory = mkdtempSync(join(tmpdir(), "delivery-mutated-stage-"));
  const managedRoot = join(directory, "managed");
  try {
    assert.throws(
      () =>
        installManagedDistribution({
          sourceRoot,
          managedRoot,
          adapterFiles: [],
          commandFile: join(directory, "bin", "delivery"),
          installDependencies: (stagingRoot) => {
            writeFileSync(join(stagingRoot, "package.json"), '{"changed":true}\n');
          },
        }),
      /digest verification/u,
    );
    assert.equal(existsSync(join(managedRoot, "current.json")), false);
    assert.deepEqual(
      existsSync(join(managedRoot, "staging")) ? readdirSync(join(managedRoot, "staging")) : [],
      [],
    );
    assert.equal(existsSync(join(managedRoot, "versions")), false);
  } finally {
    rmSync(sourceRoot, { recursive: true, force: true });
    rmSync(directory, { recursive: true, force: true });
  }
});

test("post-stage command failure removes the unselected version", () => {
  const sourceRoot = createSourceFixture();
  const directory = mkdtempSync(join(tmpdir(), "delivery-post-stage-"));
  const managedRoot = join(directory, "managed");
  const blockedParent = join(directory, "blocked-parent");
  writeFileSync(blockedParent, "not a directory\n");
  try {
    assert.throws(() =>
      installManagedDistribution({
        sourceRoot,
        managedRoot,
        adapterFiles: [],
        commandFile: join(blockedParent, "delivery"),
      }),
    );
    assert.equal(existsSync(join(managedRoot, "current.json")), false);
    assert.deepEqual(
      existsSync(join(managedRoot, "versions")) ? readdirSync(join(managedRoot, "versions")) : [],
      [],
    );
  } finally {
    rmSync(sourceRoot, { recursive: true, force: true });
    rmSync(directory, { recursive: true, force: true });
  }
});

test("upgrade pauses and refuses to stage while a runtime process is active", async () => {
  const sourceRoot = createSourceFixture();
  const directory = mkdtempSync(join(tmpdir(), "delivery-active-upgrade-"));
  const configPath = join(directory, "config.json");
  const databasePath = join(directory, "state.sqlite");
  writeFileSync(configPath, "{}\n");
  writeFileSync(databasePath, "database\n");
  let paused = false;
  let backupCalled = false;
  try {
    await assert.rejects(
      upgradeManagedDistribution({
        sourceRoot,
        configPath,
        stateDatabasePath: databasePath,
        pause: () => {
          paused = true;
        },
        activeProcessCount: () => 1,
        backupDatabase: async () => {
          backupCalled = true;
        },
        managedRoot: join(directory, "managed"),
        adapterFiles: [],
        commandFile: join(directory, "bin", "delivery"),
      }),
      /runtime processes are still active/u,
    );
    assert.equal(paused, true);
    assert.equal(backupCalled, false);
    assert.equal(currentManagedInstallation({ managedRoot: join(directory, "managed") }), null);
  } finally {
    rmSync(sourceRoot, { recursive: true, force: true });
    rmSync(directory, { recursive: true, force: true });
  }
});

test("upgrade backup uses distinct fixed names and a digest manifest", async () => {
  const sourceRoot = createSourceFixture();
  const directory = mkdtempSync(join(tmpdir(), "delivery-backup-"));
  const managedRoot = join(directory, "managed");
  const commandFile = join(directory, "bin", "delivery");
  const configPath = join(directory, "config", "agent-delivery.sqlite");
  const databasePath = join(directory, "state", "agent-delivery.sqlite");
  mkdirSync(join(directory, "config"));
  mkdirSync(join(directory, "state"));
  writeFileSync(configPath, '{"workspace":"fixture"}\n');
  writeFileSync(databasePath, "database\n");
  try {
    installManagedDistribution({
      sourceRoot,
      managedRoot,
      adapterFiles: [],
      commandFile,
    });
    writeFileSync(join(sourceRoot, "src", "index.ts"), 'export const value = "next";\n');
    const result = await upgradeManagedDistribution({
      sourceRoot,
      configPath,
      stateDatabasePath: databasePath,
      pause: () => {},
      activeProcessCount: () => 0,
      backupDatabase: async (destination) => copyFileSync(databasePath, destination),
      managedRoot,
      adapterFiles: [],
      commandFile,
    });
    assert.equal(
      readFileSync(join(result.backupDirectory, "config.json"), "utf8"),
      readFileSync(configPath, "utf8"),
    );
    assert.equal(readFileSync(join(result.backupDirectory, "state.sqlite"), "utf8"), "database\n");
    const manifest = JSON.parse(
      readFileSync(join(result.backupDirectory, "BACKUP-MANIFEST.json"), "utf8"),
    );
    assert.equal(manifest.config.file, "config.json");
    assert.equal(manifest.state.file, "state.sqlite");
    assert.equal(typeof manifest.manifestDigest, "string");
  } finally {
    rmSync(sourceRoot, { recursive: true, force: true });
    rmSync(directory, { recursive: true, force: true });
  }
});

test("incomplete knowledge requires a clearly marked draft export", () => {
  const sourceRoot = createSourceFixture();
  const directory = mkdtempSync(join(tmpdir(), "delivery-draft-"));
  try {
    assert.throws(
      () =>
        createPortableExport({
          sourceRoot,
          outputPath: join(directory, "release.tar.gz"),
          knowledgeComplete: () => false,
          knowledgeEligible: () => ({ digest: "fixture-eligible" }),
        }),
      /Knowledge coverage is incomplete/u,
    );
    const draft = createPortableExport({
      sourceRoot,
      outputPath: join(directory, "release.tar.gz"),
      draft: true,
      knowledgeComplete: () => false,
      knowledgeEligible: () => ({ digest: "fixture-eligible" }),
    });
    assert.equal(draft.path.endsWith("release.draft.tar.gz"), true);
    assert.equal(draft.releaseStatus, "draft-incomplete-knowledge");
    const complete = createPortableExport({
      sourceRoot,
      outputPath: join(directory, "complete.tar.gz"),
      knowledgeComplete: () => true,
      knowledgeEligible: () => ({ digest: "fixture-eligible" }),
    });
    assert.equal(complete.path, join(directory, "complete.tar.gz"));
    assert.equal(complete.releaseStatus, "complete");
  } finally {
    rmSync(sourceRoot, { recursive: true, force: true });
    rmSync(directory, { recursive: true, force: true });
  }
});

test("unresolved source eligibility blocks draft export", () => {
  const sourceRoot = createSourceFixture();
  const directory = mkdtempSync(join(tmpdir(), "delivery-ineligible-"));
  try {
    assert.throws(
      () =>
        createPortableExport({
          sourceRoot,
          outputPath: join(directory, "release.tar.gz"),
          draft: true,
          knowledgeComplete: () => false,
          knowledgeEligible: () => {
            throw new Error("source permission unresolved");
          },
        }),
      /source permission unresolved/u,
    );
    assert.equal(existsSync(join(directory, "release.draft.tar.gz")), false);
  } finally {
    rmSync(sourceRoot, { recursive: true, force: true });
    rmSync(directory, { recursive: true, force: true });
  }
});
