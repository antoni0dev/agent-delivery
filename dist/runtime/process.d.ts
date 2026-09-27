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
export declare const processGroupAlive: (pid: number) => boolean;
export declare const ownedRuntimeProcessAlive: (pid: number) => boolean;
export declare const cancelRuntimeProcess: ({ pid }: {
    pid: number;
}) => Promise<boolean>;
export declare const runNativeProcess: ({ executable, args, cwd, stdin, deadlineMs, env, cancellable, signal, onStarted, }: RunNativeProcessInput) => Promise<NativeProcessOutcome>;
export {};
