import { type Project, type WorkspaceConfig } from "../config.js";
import { type Issue } from "../domain.js";
export declare function createGraphqlLinearAdapter(input: {
    config: WorkspaceConfig;
    project: Project;
    fetch?: typeof fetch;
}): {
    verifyIdentity: () => Promise<void>;
    listEligible: () => Promise<Issue[]>;
    getIssue: (id: string) => Promise<Issue>;
    publishPlan: (args: {
        issueId: string;
        planDigest: string;
        fullPlan: string;
        operationKey: string;
    }) => Promise<{
        id: string;
        body: string;
    }>;
    findComment: (args: {
        issueId: string;
        operationKey: string;
    }) => Promise<{
        id: string;
        body: string;
    } | null>;
    createChild: (args: {
        parentId: string;
        title: string;
        description: string;
        operationKey: string;
    }) => Promise<Issue>;
    findChild: (args: {
        parentId: string;
        operationKey: string;
    }) => Promise<Issue | null>;
    completeIssue: (args: {
        issueId: string;
    }) => Promise<void>;
    notify: (args: {
        issueId: string;
        body: string;
        operationKey: string;
    }) => Promise<{
        id: string;
        body: string;
    }>;
};
export type LinearAdapter = ReturnType<typeof createGraphqlLinearAdapter>;
export declare function createLinearAdapter(input: {
    config: WorkspaceConfig;
    project: Project;
    fetch?: typeof fetch;
}): LinearAdapter;
