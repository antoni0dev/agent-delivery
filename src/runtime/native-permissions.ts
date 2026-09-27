import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";
import { z } from "zod";
import type { RuntimeProfile } from "./core.js";
import { runNativeProcess } from "./process.js";

const digestSchema = z.string().regex(/^[a-f0-9]{64}$/);
const guardedRootsSchema = z
  .object({
    workspace: z.string(),
    gitDir: z.string().nullable(),
    gitCommonDir: z.string().nullable(),
  })
  .strict();
const deniedWriteSchema = z
  .object({
    exitCode: z.number().int().nullable(),
    attempted: z.boolean(),
    denied: z.boolean(),
    denialClass: z.literal("os-permission-denied").nullable(),
  })
  .strict();

export const nativePermissionArtifactSchema = z
  .object({
    schemaVersion: z.literal(1),
    profile: z.enum(["codex", "claude-code", "cursor"]),
    executable: z.string(),
    executableDigest: digestSchema,
    version: z.string(),
    sourceCodeDigest: digestSchema,
    executedCodeDigest: digestSchema,
    supported: z.boolean(),
    passed: z.boolean(),
    mechanism: z.enum(["vendor-native", "macos-worktree-guard"]).nullable(),
    enforcementExecutable: z.string().nullable(),
    enforcementExecutableDigest: digestSchema.nullable(),
    guardedRoots: guardedRootsSchema.nullable(),
    policyDigest: digestSchema.nullable(),
    permissionProfile: z.string().nullable(),
    sandboxMode: z.string().nullable(),
    read: z.object({ exitCode: z.number().int().nullable(), passed: z.boolean() }).strict(),
    write: deniedWriteSchema,
    gitDirWrite: deniedWriteSchema,
    gitCommonDirWrite: deniedWriteSchema,
    markerDigestBefore: digestSchema,
    markerDigestAfter: digestSchema,
    reason: z.string().nullable(),
  })
  .strict();

export type NativePermissionArtifact = z.infer<typeof nativePermissionArtifactSchema>;

export type NativePermissionProbeResult = Readonly<{
  supported: boolean;
  passed: boolean;
  artifactPath: string;
  artifactDigest: string;
  reason: string | null;
}>;

type NativePermissionProbeInput = Readonly<{
  profile: RuntimeProfile;
  executable: string;
  executableDigest: string;
  version: string;
  sourceCodeDigest: string;
  executedCodeDigest: string;
  artifactDirectory: string;
  deadlineMs?: number;
}>;

const sha256 = (value: string | Buffer): string => createHash("sha256").update(value).digest("hex");

const macosGuardExecutable = "/usr/bin/sandbox-exec";
const gitMetadataTimeoutMs = 5_000;

export type GuardedRoots = Readonly<{
  workspace: string;
  gitDir: string | null;
  gitCommonDir: string | null;
}>;

export type RuntimeCommand = Readonly<{ executable: string; args: readonly string[] }>;

