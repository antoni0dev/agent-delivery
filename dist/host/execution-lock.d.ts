export declare function acquireExecutionLock({ token, path, }: {
    token: string;
    path?: string;
}): {
    started: (pid: number) => void;
    release: () => void;
};
