#!/usr/bin/env node

import {
  chmodSync,
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { z } from "zod";
import { configDigest, configTemplate, loadConfig, type WorkspaceConfig } from "./config.js";
import { Controller } from "./controller.js";
import {
  createPortableExport,
  currentManagedInstallation,
  installManagedDistribution,
  installNodeDependencies,
  upgradeManagedDistribution,
} from "./distribution/index.js";
import { DeliveryError, type Profile, profiles } from "./domain.js";
import {
  activateLaunchAgent,
  deactivateLaunchAgent,
  loadHostId,
  writeLaunchAgent,
} from "./host/index.js";
import { runBehaviorEvaluation } from "./knowledge/model-evaluation.js";
import { Store } from "./store.js";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const profileSchema = z.enum(profiles);
const stateDatabaseName = "agent-delivery.sqlite";

const usage = `Usage:
  delivery init --config <path> --root <repo>
  delivery doctor --config <path> [--live]
  delivery conform --config <path> --profile codex|claude-code|cursor
  delivery evaluate --config <path> --profile <profile>
  delivery transfer-host --config <path> --to <host-id>
  delivery activate --config <path>
  delivery tick --config <path>
  delivery run --config <path> --issue <id> --project <id> --profile <profile>
  delivery status --config <path>
  delivery pause --config <path>
  delivery manual --config <path> --project <id> --issue <id> --action reserve|release
  delivery cancel --config <path> --initiative <id>
  delivery handoff --config <path> --initiative <id> --owner <id> --profile <profile>
  delivery resume --config <path> --initiative <id>
  delivery replan --config <path> --initiative <id>
  delivery install --config <path>
  delivery upgrade --config <path>
  delivery export --output <path> [--draft]
  delivery help
`;

const required = (value: string | undefined, name: string): string => {
  if (value === undefined || value.length === 0)
    throw new DeliveryError(`Missing required option --${name}`, "usage");
  return value;
};

const parseProfile = (value: string | undefined, requiredValue = true): Profile | undefined => {
  if (value === undefined && !requiredValue) return undefined;
  return profileSchema.parse(required(value, "profile"));
};

const parseConfigOnly = (args: string[]): { configPath: string } => {
  const { values } = parseArgs({
    args,
    allowPositionals: false,
    strict: true,
    options: { config: { type: "string" } },
  });
  return { configPath: resolve(required(values.config, "config")) };
};

type ControllerContext = Readonly<{
  config: WorkspaceConfig;
  configPath: string;
  controller: Controller;
  store: Store;
  hostId: string;
  stateDatabasePath: string;
}>;

async function withController<T>({
  configPath,
  run,
}: {
  configPath: string;
  run: (context: ControllerContext) => Promise<T> | T;
}): Promise<T> {
  const config = loadConfig(configPath);
  const stateDatabasePath = join(config.stateDirectory, stateDatabaseName);
  const store = new Store({
    path: stateDatabasePath,
    workspaceId: config.workspaceId,
    maxInitiatives: config.capacity.initiatives,
    maxWriters: config.capacity.writers,
  });
  try {
    const hostId = loadHostId();
    const controller = new Controller({ config, store, hostId });
    return await run({ config, configPath, controller, store, hostId, stateDatabasePath });
  } finally {
    store.close();
  }
}

const managedLogDirectory = (workspaceId: string): string =>
  join(homedir(), "Library", "Logs", "agent-delivery", workspaceId);

export const workspaceActiveHere = ({
  active,
  boundHostId,
  currentHostId,
  boundConfigDigest,
  currentConfigDigest,
}: {
  active: number;
  boundHostId: string | null;
  currentHostId: string;
  boundConfigDigest: string | null;
  currentConfigDigest: string;
}): boolean =>
  active === 1 && boundHostId === currentHostId && boundConfigDigest === currentConfigDigest;

export function assertUpgradeOwnership({
  boundHostId,
  currentHostId,
  boundConfigDigest,
  currentConfigDigest,
}: {
  boundHostId: string | null;
  currentHostId: string;
  boundConfigDigest: string | null;
  currentConfigDigest: string;
}): void {
  if (
    (boundHostId !== null && boundHostId !== currentHostId) ||
    (boundConfigDigest !== null && boundConfigDigest !== currentConfigDigest)
  )
    throw new DeliveryError(
      "Upgrade requires the owning host and the configuration bound at activation",
    );
}

const commands: Readonly<Record<string, (args: string[]) => Promise<unknown>>> = {
  help: async (args) => {
    parseArgs({ args, allowPositionals: false, strict: true });
    return { usage };
  },
  init: async (args) => {
    const { values } = parseArgs({
      args,
      allowPositionals: false,
      strict: true,
      options: { config: { type: "string" }, root: { type: "string" } },
    });
    const configPath = resolve(required(values.config, "config"));
    const root = resolve(required(values.root, "root"));
    if (existsSync(configPath)) throw new DeliveryError("Configuration file already exists");
    mkdirSync(dirname(configPath), { recursive: true, mode: 0o700 });
    const descriptor = openSync(configPath, "wx", 0o600);
    try {
      writeFileSync(
        descriptor,
        `${JSON.stringify(
          configTemplate({
            root,
            stateDirectory: "./.agent-delivery-state",
            knowledgeRoot: packageRoot,
          }),
          null,
          2,
        )}\n`,
      );
    } catch (error) {
      rmSync(configPath, { force: true });
      throw error;
    } finally {
      closeSync(descriptor);
    }
    chmodSync(configPath, 0o600);
    return { config: configPath, active: false, requiresConfiguration: true };
  },
  doctor: async (args) => {
    const { values } = parseArgs({
      args,
      allowPositionals: false,
      strict: true,
      options: { config: { type: "string" }, live: { type: "boolean", default: false } },
    });
    const configPath = resolve(required(values.config, "config"));
    return withController({
      configPath,
      run: ({ controller }) => controller.doctor({ live: values.live }),
    });
  },
  conform: async (args) => {
    const { values } = parseArgs({
      args,
      allowPositionals: false,
      strict: true,
      options: { config: { type: "string" }, profile: { type: "string" } },
    });
    const configPath = resolve(required(values.config, "config"));
    const profile = requiredProfile(parseProfile(values.profile));
    return withController({ configPath, run: ({ controller }) => controller.conform({ profile }) });
  },
  evaluate: async (args) => {
    const { values } = parseArgs({
      args,
      allowPositionals: false,
      strict: true,
      options: { config: { type: "string" }, profile: { type: "string" } },
    });
    return withController({
      configPath: resolve(required(values.config, "config")),
      run: ({ config }) =>
        runBehaviorEvaluation({
          root: config.knowledgeRoot,
          directory: join(config.stateDirectory, "behavior"),
          executable: config.runtimes[requiredProfile(parseProfile(values.profile))],
          nodeExecutable: process.execPath,
          profile: requiredProfile(parseProfile(values.profile)),
        }),
    });
  },
  "transfer-host": async (args) => {
    const { values } = parseArgs({
      args,
      allowPositionals: false,
      strict: true,
      options: { config: { type: "string" }, to: { type: "string" } },
    });
    return withController({
      configPath: resolve(required(values.config, "config")),
      run: ({ store, hostId, config }) => {
        store.acquireController(hostId);
        try {
          store.pause();
          deactivateLaunchAgent({ workspaceId: config.workspaceId });
          store.transferHost({
            oldHostId: hostId,
            newHostId: z.string().uuid().parse(required(values.to, "to")),
          });
          return { active: false, transferred: true };
        } finally {
          store.releaseController();
        }
      },
    });
  },
  activate: async (args) => {
    const { configPath } = parseConfigOnly(args);
    return withController({
      configPath,
      run: async ({ config, controller }) => {
        const result = await controller.activate();
        const installation = currentManagedInstallation();
        if (installation !== null) {
          const path = writeLaunchAgent({
            workspaceId: config.workspaceId,
            nodeBinary: process.execPath,
            cliFile: installation.cliFile,
            configPath,
            enabled: true,
            logDirectory: managedLogDirectory(config.workspaceId),
          });
          activateLaunchAgent({ workspaceId: config.workspaceId, path });
        }
        return result;
      },
    });
  },
  tick: async (args) => {
    const { configPath } = parseConfigOnly(args);
    return withController({ configPath, run: ({ controller }) => controller.tick() });
  },
  run: async (args) => {
    const { values } = parseArgs({
      args,
      allowPositionals: false,
      strict: true,
      options: {
        config: { type: "string" },
        issue: { type: "string" },
        project: { type: "string" },
        profile: { type: "string" },
      },
    });
    const configPath = resolve(required(values.config, "config"));
    const profile = requiredProfile(parseProfile(values.profile, true));
    const input = {
      issueId: required(values.issue, "issue"),
      projectId: required(values.project, "project"),
      profile,
    };
    return withController({ configPath, run: ({ controller }) => controller.run(input) });
  },
  manual: async (args) => {
    const { values } = parseArgs({
      args,
      allowPositionals: false,
      strict: true,
      options: {
        config: { type: "string" },
        issue: { type: "string" },
        project: { type: "string" },
        action: { type: "string" },
      },
    });
    const configPath = resolve(required(values.config, "config"));
    const action = values.action;
    if (action !== "reserve" && action !== "release")
      throw new DeliveryError("Select --action reserve or release");
    const input = {
      issueId: required(values.issue, "issue"),
      projectId: required(values.project, "project"),
      action,
    };
    return withController({
      configPath,
      run: ({ controller }) => controller.manual({ ...input, action }),
    });
  },
  status: async (args) => {
    const { configPath } = parseConfigOnly(args);
    return withController({ configPath, run: ({ controller }) => controller.status() });
  },
  pause: async (args) => {
    const { configPath } = parseConfigOnly(args);
    return withController({
      configPath,
      run: ({ config, controller }) => {
        controller.pause();
        deactivateLaunchAgent({ workspaceId: config.workspaceId });
        return controller.status();
      },
    });
  },
  cancel: async (args) => {
    const { values } = parseArgs({
      args,
      allowPositionals: false,
      strict: true,
      options: { config: { type: "string" }, initiative: { type: "string" } },
    });
    const configPath = resolve(required(values.config, "config"));
    const id = required(values.initiative, "initiative");
    return withController({ configPath, run: ({ controller }) => controller.cancel(id) });
  },
  handoff: async (args) => {
    const { values } = parseArgs({
      args,
      allowPositionals: false,
      strict: true,
      options: {
        config: { type: "string" },
        initiative: { type: "string" },
        owner: { type: "string" },
        profile: { type: "string" },
      },
    });
    const configPath = resolve(required(values.config, "config"));
    const input = {
      id: required(values.initiative, "initiative"),
      newOwner: required(values.owner, "owner"),
      profile: requiredProfile(parseProfile(values.profile)),
    };
    return withController({ configPath, run: ({ controller }) => controller.handoff(input) });
  },
  resume: async (args) => {
    const { values } = parseArgs({
      args,
      allowPositionals: false,
      strict: true,
      options: { config: { type: "string" }, initiative: { type: "string" } },
    });
    const configPath = resolve(required(values.config, "config"));
    const id = required(values.initiative, "initiative");
    return withController({
      configPath,
      run: ({ controller }) => {
        controller.resume(id);
        return controller.status();
      },
    });
  },
  replan: async (args) => {
    const { values } = parseArgs({
      args,
      allowPositionals: false,
      strict: true,
      options: { config: { type: "string" }, initiative: { type: "string" } },
    });
    const configPath = resolve(required(values.config, "config"));
    const id = required(values.initiative, "initiative");
    return withController({
      configPath,
      run: async ({ controller }) => {
        await controller.replan(id);
        return controller.status();
      },
    });
  },
  install: async (args) => {
    const { configPath } = parseConfigOnly(args);
    return withController({
      configPath,
      run: async ({ config, controller, store, hostId }) => {
        await controller.doctor();
        store.acquireController(hostId);
        try {
          const settings = store.settings();
          const activeHere = workspaceActiveHere({
            active: settings.active,
            boundHostId: settings.host_id,
            currentHostId: hostId,
            boundConfigDigest: settings.config_digest,
            currentConfigDigest: configDigest(config),
          });
          const manifest = installManagedDistribution({
            sourceRoot: packageRoot,
            installDependencies: (directory) => installNodeDependencies({ directory }),
          });
          const path = writeLaunchAgent({
            workspaceId: config.workspaceId,
            nodeBinary: process.execPath,
            cliFile: manifest.cliFile,
            configPath,
            enabled: activeHere,
            logDirectory: managedLogDirectory(config.workspaceId),
          });
          if (activeHere) activateLaunchAgent({ workspaceId: config.workspaceId, path });
          return {
            version: manifest.version,
            cliFile: manifest.cliFile,
            commandFile: manifest.commandFile,
            active: activeHere,
            scheduler: activeHere ? "active" : "inactive",
          };
        } finally {
          store.releaseController();
        }
      },
    });
  },
  upgrade: async (args) => {
    const { configPath } = parseConfigOnly(args);
    return withController({
      configPath,
      run: async ({ config, controller, store, hostId, stateDatabasePath }) => {
        await controller.doctor();
        const settings = store.settings();
        assertUpgradeOwnership({
          boundHostId: settings.host_id,
          currentHostId: hostId,
          boundConfigDigest: settings.config_digest,
          currentConfigDigest: configDigest(config),
        });
        store.pause();
        deactivateLaunchAgent({ workspaceId: config.workspaceId });
        store.acquireController(hostId);
        try {
          const result = await upgradeManagedDistribution({
            sourceRoot: packageRoot,
            configPath,
            stateDatabasePath,
            pause: () => store.pause(),
            activeProcessCount: () => store.runningInvocations().length,
            backupDatabase: (destination) => store.backup(destination),
            installDependencies: (directory) => installNodeDependencies({ directory }),
          });
          writeLaunchAgent({
            workspaceId: config.workspaceId,
            nodeBinary: process.execPath,
            cliFile: result.manifest.cliFile,
            configPath,
            enabled: false,
            logDirectory: managedLogDirectory(config.workspaceId),
          });
          return {
            version: result.manifest.version,
            backupDirectory: result.backupDirectory,
            active: false,
            next: "delivery activate --config <path>",
          };
        } finally {
          store.releaseController();
        }
      },
    });
  },
  export: async (args) => {
    const { values } = parseArgs({
      args,
      allowPositionals: false,
      strict: true,
      options: { output: { type: "string" }, draft: { type: "boolean", default: false } },
    });
    return createPortableExport({
      sourceRoot: packageRoot,
      outputPath: resolve(required(values.output, "output")),
      draft: values.draft,
    });
  },
};

function requiredProfile(profile: Profile | undefined): Profile {
  if (profile === undefined) throw new DeliveryError("Missing required option --profile", "usage");
  return profile;
}

const redact = (message: string): string =>
  message
    .replaceAll(homedir(), "<home>")
    .replace(/(token|secret|password|authorization)[=: ]+[^\s,;]+/giu, "$1=<redacted>");

async function main(): Promise<void> {
  const [command = "help", ...args] = process.argv.slice(2);
  const run = commands[command];
  if (run === undefined) throw new DeliveryError(`Unknown command: ${command}`, "usage");
  const result = await run(args);
  process.stdout.write(`${JSON.stringify(result ?? { ok: true })}\n`);
}

if (
  process.argv[1] !== undefined &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
)
  main().catch((error: unknown) => {
    const known = error instanceof DeliveryError;
    const message = known ? redact(error.message) : "Unexpected delivery failure";
    const code = known ? error.code : "internal";
    process.stderr.write(`${JSON.stringify({ error: message, code })}\n`);
    process.exitCode = 1;
  });
