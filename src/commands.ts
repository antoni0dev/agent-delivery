import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type Command, commandSchema, DeliveryError, MAX_INVOCATION_MS } from "./domain.js";
import { processGroupAlive, runNativeProcess } from "./runtime/process.js";

export type CheckResult = {
  exitCode: number | null;
  passed: boolean;
  timedOut: boolean;
  report: unknown;
  reportPath: string;
  startedAt: string;
  completedAt: string;
};
export async function runCommand({
  command,
  cwd,
  artifactDirectory,
  requireStructuredReport,
  signal,
  environment,
  onStarted,
}: {
  command: Command;
  cwd: string;
  artifactDirectory: string;
  requireStructuredReport: boolean;
  signal?: AbortSignal;
  environment?: NodeJS.ProcessEnv;
  onStarted?: (pid: number) => void;
}): Promise<CheckResult> {
  commandSchema.parse(command);
  mkdirSync(artifactDirectory, { recursive: true, mode: 0o700 });
  const startedAt = new Date().toISOString();
  const outcome = await runNativeProcess({
    executable: command.executable,
    args: command.args,
    cwd,
    stdin: "",
    deadlineMs: MAX_INVOCATION_MS,
    env: { ...commandEnvironment(), ...environment, DELIVERY_REPORT_DIRECTORY: artifactDirectory },
    ...(signal === undefined ? {} : { signal }),
    ...(onStarted === undefined ? {} : { onStarted }),
  });
  const output = outcome.stdout;
  const exitCode = outcome.exitCode;
  const timedOut = outcome.timedOut;
  let failed =
    outcome.cancelled ||
    outcome.outputExceeded ||
    outcome.spawnFailed ||
    outcome.startCallbackFailed ||
    (outcome.pid !== null && processGroupAlive(outcome.pid));
  let report: unknown = null;
  if (requireStructuredReport) {
    try {
      report = JSON.parse(output);
    } catch {
      failed = true;
    }
  }
  const result = {
    exitCode,
    passed: exitCode === 0 && !timedOut && !failed,
    timedOut,
    report,
    reportPath: join(artifactDirectory, "command.json"),
    startedAt,
    completedAt: new Date().toISOString(),
  };
  writeFileSync(result.reportPath, JSON.stringify(result, null, 2), { mode: 0o600 });
  return result;
}

export function commandEnvironment(): NodeJS.ProcessEnv {
  const names = ["PATH", "HOME", "USER", "LOGNAME", "SHELL", "TMPDIR", "LANG", "LC_ALL", "TERM"];
  return Object.fromEntries(
    names.flatMap((name) => (process.env[name] === undefined ? [] : [[name, process.env[name]]])),
  );
}
export function requireSuccessfulCommand(result: CheckResult): void {
  if (!result.passed)
    throw new DeliveryError("Declared verification command did not complete successfully");
}
