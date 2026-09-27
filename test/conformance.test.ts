import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chmod, mkdtemp, readFile, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { conformanceCodeDigests, readConformance, runConformance } from "../src/conformance.js";
import {
  nativePermissionArtifactSchema,
  probeNativeReadOnlyPermission,
  readOnlyRuntimeCommand,
  resolveGuardedRoots,
} from "../src/runtime/native-permissions.js";

const digestJson = (value: unknown): string =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

const createCodexFixture = async ({
  denyNativeWrite = true,
}: {
  denyNativeWrite?: boolean;
} = {}): Promise<
  Readonly<{ root: string; executable: string; conformance: string; nativeInvocationPath: string }>
> => {
  const root = await mkdtemp(join(tmpdir(), "runtime-conformance-"));
  const executable = join(root, "codex-fixture.mjs");
  const nativeInvocationPath = join(root, "native-invocation.json");
  await writeFile(
    executable,
    `#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const args = process.argv.slice(2);
if (args.includes("--version")) {
  process.stdout.write("codex-cli 0.155.0\\n");
  process.exit(0);
}
if (args[0] === "sandbox") {
  writeFileSync(${JSON.stringify(nativeInvocationPath)}, JSON.stringify({
    args,
    CODEX_HOME: process.env.CODEX_HOME ?? null,
    HOME: process.env.HOME ?? null,
    CODEX_API_KEY: process.env.CODEX_API_KEY ?? null,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? null,
  }));
  const directory = args[args.indexOf("-C") + 1];
  const marker = join(directory, "marker.txt");
  if (args.includes("/bin/cat")) {
    process.stdout.write(readFileSync(marker));
    process.exit(0);
  }
  if (${JSON.stringify(denyNativeWrite)}) {
    const target = args.at(-1)?.includes("native-permission-write-probe")
      ? args.at(-1)
      : "./marker.txt";
    process.stderr.write("/bin/sh: " + target + ": Operation not permitted\\n");
    process.exit(1);
  }
  const target = args.at(-1)?.includes("native-permission-write-probe") ? args.at(-1) : marker;
  writeFileSync(target, "native-write-was-not-denied\\n");
  process.exit(0);
}
let prompt = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => { prompt += chunk; });
process.stdin.on("end", () => {
  const role = /Assigned role: ([^.]+)\\./.exec(prompt)?.[1] ?? "unknown";
  const modelIndex = args.indexOf("--model");
  const model = modelIndex >= 0 ? args[modelIndex + 1] : null;
  let output;
  if (role === "implementer") {
    const match = /Write the exact text ("(?:\\\\.|[^"])*") into ("(?:\\\\.|[^"])*")/.exec(prompt);
    if (match === null) process.exit(8);
    writeFileSync(JSON.parse(match[2]), JSON.parse(match[1]));
    output = { ok: true };
  } else {
    const match = /Read ("(?:\\\\.|[^"])*")\\./.exec(prompt);
    if (match === null) process.exit(9);
    output = { ok: true, nonce: readFileSync(JSON.parse(match[1]), "utf8").trim() };
  }
  process.stdout.write(JSON.stringify({
    type: "thread.started",
    thread_id: randomUUID(),
    model,
  }) + "\\n");
  process.stdout.write(JSON.stringify({
    type: "item.completed",
    item: { type: "agent_message", text: JSON.stringify(output) },
  }) + "\\n");
});
`,
    { mode: 0o700 },
  );
  await chmod(executable, 0o700);
  return { root, executable, conformance: join(root, "proofs"), nativeInvocationPath };
};

