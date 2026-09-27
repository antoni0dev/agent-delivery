import { z } from "zod";
declare const installManifestSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<2>;
    version: z.ZodString;
    installedAt: z.ZodString;
    cliFile: z.ZodString;
    commandFile: z.ZodString;
    commandDigest: z.ZodString;
    coreFiles: z.ZodArray<z.ZodObject<{
        path: z.ZodString;
        digest: z.ZodString;
    }, z.core.$strict>>;
    adapterFiles: z.ZodArray<z.ZodObject<{
        path: z.ZodString;
        digest: z.ZodString;
    }, z.core.$strict>>;
    manifestDigest: z.ZodString;
}, z.core.$strict>;
export type InstallManifest = z.infer<typeof installManifestSchema>;
declare const legacyInstallManifestSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    version: z.ZodString;
    installedAt: z.ZodString;
    cliFile: z.ZodString;
    coreFiles: z.ZodArray<z.ZodObject<{
        path: z.ZodString;
        digest: z.ZodString;
    }, z.core.$strict>>;
    adapterFiles: z.ZodArray<z.ZodObject<{
        path: z.ZodString;
        digest: z.ZodString;
    }, z.core.$strict>>;
    manifestDigest: z.ZodString;
}, z.core.$strict>;
type PreviousInstallManifest = InstallManifest | z.infer<typeof legacyInstallManifestSchema>;
type StagedCommandRunner = (executable: string, args: string[], options: {
    cwd: string;
    stdio: "pipe";
}) => string | Buffer;
export declare const defaultManagedRoot: () => string;
export declare const defaultAdapterFiles: () => ReadonlyArray<{
    path: string;
    content: string;
}>;
export declare function installNodeDependencies({ directory, nodeBinary, npmExecutable, run, }: {
    directory: string;
    nodeBinary?: string;
    npmExecutable?: string;
    run?: StagedCommandRunner;
}): void;
export declare function installManagedDistribution({ sourceRoot, managedRoot, adapterFiles, commandFile, nodeBinary, installDependencies, }: {
    sourceRoot: string;
    managedRoot?: string;
    adapterFiles?: ReadonlyArray<{
        path: string;
        content: string;
    }>;
    commandFile?: string;
    nodeBinary?: string;
    installDependencies?: (directory: string) => void;
}): InstallManifest;
export declare function upgradeManagedDistribution({ sourceRoot, configPath, stateDatabasePath, pause, activeProcessCount, backupDatabase, managedRoot, adapterFiles, commandFile, nodeBinary, installDependencies, }: {
    sourceRoot: string;
    configPath: string;
    stateDatabasePath: string;
    pause: () => void;
    activeProcessCount: () => number;
    backupDatabase: (destination: string) => Promise<void>;
    managedRoot?: string;
    adapterFiles?: ReadonlyArray<{
        path: string;
        content: string;
    }>;
    commandFile?: string;
    nodeBinary?: string;
    installDependencies?: (directory: string) => void;
}): Promise<{
    manifest: InstallManifest;
    backupDirectory: string;
}>;
export declare function currentManagedInstallation({ managedRoot, }?: {
    managedRoot?: string;
}): PreviousInstallManifest | null;
export {};
