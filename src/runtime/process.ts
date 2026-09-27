import { spawn } from "node:child_process";
import process from "node:process";

const outputLimitBytes = 1024 * 1024;
const terminationGraceMs = 2_000;

const ownedProcessIds = new Set<number>();
const cancelledProcessIds = new Set<number>();
const terminationTimers = new Map<number, NodeJS.Timeout>();

type NativeProcessOutcome = Readonly<{
  pid: number | null;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  cancelled: boolean;
  outputExceeded: boolean;
  spawnFailed: boolean;
  startCallbackFailed: boolean;
}>;

type RunNativeProcessInput = Readonly<{
  executable: string;
  args: readonly string[];
  cwd: string;
  stdin: string;
  deadlineMs: number;
  env?: NodeJS.ProcessEnv;
  cancellable?: boolean;
  signal?: AbortSignal;
  onStarted?: (pid: number) => void | Promise<void>;
}>;

const processTarget = (pid: number): number => (process.platform === "win32" ? pid : -pid);
export const processGroupAlive = (pid: number): boolean => {
  try {
    process.kill(processTarget(pid), 0);
    return true;
  } catch (error) {
    return !(error instanceof Error && "code" in error && error.code === "ESRCH");
  }
};
export const ownedRuntimeProcessAlive = (pid: number): boolean =>
  ownedProcessIds.has(pid) && processGroupAlive(pid);
const awaitGroupExit = async (pid: number): Promise<void> => {
  if (!processGroupAlive(pid)) return;
  terminateProcessGroup(pid);
  const deadline = Date.now() + terminationGraceMs + 1500;
  while (processGroupAlive(pid) && Date.now() < deadline)
    await new Promise<void>((done) => setTimeout(done, 25));
};

const signalProcessGroup = ({ pid, signal }: { pid: number; signal: NodeJS.Signals }): boolean => {
  try {
    process.kill(processTarget(pid), signal);
    return true;
  } catch {
    return false;
  }
};

const terminateProcessGroup = (pid: number): void => {
  if (terminationTimers.has(pid)) {
    return;
  }

  if (!signalProcessGroup({ pid, signal: "SIGTERM" })) {
    return;
  }

  const hardKillTimer = setTimeout(() => {
    terminationTimers.delete(pid);
    signalProcessGroup({ pid, signal: "SIGKILL" });
  }, terminationGraceMs);
  terminationTimers.set(pid, hardKillTimer);
  hardKillTimer.unref();
};

export const cancelRuntimeProcess = async ({ pid }: { pid: number }): Promise<boolean> => {
  if (!ownedProcessIds.has(pid)) {
    return false;
  }

  cancelledProcessIds.add(pid);
  terminateProcessGroup(pid);
  await awaitGroupExit(pid);
  return !processGroupAlive(pid);
};

export const runNativeProcess = async ({
  executable,
  args,
  cwd,
  stdin,
  deadlineMs,
  env,
  cancellable = true,
  signal,
  onStarted,
}: RunNativeProcessInput): Promise<NativeProcessOutcome> => {
  let timedOut = false;
  let outputExceeded = false;
  let spawnFailed = false;
  let startCallbackFailed = false;
  let signalCancelled = false;
  let outputBytes = 0;
  const stdoutChunks: Buffer[] = [];
  const stderrChunks: Buffer[] = [];

  const child = spawn(executable, args, {
    cwd,
    detached: process.platform !== "win32",
    env,
    stdio: ["pipe", "pipe", "pipe"],
  });
  const pid = child.pid ?? null;

  if (pid !== null && cancellable) {
    ownedProcessIds.add(pid);
  }

  const abortListener = (): void => {
    signalCancelled = true;
    if (pid !== null) {
      cancelledProcessIds.add(pid);
      terminateProcessGroup(pid);
    }
  };
  signal?.addEventListener("abort", abortListener, { once: true });
  if (signal?.aborted === true) {
    abortListener();
  }

  const deadlineTimer = setTimeout(() => {
    timedOut = true;
    if (pid !== null) {
      terminateProcessGroup(pid);
    }
  }, deadlineMs);
  deadlineTimer.unref();

  const consumeOutput = (chunk: Buffer | string): void => {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    outputBytes += buffer.byteLength;

    if (outputBytes > outputLimitBytes) {
      outputExceeded = true;
      if (pid !== null) {
        terminateProcessGroup(pid);
      }
      return;
    }

    stdoutChunks.push(buffer);
  };

  child.stdout.on("data", consumeOutput);
  child.stderr.on("data", (chunk: Buffer | string) => {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    outputBytes += buffer.byteLength;
    if (outputBytes > outputLimitBytes) {
      outputExceeded = true;
      if (pid !== null) {
        terminateProcessGroup(pid);
      }
      return;
    }
    stderrChunks.push(buffer);
  });

  const completed = new Promise<number | null>((resolve) => {
    child.once("error", () => {
      spawnFailed = true;
    });
    child.once("close", (exitCode) => resolve(exitCode));
  });

  child.stdin.on("error", () => undefined);

  if (pid !== null && onStarted !== undefined) {
    try {
      await onStarted(pid);
    } catch {
      startCallbackFailed = true;
      terminateProcessGroup(pid);
    }
  }

  if (!child.stdin.destroyed) {
    child.stdin.end(stdin);
  }

  const exitCode = await completed;
  if (pid !== null) await awaitGroupExit(pid);
  clearTimeout(deadlineTimer);
  signal?.removeEventListener("abort", abortListener);
  const cancelled = signalCancelled || (pid !== null && cancelledProcessIds.has(pid));

  if (pid !== null) {
    const terminationTimer = terminationTimers.get(pid);
    if (terminationTimer !== undefined) {
      clearTimeout(terminationTimer);
      terminationTimers.delete(pid);
    }
    ownedProcessIds.delete(pid);
    cancelledProcessIds.delete(pid);
  }

  return Object.freeze({
    pid,
    stdout: Buffer.concat(stdoutChunks).toString("utf8"),
    stderr: Buffer.concat(stderrChunks).toString("utf8"),
    exitCode,
    timedOut,
    cancelled,
    outputExceeded,
    spawnFailed,
    startCallbackFailed,
  });
};
