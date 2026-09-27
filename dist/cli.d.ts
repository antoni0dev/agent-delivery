#!/usr/bin/env node
export declare const workspaceActiveHere: ({ active, boundHostId, currentHostId, boundConfigDigest, currentConfigDigest, }: {
    active: number;
    boundHostId: string | null;
    currentHostId: string;
    boundConfigDigest: string | null;
    currentConfigDigest: string;
}) => boolean;
export declare function assertUpgradeOwnership({ boundHostId, currentHostId, boundConfigDigest, currentConfigDigest, }: {
    boundHostId: string | null;
    currentHostId: string;
    boundConfigDigest: string | null;
    currentConfigDigest: string;
}): void;
