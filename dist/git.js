import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { commandEnvironment } from "./commands.js";
import { assertRepository } from "./config.js";
import { DeliveryError } from "./domain.js";
export { assertRepository } from "./config.js";
export function git({ cwd, args, env, }) {
    try {
        return execFileSync("git", args, {
            cwd,
            encoding: "utf8",
            timeout: 120_000,
            maxBuffer: 8 * 1024 * 1024,
            env,
            stdio: ["ignore", "pipe", "pipe"],
        }).trim();
    }
    catch {
        throw new DeliveryError(`Git operation failed: ${args[0] ?? "unknown"}`);
    }
}
export function candidate({ cwd, project }) {
    return {
        head: git({ cwd, args: ["rev-parse", "HEAD"] }),
        base: git({ cwd, args: ["rev-parse", `refs/remotes/origin/${project.release.targetBranch}`] }),
        tree: git({ cwd, args: ["rev-parse", "HEAD^{tree}"] }),
    };
}
export function assertClean(cwd) {
    if (git({ cwd, args: ["status", "--porcelain", "--untracked-files=all"] }) !== "")
        throw new DeliveryError("Candidate worktree is not clean");
}
export function assertIdentity(project, cwd = project.root) {
    if (git({ cwd, args: ["config", "user.name"] }) !== project.gitIdentity.name ||
        git({ cwd, args: ["config", "user.email"] }) !== project.gitIdentity.email)
        throw new DeliveryError("Repository commit identity differs from configured destination identity");
}
function baseGitEnvironment() {
    return {
        ...commandEnvironment(),
        GIT_TERMINAL_PROMPT: "0",
        GIT_ASKPASS: "/usr/bin/false",
        SSH_ASKPASS: "/usr/bin/false",
        GCM_INTERACTIVE: "Never",
        GIT_CONFIG_NOSYSTEM: "1",
        GIT_CONFIG_GLOBAL: "/dev/null",
    };
}
function assertAuthorization({ config, project, authorization, }) {
    if (authorization.repository.toLowerCase() !== project.repository.toLowerCase() ||
        authorization.login.toLowerCase() !== config.github.login.toLowerCase() ||
        authorization.header.length > 16 * 1024 ||
        !/^AUTHORIZATION: basic [A-Za-z0-9+/]+={0,2}$/.test(authorization.header))
        throw new DeliveryError("Git authorization does not match the configured destination");
}
function assertNoUrlRewrites(cwd) {
    const result = spawnSync("git", ["config", "--get-regexp", "^url\\..*\\.(insteadof|pushinsteadof)$"], {
        cwd,
        encoding: "utf8",
        timeout: 10_000,
        maxBuffer: 64 * 1024,
        env: baseGitEnvironment(),
        stdio: ["ignore", "pipe", "ignore"],
    });
    if (result.error || (result.status !== 0 && result.status !== 1))
        throw new DeliveryError("Git URL rewrite configuration could not be inspected");
    if (result.status === 0 && result.stdout.trim() !== "")
        throw new DeliveryError("Git URL rewrite configuration is not permitted");
}
function canonicalRepositoryUrl(authorization) {
    return `https://github.com/${authorization.repository}.git`;
}
function gitEnvironment(authorization) {
    return {
        ...baseGitEnvironment(),
        GIT_CONFIG_COUNT: "7",
        GIT_CONFIG_KEY_0: "credential.helper",
        GIT_CONFIG_VALUE_0: "",
        GIT_CONFIG_KEY_1: "http.extraheader",
        GIT_CONFIG_VALUE_1: "",
        GIT_CONFIG_KEY_2: "http.https://github.com/.extraheader",
        GIT_CONFIG_VALUE_2: "",
        GIT_CONFIG_KEY_3: "http.https://github.com/.extraheader",
        GIT_CONFIG_VALUE_3: authorization.header,
        GIT_CONFIG_KEY_4: "protocol.allow",
        GIT_CONFIG_VALUE_4: "never",
        GIT_CONFIG_KEY_5: "protocol.https.allow",
        GIT_CONFIG_VALUE_5: "always",
        GIT_CONFIG_KEY_6: "core.hooksPath",
        GIT_CONFIG_VALUE_6: "/dev/null",
    };
}
export function fetchBase({ config, project, authorization, }) {
    assertAuthorization({ config, project, authorization });
    assertRepository(project);
    assertNoUrlRewrites(project.root);
    git({
        cwd: project.root,
        args: [
            "fetch",
            "--no-tags",
            canonicalRepositoryUrl(authorization),
            `+refs/heads/${project.release.targetBranch}:refs/remotes/origin/${project.release.targetBranch}`,
        ],
        env: gitEnvironment(authorization),
    });
}
export function ensureWorktree({ config, project, initiativeId, }) {
    const branch = `delivery/${initiativeId}`;
    const path = join(config.stateDirectory, "worktrees", initiativeId);
    if (existsSync(path)) {
        const common = git({
            cwd: path,
            args: ["rev-parse", "--path-format=absolute", "--git-common-dir"],
        });
        const expected = git({
            cwd: project.root,
            args: ["rev-parse", "--path-format=absolute", "--git-common-dir"],
        });
        if (realpathSync(common) !== realpathSync(expected) ||
            git({ cwd: path, args: ["branch", "--show-current"] }) !== branch)
            throw new DeliveryError("Worktree provenance does not match initiative");
    }
    else {
        mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
        git({
            cwd: project.root,
            args: [
                "worktree",
                "add",
                "-b",
                branch,
                path,
                `refs/remotes/origin/${project.release.targetBranch}`,
            ],
        });
    }
    return { path: resolve(path), branch };
}
export function commitImplementation({ project, cwd, title, }) {
    assertIdentity(project, cwd);
    const changed = git({
        cwd,
        args: [
            "diff",
            "--name-only",
            "--diff-filter=ACMR",
            "-z",
            `refs/remotes/origin/${project.release.targetBranch}`,
        ],
    })
        .split("\0")
        .filter(Boolean);
    if (changed.some((file) => /(^|\/)(\.env(?:\.|$)|\.mcp\.json$|\.private\/|\.local\/|\.auth\/)|\.(pem|key|sqlite)$/i.test(file)))
        throw new DeliveryError("Candidate contains a private artifact or credential-bearing path");
    const paths = git({ cwd, args: ["status", "--porcelain", "--untracked-files=all"] });
    if (paths !== "") {
        const raw = execFileSync("git", ["ls-files", "--modified", "--deleted", "--others", "--exclude-standard", "-z"], { cwd, encoding: "utf8" });
        const files = raw.split("\0").filter(Boolean);
        if (files.some((file) => existsSync(join(cwd, file)) &&
            /(^|\/)(\.env(?:\.|$)|\.mcp\.json$|\.private\/|\.local\/|\.auth\/)|\.(pem|key|sqlite)$/i.test(file)))
            throw new DeliveryError("Candidate contains a private artifact or credential-bearing path");
        if (files.length > 0)
            git({ cwd, args: ["add", "--", ...files] });
        git({ cwd, args: ["diff", "--cached", "--check"] });
        git({
            cwd,
            args: [
                "-c",
                "core.hooksPath=/dev/null",
                "commit",
                "-m",
                `feat: ${title
                    .replace(/[\r\n]/g, " ")
                    .replace(/^[A-Z]/, (character) => character.toLowerCase())
                    .slice(0, 64)}`,
            ],
            env: {
                ...commandEnvironment(),
                GIT_AUTHOR_NAME: project.gitIdentity.name,
                GIT_AUTHOR_EMAIL: project.gitIdentity.email,
                GIT_COMMITTER_NAME: project.gitIdentity.name,
                GIT_COMMITTER_EMAIL: project.gitIdentity.email,
            },
        });
    }
    assertClean(cwd);
    return git({ cwd, args: ["rev-parse", "HEAD"] });
}
export function pushFeature({ config, project, cwd, branch, authorization, }) {
    if (!config.authority.pushFeatureBranches || !branch.startsWith("delivery/"))
        throw new DeliveryError("Feature push is not authorized");
    assertAuthorization({ config, project, authorization });
    assertRepository(project);
    assertIdentity(project, cwd);
    assertClean(cwd);
    if (git({ cwd, args: ["branch", "--show-current"] }) !== branch)
        throw new DeliveryError("Feature push requires the owned feature branch");
    assertNoUrlRewrites(cwd);
    git({
        cwd,
        args: [
            "push",
            canonicalRepositoryUrl(authorization),
            `refs/heads/${branch}:refs/heads/${branch}`,
        ],
        env: gitEnvironment(authorization),
    });
}
export function updateBase({ config, project, cwd, branch, authorization, }) {
    assertAuthorization({ config, project, authorization });
    assertRepository(project);
    assertIdentity(project, cwd);
    assertClean(cwd);
    assertNoUrlRewrites(cwd);
    if (!branch.startsWith("delivery/") ||
        git({ cwd, args: ["branch", "--show-current"] }) !== branch)
        throw new DeliveryError("Base update requires the owned feature branch");
    git({
        cwd,
        args: [
            "-c",
            "core.hooksPath=/dev/null",
            "merge",
            "--no-edit",
            `origin/${project.release.targetBranch}`,
        ],
    });
    pushFeature({ config, project, cwd, branch, authorization });
}
