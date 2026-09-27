import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  cancelRuntime,
  probeRuntime,
  roleNames,
  runtimeProfileNames,
  runtimeProfiles,
  startRuntime,
  statusRuntime,
} from "../src/runtime/index.js";

type Fixture = Readonly<{
  root: string;
  cwd: string;
  artifacts: string;
  executable: string;
  argumentsPath: string;
  environmentPath: string;
}>;

const createFixture = async ({
  version,
  runSource,
}: {
  version: string;
  runSource: string;
}): Promise<Fixture> => {
  const root = await mkdtemp(join(tmpdir(), "runtime-adapter-"));
  const cwd = join(root, "workspace");
  const artifacts = join(root, "artifacts");
  const executable = join(root, "fake-runtime.mjs");
  const argumentsPath = join(root, "arguments.json");
  const environmentPath = join(root, "environment.json");
  await mkdir(cwd);
  await writeFile(
    executable,
    `#!/usr/bin/env node
import { writeFileSync } from "node:fs";
const args = process.argv.slice(2);
if (args.includes("--version")) {
  process.stdout.write(${JSON.stringify(version)} + "\\n");
  process.exit(0);
}
writeFileSync(${JSON.stringify(argumentsPath)}, JSON.stringify(args));
writeFileSync(${JSON.stringify(environmentPath)}, JSON.stringify({
  HOME: process.env.HOME ?? null,
  CURSOR_API_KEY: process.env.CURSOR_API_KEY ?? null,
}));
let prompt = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => { prompt += chunk; });
process.stdin.on("end", () => {
  writeFileSync(${JSON.stringify(join(root, "prompt.txt"))}, prompt);
  ${runSource}
});
`,
    { mode: 0o700 },
  );
  await chmod(executable, 0o700);

  return { root, cwd, artifacts, executable, argumentsPath, environmentPath };
};

const readJson = async (path: string): Promise<unknown> => JSON.parse(await readFile(path, "utf8"));

test("runtime profiles are immutable and pin every role to its required model", () => {
  assert.deepEqual(runtimeProfileNames, ["codex", "claude-code", "cursor"]);
  assert.deepEqual(roleNames, [
    "planner",
    "planCritic",
    "implementer",
    "reviewer",
    "browserVerifier",
  ]);
  assert.equal(runtimeProfiles.codex.planner.model, "gpt-6-astra");
  assert.equal(runtimeProfiles.codex.planCritic.model, "gpt-6-astra");
  assert.equal(runtimeProfiles.codex.implementer.model, "gpt-5.6-sol");
  assert.equal(runtimeProfiles["claude-code"].planner.model, "claude-fable-5-1");
  assert.equal(runtimeProfiles["claude-code"].implementer.model, "claude-opus-5-5");
  assert.equal(runtimeProfiles.cursor.planner.model, "gpt-5.6-sol");
  assert.equal(runtimeProfiles.cursor.planCritic.model, "claude-fable-5-1");
  assert.equal(Object.isFrozen(runtimeProfiles), true);
  assert.equal(Object.isFrozen(runtimeProfiles.codex), true);
  assert.equal(Object.isFrozen(runtimeProfiles.codex.planner), true);
});

