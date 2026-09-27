import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { z } from "zod";
import { DeliveryError } from "../domain.js";
import { readKnowledgeEligibility } from "../knowledge/eligibility.js";
import { loadKnowledge } from "../knowledge/index.js";
import { collectPortableFiles, copyDistributionFiles, fileDigest } from "./files.js";

const archiveManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    releaseStatus: z.enum(["complete", "draft-incomplete-knowledge"]),
    eligibilityDigest: z.string().min(1),
    files: z.array(
      z
        .object({ path: z.string().min(1), digest: z.string().length(64), size: z.number() })
        .strict(),
    ),
    manifestDigest: z.string().length(64),
  })
  .strict();

const digestJson = (value: unknown): string =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

const draftOutputPath = (outputPath: string): string => {
  if (outputPath.endsWith(".tar.gz")) return `${outputPath.slice(0, -7)}.draft.tar.gz`;
  return `${outputPath}.draft.tar.gz`;
};

const listFiles = (root: string, current = root): string[] => {
  const files: string[] = [];
  for (const name of readdirSync(current).sort()) {
    const absolute = join(current, name);
    const path = relative(root, absolute);
    const stat = fileKind(absolute);
    if (stat === "directory") files.push(...listFiles(root, absolute));
    else files.push(path);
  }
  return files;
};

const fileKind = (path: string): "directory" | "file" => {
  const entries = readdirSync(dirname(path), { withFileTypes: true });
  const entry = entries.find((candidate) => candidate.name === basename(path));
  if (entry === undefined || entry.isSymbolicLink())
    throw new DeliveryError("Archive verification found an unsafe entry");
  if (entry.isDirectory()) return "directory";
  if (!entry.isFile()) throw new DeliveryError("Archive verification found an unsupported entry");
  return "file";
};

function verifyExtractedArchive({ directory }: { directory: string }): void {
  const manifestPath = join(directory, "EXPORT-MANIFEST.json");
  const manifest = archiveManifestSchema.parse(JSON.parse(readFileSync(manifestPath, "utf8")));
  const payload = {
    schemaVersion: manifest.schemaVersion,
    releaseStatus: manifest.releaseStatus,
    eligibilityDigest: manifest.eligibilityDigest,
    files: manifest.files,
  };
  if (manifest.manifestDigest !== digestJson(payload))
    throw new DeliveryError("Export manifest digest does not match its content");
  const actualFiles = listFiles(directory)
    .filter((path) => path !== "EXPORT-MANIFEST.json")
    .sort();
  const expectedFiles = manifest.files.map((file) => file.path).sort();
  if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles))
    throw new DeliveryError("Archive entries do not match the export manifest");
  for (const file of manifest.files) {
    const path = resolve(directory, file.path);
    if (relative(directory, path).startsWith("..") || fileDigest(path) !== file.digest)
      throw new DeliveryError("Archive file failed digest verification");
  }
}

export function createPortableExport({
  sourceRoot,
  outputPath,
  draft = false,
  privateIdentifiers,
  knowledgeComplete = () => loadKnowledge({ root: sourceRoot }).complete,
  knowledgeEligible = () => readKnowledgeEligibility({ root: sourceRoot }),
}: {
  sourceRoot: string;
  outputPath: string;
  draft?: boolean;
  privateIdentifiers?: string[];
  knowledgeComplete?: () => boolean;
  knowledgeEligible?: () => { digest: string };
}): { path: string; digest: string; releaseStatus: "complete" | "draft-incomplete-knowledge" } {
  const eligibility = knowledgeEligible();
  const complete = knowledgeComplete();
  if (!complete && !draft)
    throw new DeliveryError("Knowledge coverage is incomplete; use --draft for a marked export");
  const releaseStatus = complete ? "complete" : "draft-incomplete-knowledge";
  const finalPath = resolve(!complete ? draftOutputPath(outputPath) : outputPath);
  if (existsSync(finalPath)) throw new DeliveryError("Export output already exists");
  const temporaryDirectory = mkdtempSync(join(tmpdir(), "agent-delivery-export-"));
  const stagingDirectory = join(temporaryDirectory, "content");
  const extractedDirectory = join(temporaryDirectory, "verified");
  const temporaryArchive = join(temporaryDirectory, "archive.tar.gz");
  try {
    mkdirSync(stagingDirectory, { recursive: true, mode: 0o700 });
    const files = collectPortableFiles({
      sourceRoot,
      ...(privateIdentifiers === undefined ? {} : { privateIdentifiers }),
    });
    copyDistributionFiles({ files, destinationRoot: stagingDirectory });
    const manifestPayload = {
      schemaVersion: 1,
      releaseStatus,
      eligibilityDigest: eligibility.digest,
      files: files.map((file) => ({
        path: file.relativePath,
        digest: file.digest,
        size: file.size,
      })),
    };
    const manifest = { ...manifestPayload, manifestDigest: digestJson(manifestPayload) };
    writeFileSync(
      join(stagingDirectory, "EXPORT-MANIFEST.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
      { mode: 0o600 },
    );
    execFileSync("tar", ["-czf", temporaryArchive, "-C", stagingDirectory, "."], {
      stdio: "ignore",
    });
    mkdirSync(extractedDirectory, { recursive: true, mode: 0o700 });
    const entries = execFileSync("tar", ["-tzf", temporaryArchive], { encoding: "utf8" })
      .split("\n")
      .filter((entry) => entry.length > 0);
    if (
      entries.some(
        (entry) =>
          entry.startsWith("/") ||
          entry === ".." ||
          entry.startsWith("../") ||
          entry.includes("/../"),
      )
    )
      throw new DeliveryError("Archive contains a path traversal entry");
    execFileSync("tar", ["-xzf", temporaryArchive, "-C", extractedDirectory], {
      stdio: "ignore",
    });
    verifyExtractedArchive({ directory: extractedDirectory });
    mkdirSync(dirname(finalPath), { recursive: true, mode: 0o700 });
    renameSync(temporaryArchive, finalPath);
    return { path: finalPath, digest: fileDigest(finalPath), releaseStatus };
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}
