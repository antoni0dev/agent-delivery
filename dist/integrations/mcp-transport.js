import { spawn } from "node:child_process";
import { ReadBuffer, serializeMessage } from "@modelcontextprotocol/sdk/shared/stdio.js";
import { DeliveryError, ensurePresent } from "../domain.js";
import { processGroupAlive } from "../runtime/process.js";
const OUTPUT_LIMIT = 4 * 1024 * 1024;
export class OwnedMcpTransport {
    input;
    onclose;
    onerror;
    onmessage;
    child = null;
    closing = null;
    buffer = new ReadBuffer({ maxBufferSize: OUTPUT_LIMIT });
    constructor(input) {
        this.input = input;
    }
    async start() {
        if (this.child !== null)
            throw new DeliveryError("MCP transport already started");
        const child = spawn(this.input.command.executable, this.input.command.args, {
            cwd: this.input.cwd,
            env: this.input.env,
            detached: true,
            stdio: ["pipe", "pipe", "ignore"],
        });
        this.child = child;
        let received = 0;
        child.once("close", () => this.onclose?.());
        child.stdin.on("error", () => this.onerror?.(new Error("MCP input closed")));
        child.stdout.on("data", (chunk) => {
            try {
                received += chunk.length;
                if (received > OUTPUT_LIMIT)
                    throw new Error("MCP output exceeded its limit");
                this.buffer.append(chunk);
                for (let message = this.buffer.readMessage(); message !== null; message = this.buffer.readMessage())
                    this.onmessage?.(message);
            }
            catch {
                this.onerror?.(new Error("MCP returned invalid or excessive protocol output"));
                void this.close().catch(() => this.onerror?.(new Error("MCP termination is unconfirmed")));
            }
        });
        await new Promise((resolve, reject) => {
            child.once("spawn", resolve);
            child.once("error", () => reject(new DeliveryError("Routed MCP process could not start")));
        });
    }
    send(message) {
        const input = ensurePresent(this.child?.stdin, "MCP input is unavailable");
        return new Promise((resolve, reject) => {
            input.write(serializeMessage(message), (error) => (error ? reject(error) : resolve()));
        });
    }
    close() {
        this.closing ??= this.terminate();
        return this.closing;
    }
    async terminate() {
        const child = this.child;
        if (child === null)
            return;
        child.stdin?.end();
        const pid = child.pid;
        if (pid === undefined)
            return;
        for (const signal of ["SIGTERM", "SIGKILL"]) {
            if (!processGroupAlive(pid))
                break;
            try {
                process.kill(-pid, signal);
            }
            catch (error) {
                if (!(error instanceof Error && "code" in error && error.code === "ESRCH"))
                    throw new DeliveryError("MCP process-group termination could not be confirmed");
            }
            const deadline = Date.now() + 2000;
            while (processGroupAlive(pid) && Date.now() < deadline)
                await new Promise((resolve) => setTimeout(resolve, 25));
        }
        this.buffer.clear();
        if (processGroupAlive(pid))
            throw new DeliveryError("MCP process group remains active");
    }
}
