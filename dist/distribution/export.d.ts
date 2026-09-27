export declare function createPortableExport({ sourceRoot, outputPath, draft, privateIdentifiers, knowledgeComplete, knowledgeEligible, }: {
    sourceRoot: string;
    outputPath: string;
    draft?: boolean;
    privateIdentifiers?: string[];
    knowledgeComplete?: () => boolean;
    knowledgeEligible?: () => {
        digest: string;
    };
}): {
    path: string;
    digest: string;
    releaseStatus: "complete" | "draft-incomplete-knowledge";
};
