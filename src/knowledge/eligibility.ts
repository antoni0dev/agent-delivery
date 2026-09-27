import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { sha256 } from "../config.js";
import { DeliveryError } from "../domain.js";
import { loadKnowledge } from "./index.js";

const eligibilitySchema = z
  .object({
    schemaVersion: z.literal(1),
    decision: z.literal("approved"),
    knowledgeDigest: z.string(),
    sourceSnapshotDigest: z.string(),
    registryDigest: z.string().length(64),
    basis: z.enum(["owner-attestation", "verified-public-permission"]),
    evidenceDigest: z.string().length(64),
    digest: z.string().length(64),
  })
  .strict();
export function readKnowledgeEligibility({ root }: { root: string }): { digest: string } {
  const path = join(root, "knowledge", "eligibility.json");
  if (!existsSync(path))
    throw new DeliveryError(
      "Source permitted-use review is unresolved; semantic coverage alone cannot authorize activation or export",
    );
  const receipt = eligibilitySchema.parse(JSON.parse(readFileSync(path, "utf8")));
  const { digest, ...payload } = receipt;
  const knowledge = loadKnowledge({ root });
  if (
    sha256(JSON.stringify(payload)) !== digest ||
    receipt.knowledgeDigest !== knowledge.digest ||
    receipt.sourceSnapshotDigest !== knowledge.sourceSnapshotDigest
  )
    throw new DeliveryError("Source eligibility approval is stale or has invalid integrity");
  return { digest };
}