test("Codex reviewer uses a fresh read-only native invocation and stores safe metadata", async () => {
  const fixture = await createFixture({
    version: "codex-cli 0.155.0",
    runSource: `
process.stdout.write(JSON.stringify({ type: "thread.started", thread_id: "codex-session", model: "gpt-5.6-sol" }) + "\\n");
process.stdout.write(JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: "reviewed" } }) + "\\n");`,
  });

  const result = await startRuntime({
    profile: "codex",
    role: "reviewer",
    executable: fixture.executable,
    cwd: fixture.cwd,
    prompt: "review this secret-shaped input",
    invocationId: "codex-review",
    artifactDirectory: fixture.artifacts,
  });

  assert.equal(result.status, "completed");
  assert.equal(result.output, "reviewed");
  assert.equal(result.nativeSessionId, "codex-session");
  const args = await readJson(fixture.argumentsPath);
  assert.ok(Array.isArray(args));
  assert.ok(args.includes("--ignore-user-config"));
  assert.ok(args.includes("--ephemeral"));
  assert.deepEqual(args.slice(args.indexOf("--sandbox"), args.indexOf("--sandbox") + 2), [
    "--sandbox",
    "read-only",
  ]);
  const artifact = await readFile(result.artifactPath, "utf8");
  assert.doesNotMatch(artifact, /secret-shaped|reviewed/);
  assert.match(artifact, /"status": "completed"/);
});

test("Claude read-only roles isolate settings and reject an unsupported local version", async () => {
  const unsupported = await createFixture({
    version: "2.1.267 (Claude Code)",
    runSource: "process.exit(99);",
  });
  const probe = await probeRuntime({
    profile: "claude-code",
    executable: unsupported.executable,
    cwd: unsupported.cwd,
  });
  assert.equal(probe.available, false);
  assert.equal(probe.version, "2.1.267");
  assert.match(probe.reason ?? "", /2\.1\.280/);

  const supported = await createFixture({
    version: "2.1.280 (Claude Code)",
    runSource:
      'try { writeFileSync("./guard-must-deny.txt", "denied\\n"); } catch {} process.stdout.write(JSON.stringify({ type: "result", subtype: "success", is_error: false, result: "ignored prose", structured_output: { ok: true }, session_id: "claude-session", modelUsage: { "claude-opus-5-5": {} }, permissionMode: "plan", permission_denials: [{ tool_name: "Write" }] }) + "\\n");',
  });
  const result = await startRuntime({
    profile: "claude-code",
    role: "reviewer",
    executable: supported.executable,
    cwd: supported.cwd,
    prompt: "review",
    invocationId: "claude-review",
    artifactDirectory: supported.artifacts,
  });
  assert.equal(result.status, "completed");
  await assert.rejects(readFile(join(supported.cwd, "guard-must-deny.txt")), /ENOENT/);
  assert.deepEqual(result.output, { ok: true });
  assert.equal(result.actualModel, "claude-opus-5-5");
  const args = await readJson(supported.argumentsPath);
  assert.ok(Array.isArray(args));
  assert.ok(args.includes("--safe-mode"));
  assert.ok(args.includes("--strict-mcp-config"));
  assert.ok(args.includes("--restricted"));
  assert.ok(args.includes("--json-schema"));
  assert.ok(args.includes("--verbose"));
  assert.deepEqual(
    args.slice(args.indexOf("--permission-mode"), args.indexOf("--permission-mode") + 2),
    ["--permission-mode", "plan"],
  );
});

