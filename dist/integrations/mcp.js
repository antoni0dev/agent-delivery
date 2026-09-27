import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { z } from "zod";
import { commandEnvironment } from "../commands.js";
import { DeliveryError } from "../domain.js";
import { OwnedMcpTransport } from "./mcp-transport.js";
const SESSION_TIMEOUT_MS = 120_000;
export async function withMcpSession(input) {
    const environment = Object.fromEntries(Object.entries(commandEnvironment()).flatMap(([key, value]) => value === undefined ? [] : [[key, value]]));
    const client = new Client({ name: "agent-delivery", version: "0.1.0" });
    const transport = new OwnedMcpTransport({
        command: input.command,
        cwd: input.cwd,
        env: environment,
    });
    const call = async (request) => {
        try {
            const response = await client.callTool({ name: request.name, arguments: request.arguments }, undefined, { timeout: 30_000, maxTotalTimeout: 30_000 });
            const result = z
                .object({
                isError: z.boolean().optional(),
                structuredContent: z.unknown().optional(),
                content: z.array(z.object({ type: z.string(), text: z.string().optional() })),
            })
                .parse(response);
            if (result.isError)
                throw new Error("Tool rejected the request");
            if (result.structuredContent !== undefined)
                return result.structuredContent;
            const blocks = result.content.filter((block) => block.type === "text");
            if (blocks.length !== 1)
                throw new Error("Expected one structured tool result");
            return JSON.parse(blocks[0]?.text ?? "");
        }
        catch {
            throw new DeliveryError(request.read
                ? "Routed Linear MCP read did not return a valid result"
                : "Routed Linear MCP mutation outcome is uncertain; reconcile before retrying", request.read ? "provider" : "uncertain");
        }
    };
    let deadline;
    try {
        return await Promise.race([
            (async () => {
                try {
                    await client.connect(transport, { timeout: 20_000 });
                }
                catch {
                    throw new DeliveryError("Routed MCP session could not initialize", "provider");
                }
                return input.run(call);
            })(),
            new Promise((_resolve, reject) => {
                deadline = setTimeout(() => reject(new DeliveryError("Routed MCP session exceeded its deadline", "provider")), SESSION_TIMEOUT_MS);
            }),
        ]);
    }
    finally {
        if (deadline !== undefined)
            clearTimeout(deadline);
        try {
            await client.close();
        }
        finally {
            await transport.close();
        }
    }
}
export function createMcpCaller(input) {
    return async (request) => {
        try {
            return await withMcpSession({ ...input, run: (call) => call(request) });
        }
        catch (error) {
            if (!request.read && error instanceof DeliveryError && error.code === "provider")
                throw new DeliveryError("Routed Linear MCP mutation outcome is uncertain; reconcile before retrying", "uncertain");
            throw error;
        }
    };
}
