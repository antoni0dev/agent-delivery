export declare function processIdentity(pid: number): string | null;
export declare function sameProcess({ pid, identity }: {
    pid: number;
    identity: string | null;
}): boolean;
export declare function terminateRecordedProcess({ pid, identity, }: {
    pid: number;
    identity: string | null;
}): Promise<boolean>;