test("Cursor uses only an explicit API key with its isolated runtime home", async () => {
  const previousApiKey = process.env.CURSOR_API_KEY;
  process.env.CURSOR_API_KEY = "implicit-key-must-not-pass";
  const fixture = await createFixture({
    version: "Cursor Agent 2026.9.1",
    runSource:
      'try { writeFileSync("./guard-must-deny.txt", "denied\\n"); } catch {} process.stdout.write(JSON.stringify({ type: "result", result: "planned", chat_id: "cursor-session", model: "gpt-5.6-sol" }) + "\\n");',
  });
  try {
    const result = await startRuntime({
      profile: "cursor",
      role: "planner",
      executable: fixture.executable,
      cwd: fixture.cwd,
      prompt: "plan",
      invocationId: "cursor-plan",
      artifactDirectory: fixture.artifacts,
    });
    assert.equal(result.status, "completed");
    await assert.rejects(readFile(join(fixture.cwd, "guard-must-deny.txt")), /ENOENT/);
    const args = await readJson(fixture.argumentsPath);
    assert.ok(Array.isArray(args));
    assert.ok(args.includes("--mode=plan"));
    assert.ok(args.includes("gpt-5.6-sol[effort=high]"));
    assert.ok(!args.includes("--force"));
    const environment = await readJson(fixture.environmentPath);
    assert.deepEqual(environment, {
      HOME: join(fixture.artifacts, "runtime-home", "cursor-plan"),
      CURSOR_API_KEY: null,
    });

    const explicit = await createFixture({
      version: "Cursor Agent 2026.9.1",
      runSource:
        'process.stdout.write(JSON.stringify({ type: "result", result: "implemented", chat_id: "cursor-write", model: "gpt-5.6-sol" }) + "\\n");',
    });
    const explicitResult = await startRuntime({
      profile: "cursor",
      role: "implementer",
      executable: explicit.executable,
      cwd: explicit.cwd,
      prompt: "implement",
      invocationId: "cursor-write",
      artifactDirectory: explicit.artifacts,
      cursorApiKey: "explicit-key",
    });
    assert.equal(explicitResult.status, "completed");
    assert.deepEqual(await readJson(explicit.environmentPath), {
      HOME: join(explicit.artifacts, "runtime-home", "cursor-write"),
      CURSOR_API_KEY: "explicit-key",
    });
    assert.doesNotMatch(await readFile(explicitResult.artifactPath, "utf8"), /explicit-key/);
  } finally {
    if (previousApiKey === undefined) {
      delete process.env.CURSOR_API_KEY;
    } else {
      process.env.CURSOR_API_KEY = previousApiKey;
    }
  }
});

test("nonzero exits, malformed JSON, and reported model fallback fail closed", async (context) => {
  await context.test("nonzero exit", async () => {
    const fixture = await createFixture({
      version: "codex-cli 0.155.0",
      runSource: "process.exit(7);",
    });
    const result = await startRuntime({
      profile: "codex",
      role: "implementer",
      executable: fixture.executable,
      cwd: fixture.cwd,
      prompt: "implement",
      invocationId: "nonzero",
      artifactDirectory: fixture.artifacts,
      complexOrMoney: true,
    });
    assert.equal(result.status, "failed");
    assert.equal(result.exitCode, 7);
    const args = await readJson(fixture.argumentsPath);
    assert.ok(Array.isArray(args));
    assert.deepEqual(args.slice(args.indexOf("--sandbox"), args.indexOf("--sandbox") + 2), [
      "--sandbox",
      "workspace-write",
    ]);
    assert.ok(args.includes('model_reasoning_effort="high"'));
  });

  await context.test("malformed JSON", async () => {
    const fixture = await createFixture({
      version: "codex-cli 0.155.0",
      runSource: 'process.stdout.write("not-json\\n");',
    });
    const result = await startRuntime({
      profile: "codex",
      role: "implementer",
      executable: fixture.executable,
      cwd: fixture.cwd,
      prompt: "implement",
      invocationId: "malformed",
      artifactDirectory: fixture.artifacts,
    });
    assert.equal(result.status, "failed");
    assert.match(result.reason ?? "", /malformed/);
  });

  await context.test("model fallback", async () => {
    const fixture = await createFixture({
      version: "codex-cli 0.155.0",
      runSource: `
process.stdout.write(JSON.stringify({ type: "thread.started", thread_id: "session", model: "fallback-model" }) + "\\n");
process.stdout.write(JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: "result" } }) + "\\n");`,
    });
    const result = await startRuntime({
      profile: "codex",
      role: "implementer",
      executable: fixture.executable,
      cwd: fixture.cwd,
      prompt: "implement",
      invocationId: "fallback",
      artifactDirectory: fixture.artifacts,
    });
    assert.equal(result.status, "blocked");
    assert.equal(result.actualModel, "fallback-model");
  });

  await context.test("Claude result without native structured output", async () => {
    const fixture = await createFixture({
      version: "2.1.280 (Claude Code)",
      runSource:
        'process.stdout.write(JSON.stringify({ type: "result", subtype: "success", is_error: false, result: "{\\"ok\\":true}", session_id: "claude-session", model: "claude-opus-5-5" }) + "\\n");',
    });
    const result = await startRuntime({
      profile: "claude-code",
      role: "reviewer",
      executable: fixture.executable,
      cwd: fixture.cwd,
      prompt: "review",
      invocationId: "claude-unstructured",
      artifactDirectory: fixture.artifacts,
    });
    assert.equal(result.status, "failed");
    assert.match(result.reason ?? "", /malformed/);
  });

  await context.test("Claude weekly quota exhaustion", async () => {
    const fixture = await createFixture({
      version: "2.1.283 (Claude Code)",
      runSource: `
process.stderr.write("You've hit your weekly limit; reset information omitted from normalized metadata\\n");
process.exit(1);`,
    });
    const result = await startRuntime({
      profile: "claude-code",
      role: "planner",
      executable: fixture.executable,
      cwd: fixture.cwd,
      prompt: "plan",
      invocationId: "claude-weekly-limit",
      artifactDirectory: fixture.artifacts,
    });
    assert.equal(result.status, "blocked");
    assert.equal(result.reason, "Claude runtime weekly usage limit is exhausted.");
    const artifact = await readFile(result.artifactPath, "utf8");
    assert.doesNotMatch(artifact, /reset information|weekly limit;/);
  });
});

