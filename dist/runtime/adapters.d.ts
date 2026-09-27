import type { RuntimeEffort } from "./core.js";
export type ParsedRuntimeOutput = Readonly<{
    output: unknown;
    actualModel: string | null;
    nativeSessionId: string | null;
    nativePermissionMode: string | null;
    writeAttempted: boolean | null;
    writeDenied: boolean | null;
}>;
type AdapterArgumentsInput = Readonly<{
    model: string;
    effort: RuntimeEffort;
    readOnly: boolean;
    outputSchema?: Readonly<Record<string, unknown>>;
    outputSchemaPath?: string;
}>;
type ParseRuntimeOutputInput = Readonly<{
    stdout: string;
}>;
declare const codexOutput: ({ stdout }: ParseRuntimeOutputInput) => ParsedRuntimeOutput;
declare const claudeOutput: ({ stdout }: ParseRuntimeOutputInput) => ParsedRuntimeOutput;
declare const resultObjectOutput: ({ stdout }: ParseRuntimeOutputInput) => ParsedRuntimeOutput;
declare const parseSemanticVersion: (stdout: string) => string | null;
declare const codexArguments: ({ model, effort, readOnly, outputSchemaPath, }: AdapterArgumentsInput) => readonly string[];
declare const claudeArguments: ({ model, effort, readOnly, outputSchema, }: AdapterArgumentsInput) => readonly string[];
declare const cursorArguments: ({ model, effort, readOnly }: AdapterArgumentsInput) => readonly string[];
export declare const runtimeAdapters: Readonly<{
    codex: Readonly<{
        capabilities: Readonly<{
            readonly freshContext: true;
            readonly readOnly: true;
            readonly structuredOutput: true;
            readonly modelSelection: true;
        }>;
        minimumVersion: null;
        buildArguments: typeof codexArguments;
        parseOutput: typeof codexOutput;
        parseVersion: typeof parseSemanticVersion;
    }>;
    "claude-code": Readonly<{
        capabilities: Readonly<{
            readonly freshContext: true;
            readonly readOnly: true;
            readonly structuredOutput: true;
            readonly modelSelection: true;
        }>;
        minimumVersion: "2.1.280";
        buildArguments: typeof claudeArguments;
        parseOutput: typeof claudeOutput;
        parseVersion: typeof parseSemanticVersion;
    }>;
    cursor: Readonly<{
        capabilities: Readonly<{
            readonly freshContext: true;
            readonly readOnly: true;
            readonly structuredOutput: true;
            readonly modelSelection: true;
        }>;
        minimumVersion: null;
        buildArguments: typeof cursorArguments;
        parseOutput: typeof resultObjectOutput;
        parseVersion: typeof parseSemanticVersion;
    }>;
}>;
export declare const compareSemanticVersions: ({ left, right, }: {
    left: string;
    right: string;
}) => number;
export declare const modelsMatch: ({ requested, actual, }: {
    requested: string;
    actual: string;
}) => boolean;
export {};
