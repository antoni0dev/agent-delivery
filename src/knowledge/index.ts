/// <reference types="node" />

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

export {
  evaluateKnowledgeDecision,
  KnowledgeDecisionExpectationSchema,
  KnowledgeDecisionOutputSchema,
} from "./evaluation.js";

const CardInputSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  topics: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)).min(1),
  content: z.string().min(120),
});

const CardsFileSchema = z.object({
  schemaVersion: z.literal(1),
  cards: z.array(CardInputSchema).min(1),
});

const SourceUnitSchema = z.object({
  id: z.string(),
  kind: z.string(),
  digest: z.string().regex(/^[a-f0-9]{64}$/),
  inspection: z.enum(["ocr-inspected", "unexamined"]).optional(),
  page: z.number().int().positive().optional(),
});

const SourceSchema = z.object({
  id: z.string().regex(/^source-[0-9]{2}$/),
  format: z.string(),
  digest: z.string().regex(/^[a-f0-9]{64}$/),
  counts: z.record(z.string(), z.number().int().nonnegative()),
  units: z.array(SourceUnitSchema),
});

const SnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  sources: z.array(SourceSchema).min(1),
  snapshotDigest: z.string().regex(/^[a-f0-9]{64}$/),
});

const CoverageUnitSchema = z.object({
  unitId: z.string(),
  disposition: z.enum([
    "incorporated",
    "covered",
    "reconciled",
    "superseded",
    "excluded",
    "pending",
  ]),
  cardIds: z.array(z.string()),
  reasonCategory: z
    .enum([
      "derived-guidance",
      "reviewed-guidance",
      "reconciled-guidance",
      "dated-guidance",
      "supporting-evidence",
      "visual-evidence",
      "mixed-eligibility",
      "duplicate-guidance",
      "private-specific",
      "unclear-eligibility",
      "non-normative",
      "format-only",
    ])
    .optional(),
});

const CoverageSchema = z.object({
  schemaVersion: z.literal(1),
  sourceSnapshotDigest: z.string().regex(/^[a-f0-9]{64}$/),
  units: z.array(CoverageUnitSchema),
});

const TopicsSchema = z.object({
  schemaVersion: z.literal(1),
  topics: z.record(z.string(), z.array(z.string())),
});

const ReleaseSchema = z.object({
  schemaVersion: z.literal(1),
  curatorId: z.string().min(1),
  sourceSnapshotDigest: z.string().regex(/^[a-f0-9]{64}$/),
  cardSetDigest: z.string().regex(/^[a-f0-9]{64}$/),
  coverageDigest: z.string().regex(/^[a-f0-9]{64}$/),
  topicIndexDigest: z.string().regex(/^[a-f0-9]{64}$/),
});

const AuditSchema = z.object({
  schemaVersion: z.literal(1),
  producer: z.object({
    kind: z.literal("independent"),
    id: z.string().min(1),
  }),
  method: z.literal("fresh-coverage-audit"),
  decision: z.literal("approved"),
  sourceSnapshotDigest: z.string().regex(/^[a-f0-9]{64}$/),
  cardSetDigest: z.string().regex(/^[a-f0-9]{64}$/),
  coverageDigest: z.string().regex(/^[a-f0-9]{64}$/),
  topicIndexDigest: z.string().regex(/^[a-f0-9]{64}$/),
  auditDigest: z.string().regex(/^[a-f0-9]{64}$/),
});

type CardInput = z.infer<typeof CardInputSchema>;
type Snapshot = z.infer<typeof SnapshotSchema>;
type Coverage = z.infer<typeof CoverageSchema>;
type Audit = z.infer<typeof AuditSchema>;

export type KnowledgeCard = CardInput & { digest: string };

export type LoadedKnowledge = {
  digest: string;
  complete: boolean;
  cards: KnowledgeCard[];
  sourceSnapshotDigest: string;
  coverage: {
    total: number;
    pending: number;
    excluded: number;
    incorporated: number;
    covered: number;
    reconciled: number;
    superseded: number;
  };
  audit: "approved" | "missing";
};

export type SelectedKnowledge = {
  releaseDigest: string;
  complete: boolean;
  cards: KnowledgeCard[];
};

type VerificationState = LoadedKnowledge & { errors: string[] };

