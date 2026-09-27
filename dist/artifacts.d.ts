export type Artifact = {
    digest: string;
    path: string;
};
export declare function writeArtifact({ directory, content, }: {
    directory: string;
    content: string;
}): Artifact;
export declare function readArtifact(artifact: Artifact): string;
