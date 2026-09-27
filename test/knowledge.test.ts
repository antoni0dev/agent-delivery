/// <reference types="node" />

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  evaluateKnowledgeDecision,
  KnowledgeDecisionExpectationSchema,
  KnowledgeDecisionOutputSchema,
  loadKnowledge,
  selectKnowledge,
  verifyKnowledge,
} from "../src/knowledge/index.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const FixtureSchema = z.object({
  schemaVersion: z.literal(2),
  cases: z.array(
    z.object({
      id: z.string(),
      phase: z.enum(["planning", "implementation", "review"]),
      topics: z.array(z.string()),
      situation: z.string(),
      expected: KnowledgeDecisionExpectationSchema,
      positiveOutput: KnowledgeDecisionOutputSchema,
      negativeOutput: KnowledgeDecisionOutputSchema,
    }),
  ),
});

function stableJson(value: unknown): string {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    typeof value === "number"
  ) {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(",")}}`;
  }
  throw new Error(`Unsupported value: ${typeof value}`);
}

function digestValue(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function isolatedKnowledgeRoot(): string {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "knowledge-test-"));
  cpSync(join(root, "knowledge"), join(temporaryRoot, "knowledge"), { recursive: true });
  return temporaryRoot;
}

test("loads a verified release without self-certifying completeness", () => {
  assert.deepEqual(verifyKnowledge({ root }), { passed: true, errors: [] });
  const loaded = loadKnowledge({ root });
  assert.equal(loaded.cards.length, 58);
  assert.equal(loaded.coverage.total, 2948);
  assert.equal(loaded.coverage.pending, 0);
  assert.equal(loaded.coverage.excluded, 335);
  assert.equal(loaded.coverage.incorporated, 837);
  assert.equal(loaded.coverage.covered, 118);
  assert.equal(loaded.coverage.reconciled, 1658);
  assert.equal(loaded.coverage.superseded, 0);
  assert.equal(loaded.audit, "approved");
  assert.equal(loaded.complete, true);
});

test("behavior fixtures validate positive outputs and reject negative decisions", () => {
  const fixtures = FixtureSchema.parse(
    JSON.parse(readFileSync(join(root, "knowledge/fixtures/behavior.json"), "utf8")),
  );
  assert.deepEqual(
    new Set(fixtures.cases.map((fixture) => fixture.phase)),
    new Set(["planning", "implementation", "review"]),
  );
  for (const fixture of fixtures.cases) {
    const selected = selectKnowledge({ root, topics: fixture.topics });
    const selectedIds = new Set(selected.cards.map((card) => card.id));
    for (const required of fixture.expected.requiredCardIds) {
      assert.equal(selectedIds.has(required), true, `${fixture.id} omitted ${required}`);
    }
    assert.deepEqual(
      evaluateKnowledgeDecision({
        output: fixture.positiveOutput,
        expectation: fixture.expected,
        availableCardIds: [...selectedIds],
      }),
      {
        passed: true,
        errors: [],
      },
    );
    assert.equal(
      evaluateKnowledgeDecision({
        output: fixture.negativeOutput,
        expectation: fixture.expected,
        availableCardIds: [...selectedIds],
      }).passed,
      false,
    );
  }
});

test("detects a card edit without a matching reviewed release", () => {
  const temporaryRoot = isolatedKnowledgeRoot();
  const path = join(temporaryRoot, "knowledge/cards.json");
  const cards = JSON.parse(readFileSync(path, "utf8"));
  cards.cards[0].content += " Changed after release.";
  writeFileSync(path, JSON.stringify(cards));
  const result = verifyKnowledge({ root: temporaryRoot });
  assert.equal(result.passed, false);
  assert.equal(
    result.errors.some((error) => error.includes("cardSetDigest")),
    true,
  );
});

test("detects a coverage disposition edit without a matching release", () => {
  const temporaryRoot = isolatedKnowledgeRoot();
  const path = join(temporaryRoot, "knowledge/coverage.json");
  const coverage = JSON.parse(readFileSync(path, "utf8"));
  coverage.units[0].disposition = "pending";
  coverage.units[0].cardIds = [];
  writeFileSync(path, JSON.stringify(coverage));
  const result = verifyKnowledge({ root: temporaryRoot });
  assert.equal(result.passed, false);
  assert.equal(
    result.errors.some((error) => error.includes("coverageDigest")),
    true,
  );
});

test("detects a source-unit edit without a matching snapshot", () => {
  const temporaryRoot = isolatedKnowledgeRoot();
  const path = join(temporaryRoot, "knowledge/source-snapshot.json");
  const snapshot = JSON.parse(readFileSync(path, "utf8"));
  snapshot.sources[0].units[0].digest = "0".repeat(64);
  writeFileSync(path, JSON.stringify(snapshot));
  const result = verifyKnowledge({ root: temporaryRoot });
  assert.equal(result.passed, false);
  assert.equal(
    result.errors.some((error) => error.includes("snapshotDigest")),
    true,
  );
});

test("rejects self-produced coverage approval", () => {
  const temporaryRoot = isolatedKnowledgeRoot();
  const release = JSON.parse(readFileSync(join(temporaryRoot, "knowledge/release.json"), "utf8"));
  const payload = {
    schemaVersion: 1,
    producer: { kind: "independent", id: release.curatorId },
    method: "fresh-coverage-audit",
    decision: "approved",
    sourceSnapshotDigest: release.sourceSnapshotDigest,
    cardSetDigest: release.cardSetDigest,
    coverageDigest: release.coverageDigest,
    topicIndexDigest: release.topicIndexDigest,
  };
  writeFileSync(
    join(temporaryRoot, "knowledge/audit.json"),
    JSON.stringify({ ...payload, auditDigest: digestValue(payload) }),
  );
  const result = verifyKnowledge({ root: temporaryRoot });
  assert.equal(result.passed, false);
  assert.equal(
    result.errors.some((error) => error.includes("independent")),
    true,
  );
});

test("accepts an independently produced audit bound to the exact release", () => {
  const temporaryRoot = isolatedKnowledgeRoot();
  const release = JSON.parse(readFileSync(join(temporaryRoot, "knowledge/release.json"), "utf8"));
  const payload = {
    schemaVersion: 1,
    producer: { kind: "independent", id: "fresh-coverage-auditor-v1" },
    method: "fresh-coverage-audit",
    decision: "approved",
    sourceSnapshotDigest: release.sourceSnapshotDigest,
    cardSetDigest: release.cardSetDigest,
    coverageDigest: release.coverageDigest,
    topicIndexDigest: release.topicIndexDigest,
  };
  writeFileSync(
    join(temporaryRoot, "knowledge/audit.json"),
    JSON.stringify({ ...payload, auditDigest: digestValue(payload) }),
  );
  assert.deepEqual(verifyKnowledge({ root: temporaryRoot }), { passed: true, errors: [] });
  assert.equal(loadKnowledge({ root: temporaryRoot }).complete, true);
});

test("tracked knowledge contains no private paths, identities, or source attribution", () => {
  const files = [
    "cards.json",
    "coverage.json",
    "evaluation.md",
    "release.json",
    "source-snapshot.json",
    "topics.json",
    "fixtures/behavior.json",
  ];
  const trackedContent = files
    .map((file) => readFileSync(join(root, "knowledge", file), "utf8"))
    .join("\n");
  assert.doesNotMatch(trackedContent, /\/Users\//);
  assert.doesNotMatch(trackedContent, /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/);
  assert.doesNotMatch(trackedContent, /https?:\/\//);
});