test("deadline and explicit cancellation terminate owned process groups", async (context) => {
  await context.test("deadline", async () => {
    const fixture = await createFixture({
      version: "codex-cli 0.155.0",
      runSource: "setInterval(() => undefined, 1_000);",
    });
    const result = await startRuntime({
      profile: "codex",
      role: "implementer",
      executable: fixture.executable,
      cwd: fixture.cwd,
      prompt: "wait",
      invocationId: "timeout",
      artifactDirectory: fixture.artifacts,
      deadlineMs: 50,
    });
    assert.equal(result.status, "timed-out");
  });

  await context.test("cancellation", async () => {
    const fixture = await createFixture({
      version: "codex-cli 0.155.0",
      runSource: "setInterval(() => undefined, 1_000);",
    });
    let startedPid: number | null = null;
    const result = await startRuntime({
      profile: "codex",
      role: "implementer",
      executable: fixture.executable,
      cwd: fixture.cwd,
      prompt: "wait",
      invocationId: "cancel",
      artifactDirectory: fixture.artifacts,
      onStarted: async (pid) => {
        startedPid = pid;
        const runningStatus = await statusRuntime({
          artifactPath: join(fixture.artifacts, "cancel.json"),
        });
        assert.equal(runningStatus.status, "running");
        assert.equal(runningStatus.processAlive, true);
        assert.equal(await cancelRuntime({ pid }), true);
      },
    });
    assert.equal(result.status, "cancelled");
    assert.equal(result.pid, startedPid);
    assert.equal(await cancelRuntime({ pid: result.pid ?? -1 }), false);
    assert.deepEqual(await statusRuntime({ artifactPath: result.artifactPath }), {
      artifactPath: result.artifactPath,
      status: "cancelled",
      pid: result.pid,
      processAlive: false,
    });
  });

  await context.test("abort signal", async () => {
    const fixture = await createFixture({
      version: "codex-cli 0.155.0",
      runSource: "setInterval(() => undefined, 1_000);",
    });
    const controller = new AbortController();
    const result = await startRuntime({
      profile: "codex",
      role: "implementer",
      executable: fixture.executable,
      cwd: fixture.cwd,
      prompt: "wait",
      invocationId: "abort",
      artifactDirectory: fixture.artifacts,
      signal: controller.signal,
      onStarted: () => controller.abort(),
    });
    assert.equal(result.status, "cancelled");
  });
});
