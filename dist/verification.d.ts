import { z } from "zod";
import type { Project } from "./config.js";
import { type Requirement } from "./domain.js";
export declare const journeyReportSchema: z.ZodObject<{
    head: z.ZodString;
    environment: z.ZodString;
    authentication: z.ZodEnum<{
        fixture: "fixture";
        none: "none";
        real: "real";
    }>;
    production: z.ZodBoolean;
    mainnet: z.ZodBoolean;
    tests: z.ZodArray<z.ZodObject<{
        requirementId: z.ZodString;
        status: z.ZodEnum<{
            failed: "failed";
            passed: "passed";
            skipped: "skipped";
        }>;
        assertions: z.ZodNumber;
        proof: z.ZodNullable<z.ZodString>;
        chainId: z.ZodNullable<z.ZodNumber>;
        destinationVerified: z.ZodBoolean;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare function verifyJourneys({ project, head, requirements, report, }: {
    project: Project;
    head: string;
    requirements: Requirement[];
    report: unknown;
}): void;
