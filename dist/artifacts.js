import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { sha256 } from "./config.js";
import { DeliveryError } from "./domain.js";
export function writeArtifact({ directory, content, }) {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    const digest = sha256(content);
    const path = join(directory, `${digest}.json`);
    try {
        writeFileSync(path, content, { flag: "wx", mode: 0o600 });
    }
    catch (error) {
        if (!(error instanceof Error && "code" in error && error.code === "EEXIST"))
            throw error;
        if (sha256(readFileSync(path)) !== digest)
            throw new DeliveryError("Existing artifact failed integrity verification");
    }
    return { digest, path };
}
export function readArtifact(artifact) {
    const content = readFileSync(artifact.path, "utf8");
    if (sha256(content) !== artifact.digest)
        throw new DeliveryError("Artifact content changed after recording");
    return content;
}