const createVendorFixture = async ({
  profile,
}: {
  profile: "claude-code" | "cursor";
}): Promise<Readonly<{ root: string; executable: string; conformance: string }>> => {
  const root = await mkdtemp(join(tmpdir(), "runtime-vendor-"));
  const executable = join(root, "runtime-fixture.mjs");
  const version = profile === "claude-code" ? "2.1.283 (Claude Code)" : "Cursor Agent 2026.9.1";
  await writeFile(
    executable,
    `#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
const args = process.argv.slice(2);
if (args.includes("--version")) {
  process.stdout.write(${JSON.stringify(version)} + "\\n");
  process.exit(0);
}
let prompt = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => { prompt += chunk; });
process.stdin.on("end", () => {
  const role = /Assigned role: ([^.]+)\\./.exec(prompt)?.[1] ?? "unknown";
  const modelIndex = args.indexOf("--model");
  const requested = modelIndex >= 0 ? args[modelIndex + 1] : "unknown";
  const model = requested.replace(/\\[effort=.*\\]$/, "");
  let output;
  if (role === "implementer") {
    const match = /Write the exact text ("(?:\\\\.|[^"])*") into ("(?:\\\\.|[^"])*")/.exec(prompt);
    if (match === null) process.exit(8);
    writeFileSync(JSON.parse(match[2]), JSON.parse(match[1]));
    output = { ok: true };
  } else {
    const match = /Read ("(?:\\\\.|[^"])*")\\./.exec(prompt);
    if (match === null) process.exit(9);
    output = { ok: true, nonce: readFileSync(JSON.parse(match[1]), "utf8").trim() };
  }
  const session = randomUUID();
  if (${JSON.stringify(profile)} === "claude-code") {
    process.stdout.write(JSON.stringify({
      type: "result",
      subtype: "success",
      is_error: false,
      result: "ignored",
      structured_output: output,
      session_id: session,
      model,
      permissionMode: role === "implementer" ? "acceptEdits" : "plan",
      permission_denials: [],
    }) + "\\n");
  } else {
    process.stdout.write(JSON.stringify({
      type: "result",
      result: JSON.stringify(output),
      chat_id: session,
      model,
    }) + "\\n");
  }
});
`,
    { mode: 0o700 },
  );
  await chmod(executable, 0o700);
  return { root, executable, conformance: join(root, "proofs") };
};

