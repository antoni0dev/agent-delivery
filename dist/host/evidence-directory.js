import { lstatSync, mkdirSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { DeliveryError } from "../domain.js";
/** Proofs belong to one workspace; linked caches can invalidate unrelated dispatches. */
export function evidenceDirectory({ stateDirectory, kind, profile, access = "read", }) {
    const state = resolve(stateDirectory);
    const directory = join(state, kind);
    const directories = kind === "behavior" ? [state, directory, join(directory, "runs")] : [state, directory];
    for (const path of directories) {
        const entry = lstatSync(path, { throwIfNoEntry: false });
        if (entry && (entry.isSymbolicLink() || !entry.isDirectory()))
            throw new DeliveryError(`${kind} evidence requires a workspace-local directory without symlinks; pause and migrate the existing evidence before retrying`, "capability");
    }
    const receipt = lstatSync(join(directory, `${profile}.json`), { throwIfNoEntry: false });
    if (receipt && (!receipt.isFile() || receipt.isSymbolicLink() || receipt.nlink !== 1))
        throw new DeliveryError(`${kind} evidence requires an independent profile proof file, not a symlink or hardlink`, "capability");
    if (access === "write")
        mkdirSync(directory, { recursive: true, mode: 0o700 });
    if (lstatSync(directory, { throwIfNoEntry: false })) {
        const realDirectory = realpathSync(directory);
        if (dirname(realDirectory) !== realpathSync(state))
            throw new DeliveryError(`${kind} evidence must remain inside its workspace state`, "capability");
    }
    return directory;
}
