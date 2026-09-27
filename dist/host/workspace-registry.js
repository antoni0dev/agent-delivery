import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync, } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { z } from "zod";
import { loadConfig } from "../config.js";
import { DeliveryError } from "../domain.js";
const recordSchema = z
    .object({
    workspaceId: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    configPath: z.string(),
    trackerWorkspaceId: z.string(),
    githubLogin: z.string(),
    projects: z.array(z
        .object({
        id: z.string(),
        root: z.string(),
        repository: z.string(),
        commonDirectory: z.string().nullable(),
    })
        .strict()),
})
    .strict();
const commonDirectory = (root) => {
    try {
        return realpathSync(execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
            cwd: root,
            encoding: "utf8",
            timeout: 10_000,
            stdio: ["ignore", "pipe", "ignore"],
        }).trim());
    }
    catch {
        return null;
    }
};
const contains = ({ root, path }) => {
    const delta = relative(root, path);
    return !isAbsolute(delta) && delta !== ".." && !delta.startsWith("../");
};
export function registerWorkspace({ managedRoot, configPath, config, }) {
    const current = loadConfig(configPath);
    if (current.workspaceId !== config.workspaceId ||
        current.linear.workspaceId !== config.linear.workspaceId ||
        current.github.login !== config.github.login)
        throw new DeliveryError("Workspace registration does not match its configuration", "configuration");
    const record = recordSchema.parse({
        workspaceId: current.workspaceId,
        configPath: realpathSync(configPath),
        trackerWorkspaceId: current.linear.workspaceId,
        githubLogin: current.github.login,
        projects: current.projects.map((project) => ({
            id: project.id,
            root: project.root,
            repository: project.repository,
            commonDirectory: commonDirectory(project.root),
        })),
    });
    const directory = join(resolve(managedRoot), "workspaces");
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    chmodSync(directory, 0o700);
    const target = join(directory, `${record.workspaceId}.json`);
    if (existsSync(target)) {
        const previous = recordSchema.parse(JSON.parse(readFileSync(target, "utf8")));
        if (previous.trackerWorkspaceId !== record.trackerWorkspaceId ||
            previous.githubLogin !== record.githubLogin)
            throw new DeliveryError("Workspace identifier is already registered to another destination", "configuration");
    }
    const temporary = `${target}.${randomUUID()}.tmp`;
    try {
        writeFileSync(temporary, `${JSON.stringify(record, null, 2)}\n`, { mode: 0o600 });
        renameSync(temporary, target);
    }
    finally {
        rmSync(temporary, { force: true });
    }
}
export function locateWorkspace({ managedRoot, root }) {
    const path = realpathSync(root);
    const common = commonDirectory(path);
    const directory = join(resolve(managedRoot), "workspaces");
    const matches = [];
    for (const file of existsSync(directory)
        ? readdirSync(directory).filter((file) => file.endsWith(".json"))
        : []) {
        const parsed = recordSchema.safeParse(JSON.parse(readFileSync(join(directory, file), "utf8")));
        if (!parsed.success)
            throw new DeliveryError("Invalid workspace registry record", "configuration");
        const record = parsed.data;
        for (const project of record.projects) {
            if ((contains({ root: project.root, path }) && common === project.commonDirectory) ||
                (common !== null && common === project.commonDirectory))
                matches.push({ record, project });
        }
    }
    const match = matches[0];
    if (matches.length !== 1 || match === undefined)
        throw new DeliveryError(matches.length === 0
            ? "No registered workspace matches this repository"
            : "Multiple registered projects match this repository", "configuration");
    const { record, project } = match;
    const config = loadConfig(record.configPath);
    const current = config.projects.find((entry) => entry.id === project.id);
    if (config.workspaceId !== record.workspaceId ||
        config.linear.workspaceId !== record.trackerWorkspaceId ||
        config.github.login !== record.githubLogin ||
        current === undefined ||
        current.root !== project.root ||
        current.repository !== project.repository ||
        commonDirectory(current.root) !== project.commonDirectory)
        throw new DeliveryError("Workspace registration is stale; register the current configuration", "configuration");
    return { workspaceId: record.workspaceId, projectId: project.id, configPath: record.configPath };
}
