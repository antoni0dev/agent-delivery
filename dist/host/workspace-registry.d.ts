import { type WorkspaceConfig } from "../config.js";
export declare function registerWorkspace({ managedRoot, configPath, config, }: {
    managedRoot: string;
    configPath: string;
    config: WorkspaceConfig;
}): void;
export declare function locateWorkspace({ managedRoot, root }: {
    managedRoot: string;
    root: string;
}): {
    workspaceId: string;
    projectId: string;
    configPath: string;
};
