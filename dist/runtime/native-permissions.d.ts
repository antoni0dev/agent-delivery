import { z } from "zod";
import type { RuntimeProfile } from "./core.js";
export declare const nativePermissionArtifactSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    profile: z.ZodEnum<{
        "claude-code": "claude-code";
        codex: "codex";
        cursor: "cursor";
    }>;
    executable: z.ZodString;
    executableDigest: z.ZodString;
    version: z.ZodString;
    sourceCodeDigest: z.ZodString;
    executedCodeDigest: z.ZodString;
    supported: z.ZodBoolean;
    passed: z.ZodBoolean;
    mechanism: z.ZodNullable<z.ZodEnum<{
        "macos-worktree-guard": "macos-worktree-guard";
        "vendor-native": "vendor-native";
    }>>;
    enforcementExecutable: z.ZodNullable<z.ZodString>;
    enforcementExecutableDigest: z.ZodNullable<z.ZodString>;
    guardedRoots: z.ZodNullable<z.ZodObject<{
        workspace: z.ZodString;
        gitDir: z.ZodNullable<z.ZodString>;
        gitCommonDir: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>>;
    policyDigest: z.ZodNullable<z.ZodString>;
    permissionProfile: z.ZodNullable<z.ZodString>;
    sandboxMode: z.ZodNullable<z.ZodString>;
    read: z.ZodObject<{
        exitCode: z.ZodNullable<z.ZodNumber>;
        passed: z.ZodBoolean;
    }, z.core.$strict>;
    write: z.ZodObject<{
        exitCode: z.ZodNullable<z.ZodNumber>;
        attempted: z.ZodBoolean;
        denied: z.ZodBoolean;
        denialClass: z.ZodNullable<z.ZodLiteral<"os-permission-denied">>;
    }, z.core.$strict>;
    gitDirWrite: z.ZodObject<{
        exitCode: z.ZodNullable<z.ZodNumber>;
        attempted: z.ZodBoolean;
        denied: z.ZodBoolean;
        denialClass: z.ZodNullable<z.ZodLiteral<"os-permission-denied">>;
    }, z.core.$strict>;
    gitCommonDirWrite: z.ZodObject<{
        exitCode: z.ZodNullable<z.ZodNumber>;
        attempted: z.ZodBoolean;
        denied: z.ZodBoolean;
        denialClass: z.ZodNullable<z.ZodLiteral<"os-permission-denied">>;
    }, z.core.$strict>;
    markerDigestBefore: z.ZodString;
    markerDigestAfter: z.ZodString;
    reason: z.ZodNullable<z.ZodString>;
}, z.core.$strict>;
export type NativePermissionArtifact = z.infer<typeof nativePermissionArtifactSchema>;
export type NativePermissionProbeResult = Readonly<{
    supported: boolean;
    passed: boolean;
    artifactPath: string;
    artifactDigest: string;
    reason: string | null;
}>;
type NativePermissionProbeInput = Readonly<{
    profile: RuntimeProfile;
    executable: string;
    executableDigest: string;
    version: string;
    sourceCodeDigest: string;
    executedCodeDigest: string;
    artifactDirectory: string;
    deadlineMs?: number;
}>;
export type GuardedRoots = Readonly<{
    workspace: string;
    gitDir: string | null;
    gitCommonDir: string | null;
}>;
export type RuntimeCommand = Readonly<{
    executable: string;
    args: readonly string[];
}>;
export declare const resolveGuardedRoots: (cwd: string) => GuardedRoots;
export declare const macosWorktreeGuardIdentity: ({ cwd, }: {
    cwd: string;
}) => Readonly<{
    executable: string;
    executableDigest: string;
    policyDigest: string;
    guardedRoots: GuardedRoots;
}> | null;
export declare const nativePermissionEnforcementIdentity: ({ profile, executable, executableDigest, cwd, }: {
    profile: RuntimeProfile;
    executable: string;
    executableDigest: string;
    cwd: string;
}) => Readonly<{
    mechanism: "vendor-native" | "macos-worktree-guard";
    enforcementExecutable: string;
    enforcementExecutableDigest: string;
    policyDigest: string;
    guardedRoots: GuardedRoots;
}> | null;
export declare const readOnlyRuntimeCommand: ({ profile, executable, args, cwd, }: {
    profile: RuntimeProfile;
    executable: string;
    args: readonly string[];
    cwd: string;
}) => RuntimeCommand;
export declare const probeNativeReadOnlyPermission: ({ profile, executable, executableDigest, version, sourceCodeDigest, executedCodeDigest, artifactDirectory, deadlineMs, }: NativePermissionProbeInput) => Promise<NativePermissionProbeResult>;
export {};
