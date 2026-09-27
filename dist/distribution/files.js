import { createHash } from "node:crypto";
import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { DeliveryError } from "../domain.js";
const portableRootFiles = [
    ".gitignore",
    "package.json",
    "package-lock.json",
    ".mise.toml",
    "AGENTS.md",
    "README.md",
    "biome.json",
    "tsconfig.json",
    "tsconfig.build.json",
];
const portableDirectories = ["src", "dist", "knowledge", "docs", "scripts", "test"];
const deniedSegments = new Set([
    ".git",
    "node_modules",
    ".private",
    ".local",
    ".worktrees",
    ".codex-worktrees",
    "logs",
    "run-state",
]);
const deniedFileSuffixes = [".sqlite", ".sqlite-wal", ".sqlite-shm", ".db", ".log"];
export const fileDigest = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const assertPortableRelativePath = (path) => {
    if (path.length === 0 ||
        isAbsolute(path) ||
        path === ".." ||
        path.startsWith(`..${sep}`) ||
        path.split(sep).some((segment) => deniedSegments.has(segment)) ||
        deniedFileSuffixes.some((suffix) => path.endsWith(suffix)) ||
        /(^|\/)(\.env(?:\.|$)|\.mcp\.json$|credentials?\.json$)|\.(pem|key|p12|pfx)$/i.test(path))
        throw new DeliveryError("Distribution path is not portable");
};
const privatePathPatterns = [/\/(?:Users|home)\/[^/\s]+\//u, /[A-Za-z]:\\Users\\[^\\\s]+\\/u];
const readPrivateIdentifiers = () => (process.env.DELIVERY_PRIVATE_IDENTIFIERS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
function assertPortableContent({ path, identifiers, }) {
    const content = readFileSync(path);
    if (content.includes(0))
        throw new DeliveryError("Binary assets require separate portable eligibility review");
    const text = content.toString("utf8");
    if (privatePathPatterns.some((pattern) => pattern.test(text)) ||
        identifiers.some((identifier) => text.toLowerCase().includes(identifier.toLowerCase())))
        throw new DeliveryError("Distribution content contains a private path or identifier");
}
function walk({ sourceRoot, relativePath, identifiers, output, }) {
    assertPortableRelativePath(relativePath);
    const absolutePath = resolve(sourceRoot, relativePath);
    const delta = relative(sourceRoot, absolutePath);
    if (delta !== relativePath)
        throw new DeliveryError("Distribution path escaped its source root");
    const stat = lstatSync(absolutePath);
    if (stat.isSymbolicLink())
        throw new DeliveryError("Symbolic links are not portable exports");
    if (stat.isDirectory()) {
        for (const name of readdirSync(absolutePath).sort())
            walk({ sourceRoot, relativePath: join(relativePath, name), identifiers, output });
        return;
    }
    if (!stat.isFile())
        throw new DeliveryError("Distribution contains an unsupported file type");
    assertPortableContent({ path: absolutePath, identifiers });
    output.push({
        relativePath,
        sourcePath: absolutePath,
        digest: fileDigest(absolutePath),
        size: stat.size,
    });
}
export function collectPortableFiles({ sourceRoot, privateIdentifiers = readPrivateIdentifiers(), }) {
    const root = resolve(sourceRoot);
    if (lstatSync(root).isSymbolicLink())
        throw new DeliveryError("Symbolic links are not portable exports");
    const output = [];
    for (const relativePath of portableRootFiles) {
        if (existsSync(join(root, relativePath)))
            walk({ sourceRoot: root, relativePath, identifiers: privateIdentifiers, output });
    }
    for (const relativePath of portableDirectories) {
        if (existsSync(join(root, relativePath)))
            walk({ sourceRoot: root, relativePath, identifiers: privateIdentifiers, output });
    }
    if (output.length === 0)
        throw new DeliveryError("No portable distribution files were found");
    return output.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}
export function copyDistributionFiles({ files, destinationRoot, }) {
    for (const file of files) {
        assertPortableRelativePath(file.relativePath);
        const destination = resolve(destinationRoot, file.relativePath);
        if (relative(resolve(destinationRoot), destination).startsWith(".."))
            throw new DeliveryError("Distribution destination escaped its root");
        mkdirSync(dirname(destination), { recursive: true, mode: 0o700 });
        copyFileSync(file.sourcePath, destination);
    }
}
