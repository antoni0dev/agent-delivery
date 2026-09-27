import { type Command } from "../domain.js";
export type McpCall = (input: {
    name: string;
    arguments: Record<string, unknown>;
    read: boolean;
}) => Promise<unknown>;
export declare function withMcpSession<T>(input: {
    command: Command;
    cwd: string;
    run: (call: McpCall) => Promise<T>;
}): Promise<T>;
export declare function createMcpCaller(input: {
    command: Command;
    cwd: string;
}): McpCall;