const gitValue = ({ cwd, args }: { cwd: string; args: readonly string[] }): string => {
  const result = spawnSync("git", ["-C", cwd, ...args], {
    encoding: "utf8",
    timeout: gitMetadataTimeoutMs,
    maxBuffer: 64 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error !== undefined || result.status !== 0) {
    throw new Error("Git repository metadata resolution failed.");
  }
  const value = result.stdout.trim();
  if (value.length === 0 || value.includes("\n")) {
    throw new Error("Git repository metadata resolution returned an invalid path.");
  }
  return value;
};

export const resolveGuardedRoots = (cwd: string): GuardedRoots => {
  const workspace = realpathSync(cwd);
  const inside = spawnSync("git", ["-C", workspace, "rev-parse", "--is-inside-work-tree"], {
    encoding: "utf8",
    timeout: gitMetadataTimeoutMs,
    maxBuffer: 64 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (inside.error !== undefined) {
    throw new Error("Git repository discovery failed.");
  }
  if (inside.status !== 0) {
    if (!existsSync(join(workspace, ".git")) && /not a git repository/i.test(inside.stderr)) {
      return Object.freeze({ workspace, gitDir: null, gitCommonDir: null });
    }
    throw new Error("Git repository discovery failed.");
  }
  if (inside.stdout.trim() !== "true") {
    throw new Error("The assigned workspace is not a Git worktree.");
  }
  const gitDir = realpathSync(
    gitValue({ cwd: workspace, args: ["rev-parse", "--absolute-git-dir"] }),
  );
  const gitCommonDir = realpathSync(
    gitValue({
      cwd: workspace,
      args: ["rev-parse", "--path-format=absolute", "--git-common-dir"],
    }),
  );
  return Object.freeze({ workspace, gitDir, gitCommonDir });
};

const macosGuard = (
  cwd: string,
): Readonly<{
  executable: string;
  executableDigest: string;
  policyDigest: string;
  policy: string;
  parameters: readonly string[];
  guardedRoots: GuardedRoots;
}> | null => {
  if (process.platform !== "darwin" || !existsSync(macosGuardExecutable)) {
    return null;
  }
  const guardedRoots = resolveGuardedRoots(cwd);
  const roots = [
    ["WORKSPACE", guardedRoots.workspace],
    ...(guardedRoots.gitDir === null ? [] : [["GIT_DIR", guardedRoots.gitDir]]),
    ...(guardedRoots.gitCommonDir === null ? [] : [["GIT_COMMON_DIR", guardedRoots.gitCommonDir]]),
  ] as const;
  const policy = `(version 1) (allow default) ${roots
    .map(([name]) => `(deny file-write* (subpath (param "${name}")))`)
    .join(" ")}`;
  return Object.freeze({
    executable: macosGuardExecutable,
    executableDigest: sha256(readFileSync(macosGuardExecutable)),
    policyDigest: sha256(policy),
    policy,
    parameters: roots.flatMap(([name, path]) => ["-D", `${name}=${path}`]),
    guardedRoots,
  });
};

export const macosWorktreeGuardIdentity = ({
  cwd,
}: {
  cwd: string;
}): Readonly<{
  executable: string;
  executableDigest: string;
  policyDigest: string;
  guardedRoots: GuardedRoots;
}> | null => {
  const guard = macosGuard(cwd);
  if (guard === null) {
    return null;
  }
  return Object.freeze({
    executable: guard.executable,
    executableDigest: guard.executableDigest,
    policyDigest: guard.policyDigest,
    guardedRoots: guard.guardedRoots,
  });
};

export const nativePermissionEnforcementIdentity = ({
  profile,
  executable,
  executableDigest,
  cwd,
}: {
  profile: RuntimeProfile;
  executable: string;
  executableDigest: string;
  cwd: string;
}): Readonly<{
  mechanism: "vendor-native" | "macos-worktree-guard";
  enforcementExecutable: string;
  enforcementExecutableDigest: string;
  policyDigest: string;
  guardedRoots: GuardedRoots;
}> | null => {
  const guardedRoots = resolveGuardedRoots(cwd);
  if (profile === "codex") {
    return Object.freeze({
      mechanism: "vendor-native",
      enforcementExecutable: executable,
      enforcementExecutableDigest: executableDigest,
      policyDigest: sha256('permission_profile=":read-only";sandbox_mode="read-only"'),
      guardedRoots,
    });
  }
  const guard = macosWorktreeGuardIdentity({ cwd });
  if (guard === null) {
    return null;
  }
  return Object.freeze({
    mechanism: "macos-worktree-guard",
    enforcementExecutable: guard.executable,
    enforcementExecutableDigest: guard.executableDigest,
    policyDigest: guard.policyDigest,
    guardedRoots: guard.guardedRoots,
  });
};

export const readOnlyRuntimeCommand = ({
  profile,
  executable,
  args,
  cwd,
}: {
  profile: RuntimeProfile;
  executable: string;
  args: readonly string[];
  cwd: string;
}): RuntimeCommand => {
  if (profile === "codex") {
    return Object.freeze({ executable, args });
  }
  const guard = macosGuard(cwd);
  if (guard === null) {
    throw new Error("The macOS read-only worktree guard is unavailable.");
  }
  return Object.freeze({
    executable: guard.executable,
    args: [...guard.parameters, "-p", guard.policy, executable, ...args],
  });
};

const runtimeEnvironment = (runtimeHome: string): NodeJS.ProcessEnv => {
  const inheritedNames = ["PATH", "USER", "LOGNAME", "SHELL", "TMPDIR", "LANG", "LC_ALL"];
  return {
    ...Object.fromEntries(
      inheritedNames.flatMap((name) =>
        process.env[name] === undefined ? [] : [[name, process.env[name]]],
      ),
    ),
    CODEX_HOME: runtimeHome,
    HOME: runtimeHome,
    LANG: "C",
    LC_ALL: "C",
  };
};

const persistArtifact = async ({
  artifact,
  artifactDirectory,
}: {
  artifact: NativePermissionArtifact;
  artifactDirectory: string;
}): Promise<NativePermissionProbeResult> => {
  const content = `${JSON.stringify(artifact, null, 2)}\n`;
  const artifactPath = join(artifactDirectory, "native-permission.json");
  await mkdir(artifactDirectory, { recursive: true, mode: 0o700 });
  await writeFile(artifactPath, content, { mode: 0o600 });
  return Object.freeze({
    supported: artifact.supported,
    passed: artifact.passed,
    artifactPath,
    artifactDigest: sha256(content),
    reason: artifact.reason,
  });
};

const runGitCommand = ({ cwd, args }: { cwd: string; args: readonly string[] }): void => {
  const result = spawnSync("git", ["-C", cwd, ...args], {
    encoding: "utf8",
    timeout: gitMetadataTimeoutMs,
    maxBuffer: 64 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error !== undefined || result.status !== 0) {
    throw new Error("Git permission fixture setup failed.");
  }
};

const createLinkedWorktreeFixture = async ({
  artifactDirectory,
}: {
  artifactDirectory: string;
}): Promise<Readonly<{ repositoryDirectory: string; fixtureDirectory: string }>> => {
  const repositoryDirectory = join(artifactDirectory, "repository");
  const fixtureDirectory = join(artifactDirectory, "workspace");
  await mkdir(repositoryDirectory, { recursive: true, mode: 0o700 });
  runGitCommand({ cwd: repositoryDirectory, args: ["init", "-q"] });
  runGitCommand({ cwd: repositoryDirectory, args: ["config", "user.name", "Fixture"] });
  runGitCommand({ cwd: repositoryDirectory, args: ["config", "user.email", "fixture@invalid"] });
  runGitCommand({
    cwd: repositoryDirectory,
    args: ["commit", "--allow-empty", "-q", "-m", "fixture"],
  });
  runGitCommand({
    cwd: repositoryDirectory,
    args: ["worktree", "add", "--detach", "-q", fixtureDirectory, "HEAD"],
  });
  return Object.freeze({ repositoryDirectory, fixtureDirectory });
};

export const probeNativeReadOnlyPermission = async ({
  profile,
  executable,
  executableDigest,
  version,
  sourceCodeDigest,
  executedCodeDigest,
  artifactDirectory,
  deadlineMs = 10_000,
}: NativePermissionProbeInput): Promise<NativePermissionProbeResult> => {
  const { fixtureDirectory } = await createLinkedWorktreeFixture({ artifactDirectory });
  const runtimeHome = join(artifactDirectory, "runtime-home");
  const markerPath = join(fixtureDirectory, "marker.txt");
  const marker = "native-read-only-marker\n";
  await mkdir(runtimeHome, { recursive: true, mode: 0o700 });
  await writeFile(markerPath, marker, { mode: 0o600 });
  const markerDigestBefore = sha256(marker);
  const enforcement = nativePermissionEnforcementIdentity({
    profile,
    executable,
    executableDigest,
    cwd: fixtureDirectory,
  });

  if (enforcement === null) {
    return persistArtifact({
      artifactDirectory,
      artifact: {
        schemaVersion: 1,
        profile,
        executable,
        executableDigest,
        version,
        sourceCodeDigest,
        executedCodeDigest,
        supported: false,
        passed: false,
        mechanism: null,
        enforcementExecutable: null,
        enforcementExecutableDigest: null,
        guardedRoots: resolveGuardedRoots(fixtureDirectory),
        policyDigest: null,
        permissionProfile: null,
        sandboxMode: null,
        read: { exitCode: null, passed: false },
        write: { exitCode: null, attempted: false, denied: false, denialClass: null },
        gitDirWrite: {
          exitCode: null,
          attempted: false,
          denied: false,
          denialClass: null,
        },
        gitCommonDirWrite: {
          exitCode: null,
          attempted: false,
          denied: false,
          denialClass: null,
        },
        markerDigestBefore,
        markerDigestAfter: sha256(await readFile(markerPath)),
        reason: "The macOS read-only worktree guard is unavailable.",
      },
    });
  }

  const codexSandboxArguments = [
    "sandbox",
    "-P",
    ":read-only",
    "-C",
    fixtureDirectory,
    "-c",
    'sandbox_mode="read-only"',
  ] as const;
  const env = runtimeEnvironment(runtimeHome);
  const readCommand =
    profile === "codex"
      ? { executable, args: [...codexSandboxArguments, "/bin/cat", "./marker.txt"] }
      : readOnlyRuntimeCommand({
          profile,
          executable: "/bin/cat",
          args: ["./marker.txt"],
          cwd: fixtureDirectory,
        });
  const writeCommand =
    profile === "codex"
      ? {
          executable,
          args: [
            ...codexSandboxArguments,
            "/bin/sh",
            "-c",
            'printf "native-write-must-be-denied\\n" > ./marker.txt',
          ],
        }
      : readOnlyRuntimeCommand({
          profile,
          executable: "/bin/sh",
          args: ["-c", 'printf "native-write-must-be-denied\\n" > ./marker.txt'],
          cwd: fixtureDirectory,
        });
  const gitDir = enforcement.guardedRoots.gitDir;
  const gitCommonDir = enforcement.guardedRoots.gitCommonDir;
  if (gitDir === null || gitCommonDir === null) {
    throw new Error("Linked worktree Git metadata directories are unavailable.");
  }
  const gitDirTarget = join(gitDir, "native-permission-write-probe");
  const gitCommonDirTarget = join(gitCommonDir, "native-permission-write-probe-common");
  const gitMetadataWriteCommand = (target: string): RuntimeCommand =>
    profile === "codex"
      ? {
          executable,
          args: [
            ...codexSandboxArguments,
            "/bin/sh",
            "-c",
            'printf "native-git-write-must-be-denied\\n" > "$1"',
            "native-git-write-probe",
            target,
          ],
        }
      : readOnlyRuntimeCommand({
          profile,
          executable: "/bin/sh",
          args: [
            "-c",
            'printf "native-git-write-must-be-denied\\n" > "$1"',
            "native-git-write-probe",
            target,
          ],
          cwd: fixtureDirectory,
        });
  const read = await runNativeProcess({
    executable: readCommand.executable,
    args: readCommand.args,
    cwd: fixtureDirectory,
    stdin: "",
    deadlineMs,
    env,
    cancellable: false,
  });
  const write = await runNativeProcess({
    executable: writeCommand.executable,
    args: writeCommand.args,
    cwd: fixtureDirectory,
    stdin: "",
    deadlineMs,
    env,
    cancellable: false,
  });
  const gitDirWriteCommand = gitMetadataWriteCommand(gitDirTarget);
  const gitDirWrite = await runNativeProcess({
    executable: gitDirWriteCommand.executable,
    args: gitDirWriteCommand.args,
    cwd: fixtureDirectory,
    stdin: "",
    deadlineMs,
    env,
    cancellable: false,
  });
  const gitCommonDirWriteCommand = gitMetadataWriteCommand(gitCommonDirTarget);
  const gitCommonDirWrite = await runNativeProcess({
    executable: gitCommonDirWriteCommand.executable,
    args: gitCommonDirWriteCommand.args,
    cwd: fixtureDirectory,
    stdin: "",
    deadlineMs,
    env,
    cancellable: false,
  });
  const markerAfter = await readFile(markerPath);
  const markerDigestAfter = sha256(markerAfter);
  const readPassed =
    read.exitCode === 0 &&
    read.stdout === marker &&
    !read.spawnFailed &&
    !read.timedOut &&
    !read.outputExceeded;
  const denialClass = /marker\.txt:[^\n]*(?:Operation not permitted|Permission denied)/i.test(
    write.stderr,
  )
    ? "os-permission-denied"
    : null;
  const writeAttempted = !write.spawnFailed;
  const writeDenied =
    writeAttempted &&
    write.exitCode !== 0 &&
    denialClass !== null &&
    markerAfter.toString("utf8") === marker &&
    markerDigestAfter === markerDigestBefore &&
    !write.timedOut &&
    !write.outputExceeded;
  const deniedGitWrite = ({
    outcome,
    target,
  }: {
    outcome: Awaited<ReturnType<typeof runNativeProcess>>;
    target: string;
  }): NativePermissionArtifact["gitDirWrite"] => {
    const denialClass =
      /native-permission-write-probe(?:-common)?:[^\n]*(?:Operation not permitted|Permission denied)/i.test(
        outcome.stderr,
      )
        ? "os-permission-denied"
        : null;
    const attempted = !outcome.spawnFailed;
    const denied =
      attempted &&
      outcome.exitCode !== 0 &&
      denialClass !== null &&
      !existsSync(target) &&
      !outcome.timedOut &&
      !outcome.outputExceeded;
    return { exitCode: outcome.exitCode, attempted, denied, denialClass };
  };
  const gitDirWriteEvidence = deniedGitWrite({ outcome: gitDirWrite, target: gitDirTarget });
  const gitCommonDirWriteEvidence = deniedGitWrite({
    outcome: gitCommonDirWrite,
    target: gitCommonDirTarget,
  });
  const passed =
    readPassed && writeDenied && gitDirWriteEvidence.denied && gitCommonDirWriteEvidence.denied;

  return persistArtifact({
    artifactDirectory,
    artifact: {
      schemaVersion: 1,
      profile,
      executable,
      executableDigest,
      version,
      sourceCodeDigest,
      executedCodeDigest,
      supported: true,
      passed,
      mechanism: enforcement.mechanism,
      enforcementExecutable: enforcement.enforcementExecutable,
      enforcementExecutableDigest: enforcement.enforcementExecutableDigest,
      guardedRoots: enforcement.guardedRoots,
      policyDigest: enforcement.policyDigest,
      permissionProfile: profile === "codex" ? ":read-only" : null,
      sandboxMode: profile === "codex" ? "read-only" : null,
      read: { exitCode: read.exitCode, passed: readPassed },
      write: {
        exitCode: write.exitCode,
        attempted: writeAttempted,
        denied: writeDenied,
        denialClass,
      },
      gitDirWrite: gitDirWriteEvidence,
      gitCommonDirWrite: gitCommonDirWriteEvidence,
      markerDigestBefore,
      markerDigestAfter,
      reason: passed ? null : "Native read-only permission probe did not enforce its contract.",
    },
  });
};
