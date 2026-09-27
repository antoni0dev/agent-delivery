import type { Role, RuntimeProfile } from "./core.js";
export type RuntimeCapabilities = Readonly<{
    freshContext: boolean;
    readOnly: boolean;
    structuredOutput: boolean;
    modelSelection: boolean;
}>;
export type RuntimeProbe = Readonly<{
    profile: RuntimeProfile;
    executable: string;
    version: string | null;
    available: boolean;
    capabilities: RuntimeCapabilities;
    reason: string | null;
}>;
export declare const runtimeStatusNames: readonly ["completed", "failed", "blocked", "cancelled", "timed-out"];
export type RuntimeStatus = (typeof runtimeStatusNames)[number];
export declare const runtimeLifecycleStatusNames: readonly ["probing", "running", "completed", "failed", "blocked", "cancelled", "timed-out"];
export type RuntimeLifecycleStatus = (typeof runtimeLifecycleStatusNames)[number];
export type RuntimeResult = Readonly<{
    status: RuntimeStatus;
    output: unknown;
    requestedModel: string;
    actualModel: string | null;
    nativeSessionId: string | null;
    startedAt: string;
    finishedAt: string;
    exitCode: number | null;
    artifactPath: string;
    pid: number | null;
    reason: string | null;
}>;
export type ProbeRuntimeInput = Readonly<{
    profile: RuntimeProfile;
    executable: string;
    cwd: string;
}>;
export type StartRuntimeInput = Readonly<{
    profile: RuntimeProfile;
    role: Role;
    executable: string;
    cwd: string;
    prompt: string;
    invocationId: string;
    artifactDirectory: string;
    deadlineMs?: number;
    complexOrMoney?: boolean;
    cursorApiKey?: string;
    outputSchema?: Readonly<Record<string, unknown>>;
    signal?: AbortSignal;
    onStarted?: (pid: number) => void | Promise<void>;
}>;
export type CancelRuntimeInput = Readonly<{
    pid: number;
}>;
export type StatusRuntimeInput = Readonly<{
    artifactPath: string;
}>;
export type RuntimeStatusSnapshot = Readonly<{
    artifactPath: string;
    status: RuntimeLifecycleStatus;
    pid: number | null;
    processAlive: boolean;
}>;
export type NormalizeRuntimeResultInput = {
    status: RuntimeStatus;
    output: unknown;
    requestedModel: string;
    actualModel: string | null;
    nativeSessionId: string | null;
    startedAt: string;
    finishedAt: string;
    exitCode: number | null;
    artifactPath: string;
    pid: number | null;
    reason: string | null;
};
