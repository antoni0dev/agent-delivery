import { z } from "zod";
export { evaluateKnowledgeDecision, KnowledgeDecisionExpectationSchema, KnowledgeDecisionOutputSchema, } from "./evaluation.js";
declare const CardInputSchema: z.ZodObject<{
    id: z.ZodString;
    topics: z.ZodArray<z.ZodString>;
    content: z.ZodString;
}, z.core.$strip>;
type CardInput = z.infer<typeof CardInputSchema>;
export type KnowledgeCard = CardInput & {
    digest: string;
};
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
export declare function loadKnowledge({ root }: {
    root: string;
}): LoadedKnowledge;
export declare function selectKnowledge({ root, topics, }: {
    root: string;
    topics: string[];
}): SelectedKnowledge;
export declare function verifyKnowledge({ root }: {
    root: string;
}): {
    passed: boolean;
    errors: string[];
};
