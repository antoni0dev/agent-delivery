import { z } from "zod";

export const profiles = ["codex", "claude-code", "cursor"] as const;
export const roles = [
  "planner",
  "planCritic",
  "implementer",
  "reviewer",
  "browserVerifier",
] as const;
export const states = [
  "queued",
  "running",
  "waiting",
  "blocked",
  "completed",
  "cancelled",
] as const;
export const stages = [
  "validate",
  "plan",
  "challenge",
  "implement",
  "prepare-qa",
  "review",
  "verify",
  "merge",
  "accept",
] as const;
export type Profile = (typeof profiles)[number];
export type Role = (typeof roles)[number];
export type State = (typeof states)[number];
export type Stage = (typeof stages)[number];
export const MAX_INVOCATION_MS = 60 * 60 * 1000;
export const MAX_PLAN_ROUNDS = 2;
export const MAX_REPAIR_ROUNDS = 2;
export const MAX_NO_PROGRESS = 3;

export const commandSchema = z
  .object({ executable: z.string().min(1), args: z.array(z.string()) })
  .strict();
export type Command = z.infer<typeof commandSchema>;
export const credentialSchema = z.discriminatedUnion("kind", [
  z
    .object({ kind: z.literal("environment"), name: z.string().regex(/^[A-Z][A-Z0-9_]*$/) })
    .strict(),
  z.object({ kind: z.literal("command"), command: commandSchema }).strict(),
]);
export type CredentialReference = z.infer<typeof credentialSchema>;
export const bindingSchema = z
  .object({
    planDigest: z.string().min(1),
    knowledgeDigest: z.string().min(1),
    configDigest: z.string().min(1),
    head: z.string().regex(/^[a-f0-9]{40,64}$/),
    base: z.string().regex(/^[a-f0-9]{40,64}$/),
    environmentDigest: z.string().min(1),
  })
  .strict();
export type Binding = z.infer<typeof bindingSchema>;
export const requirementSchema = z
  .object({
    id: z.string().min(1),
    description: z.string().min(1),
    kind: z.enum([
      "code-review",
      "static",
      "unit",
      "integration",
      "browser",
      "authenticated",
      "nonproduction-write",
      "parent-acceptance",
    ]),
    commandId: z.string().nullable(),
  })
  .strict();
export type Requirement = z.infer<typeof requirementSchema>;
export const planSchema = z
  .object({
    summary: z.string().min(1),
    fullPlan: z.string().min(80),
    sourceOfTruth: z.string().min(1),
    boundaries: z.array(z.string().min(1)).min(1),
    interfaces: z.array(z.string().min(1)),
    decisions: z.array(z.string().min(1)).min(1),
    nonGoals: z.array(z.string()),
    topics: z.array(z.string().min(1)).min(1),
    exceptions: z.array(z.string()),
    requirements: z.array(requirementSchema).min(1),
    children: z.array(
      z
        .object({
          key: z.string().min(1),
          title: z.string().min(1),
          description: z.string().min(1),
          dependencies: z.array(z.string()),
          coupled: z.boolean(),
        })
        .strict(),
    ),
    unresolvedDecisions: z.array(z.string()),
    complexOrMoney: z.boolean(),
  })
  .strict()
  .superRefine((plan, context) => {
    const ids = plan.requirements.map((requirement) => requirement.id);
    if (new Set(ids).size !== ids.length)
      context.addIssue({ code: "custom", message: "Requirement IDs must be unique" });
    const childIds = new Set(plan.children.map((child) => child.key));
    if (childIds.size !== plan.children.length)
      context.addIssue({ code: "custom", message: "Child keys must be unique" });
    const remaining = new Map(
      plan.children.map((child) => [child.key, new Set(child.dependencies)]),
    );
    while (remaining.size > 0) {
      const ready = [...remaining]
        .filter(([, dependencies]) => dependencies.size === 0)
        .map(([key]) => key);
      if (ready.length === 0) {
        context.addIssue({ code: "custom", message: "Child dependencies contain a cycle" });
        break;
      }
      for (const key of ready) {
        remaining.delete(key);
        for (const dependencies of remaining.values()) dependencies.delete(key);
      }
    }
    for (const child of plan.children) {
      if (
        child.dependencies.some(
          (dependency) => !childIds.has(dependency) || dependency === child.key,
        )
      )
        context.addIssue({
          code: "custom",
          message: "Child dependency must name another planned slice",
        });
    }
  });
export type Plan = z.infer<typeof planSchema>;
export const findingSchema = z
  .object({
    impact: z.enum(["main-path", "money", "deferred"]),
    blocking: z.boolean(),
    summary: z.string().min(1),
    evidence: z.string().min(1),
  })
  .strict();
export const reviewSchema = z
  .object({
    summary: z.string(),
    findings: z.array(findingSchema),
    unresolvedDecisions: z.array(z.string()),
  })
  .strict();
export type Review = z.infer<typeof reviewSchema>;
export const issueSchema = z
  .object({
    id: z.string(),
    identifier: z.string(),
    title: z.string(),
    description: z.string(),
    teamId: z.string(),
    projectId: z.string().nullable(),
    assigneeId: z.string().nullable(),
    creatorId: z.string().nullable().optional(),
    stateType: z.string().optional(),
    labels: z.array(z.string()),
    state: z.string(),
    url: z.string(),
  })
  .strict();
export type Issue = z.infer<typeof issueSchema>;

export class DeliveryError extends Error {
  constructor(
    message: string,
    public readonly code = "blocked",
  ) {
    super(message);
    this.name = "DeliveryError";
  }
}

export function ensurePresent<T>(value: T | null | undefined, message: string): T {
  if (value === undefined || value === null) throw new DeliveryError(message);
  return value;
}

export function hasBlockingFindings(review: Review): boolean {
  return (
    review.unresolvedDecisions.length > 0 ||
    review.findings.some((finding) => finding.blocking && finding.impact !== "deferred")
  );
}

export function parseStructuredOutput(output: unknown): unknown {
  if (typeof output !== "string") return output;
  const wrapper = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(output.trim());
  return JSON.parse(wrapper?.[1] ?? output);
}
