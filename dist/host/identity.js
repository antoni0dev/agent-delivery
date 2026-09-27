import { randomUUID } from "node:crypto";
import { chmodSync, closeSync, mkdirSync, openSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { z } from "zod";
const hostIdSchema = z.string().uuid();
export const defaultApplicationSupportDirectory = () => join(homedir(), "Library", "Application Support", "agent-delivery");
export function loadHostId({ applicationSupportDirectory = defaultApplicationSupportDirectory(), } = {}) {
    const path = join(applicationSupportDirectory, "host-id");
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    try {
        return hostIdSchema.parse(readFileSync(path, "utf8").trim());
    }
    catch (error) {
        if (error instanceof Error && "code" in error && error.code === "ENOENT") {
            const hostId = randomUUID();
            const descriptor = openSync(path, "wx", 0o600);
            try {
                writeFileSync(descriptor, `${hostId}\n`, "utf8");
            }
            finally {
                closeSync(descriptor);
                chmodSync(path, 0o600);
            }
            return hostId;
        }
        throw error;
    }
}
