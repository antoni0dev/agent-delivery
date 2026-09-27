import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { z } from "zod";
import { DeliveryError } from "../domain.js";
import { defaultApplicationSupportDirectory } from "../host/identity.js";
import { collectPortableFiles, copyDistributionFiles, fileDigest } from "./files.js";
import { managerEntrypoint, managerRuleEntrypoint } from "./manager-contract.js";
import { ticketShapingSkill } from "./ticket-skill.js";

const ownedFileSchema = z
  .object({ path: z.string().min(1), digest: z.string().length(64) })
  .strict();
const installManifestSchema = z
  .object({
    schemaVersion: z.literal(2),
    version: z.string().length(64),
    installedAt: z.string().datetime(),
    cliFile: z.string().min(1),
    commandFile: z.string().min(1),
    commandDigest: z.string().length(64),
    coreFiles: z.array(ownedFileSchema),
    adapterFiles: z.array(ownedFileSchema),
    manifestDigest: z.string().length(64),
  })
  .strict();
export type InstallManifest = z.infer<typeof installManifestSchema>;

const legacyInstallManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    version: z.string().length(64),
    installedAt: z.string().datetime(),
    cliFile: z.string().min(1),
    coreFiles: z.array(ownedFileSchema),
    adapterFiles: z.array(ownedFileSchema),
    manifestDigest: z.string().length(64),
  })
  .strict();
type PreviousInstallManifest = InstallManifest | z.infer<typeof legacyInstallManifestSchema>;

type ManagedFile = Readonly<{ path: string; content: string; mode: number }>;
type ManagedFileBackup = Readonly<{ path: string; content: Buffer | null; mode: number }>;
type StagedCommandRunner = (
  executable: string,
  args: string[],
  options: { cwd: string; stdio: "pipe" },
) => string | Buffer;

const runStagedCommand: StagedCommandRunner = (executable, args, options) =>
  execFileSync(executable, args, options);

const digestJson = (value: unknown): string =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

export const defaultManagedRoot = (): string =>
  join(defaultApplicationSupportDirectory(), "managed");

export const defaultAdapterFiles = (): ReadonlyArray<{ path: string; content: string }> => [
  {
    path: join(homedir(), ".cursor", "skills", "agent-delivery", "SKILL.md"),
    content: managerEntrypoint,
  },
  {
    path: join(homedir(), ".cursor", "skills", "shape-linear-ticket", "SKILL.md"),
    content: ticketShapingSkill,
  },
  {
    path: join(homedir(), ".codex", "skills", "shape-linear-ticket", "SKILL.md"),
    content: ticketShapingSkill,
  },
  {
    path: join(homedir(), ".claude", "skills", "shape-linear-ticket", "SKILL.md"),
    content: ticketShapingSkill,
  },
  {
    path: join(homedir(), ".cursor", "rules", "shape-linear-ticket.mdc"),
    content: ticketShapingSkill,
  },
  {
    path: join(homedir(), ".codex", "skills", "agent-delivery", "SKILL.md"),
    content: managerEntrypoint,
  },
  {
    path: join(homedir(), ".claude", "skills", "agent-delivery", "SKILL.md"),
    content: managerEntrypoint,
  },
  {
    path: join(homedir(), ".cursor", "rules", "agent-delivery.mdc"),
    content: managerRuleEntrypoint,
  },
];

const manifestPayload = (manifest: PreviousInstallManifest): unknown =>
  manifest.schemaVersion === 1
    ? {
        schemaVersion: manifest.schemaVersion,
        version: manifest.version,
        installedAt: manifest.installedAt,
        cliFile: manifest.cliFile,
        coreFiles: manifest.coreFiles,
        adapterFiles: manifest.adapterFiles,
      }
    : {
        schemaVersion: manifest.schemaVersion,
        version: manifest.version,
        installedAt: manifest.installedAt,
        cliFile: manifest.cliFile,
        commandFile: manifest.commandFile,
        commandDigest: manifest.commandDigest,
        coreFiles: manifest.coreFiles,
        adapterFiles: manifest.adapterFiles,
      };

const readManifest = (path: string): PreviousInstallManifest | null => {
  if (!existsSync(path)) return null;
  const value: unknown = JSON.parse(readFileSync(path, "utf8"));
  const current = installManifestSchema.safeParse(value);
  const manifest = current.success ? current.data : legacyInstallManifestSchema.parse(value);
  if (manifest.manifestDigest !== digestJson(manifestPayload(manifest)))
    throw new DeliveryError("Managed installation manifest failed integrity verification");
  return manifest;
};

