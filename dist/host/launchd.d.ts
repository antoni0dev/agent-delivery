type LaunchctlRunner = (args: string[]) => unknown;
export declare const launchAgentPath: ({ workspaceId, launchAgentsDirectory, }: {
    workspaceId: string;
    launchAgentsDirectory?: string;
}) => string;
export declare function renderLaunchAgent(input: {
    workspaceId: string;
    nodeBinary: string;
    cliFile: string;
    configPath: string;
    enabled: boolean;
    logDirectory: string;
}): string;
export declare function writeLaunchAgent(input: {
    workspaceId: string;
    nodeBinary: string;
    cliFile: string;
    configPath: string;
    enabled: boolean;
    logDirectory: string;
    launchAgentsDirectory?: string;
}): string;
export declare function activateLaunchAgent({ workspaceId, path, run, }: {
    workspaceId: string;
    path: string;
    run?: LaunchctlRunner;
}): void;
export declare function deactivateLaunchAgent({ workspaceId, run, }: {
    workspaceId: string;
    run?: LaunchctlRunner;
}): void;
export {};
