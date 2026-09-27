import { type Profile } from "./domain.js";
export declare const conformanceCodeDigests: () => Readonly<{
    sourceCodeDigest: string;
    executedCodeDigest: string;
}>;
export declare function runConformance({ profile, executable, directory, hostId, cursorApiKey, }: {
    profile: Profile;
    executable: string;
    directory: string;
    hostId: string;
    cursorApiKey?: string;
}): Promise<unknown>;
export declare function readConformance({ directory, profile, executable, hostId, }: {
    directory: string;
    profile: Profile;
    executable: string;
    hostId: string;
}): Promise<{
    digest: string;
}>;
