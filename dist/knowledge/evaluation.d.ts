import { z } from "zod";
export declare const KnowledgeDecisionOutputSchema: z.ZodObject<{
    decisionCode: z.ZodString;
    appliedCardIds: z.ZodArray<z.ZodString>;
    rejectedPatternCodes: z.ZodArray<z.ZodString>;
    rationale: z.ZodString;
}, z.core.$strip>;
export declare const KnowledgeDecisionExpectationSchema: z.ZodObject<{
    expectedDecisionCode: z.ZodString;
    requiredCardIds: z.ZodArray<z.ZodString>;
    forbiddenCardIds: z.ZodArray<z.ZodString>;
    requiredRejectedPatterns: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export type KnowledgeDecisionOutput = z.infer<typeof KnowledgeDecisionOutputSchema>;
export type KnowledgeDecisionExpectation = z.infer<typeof KnowledgeDecisionExpectationSchema>;
export declare function evaluateKnowledgeDecision({ output, expectation, availableCardIds, }: {
    output: unknown;
    expectation: KnowledgeDecisionExpectation;
    availableCardIds: string[];
}): {
    passed: boolean;
    errors: string[];
};
