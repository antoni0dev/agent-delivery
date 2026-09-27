import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { z } from "zod";
import { commandSchema, credentialSchema, DeliveryError, profiles } from "./domain.js";

const projectSchema = z
  .object({
    id: z.string().min(1),
    root: z.string().min(1),
    repository: z.string().regex(/^[\w.-]+\/[\w.-]+$/),
    remote: z.string().min(1),
    defaultBranch: z.string().min(1),
    gitIdentity: z.object({ name: z.string().min(1), email: z.string().email() }).strict(),
    teamIds: z.array(z.string()).min(1),
    projectIds: z.array(z.string()),
    instructions: z.array(z.string()),
    commands: z.record(z.string(), commandSchema),
    preparation: commandSchema.optional(),
    environment: z
      .object({
        name: z.string().min(1),
        production: z.literal(false),
        mainnet: z.literal(false),
        authentication: z.enum(["none", "real"]),
        mutations: z.enum(["disabled", "non-production"]),
        allowedChainIds: z.array(z.number().int().positive()),
        configurationFiles: z.array(z.string()),
        variables: z.array(z.string().regex(/^[A-Z][A-Z0-9_]*$/)).default([]),
      })
      .strict(),
    release: z
      .object({
        targetBranch: z.string().min(1),
        method: z.enum(["squash", "merge", "rebase"]),
        deploysProduction: z.literal(false),
        strictCurrentBase: z.literal(true),
        requiredChecks: z.array(z.string()).min(1),
      })
      .strict(),
  })
  .strict();
export type Project = z.infer<typeof projectSchema>;

export const workspaceConfigSchema = z
  .object({
    schemaVersion: z.literal(1),
    workspaceId: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    stateDirectory: z.string().min(1),
    knowledgeRoot: z.string().min(1),
    intakeRuntimeProfile: z.enum(profiles),
    runtimes: z
      .object({
        codex: z.string().min(1),
        "claude-code": z.string().min(1),
        cursor: z.string().min(1),
      })
      .strict(),
    runtimeCredentials: z.object({ cursor: credentialSchema.optional() }).strict().optional(),
    linear: z
      .object({
        workspaceId: z.string().min(1),
        assigneeId: z.string().min(1),
        readyLabel: z.string().min(1),
        intake: z
          .object({
            mode: z.enum(["label", "private"]),
            automaticOthers: z.boolean(),
          })
          .strict()
          .optional(),
        credential: credentialSchema.optional(),
        mcp: commandSchema.optional(),
      })
      .strict()
      .refine(
        (linear) =>
          Number(linear.credential !== undefined) + Number(linear.mcp !== undefined) === 1,
        "Select exactly one Linear connection",
      ),
    github: z
      .object({
        hostname: z.literal("github.com"),
        login: z.string().min(1),
        credential: credentialSchema,
      })
      .strict(),
    authority: z
      .object({
        grantReference: z.string().min(1),
        updateOwnedIssues: z.boolean(),
        createScopedChildren: z.boolean(),
        pushFeatureBranches: z.boolean(),
        openPullRequests: z.boolean(),
        mergeDevelopment: z.boolean(),
      })
      .strict(),
    capacity: z
      .object({
        initiatives: z.number().int().min(1).max(2),
        writers: z.number().int().min(1).max(3),
      })
      .strict(),
    projects: z.array(projectSchema).min(1),
    notifications: z.object({ linear: z.boolean(), desktop: z.boolean() }).strict(),
    liveEvidenceMaxAgeMs: z
      .number()
      .int()
      .positive()
      .max(24 * 60 * 60 * 1000),
  })
  .strict();
export type WorkspaceConfig = z.infer<typeof workspaceConfigSchema>;

export const sha256 = (content: string | Buffer): string =>
  createHash("sha256").update(content).digest("hex");
export const configDigest = (config: WorkspaceConfig): string => sha256(JSON.stringify(config));

export function loadConfig(path: string): WorkspaceConfig {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new DeliveryError("Configuration could not be read as JSON", "configuration");
  }
  const parsed = workspaceConfigSchema.safeParse(raw);
  if (!parsed.success)
    throw new DeliveryError(
      `Invalid configuration fields: ${parsed.error.issues
        .slice(0, 12)
        .map((issue) => `${issue.path.join(".") || "root"} (${issue.code})`)
        .join(", ")}`,
      "configuration",
    );
  const value = parsed.data;
  const base = dirname(resolve(path));
  value.stateDirectory = resolve(base, value.stateDirectory);
  value.knowledgeRoot = resolve(base, value.knowledgeRoot);
  for (const project of value.projects) project.root = realpathSync(resolve(base, project.root));
  if (new Set(value.projects.map((project) => project.id)).size !== value.projects.length)
    throw new DeliveryError("Duplicate project identifier");
  if (new Set(value.projects.map((project) => project.root)).size !== value.projects.length)
    throw new DeliveryError("Duplicate project root");
  return value;
}

