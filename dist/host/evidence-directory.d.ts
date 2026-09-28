import { type Profile } from "../domain.js";
/** Proofs belong to one workspace; linked caches can invalidate unrelated dispatches. */
export declare function evidenceDirectory({ stateDirectory, kind, profile, access, }: {
    stateDirectory: string;
    kind: "behavior" | "conformance";
    profile: Profile;
    access?: "read" | "write";
}): string;
