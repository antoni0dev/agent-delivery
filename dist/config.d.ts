import { z } from "zod";
import { credentialSchema } from "./domain.js";
declare const projectSchema: z.ZodObject<{
    id: z.ZodString;
    root: z.ZodString;
    repository: z.ZodString;
    remote: z.ZodString;
    defaultBranch: z.ZodString;
    gitIdentity: z.ZodObject<{
        name: z.ZodString;
        email: z.ZodString;
    }, z.core.$strict>;
    teamIds: z.ZodArray<z.ZodString>;
    projectIds: z.ZodArray<z.ZodString>;
    instructions: z.ZodArray<z.ZodString>;
    commands: z.ZodRecord<z.ZodString, z.ZodObject<{
        executable: z.ZodString;
        args: z.ZodArray<z.ZodString>;
    }, z.core.$strict>>;
    preparation: z.ZodOptional<z.ZodObject<{
        executable: z.ZodString;
        args: z.ZodArray<z.ZodString>;
    }, z.core.$strict>>;
    environment: z.ZodObject<{
        name: z.ZodString;
        production: z.ZodLiteral<false>;
        mainnet: z.ZodLiteral<false>;
        authentication: z.ZodEnum<{
            none: "none";
            real: "real";
        }>;
        mutations: z.ZodEnum<{
            disabled: "disabled";
            "non-production": "non-production";
        }>;
        allowedChainIds: z.ZodArray<z.ZodNumber>;
        configurationFiles: z.ZodArray<z.ZodString>;
        variables: z.ZodDefault<z.ZodArray<z.ZodString>>;
    }, z.core.$strict>;
    release: z.ZodObject<{
        targetBranch: z.ZodString;
        method: z.ZodEnum<{
            merge: "merge";
            rebase: "rebase";
            squash: "squash";
        }>;
        deploysProduction: z.ZodLiteral<false>;
        strictCurrentBase: z.ZodBoolean;
        requiredChecks: z.ZodArray<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>;
export type Project = z.infer<typeof projectSchema>;
export declare const workspaceConfigSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    workspaceId: z.ZodString;
    stateDirectory: z.ZodString;
    knowledgeRoot: z.ZodString;
    intakeRuntimeProfile: z.ZodEnum<{
        "claude-code": "claude-code";
        codex: "codex";
        cursor: "cursor";
    }>;
    runtimes: z.ZodObject<{
        codex: z.ZodString;
        "claude-code": z.ZodString;
        cursor: z.ZodString;
    }, z.core.$strict>;
    runtimeCredentials: z.ZodOptional<z.ZodObject<{
        cursor: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"environment">;
            name: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"command">;
            command: z.ZodObject<{
                executable: z.ZodString;
                args: z.ZodArray<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>], "kind">>;
    }, z.core.$strict>>;
    linear: z.ZodObject<{
        workspaceId: z.ZodString;
        assigneeId: z.ZodString;
        readyLabel: z.ZodString;
        intake: z.ZodOptional<z.ZodObject<{
            mode: z.ZodEnum<{
                label: "label";
                private: "private";
            }>;
            automaticOthers: z.ZodBoolean;
        }, z.core.$strict>>;
        credential: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"environment">;
            name: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"command">;
            command: z.ZodObject<{
                executable: z.ZodString;
                args: z.ZodArray<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>], "kind">>;
        mcp: z.ZodOptional<z.ZodObject<{
            executable: z.ZodString;
            args: z.ZodArray<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict>;
    github: z.ZodObject<{
        hostname: z.ZodLiteral<"github.com">;
        login: z.ZodString;
        credential: z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"environment">;
            name: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"command">;
            command: z.ZodObject<{
                executable: z.ZodString;
                args: z.ZodArray<z.ZodString>;
            }, z.core.$strict>;
        }, z.core.$strict>], "kind">;
    }, z.core.$strict>;
    authority: z.ZodObject<{
        grantReference: z.ZodString;
        updateOwnedIssues: z.ZodBoolean;
        createScopedChildren: z.ZodBoolean;
        pushFeatureBranches: z.ZodBoolean;
        openPullRequests: z.ZodBoolean;
        mergeDevelopment: z.ZodBoolean;
    }, z.core.$strict>;
    capacity: z.ZodObject<{
        initiatives: z.ZodNumber;
        writers: z.ZodNumber;
    }, z.core.$strict>;
    projects: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        root: z.ZodString;
        repository: z.ZodString;
        remote: z.ZodString;
        defaultBranch: z.ZodString;
        gitIdentity: z.ZodObject<{
            name: z.ZodString;
            email: z.ZodString;
        }, z.core.$strict>;
        teamIds: z.ZodArray<z.ZodString>;
        projectIds: z.ZodArray<z.ZodString>;
        instructions: z.ZodArray<z.ZodString>;
        commands: z.ZodRecord<z.ZodString, z.ZodObject<{
            executable: z.ZodString;
            args: z.ZodArray<z.ZodString>;
        }, z.core.$strict>>;
        preparation: z.ZodOptional<z.ZodObject<{
            executable: z.ZodString;
            args: z.ZodArray<z.ZodString>;
        }, z.core.$strict>>;
        environment: z.ZodObject<{
            name: z.ZodString;
            production: z.ZodLiteral<false>;
            mainnet: z.ZodLiteral<false>;
            authentication: z.ZodEnum<{
                none: "none";
                real: "real";
            }>;
            mutations: z.ZodEnum<{
                disabled: "disabled";
                "non-production": "non-production";
            }>;
            allowedChainIds: z.ZodArray<z.ZodNumber>;
            configurationFiles: z.ZodArray<z.ZodString>;
            variables: z.ZodDefault<z.ZodArray<z.ZodString>>;
        }, z.core.$strict>;
        release: z.ZodObject<{
            targetBranch: z.ZodString;
            method: z.ZodEnum<{
                merge: "merge";
                rebase: "rebase";
                squash: "squash";
            }>;
            deploysProduction: z.ZodLiteral<false>;
            strictCurrentBase: z.ZodBoolean;
            requiredChecks: z.ZodArray<z.ZodString>;
        }, z.core.$strict>;
    }, z.core.$strict>>;
    notifications: z.ZodObject<{
        linear: z.ZodBoolean;
        desktop: z.ZodBoolean;
    }, z.core.$strict>;
    liveEvidenceMaxAgeMs: z.ZodNumber;
}, z.core.$strict>;
export type WorkspaceConfig = z.infer<typeof workspaceConfigSchema>;
export declare const sha256: (content: string | Buffer) => string;
export declare const configDigest: (config: WorkspaceConfig) => string;
export declare function loadConfig(path: string): WorkspaceConfig;
export declare function withinRoot({ root, path }: {
    root: string;
    path: string;
}): string;
export declare function assertRepository(project: Project): void;
export declare function environmentDigest(project: Project): string;
export declare function credentialValue({ reference, cwd, }: {
    reference: z.infer<typeof credentialSchema>;
    cwd: string;
}): string;
export declare function readProjectInstructions(project: Project): string[];
export declare function configTemplate({ root, stateDirectory, knowledgeRoot, }: {
    root: string;
    stateDirectory: string;
    knowledgeRoot: string;
}): unknown;
export {};
