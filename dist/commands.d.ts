import { type Command } from "./domain.js";
export type CheckResult = {
    exitCode: number | null;
    passed: boolean;
    timedOut: boolean;
    report: unknown;
    reportPath: string;
    startedAt: string;
    completedAt: string;
};
export declare function runCommand({ command, cwd, artifactDirectory, requireStructuredReport, signal, environment, onStarted, }: {
    command: Command;
    cwd: string;
    artifactDirectory: string;
    requireStructuredReport: boolean;
    signal?: AbortSignal;
    environment?: NodeJS.ProcessEnv;
    onStarted?: (pid: number) => void;
}): Promise<CheckResult>;
export declare function commandEnvironment(): NodeJS.ProcessEnv;
export declare function requireSuccessfulCommand(result: CheckResult): void;
