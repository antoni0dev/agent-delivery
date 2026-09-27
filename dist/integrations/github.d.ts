import { type Project, type WorkspaceConfig } from "../config.js";
export type Pull = {
    number: number;
    url: string;
    head: string;
    base: string;
    headBranch: string;
    baseBranch: string;
    draft: boolean;
    merged: boolean;
    mergeCommit: string | null;
};
export type GitAuthorization = {
    repository: string;
    login: string;
    header: string;
};
type CheckNextAction = "wait" | "repair" | "human-review" | "blocked-policy";
type CheckDetail = {
    context: string;
    ref: string;
    source: "check-run" | "commit-status" | "missing";
    status: string;
    conclusion: string | null;
    summary: string | null;
};
type RequiredChecksResult = {
    passed: boolean;
    failures: string[];
    testedRefs: string[];
    nextAction?: CheckNextAction;
    details: CheckDetail[];
};
export declare function createGithubAdapter(input: {
    config: WorkspaceConfig;
    project: Project;
    fetch?: typeof fetch;
}): {
    verifyIdentity: () => Promise<void>;
    gitAuthorization: () => Promise<GitAuthorization>;
    findPullRequest: (args: {
        headBranch: string;
        operationKey: string;
    }) => Promise<Pull | null>;
    relatedPullRequests: (args: {
        issueUrl: string;
    }) => Promise<Pull[]>;
    createPullRequest: (args: {
        headBranch: string;
        title: string;
        body: string;
        operationKey: string;
    }) => Promise<Pull>;
    readPullRequest: (number: number) => Promise<Pull>;
    requiredChecks: (args: {
        number: number;
        head: string;
        base: string;
    }) => Promise<RequiredChecksResult>;
    merge: (args: {
        number: number;
        head: string;
        base: string;
    }) => Promise<{
        merged: boolean;
        commit: string | null;
    }>;
    disableAutoMerge: (args: {
        number: number;
    }) => Promise<void>;
    markReady: (args: {
        number: number;
        head: string;
    }) => Promise<void>;
    markDraft: (args: {
        number: number;
        head: string;
    }) => Promise<void>;
};
export {};
