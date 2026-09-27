import { z } from "zod";
import { DeliveryError } from "./domain.js";
export const journeyReportSchema = z
    .object({
    head: z.string(),
    environment: z.string(),
    authentication: z.enum(["none", "fixture", "real"]),
    production: z.boolean(),
    mainnet: z.boolean(),
    tests: z.array(z
        .object({
        requirementId: z.string(),
        status: z.enum(["passed", "failed", "skipped"]),
        assertions: z.number().int().nonnegative(),
        proof: z.string().nullable(),
        chainId: z.number().int().nullable(),
        destinationVerified: z.boolean(),
    })
        .strict()),
})
    .strict();
export function verifyJourneys({ project, head, requirements, report, }) {
    const parsed = journeyReportSchema.parse(report);
    if (parsed.head !== head ||
        parsed.environment !== project.environment.name ||
        parsed.production ||
        parsed.mainnet)
        throw new DeliveryError("Journey report targets another candidate or unsafe environment");
    for (const requirement of requirements) {
        const tests = parsed.tests.filter((entry) => entry.requirementId === requirement.id);
        if (tests.length === 0 ||
            tests.some((entry) => entry.status !== "passed" || entry.assertions === 0))
            throw new DeliveryError(`Journey ${requirement.id} is missing, skipped, empty or failing`);
        if (["authenticated", "nonproduction-write"].includes(requirement.kind) &&
            parsed.authentication !== "real")
            throw new DeliveryError("Fixture authentication cannot prove a real authenticated journey");
        if (tests.some((entry) => entry.chainId !== null && !project.environment.allowedChainIds.includes(entry.chainId)))
            throw new DeliveryError("Report contains an unapproved chain");
        if (requirement.kind === "nonproduction-write") {
            if (project.environment.mutations !== "non-production")
                throw new DeliveryError("Real write testing is not enabled for this destination");
            if (tests.some((entry) => entry.proof === null || !entry.destinationVerified))
                throw new DeliveryError("Write outcome lacks authoritative proof or target verification");
            if (project.environment.allowedChainIds.length > 0 &&
                tests.some((entry) => entry.chainId === null || !project.environment.allowedChainIds.includes(entry.chainId)))
                throw new DeliveryError("Write used an unapproved chain");
        }
    }
}
