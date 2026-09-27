import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import {
  basename,
  delimiter,
  dirname,
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { sha256 } from "./config.js";
import { DeliveryError, type Profile, parseStructuredOutput } from "./domain.js";
import { modelsMatch } from "./runtime/adapters.js";
import {
  probeRuntime,
  type RuntimeResult,
  roleNames,
  selectRuntimeRole,
  startRuntime,
} from "./runtime/index.js";
import {
  nativePermissionArtifactSchema,
  nativePermissionEnforcementIdentity,
  probeNativeReadOnlyPermission,
} from "./runtime/native-permissions.js";

const digestSchema = z.string().regex(/^[a-f0-9]{64}$/);
const runtimeStatusSchema = z.enum(["completed", "failed", "blocked", "cancelled", "timed-out"]);
const checkSchema = z
  .object({ name: z.string(), passed: z.boolean(), detail: z.string() })
  .strict();
const runSchema = z
  .object({
    id: z.string(),
    role: z.enum(roleNames),
    requestedModel: z.string(),
    actualModel: z.string().nullable(),
    sessionId: z.string().nullable(),
    artifactPath: z.string(),
    artifactDigest: digestSchema,
    permissionMode: z.string().nullable(),
    writeAttempted: z.boolean().nullable(),
    writeDenied: z.boolean().nullable(),
  })
  .strict();
const cancellationSchema = z
  .object({
    status: runtimeStatusSchema,
    artifactPath: z.string(),
    artifactDigest: digestSchema,
  })
  .strict();
const nativePermissionSchema = z
  .object({
    supported: z.literal(true),
    passed: z.literal(true),
    artifactPath: z.string(),
    artifactDigest: digestSchema,
    reason: z.null(),
  })
  .strict();
const proofSchema = z
  .object({
    schemaVersion: z.literal(2),
    profile: z.enum(["codex", "claude-code", "cursor"]),
    hostId: z.string(),
    executable: z.string(),
    executableDigest: digestSchema,
    sourceCodeDigest: digestSchema,
    executedCodeDigest: digestSchema,
    version: z.string(),
    passed: z.boolean(),
    createdAt: z.string(),
    checks: z.array(checkSchema),
    runs: z.array(runSchema),
    nativePermission: nativePermissionSchema,
    cancellation: cancellationSchema,
    digest: digestSchema,
  })
  .strict();

const runtimeArtifactSchema = z
  .object({
    status: runtimeStatusSchema,
    requestedModel: z.string(),
    actualModel: z.string().nullable(),
    nativeSessionId: z.string().nullable(),
    nativePermissionMode: z.string().nullable(),
    writeAttempted: z.boolean().nullable(),
    writeDenied: z.boolean().nullable(),
  })
  .passthrough();

type Proof = z.infer<typeof proofSchema>;
type ProofRun = z.infer<typeof runSchema>;
type RuntimeArtifact = z.infer<typeof runtimeArtifactSchema>;

const codeModuleNames = [
  "config",
  "conformance",
  "domain",
  "runtime/adapters",
  "runtime/core",
  "runtime/index",
  "runtime/native-permissions",
  "runtime/process",
  "runtime/types",
] as const;

const payloadDigest = (value: Omit<Proof, "digest">): string => sha256(JSON.stringify(value));

const digestCodeFiles = ({ root, extension }: { root: string; extension: ".js" | ".ts" }): string =>
  sha256(
    JSON.stringify(
      codeModuleNames.map((name) => ({
        path: `${name}${extension}`,
        digest: sha256(readFileSync(join(root, `${name}${extension}`))),
      })),
    ),
  );

export const conformanceCodeDigests = (): Readonly<{
  sourceCodeDigest: string;
  executedCodeDigest: string;
}> => {
  const currentModulePath = fileURLToPath(import.meta.url);
  const executedRoot = dirname(currentModulePath);
  const currentExtension = extname(currentModulePath);
  if (currentExtension !== ".js" && currentExtension !== ".ts") {
    throw new DeliveryError("Conformance code has an unsupported module extension");
  }

  const packageRoot = dirname(executedRoot);
  const sourceRoot = basename(executedRoot) === "src" ? executedRoot : join(packageRoot, "src");

  return Object.freeze({
    sourceCodeDigest: digestCodeFiles({ root: sourceRoot, extension: ".ts" }),
    executedCodeDigest: digestCodeFiles({ root: executedRoot, extension: currentExtension }),
  });
};

const resolveExecutable = (executable: string): string => {
  if (executable.includes("/")) {
    const path = resolve(executable);
    if (!existsSync(path)) {
      throw new DeliveryError("Runtime executable is not available");
    }
    return path;
  }

  const candidates = (process.env.PATH ?? "")
    .split(delimiter)
    .map((entry) => join(entry, executable));
  const found = candidates.find(existsSync);
  if (found === undefined) {
    throw new DeliveryError("Runtime executable is not available on PATH");
  }
  return resolve(found);
};

const executableDigest = (executable: string): string =>
  sha256(readFileSync(realpathSync(executable)));

const readRuntimeArtifact = (
  artifactPath: string,
): Readonly<{
  value: RuntimeArtifact;
  digest: string;
}> => {
  const content = readFileSync(artifactPath);
  return Object.freeze({
    value: runtimeArtifactSchema.parse(JSON.parse(content.toString("utf8"))),
    digest: sha256(content),
  });
};

const withinDirectory = ({ directory, path }: { directory: string; path: string }): boolean => {
  const delta = relative(resolve(directory), resolve(path));
  return delta === "" || (!isAbsolute(delta) && delta !== ".." && !delta.startsWith(`..${sep}`));
};

const assertArtifact = ({
  directory,
  path,
  digest,
}: {
  directory: string;
  path: string;
  digest: string;
}): RuntimeArtifact => {
  if (!withinDirectory({ directory, path }) || !existsSync(path)) {
    throw new DeliveryError("Conformance artifact is missing or outside its proof directory");
  }
  const artifact = readRuntimeArtifact(path);
  if (artifact.digest !== digest) {
    throw new DeliveryError("Conformance artifact changed after proof creation");
  }
  return artifact.value;
};

const recordRun = ({
  id,
  role,
  result,
}: {
  id: string;
  role: ProofRun["role"];
  result: RuntimeResult;
}): ProofRun => {
  const artifact = readRuntimeArtifact(result.artifactPath);
  if (
    artifact.value.requestedModel !== result.requestedModel ||
    artifact.value.actualModel !== result.actualModel ||
    artifact.value.nativeSessionId !== result.nativeSessionId
  ) {
    throw new DeliveryError("Runtime result and metadata artifact disagree");
  }

  return {
    id,
    role,
    requestedModel: result.requestedModel,
    actualModel: result.actualModel,
    sessionId: result.nativeSessionId,
    artifactPath: result.artifactPath,
    artifactDigest: artifact.digest,
    permissionMode: artifact.value.nativePermissionMode,
    writeAttempted: artifact.value.writeAttempted,
    writeDenied: artifact.value.writeDenied,
  };
};

const saveResponse = ({
  root,
  id,
  result,
}: {
  root: string;
  id: string;
  result: RuntimeResult;
}): void => {
  const responses = join(root, "responses");
  mkdirSync(responses, { recursive: true, mode: 0o700 });
  writeFileSync(join(responses, `${id}.json`), JSON.stringify(result), { mode: 0o600 });
};

export async function runConformance({
  profile,
  executable,
  directory,
  hostId,
  cursorApiKey,
}: {
  profile: Profile;
  executable: string;
  directory: string;
  hostId: string;
  cursorApiKey?: string;
}): Promise<unknown> {
  if (cursorApiKey !== undefined && profile !== "cursor") {
    throw new DeliveryError("A Cursor API key can only be used for Cursor conformance");
  }

  const id = randomUUID();
  const root = join(directory, id);
  const workspace = join(root, "workspace");
  const artifacts = join(root, "artifacts");
  const resolvedExecutable = resolveExecutable(executable);
  const initialExecutableDigest = executableDigest(resolvedExecutable);
  const initialCodeDigests = conformanceCodeDigests();
  mkdirSync(workspace, { recursive: true, mode: 0o700 });
  execFileSync("git", ["init", "-q"], { cwd: workspace, stdio: "ignore" });
  const probe = await probeRuntime({ profile, executable, cwd: workspace });
  if (!probe.available || probe.version === null) {
    throw new DeliveryError(probe.reason ?? "Runtime unavailable");
  }

  const nativePermission = await probeNativeReadOnlyPermission({
    profile,
    executable: resolvedExecutable,
    executableDigest: initialExecutableDigest,
    version: probe.version,
    sourceCodeDigest: initialCodeDigests.sourceCodeDigest,
    executedCodeDigest: initialCodeDigests.executedCodeDigest,
    artifactDirectory: join(root, "native-permission"),
  });
  if (!nativePermission.supported || !nativePermission.passed) {
    throw new DeliveryError(
      nativePermission.reason ?? "Runtime has no verified native read-only permission probe",
    );
  }
  const nativePermissionArtifact = nativePermissionArtifactSchema.parse(
    JSON.parse(readFileSync(nativePermission.artifactPath, "utf8")),
  );
  const checks: Array<z.infer<typeof checkSchema>> = [
    {
      name: "native-permission:read",
      passed: nativePermissionArtifact.read.passed,
      detail: nativePermissionArtifact.read.passed
        ? "Native read-only sandbox read the fixture"
        : "Native read-only sandbox could not read the fixture",
    },
    {
      name: "native-permission:write-denial",
      passed: nativePermissionArtifact.write.denied,
      detail: nativePermissionArtifact.write.denied
        ? "Native read-only sandbox denied the fixed write primitive"
        : "Native read-only sandbox did not deny the fixed write primitive",
    },
  ];
  const runs: ProofRun[] = [];
  const sessions = new Set<string>();
  for (const role of roleNames) {
    const invocationId = randomUUID();
    const marker = join(workspace, `${role}.txt`);
    const nonce = randomUUID();
    const initialMarker = role === "implementer" ? "original\n" : `${nonce}\n`;
    writeFileSync(marker, initialMarker);
    const prompt =
      role === "implementer"
        ? `This is an authorized conformance fixture. Write the exact text ${JSON.stringify(`${nonce}\n`)} into ${JSON.stringify(marker)}. Do not change any other file. Return only JSON {"ok":true}.`
        : `Read ${JSON.stringify(marker)}. Return only JSON with {"ok":true,"nonce":"the exact file content without its trailing newline"}. Do not write files or run network operations.`;
    const outputSchema =
      role === "implementer"
        ? {
            type: "object",
            properties: { ok: { type: "boolean" } },
            required: ["ok"],
            additionalProperties: false,
          }
        : {
            type: "object",
            properties: { ok: { type: "boolean" }, nonce: { type: "string" } },
            required: ["ok", "nonce"],
            additionalProperties: false,
          };
    const result = await startRuntime({
      profile,
      role,
      executable,
      cwd: workspace,
      prompt,
      invocationId,
      artifactDirectory: artifacts,
      deadlineMs: 5 * 60 * 1000,
      outputSchema,
      ...(cursorApiKey === undefined ? {} : { cursorApiKey }),
    });
    saveResponse({ root, id: invocationId, result });
    let parsed: unknown = null;
    try {
      parsed = parseStructuredOutput(result.output);
    } catch {}
    const output =
      role === "implementer"
        ? z.object({ ok: z.literal(true) }).safeParse(parsed)
        : z.object({ ok: z.literal(true), nonce: z.literal(nonce) }).safeParse(parsed);
    const expected = `${nonce}\n`;
    const filePassed = readFileSync(marker, "utf8") === expected;
    const isFresh = result.nativeSessionId !== null && !sessions.has(result.nativeSessionId);
    if (result.nativeSessionId !== null) {
      sessions.add(result.nativeSessionId);
    }
    const run = recordRun({ id: invocationId, role, result });
    runs.push(run);
    const nativeResultPassed = result.status === "completed" && output.success;
    checks.push({
      name: `${role}:native-result`,
      passed: nativeResultPassed,
      detail: nativeResultPassed
        ? "Native structured result observed"
        : (result.reason ?? "Native structured result did not satisfy its contract"),
    });
    checks.push({
      name: `${role}:filesystem`,
      passed: filePassed,
      detail:
        role === "implementer"
          ? "Scoped fixture write checked"
          : "Scoped fixture remained unchanged after exact marker read",
    });
    checks.push({
      name: `${role}:fresh-context`,
      passed: isFresh,
      detail: isFresh
        ? "Distinct native session observed"
        : "Native independence could not be verified",
    });
    if (result.status !== "completed") {
      break;
    }
  }

  const abort = new AbortController();
  const cancellationId = randomUUID();
  const abortResult = await startRuntime({
    profile,
    role: "reviewer",
    executable,
    cwd: workspace,
    prompt: "Read the fixture and return a JSON object.",
    invocationId: cancellationId,
    artifactDirectory: artifacts,
    deadlineMs: 60_000,
    signal: abort.signal,
    onStarted: () => abort.abort(),
    ...(cursorApiKey === undefined ? {} : { cursorApiKey }),
  });
  saveResponse({ root, id: cancellationId, result: abortResult });
  const cancellationArtifact = readRuntimeArtifact(abortResult.artifactPath);
  const cancellation = {
    status: abortResult.status,
    artifactPath: abortResult.artifactPath,
    artifactDigest: cancellationArtifact.digest,
  };
  const cancellationPassed = abortResult.status === "cancelled";
  checks.push({
    name: "cancellation",
    passed: cancellationPassed,
    detail: cancellationPassed
      ? "Owned invocation stopped after explicit cancellation"
      : "Owned invocation did not report explicit cancellation",
  });

  const finalCodeDigests = conformanceCodeDigests();
  if (
    executableDigest(resolvedExecutable) !== initialExecutableDigest ||
    finalCodeDigests.sourceCodeDigest !== initialCodeDigests.sourceCodeDigest ||
    finalCodeDigests.executedCodeDigest !== initialCodeDigests.executedCodeDigest
  ) {
    throw new DeliveryError("Runtime or conformance code changed during capability verification");
  }
  const base: Omit<Proof, "digest"> = {
    schemaVersion: 2,
    profile,
    hostId,
    executable: resolvedExecutable,
    executableDigest: initialExecutableDigest,
    ...initialCodeDigests,
    version: probe.version,
    passed: runs.length === roleNames.length && checks.every((check) => check.passed),
    createdAt: new Date().toISOString(),
    checks,
    runs,
    nativePermission: nativePermissionSchema.parse(nativePermission),
    cancellation: cancellationSchema.parse(cancellation),
  };
  const proof: Proof = { ...base, digest: payloadDigest(base) };
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  writeFileSync(join(directory, `${profile}.json`), JSON.stringify(proof, null, 2), {
    mode: 0o600,
  });
  return proof;
}

const assertProofArtifact = ({ directory, run }: { directory: string; run: ProofRun }): void => {
  const artifact = assertArtifact({
    directory,
    path: run.artifactPath,
    digest: run.artifactDigest,
  });
  if (
    artifact.status !== "completed" ||
    artifact.requestedModel !== run.requestedModel ||
    artifact.actualModel !== run.actualModel ||
    artifact.nativeSessionId !== run.sessionId ||
    artifact.nativePermissionMode !== run.permissionMode ||
    artifact.writeAttempted !== run.writeAttempted ||
    artifact.writeDenied !== run.writeDenied
  ) {
    throw new DeliveryError("Conformance run does not match its metadata artifact");
  }
};

const assertNativePermissionArtifact = ({
  directory,
  proof,
}: {
  directory: string;
  proof: Proof;
}): void => {
  const receipt = proof.nativePermission;
  if (
    !withinDirectory({ directory, path: receipt.artifactPath }) ||
    !existsSync(receipt.artifactPath)
  ) {
    throw new DeliveryError("Native permission artifact is missing or outside its proof directory");
  }
  const content = readFileSync(receipt.artifactPath);
  if (sha256(content) !== receipt.artifactDigest) {
    throw new DeliveryError("Native permission artifact changed after proof creation");
  }
  const artifact = nativePermissionArtifactSchema.parse(JSON.parse(content.toString("utf8")));
  const roots = artifact.guardedRoots;
  const enforcement =
    roots === null
      ? null
      : nativePermissionEnforcementIdentity({
          profile: proof.profile,
          executable: proof.executable,
          executableDigest: proof.executableDigest,
          cwd: roots.workspace,
        });
  const vendorSettingsMatch =
    proof.profile === "codex"
      ? artifact.permissionProfile === ":read-only" && artifact.sandboxMode === "read-only"
      : artifact.permissionProfile === null && artifact.sandboxMode === null;
  if (
    enforcement === null ||
    !artifact.supported ||
    !artifact.passed ||
    !artifact.read.passed ||
    !artifact.write.attempted ||
    !artifact.write.denied ||
    artifact.write.denialClass !== "os-permission-denied" ||
    !artifact.gitDirWrite.attempted ||
    !artifact.gitDirWrite.denied ||
    artifact.gitDirWrite.denialClass !== "os-permission-denied" ||
    !artifact.gitCommonDirWrite.attempted ||
    !artifact.gitCommonDirWrite.denied ||
    artifact.gitCommonDirWrite.denialClass !== "os-permission-denied" ||
    artifact.mechanism !== enforcement.mechanism ||
    artifact.enforcementExecutable !== enforcement.enforcementExecutable ||
    artifact.enforcementExecutableDigest !== enforcement.enforcementExecutableDigest ||
    artifact.policyDigest !== enforcement.policyDigest ||
    roots === null ||
    roots.gitDir === null ||
    roots.gitCommonDir === null ||
    roots.workspace !== enforcement.guardedRoots.workspace ||
    roots.gitDir !== enforcement.guardedRoots.gitDir ||
    roots.gitCommonDir !== enforcement.guardedRoots.gitCommonDir ||
    ![roots.workspace, roots.gitDir, roots.gitCommonDir].every((path) =>
      withinDirectory({ directory: realpathSync(directory), path }),
    ) ||
    !vendorSettingsMatch ||
    artifact.profile !== proof.profile ||
    artifact.executable !== proof.executable ||
    artifact.executableDigest !== proof.executableDigest ||
    artifact.version !== proof.version ||
    artifact.sourceCodeDigest !== proof.sourceCodeDigest ||
    artifact.executedCodeDigest !== proof.executedCodeDigest ||
    artifact.markerDigestBefore !== artifact.markerDigestAfter
  ) {
    throw new DeliveryError("Native permission artifact does not match its conformance proof");
  }
};

export async function readConformance({
  directory,
  profile,
  executable,
  hostId,
}: {
  directory: string;
  profile: Profile;
  executable: string;
  hostId: string;
}): Promise<{ digest: string }> {
  const path = join(directory, `${profile}.json`);
  if (!existsSync(path)) {
    throw new DeliveryError("Native runtime conformance has not run");
  }
  const proof = proofSchema.parse(JSON.parse(readFileSync(path, "utf8")));
  const { digest, ...base } = proof;
  const resolvedExecutable = resolveExecutable(executable);
  const codeDigests = conformanceCodeDigests();
  const roles = new Set(proof.runs.map((run) => run.role));
  const modelBindingsValid = proof.runs.every((run) => {
    const requestedModel = selectRuntimeRole({ profile: proof.profile, role: run.role }).model;
    return (
      run.requestedModel === requestedModel &&
      (run.actualModel === null ||
        modelsMatch({ requested: requestedModel, actual: run.actualModel }))
    );
  });
  const proofClaimsPass =
    proof.checks.every((check) => check.passed) &&
    proof.runs.length === roleNames.length &&
    roles.size === roleNames.length &&
    roleNames.every((role) => roles.has(role)) &&
    modelBindingsValid &&
    proof.nativePermission.supported &&
    proof.nativePermission.passed &&
    proof.cancellation.status === "cancelled";
  if (
    !proof.passed ||
    !proofClaimsPass ||
    proof.hostId !== hostId ||
    proof.profile !== profile ||
    proof.executable !== resolvedExecutable ||
    proof.executableDigest !== executableDigest(resolvedExecutable) ||
    proof.sourceCodeDigest !== codeDigests.sourceCodeDigest ||
    proof.executedCodeDigest !== codeDigests.executedCodeDigest ||
    payloadDigest(base) !== digest
  ) {
    throw new DeliveryError(
      "Conformance proof is missing, failed, stale or belongs to another runtime/host",
    );
  }
  for (const run of proof.runs) {
    assertProofArtifact({ directory, run });
  }
  assertNativePermissionArtifact({ directory, proof });
  const cancellationArtifact = assertArtifact({
    directory,
    path: proof.cancellation.artifactPath,
    digest: proof.cancellation.artifactDigest,
  });
  if (cancellationArtifact.status !== "cancelled") {
    throw new DeliveryError("Conformance cancellation artifact does not report cancellation");
  }
  const probe = await probeRuntime({ profile, executable, cwd: directory });
  if (!probe.available || probe.version !== proof.version) {
    throw new DeliveryError("Runtime changed since conformance");
  }
  return { digest };
}