test("conformance binds a deterministic native permission receipt and nonce-reading roles", async () => {
  const fixture = await createCodexFixture();
  const previousCodexApiKey = process.env.CODEX_API_KEY;
  const previousOpenAiApiKey = process.env.OPENAI_API_KEY;
  process.env.CODEX_API_KEY = "must-not-pass";
  process.env.OPENAI_API_KEY = "must-not-pass";
  const proof = await (async () => {
    try {
      return JSON.parse(
        JSON.stringify(
          await runConformance({
            profile: "codex",
            executable: fixture.executable,
            directory: fixture.conformance,
            hostId: "test-host",
          }),
        ),
      );
    } finally {
      if (previousCodexApiKey === undefined) delete process.env.CODEX_API_KEY;
      else process.env.CODEX_API_KEY = previousCodexApiKey;
      if (previousOpenAiApiKey === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = previousOpenAiApiKey;
    }
  })();

  assert.equal(proof.schemaVersion, 2);
  assert.equal(proof.passed, true);
  assert.match(proof.sourceCodeDigest, /^[a-f0-9]{64}$/);
  assert.match(proof.executedCodeDigest, /^[a-f0-9]{64}$/);
  assert.match(proof.executableDigest, /^[a-f0-9]{64}$/);
  assert.equal(proof.nativePermission.supported, true);
  assert.equal(proof.nativePermission.passed, true);
  assert.match(proof.nativePermission.artifactDigest, /^[a-f0-9]{64}$/);
  const nativeInvocation = JSON.parse(await readFile(fixture.nativeInvocationPath, "utf8"));
  assert.equal(nativeInvocation.CODEX_API_KEY, null);
  assert.equal(nativeInvocation.OPENAI_API_KEY, null);
  assert.equal(nativeInvocation.CODEX_HOME, nativeInvocation.HOME);
  assert.match(nativeInvocation.CODEX_HOME, /native-permission\/runtime-home$/);
  assert.ok(nativeInvocation.args.includes(":read-only"));
  const nativeReceipt = nativePermissionArtifactSchema.parse(
    JSON.parse(await readFile(proof.nativePermission.artifactPath, "utf8")),
  );
  assert.equal(nativeReceipt.mechanism, "vendor-native");
  assert.notEqual(nativeReceipt.guardedRoots?.gitDir, null);
  assert.notEqual(nativeReceipt.guardedRoots?.gitCommonDir, null);
  assert.equal(nativeReceipt.gitDirWrite.attempted, true);
  assert.equal(nativeReceipt.gitDirWrite.denied, true);
  assert.equal(nativeReceipt.gitCommonDirWrite.attempted, true);
  assert.equal(nativeReceipt.gitCommonDirWrite.denied, true);
  assert.equal(proof.runs.length, 5);
  assert.ok(
    proof.checks.some(
      (check: Record<string, unknown>) =>
        check.name === "native-permission:write-denial" && check.passed === true,
    ),
  );
  assert.ok(
    proof.runs.every(
      (run: Record<string, unknown>) =>
        typeof run.actualModel === "string" && typeof run.artifactDigest === "string",
    ),
  );
  assert.deepEqual(
    await readConformance({
      directory: fixture.conformance,
      profile: "codex",
      executable: fixture.executable,
      hostId: "test-host",
    }),
    { digest: proof.digest },
  );

  const proofPath = join(fixture.conformance, "codex.json");
  const originalProof = await readFile(proofPath);
  const mismatchedModelProof = JSON.parse(originalProof.toString("utf8"));
  mismatchedModelProof.runs[0].requestedModel = "wrong-model";
  mismatchedModelProof.runs[0].actualModel = "known-fallback";
  const { digest: ignoredDigest, ...mismatchedBase } = mismatchedModelProof;
  assert.equal(typeof ignoredDigest, "string");
  mismatchedModelProof.digest = digestJson(mismatchedBase);
  await writeFile(proofPath, `${JSON.stringify(mismatchedModelProof, null, 2)}\n`);
  await assert.rejects(
    readConformance({
      directory: fixture.conformance,
      profile: "codex",
      executable: fixture.executable,
      hostId: "test-host",
    }),
    /failed, stale/,
  );
  await writeFile(proofPath, originalProof);

  const nativeArtifactPath = proof.nativePermission.artifactPath;
  const originalNativeArtifact = await readFile(nativeArtifactPath);
  await writeFile(nativeArtifactPath, Buffer.concat([originalNativeArtifact, Buffer.from("\n")]));
  await assert.rejects(
    readConformance({
      directory: fixture.conformance,
      profile: "codex",
      executable: fixture.executable,
      hostId: "test-host",
    }),
    /Native permission artifact changed/,
  );
  await writeFile(nativeArtifactPath, originalNativeArtifact);

  const originalExecutable = await readFile(fixture.executable);
  await writeFile(fixture.executable, Buffer.concat([originalExecutable, Buffer.from("\n")]));
  await assert.rejects(
    readConformance({
      directory: fixture.conformance,
      profile: "codex",
      executable: fixture.executable,
      hostId: "test-host",
    }),
    /failed, stale/,
  );
});

test("conformance blocks when the native Codex sandbox permits the write", async () => {
  const fixture = await createCodexFixture({ denyNativeWrite: false });
  await assert.rejects(
    runConformance({
      profile: "codex",
      executable: fixture.executable,
      directory: fixture.conformance,
      hostId: "test-host",
    }),
    /did not enforce/,
  );
});

test("the macOS worktree guard supplies deterministic permission evidence for vendor profiles", async () => {
  for (const profile of ["claude-code", "cursor"] as const) {
    const fixture = await createVendorFixture({ profile });
    const artifactDirectory = join(fixture.root, "native-permission");
    const result = await probeNativeReadOnlyPermission({
      profile,
      executable: fixture.executable,
      executableDigest: "1".repeat(64),
      version: profile === "claude-code" ? "2.1.283" : "2026.9.1",
      sourceCodeDigest: "2".repeat(64),
      executedCodeDigest: "3".repeat(64),
      artifactDirectory,
    });
    assert.equal(result.passed, true);
    const artifact = nativePermissionArtifactSchema.parse(
      JSON.parse(await readFile(result.artifactPath, "utf8")),
    );
    assert.equal(artifact.mechanism, "macos-worktree-guard");
    assert.equal(artifact.enforcementExecutable, "/usr/bin/sandbox-exec");
    assert.notEqual(artifact.guardedRoots?.gitDir, null);
    assert.notEqual(artifact.guardedRoots?.gitCommonDir, null);
    assert.equal(artifact.gitDirWrite.attempted, true);
    assert.equal(artifact.gitDirWrite.denied, true);
    assert.equal(artifact.gitCommonDirWrite.attempted, true);
    assert.equal(artifact.gitCommonDirWrite.denied, true);
    assert.equal(artifact.permissionProfile, null);
    assert.equal(artifact.sandboxMode, null);
  }
});

test("worktree guard metadata discovery preserves plain fixtures and rejects broken repositories", async () => {
  const plainDirectory = await mkdtemp(join(tmpdir(), "runtime-plain-"));
  assert.deepEqual(resolveGuardedRoots(plainDirectory), {
    workspace: await realpath(plainDirectory),
    gitDir: null,
    gitCommonDir: null,
  });
  const plainCommand = readOnlyRuntimeCommand({
    profile: "claude-code",
    executable: "/bin/true",
    args: [],
    cwd: plainDirectory,
  });
  assert.ok(plainCommand.args.some((argument) => argument.startsWith("WORKSPACE=")));
  assert.ok(!plainCommand.args.some((argument) => argument.startsWith("GIT_DIR=")));

  const brokenDirectory = await mkdtemp(join(tmpdir(), "runtime-broken-git-"));
  await writeFile(join(brokenDirectory, ".git"), "gitdir: /missing/runtime-git-dir\n");
  assert.throws(() => resolveGuardedRoots(brokenDirectory), /discovery failed/);
});

test("nonce-reading conformance works for guarded Claude and Cursor fixtures", async () => {
  for (const profile of ["claude-code", "cursor"] as const) {
    const fixture = await createVendorFixture({ profile });
    const proof = JSON.parse(
      JSON.stringify(
        await runConformance({
          profile,
          executable: fixture.executable,
          directory: fixture.conformance,
          hostId: "test-host",
          ...(profile === "cursor" ? { cursorApiKey: "fixture-key" } : {}),
        }),
      ),
    );
    assert.equal(proof.passed, true);
    assert.equal(proof.nativePermission.supported, true);
    const artifact = nativePermissionArtifactSchema.parse(
      JSON.parse(await readFile(proof.nativePermission.artifactPath, "utf8")),
    );
    assert.equal(artifact.mechanism, "macos-worktree-guard");
    assert.equal(artifact.gitDirWrite.denied, true);
    assert.equal(artifact.gitCommonDirWrite.denied, true);
    assert.ok(proof.checks.every((check: Record<string, unknown>) => check.passed === true));
    assert.deepEqual(
      await readConformance({
        profile,
        executable: fixture.executable,
        directory: fixture.conformance,
        hostId: "test-host",
      }),
      { digest: proof.digest },
    );
  }
});

test("source and executed code digests bind the active source runtime", () => {
  const digests = conformanceCodeDigests();
  assert.match(digests.sourceCodeDigest, /^[a-f0-9]{64}$/);
  assert.equal(digests.executedCodeDigest, digests.sourceCodeDigest);
});
