import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import { type Command } from "../domain.js";
export declare class OwnedMcpTransport implements Transport {
    private readonly input;
    onclose?: () => void;
    onerror?: (error: Error) => void;
    onmessage?: NonNullable<Transport["onmessage"]>;
    private child;
    private closing;
    private readonly buffer;
    constructor(input: {
        command: Command;
        cwd: string;
        env: NodeJS.ProcessEnv;
    });
    start(): Promise<void>;
    send(message: JSONRPCMessage): Promise<void>;
    close(): Promise<void>;
    private terminate;
}
