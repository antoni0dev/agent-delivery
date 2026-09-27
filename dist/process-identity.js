import { execFileSync } from "node:child_process";
export function processIdentity(pid) {
    try {
        const identity = execFileSync("/bin/ps", ["-p", String(pid), "-o", "lstart="], {
            encoding: "utf8",
            timeout: 5000,
            stdio: ["ignore", "pipe", "ignore"],
        }).trim();
        return identity.length === 0 ? null : identity;
    }
    catch (error) {
        if (error instanceof Error && "status" in error && error.status === 1)
            return null;
        throw new Error("Cannot verify process identity");
    }
}
export function sameProcess({ pid, identity }) {
    return identity !== null && processIdentity(pid) === identity;
}
export async function terminateRecordedProcess({ pid, identity, }) {
    const groupAlive = () => {
        try {
            process.kill(-pid, 0);
            return true;
        }
        catch (error) {
            return !(error instanceof Error && "code" in error && error.code === "ESRCH");
        }
    };
    if (!groupAlive())
        return true;
    if (!sameProcess({ pid, identity }))
        return false;
    for (const signal of ["SIGTERM", "SIGKILL"]) {
        try {
            process.kill(-pid, signal);
        }
        catch { }
        const deadline = Date.now() + 2000;
        while (groupAlive() && Date.now() < deadline)
            await new Promise((done) => setTimeout(done, 25));
        if (!groupAlive())
            return true;
    }
    return false;
}