function stableJson(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("Cannot digest a non-finite number");
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(",")}}`;
  }
  throw new Error(`Unsupported digest value: ${typeof value}`);
}

function digestValue(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function parseFile<T>({ path, schema }: { path: string; schema: z.ZodType<T> }): T {
  return schema.parse(JSON.parse(readFileSync(path, "utf8")));
}

function cardDigest(card: CardInput): string {
  return digestValue({ content: card.content, id: card.id, topics: card.topics });
}

function cardSetDigest(cards: KnowledgeCard[]): string {
  return digestValue(cards.map(({ digest, id }) => ({ digest, id })));
}

function snapshotPayload(snapshot: Snapshot): unknown {
  return { schemaVersion: snapshot.schemaVersion, sources: snapshot.sources };
}

function coveragePayload(coverage: Coverage): unknown {
  return {
    schemaVersion: coverage.schemaVersion,
    sourceSnapshotDigest: coverage.sourceSnapshotDigest,
    units: coverage.units,
  };
}

function topicIndexPayload(topics: z.infer<typeof TopicsSchema>): unknown {
  return { schemaVersion: topics.schemaVersion, topics: topics.topics };
}

function auditPayload(audit: Audit): unknown {
  return {
    schemaVersion: audit.schemaVersion,
    producer: audit.producer,
    method: audit.method,
    decision: audit.decision,
    sourceSnapshotDigest: audit.sourceSnapshotDigest,
    cardSetDigest: audit.cardSetDigest,
    coverageDigest: audit.coverageDigest,
    topicIndexDigest: audit.topicIndexDigest,
  };
}

function expectedTopicIndex(cards: KnowledgeCard[]): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const card of cards) {
    for (const topic of card.topics) {
      const existing = result[topic] ?? [];
      result[topic] = [...existing, card.id];
    }
  }
  return Object.fromEntries(
    Object.entries(result).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function readAudit({
  knowledgeRoot,
  errors,
}: {
  knowledgeRoot: string;
  errors: string[];
}): Audit | undefined {
  const path = join(knowledgeRoot, "audit.json");
  if (!existsSync(path)) {
    return undefined;
  }
  try {
    return parseFile({ path, schema: AuditSchema });
  } catch (error) {
    errors.push(`audit.json is invalid: ${String(error)}`);
    return undefined;
  }
}

function inspectKnowledge(root: string): VerificationState {
  const knowledgeRoot = join(root, "knowledge");
  const errors: string[] = [];
  const cardsFile = parseFile({ path: join(knowledgeRoot, "cards.json"), schema: CardsFileSchema });
  const snapshot = parseFile({
    path: join(knowledgeRoot, "source-snapshot.json"),
    schema: SnapshotSchema,
  });
  const coverage = parseFile({
    path: join(knowledgeRoot, "coverage.json"),
    schema: CoverageSchema,
  });
  const topics = parseFile({ path: join(knowledgeRoot, "topics.json"), schema: TopicsSchema });
  const release = parseFile({ path: join(knowledgeRoot, "release.json"), schema: ReleaseSchema });
  const cards = cardsFile.cards.map((card) => ({ ...card, digest: cardDigest(card) }));

  const ids = new Set<string>();
  for (const card of cards) {
    if (ids.has(card.id)) {
      errors.push(`Duplicate card id: ${card.id}`);
    }
    ids.add(card.id);
    if (new Set(card.topics).size !== card.topics.length) {
      errors.push(`Card has duplicate topics: ${card.id}`);
    }
  }

  const actualSnapshotDigest = digestValue(snapshotPayload(snapshot));
  if (snapshot.snapshotDigest !== actualSnapshotDigest) {
    errors.push("Source snapshot content does not match snapshotDigest");
  }
  if (
    release.sourceSnapshotDigest !== snapshot.snapshotDigest ||
    coverage.sourceSnapshotDigest !== snapshot.snapshotDigest
  ) {
    errors.push("Release or coverage is bound to a different source snapshot");
  }

  const actualCardSetDigest = cardSetDigest(cards);
  if (release.cardSetDigest !== actualCardSetDigest) {
    errors.push("Card content does not match the released cardSetDigest");
  }
  const actualCoverageDigest = digestValue(coveragePayload(coverage));
  if (release.coverageDigest !== actualCoverageDigest) {
    errors.push("Coverage content does not match the released coverageDigest");
  }
  const actualTopicIndexDigest = digestValue(topicIndexPayload(topics));
  if (release.topicIndexDigest !== actualTopicIndexDigest) {
    errors.push("Topic index does not match the released topicIndexDigest");
  }

  const expectedTopics = expectedTopicIndex(cards);
  if (stableJson(topics.topics) !== stableJson(expectedTopics)) {
    errors.push("Topic index is not an exact projection of card topics");
  }

  const snapshotUnits = new Map(
    snapshot.sources.flatMap((source) => source.units.map((unit) => [unit.id, unit])),
  );
  const coverageIds = new Set<string>();
  for (const unit of coverage.units) {
    if (coverageIds.has(unit.unitId)) {
      errors.push(`Duplicate coverage unit: ${unit.unitId}`);
    }
    coverageIds.add(unit.unitId);
    const sourceUnit = snapshotUnits.get(unit.unitId);
    if (sourceUnit === undefined) {
      errors.push(`Coverage references an unknown source unit: ${unit.unitId}`);
    }
    for (const id of unit.cardIds) {
      if (!ids.has(id)) {
        errors.push(`Coverage references an unknown card: ${id}`);
      }
    }
    const requiresCards =
      unit.disposition === "incorporated" ||
      unit.disposition === "covered" ||
      unit.disposition === "reconciled" ||
      unit.disposition === "superseded";
    if (requiresCards && unit.cardIds.length === 0) {
      errors.push(`Coverage unit has no linked cards: ${unit.unitId}`);
    }
    if (
      (unit.disposition === "excluded" || unit.disposition === "pending") &&
      unit.cardIds.length > 0
    ) {
      errors.push(`Excluded or pending unit links cards: ${unit.unitId}`);
    }
    if (unit.disposition === "excluded" && unit.reasonCategory === undefined) {
      errors.push(`Excluded unit lacks a reason category: ${unit.unitId}`);
    }
    if (
      sourceUnit?.kind === "image" &&
      sourceUnit.inspection !== "ocr-inspected" &&
      unit.disposition !== "pending"
    ) {
      errors.push(`Unexamined image has a final disposition: ${unit.unitId}`);
    }
    if (
      sourceUnit?.kind === "image" &&
      unit.disposition !== "pending" &&
      (unit.disposition !== "covered" || unit.reasonCategory !== "visual-evidence")
    ) {
      errors.push(`Image lacks a visual-review coverage disposition: ${unit.unitId}`);
    }
  }
  for (const id of snapshotUnits.keys()) {
    if (!coverageIds.has(id)) {
      errors.push(`Source unit is missing coverage: ${id}`);
    }
  }

  const pending = coverage.units.filter((unit) => unit.disposition === "pending").length;
  const excluded = coverage.units.filter((unit) => unit.disposition === "excluded").length;
  const incorporated = coverage.units.filter((unit) => unit.disposition === "incorporated").length;
  const covered = coverage.units.filter((unit) => unit.disposition === "covered").length;
  const reconciled = coverage.units.filter((unit) => unit.disposition === "reconciled").length;
  const superseded = coverage.units.filter((unit) => unit.disposition === "superseded").length;
  const audit = readAudit({ knowledgeRoot, errors });
  let auditApproved = false;
  if (audit !== undefined) {
    if (audit.producer.id === release.curatorId) {
      errors.push("Coverage audit producer must be independent from the curator");
    }
    if (audit.auditDigest !== digestValue(auditPayload(audit))) {
      errors.push("Audit content does not match auditDigest");
    }
    if (
      audit.sourceSnapshotDigest !== release.sourceSnapshotDigest ||
      audit.cardSetDigest !== release.cardSetDigest ||
      audit.coverageDigest !== release.coverageDigest ||
      audit.topicIndexDigest !== release.topicIndexDigest
    ) {
      errors.push("Audit is bound to a different release");
    }
    auditApproved = errors.length === 0;
  }

  const digest = digestValue({
    cardSetDigest: actualCardSetDigest,
    coverageDigest: actualCoverageDigest,
    sourceSnapshotDigest: actualSnapshotDigest,
    topicIndexDigest: actualTopicIndexDigest,
  });
  return {
    digest,
    complete: errors.length === 0 && pending === 0 && auditApproved,
    cards,
    sourceSnapshotDigest: snapshot.snapshotDigest,
    coverage: {
      total: coverage.units.length,
      pending,
      excluded,
      incorporated,
      covered,
      reconciled,
      superseded,
    },
    audit: auditApproved ? "approved" : "missing",
    errors,
  };
}

export function loadKnowledge({ root }: { root: string }): LoadedKnowledge {
  const result = inspectKnowledge(root);
  if (result.errors.length > 0) {
    throw new Error(`Knowledge verification failed:\n${result.errors.join("\n")}`);
  }
  const { errors: _errors, ...loaded } = result;
  return loaded;
}

export function selectKnowledge({
  root,
  topics,
}: {
  root: string;
  topics: string[];
}): SelectedKnowledge {
  const loaded = loadKnowledge({ root });
  const requested = new Set(topics);
  return {
    releaseDigest: loaded.digest,
    complete: loaded.complete,
    cards: loaded.cards.filter((card) => card.topics.some((topic) => requested.has(topic))),
  };
}

export function verifyKnowledge({ root }: { root: string }): { passed: boolean; errors: string[] } {
  try {
    const result = inspectKnowledge(root);
    return { passed: result.errors.length === 0, errors: result.errors };
  } catch (error) {
    return { passed: false, errors: [String(error)] };
  }
}
