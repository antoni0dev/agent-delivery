import { z } from "zod";
export const KnowledgeDecisionOutputSchema = z.object({
    decisionCode: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    appliedCardIds: z.array(z.string()),
    rejectedPatternCodes: z.array(z.string()),
    rationale: z.string().min(40),
});
export const KnowledgeDecisionExpectationSchema = z.object({
    expectedDecisionCode: z.string(),
    requiredCardIds: z.array(z.string()),
    forbiddenCardIds: z.array(z.string()),
    requiredRejectedPatterns: z.array(z.string()),
});
export function evaluateKnowledgeDecision({ output, expectation, availableCardIds, }) {
    const parsed = KnowledgeDecisionOutputSchema.safeParse(output);
    if (!parsed.success) {
        return { passed: false, errors: [z.prettifyError(parsed.error)] };
    }
    const errors = [];
    if (parsed.data.decisionCode !== expectation.expectedDecisionCode) {
        errors.push(`Expected decision ${expectation.expectedDecisionCode}, received ${parsed.data.decisionCode}`);
    }
    if (new Set(parsed.data.appliedCardIds).size !== parsed.data.appliedCardIds.length) {
        errors.push("appliedCardIds contains duplicates");
    }
    const applied = new Set(parsed.data.appliedCardIds);
    const available = new Set(availableCardIds);
    for (const cardId of applied) {
        if (!available.has(cardId)) {
            errors.push(`Card was not present in selected context: ${cardId}`);
        }
    }
    for (const cardId of expectation.requiredCardIds) {
        if (!applied.has(cardId)) {
            errors.push(`Required card was not applied: ${cardId}`);
        }
    }
    for (const cardId of expectation.forbiddenCardIds) {
        if (applied.has(cardId)) {
            errors.push(`Inapplicable card was applied: ${cardId}`);
        }
    }
    const rejected = new Set(parsed.data.rejectedPatternCodes);
    for (const pattern of expectation.requiredRejectedPatterns) {
        if (!rejected.has(pattern)) {
            errors.push(`Required rejected pattern was omitted: ${pattern}`);
        }
    }
    return { passed: errors.length === 0, errors };
}