export function withinRoot({ root, path }: { root: string; path: string }): string {
  const target = resolve(root, path);
  const delta = relative(realpathSync(root), realpathSync(target));
  if (isAbsolute(delta) || delta === ".." || delta.startsWith("../"))
    throw new DeliveryError("Path is outside the configured project");
  return target;
}

export function assertRepository(project: Project): void {
  const actual = execFileSync("git", ["remote", "get-url", "origin"], {
    cwd: project.root,
    encoding: "utf8",
    timeout: 10_000,
  }).trim();
  if (actual !== project.remote)
    throw new DeliveryError("Repository remote does not match destination configuration");
  const allowed = [
    `git@github.com:${project.repository}.git`,
    `https://github.com/${project.repository}.git`,
    `https://github.com/${project.repository}`,
  ];
  if (allowed.includes(actual)) return;
  const alias = /^git@([\w.-]+):([\w.-]+\/[\w.-]+)\.git$/.exec(actual);
  if (alias !== null && alias[2] === project.repository) {
    const resolved = execFileSync("ssh", ["-G", `git@${alias[1]}`], {
      cwd: project.root,
      encoding: "utf8",
      timeout: 10_000,
      stdio: ["ignore", "pipe", "ignore"],
    });
    if (/^hostname github\.com$/m.test(resolved) && /^user git$/m.test(resolved)) return;
  }
  throw new DeliveryError("Configured repository identity and remote disagree");
}

export function environmentDigest(project: Project): string {
  const files = project.environment.configurationFiles.map((path) => {
    const absolute = withinRoot({ root: project.root, path });
    return { path, hash: sha256(readFileSync(absolute)) };
  });
  const variables = project.environment.variables.map((name) => ({
    name,
    digest: sha256(process.env[name] ?? "<missing>"),
  }));
  return sha256(JSON.stringify({ environment: project.environment, files, variables }));
}

export function credentialValue({
  reference,
  cwd,
}: {
  reference: z.infer<typeof credentialSchema>;
  cwd: string;
}): string {
  const value =
    reference.kind === "environment"
      ? process.env[reference.name]
      : execFileSync(reference.command.executable, reference.command.args, {
          cwd,
          encoding: "utf8",
          timeout: 10_000,
          maxBuffer: 64 * 1024,
          stdio: ["ignore", "pipe", "ignore"],
        }).trim();
  if (!value || value.includes("\n"))
    throw new DeliveryError("Credential reference did not resolve to one secret value");
  return value;
}

export function readProjectInstructions(project: Project): string[] {
  return project.instructions.map((path) =>
    readFileSync(withinRoot({ root: project.root, path }), "utf8"),
  );
}

export function configTemplate({
  root,
  stateDirectory,
  knowledgeRoot,
}: {
  root: string;
  stateDirectory: string;
  knowledgeRoot: string;
}): unknown {
  return {
    schemaVersion: 1,
    workspaceId: "configure-workspace",
    stateDirectory,
    knowledgeRoot,
    intakeRuntimeProfile: "codex",
    runtimes: { codex: "codex", "claude-code": "claude", cursor: "agent" },
    linear: {
      workspaceId: "configure",
      assigneeId: "configure",
      readyLabel: "AI-ready",
      intake: { mode: "private", automaticOthers: false },
      credential: { kind: "environment", name: "DELIVERY_LINEAR_TOKEN" },
    },
    github: {
      hostname: "github.com",
      login: "configure",
      credential: { kind: "environment", name: "DELIVERY_GITHUB_TOKEN" },
    },
    authority: {
      grantReference: "",
      updateOwnedIssues: false,
      createScopedChildren: false,
      pushFeatureBranches: false,
      openPullRequests: false,
      mergeDevelopment: false,
    },
    capacity: { initiatives: 2, writers: 3 },
    projects: [
      {
        id: "project",
        root,
        repository: "owner/repository",
        remote: "",
        defaultBranch: "main",
        gitIdentity: { name: "", email: "" },
        teamIds: [],
        projectIds: [],
        instructions: existsSync(resolve(root, "AGENTS.md")) ? ["AGENTS.md"] : [],
        commands: {},
        environment: {
          name: "non-production",
          production: false,
          mainnet: false,
          authentication: "none",
          mutations: "disabled",
          allowedChainIds: [],
          configurationFiles: [],
          variables: [],
        },
        release: {
          targetBranch: "main",
          method: "squash",
          deploysProduction: false,
          strictCurrentBase: true,
          requiredChecks: [],
        },
      },
    ],
    notifications: { linear: true, desktop: true },
    liveEvidenceMaxAgeMs: 60 * 60 * 1000,
  };
}
