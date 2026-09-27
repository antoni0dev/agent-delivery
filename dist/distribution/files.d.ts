export type DistributionFile = Readonly<{
    relativePath: string;
    sourcePath: string;
    digest: string;
    size: number;
}>;
export declare const fileDigest: (path: string) => string;
export declare function collectPortableFiles({ sourceRoot, privateIdentifiers, }: {
    sourceRoot: string;
    privateIdentifiers?: string[];
}): DistributionFile[];
export declare function copyDistributionFiles({ files, destinationRoot, }: {
    files: DistributionFile[];
    destinationRoot: string;
}): void;
