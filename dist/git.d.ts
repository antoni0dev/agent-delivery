import { type Project, type WorkspaceConfig } from "./config.js";
import type { GitAuthorization } from "./integrations/github.js";
export { assertRepository } from "./config.js";
export declare function git({ cwd, args, env, }: {
    cwd: string;
    args: string[];
    env?: NodeJS.ProcessEnv;
}): string;
export declare function candidate({ cwd, project }: {
    cwd: string;
    project: Project;
}): {
    head: string;
    base: string;
    tree: string;
};
export declare function assertClean(cwd: string): void;
export declare function assertIdentity(project: Project, cwd?: string): void;
export declare function fetchBase({ config, project, authorization, }: {
    config: WorkspaceConfig;
    project: Project;
    authorization: GitAuthorization;
}): void;
export declare function ensureWorktree({ config, project, initiativeId, }: {
    config: WorkspaceConfig;
    project: Project;
    initiativeId: string;
}): {
    path: string;
    branch: string;
};
export declare function commitImplementation({ project, cwd, title, }: {
    project: Project;
    cwd: string;
    title: string;
}): string;
export declare function pushFeature({ config, project, cwd, branch, authorization, }: {
    config: WorkspaceConfig;
    project: Project;
    cwd: string;
    branch: string;
    authorization: GitAuthorization;
}): void;
export declare function updateBase({ config, project, cwd, branch, authorization, }: {
    config: WorkspaceConfig;
    project: Project;
    cwd: string;
    branch: string;
    authorization: GitAuthorization;
}): void;