const writeAtomic = ({
  path,
  content,
  mode = 0o600,
}: {
  path: string;
  content: string | Buffer;
  mode?: number;
}): void => {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const temporaryPath = `${path}.${process.pid}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temporaryPath, content, { mode });
    chmodSync(temporaryPath, mode);
    renameSync(temporaryPath, path);
  } finally {
    rmSync(temporaryPath, { force: true });
  }
};

const adapterDigest = (content: string): string =>
  createHash("sha256").update(content).digest("hex");

function preflightAdapters({
  files,
  previous,
}: {
  files: ManagedFile[];
  previous: PreviousInstallManifest | null;
}): void {
  const previousFiles = new Map(
    (previous?.adapterFiles ?? []).map((file) => [resolve(file.path), file.digest]),
  );
  for (const file of files) {
    const path = resolve(file.path);
    if (!existsSync(path)) continue;
    const expectedDigest = previousFiles.get(path);
    if (expectedDigest === undefined || fileDigest(path) !== expectedDigest)
      throw new DeliveryError(`Refusing to overwrite an unknown or locally changed managed file`);
  }
}

function preflightCommand({
  file,
  previous,
}: {
  file: ManagedFile;
  previous: PreviousInstallManifest | null;
}): void {
  const path = resolve(file.path);
  if (!existsSync(path)) return;
  if (
    previous?.schemaVersion !== 2 ||
    resolve(previous.commandFile) !== path ||
    fileDigest(path) !== previous.commandDigest
  )
    throw new DeliveryError("Refusing to overwrite an unknown or locally changed delivery command");
}

function updateManagedFiles({ files }: { files: ManagedFile[] }): ManagedFileBackup[] {
  const backups = files.map((file) => ({
    path: resolve(file.path),
    content: existsSync(file.path) ? readFileSync(file.path) : null,
    mode: file.mode,
  }));
  try {
    for (const file of files)
      writeAtomic({ path: resolve(file.path), content: file.content, mode: file.mode });
    return backups;
  } catch (error) {
    restoreManagedFiles(backups);
    throw error;
  }
}

function restoreManagedFiles(backups: ManagedFileBackup[]): void {
  for (const backup of backups) {
    if (backup.content === null) {
      if (existsSync(backup.path)) rmSync(backup.path, { force: true });
    } else writeAtomic({ path: backup.path, content: backup.content, mode: backup.mode });
  }
}

const shellQuote = (value: string): string => `'${value.replaceAll("'", `'"'"'`)}'`;

const commandFileContent = ({
  nodeBinary,
  cliFile,
}: {
  nodeBinary: string;
  cliFile: string;
}): string => `#!/bin/sh\nexec ${shellQuote(nodeBinary)} ${shellQuote(cliFile)} "$@"\n`;

export function installNodeDependencies({
  directory,
  nodeBinary = process.execPath,
  npmExecutable = "npm",
  run = runStagedCommand,
}: {
  directory: string;
  nodeBinary?: string;
  npmExecutable?: string;
  run?: StagedCommandRunner;
}): void {
  run(npmExecutable, ["ci", "--omit=dev"], { cwd: directory, stdio: "pipe" });
  run(
    nodeBinary,
    [
      "--input-type=module",
      "--eval",
      "const {default: Database}=await import('better-sqlite3');const db=new Database(':memory:');db.close();",
    ],
    { cwd: directory, stdio: "pipe" },
  );
  const helpOutput = run(nodeBinary, [join(directory, "dist", "cli.js"), "help"], {
    cwd: directory,
    stdio: "pipe",
  });
  const help = z.object({ usage: z.string().min(1) }).parse(JSON.parse(String(helpOutput)));
  if (!help.usage.includes("delivery install"))
    throw new DeliveryError("Staged CLI did not report the managed install command");
}

const verifyCoreFiles = ({
  root,
  files,
}: {
  root: string;
  files: ReadonlyArray<{ relativePath: string; digest: string }>;
}): void => {
  for (const file of files) {
    const path = join(root, file.relativePath);
    if (!existsSync(path) || fileDigest(path) !== file.digest)
      throw new DeliveryError("Staged managed file failed digest verification");
  }
};

export function installManagedDistribution({
  sourceRoot,
  managedRoot = defaultManagedRoot(),
  adapterFiles = defaultAdapterFiles(),
  commandFile = join(homedir(), ".local", "bin", "delivery"),
  nodeBinary = process.execPath,
  installDependencies,
}: {
  sourceRoot: string;
  managedRoot?: string;
  adapterFiles?: ReadonlyArray<{ path: string; content: string }>;
  commandFile?: string;
  nodeBinary?: string;
  installDependencies?: (directory: string) => void;
}): InstallManifest {
  if (!isAbsolute(nodeBinary)) throw new DeliveryError("Managed Node binary must be absolute");
  const root = resolve(managedRoot);
  const currentPath = join(root, "current.json");
  const previous = readManifest(currentPath);
  const managedAdapters = adapterFiles.map((file) => ({ ...file, mode: 0o600 }));
  preflightAdapters({ files: managedAdapters, previous });
  const files = collectPortableFiles({ sourceRoot });
  const version = digestJson(
    files.map((file) => ({ path: file.relativePath, digest: file.digest, size: file.size })),
  );
  const stagingRoot = join(root, "staging", randomUUID());
  const versionRoot = join(root, "versions", version);
  const cliFile = join(versionRoot, "dist", "cli.js");
  const command = {
    path: resolve(commandFile),
    content: commandFileContent({ nodeBinary: resolve(nodeBinary), cliFile }),
    mode: 0o755,
  };
  preflightCommand({ file: command, previous });
  let createdVersion = false;
  if (existsSync(versionRoot)) {
    if (previous?.version !== version)
      throw new DeliveryError("Refusing to replace an unowned managed version directory");
    verifyCoreFiles({ root: versionRoot, files });
  } else {
    mkdirSync(stagingRoot, { recursive: true, mode: 0o700 });
    try {
      copyDistributionFiles({ files, destinationRoot: stagingRoot });
      verifyCoreFiles({ root: stagingRoot, files });
      if (!existsSync(join(stagingRoot, "dist", "cli.js")))
        throw new DeliveryError("Managed installation requires a built CLI");
      installDependencies?.(stagingRoot);
      verifyCoreFiles({ root: stagingRoot, files });
      mkdirSync(dirname(versionRoot), { recursive: true, mode: 0o700 });
      renameSync(stagingRoot, versionRoot);
      createdVersion = true;
    } catch (error) {
      rmSync(stagingRoot, { recursive: true, force: true });
      throw error;
    }
  }
  let managedFileBackups: ManagedFileBackup[] = [];
  try {
    managedFileBackups = updateManagedFiles({ files: [...managedAdapters, command] });
    const payload = {
      schemaVersion: 2,
      version,
      installedAt: new Date().toISOString(),
      cliFile,
      commandFile: command.path,
      commandDigest: adapterDigest(command.content),
      coreFiles: files.map((file) => ({ path: file.relativePath, digest: file.digest })),
      adapterFiles: managedAdapters.map((file) => ({
        path: resolve(file.path),
        digest: adapterDigest(file.content),
      })),
    };
    const manifest = installManifestSchema.parse({
      ...payload,
      manifestDigest: digestJson(payload),
    });
    writeAtomic({ path: currentPath, content: `${JSON.stringify(manifest, null, 2)}\n` });
    return manifest;
  } catch (error) {
    restoreManagedFiles(managedFileBackups);
    if (createdVersion) rmSync(versionRoot, { recursive: true, force: true });
    throw error;
  }
}

export async function upgradeManagedDistribution({
  sourceRoot,
  configPath,
  stateDatabasePath,
  pause,
  activeProcessCount,
  backupDatabase,
  managedRoot = defaultManagedRoot(),
  adapterFiles = defaultAdapterFiles(),
  commandFile = join(homedir(), ".local", "bin", "delivery"),
  nodeBinary = process.execPath,
  installDependencies,
}: {
  sourceRoot: string;
  configPath: string;
  stateDatabasePath: string;
  pause: () => void;
  activeProcessCount: () => number;
  backupDatabase: (destination: string) => Promise<void>;
  managedRoot?: string;
  adapterFiles?: ReadonlyArray<{ path: string; content: string }>;
  commandFile?: string;
  nodeBinary?: string;
  installDependencies?: (directory: string) => void;
}): Promise<{ manifest: InstallManifest; backupDirectory: string }> {
  pause();
  if (activeProcessCount() > 0)
    throw new DeliveryError("Upgrade refused because runtime processes are still active");
  if (resolve(configPath) === resolve(stateDatabasePath))
    throw new DeliveryError("Configuration and state database must be distinct files");
  const backupDirectory = join(
    resolve(managedRoot),
    "backups",
    `${new Date().toISOString().replaceAll(":", "-")}-${randomUUID()}`,
  );
  mkdirSync(backupDirectory, { recursive: true, mode: 0o700 });
  const configBackup = join(backupDirectory, "config.json");
  const databaseBackup = join(backupDirectory, "state.sqlite");
  try {
    copyFileSync(configPath, configBackup);
    chmodSync(configBackup, 0o600);
    await backupDatabase(databaseBackup);
    chmodSync(databaseBackup, 0o600);
    const backupPayload = {
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
      config: { file: "config.json", digest: fileDigest(configBackup) },
      state: { file: "state.sqlite", digest: fileDigest(databaseBackup) },
    };
    writeAtomic({
      path: join(backupDirectory, "BACKUP-MANIFEST.json"),
      content: `${JSON.stringify(
        { ...backupPayload, manifestDigest: digestJson(backupPayload) },
        null,
        2,
      )}\n`,
    });
  } catch (error) {
    rmSync(backupDirectory, { recursive: true, force: true });
    throw error;
  }
  const manifest = installManagedDistribution({
    sourceRoot,
    managedRoot,
    adapterFiles,
    commandFile,
    nodeBinary,
    ...(installDependencies === undefined ? {} : { installDependencies }),
  });
  return { manifest, backupDirectory };
}

export function currentManagedInstallation({
  managedRoot = defaultManagedRoot(),
}: {
  managedRoot?: string;
} = {}): PreviousInstallManifest | null {
  return readManifest(join(resolve(managedRoot), "current.json"));
}
