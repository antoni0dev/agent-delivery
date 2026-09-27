import { chmodSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import Database from "better-sqlite3";
import { z } from "zod";
import { DeliveryError, ensurePresent } from "../domain.js";
import { processIdentity, sameProcess } from "../process-identity.js";
import { processGroupAlive } from "../runtime/process.js";
import { defaultApplicationSupportDirectory } from "./identity.js";

const lockSchema = z.object({
  token: z.string(),
  pid: z.number(),
  identity: z.string(),
  child: z.number().nullable(),
});
// Host coordination contains only process identities, never workspace or ticket data.
export function acquireExecutionLock({
  token,
  path = join(defaultApplicationSupportDirectory(), "execution.sqlite"),
}: {
  token: string;
  path?: string;
}): { started: (pid: number) => void; release: () => void } {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const db = new Database(path);
  chmodSync(path, 0o600);
  db.pragma("busy_timeout = 5000");
  db.exec(
    "CREATE TABLE IF NOT EXISTS execution(slot INTEGER PRIMARY KEY CHECK(slot=1),token TEXT NOT NULL,pid INTEGER NOT NULL,identity TEXT NOT NULL,child INTEGER)",
  );
  try {
    db.transaction(() => {
      const raw = db.prepare("SELECT * FROM execution WHERE slot=1").get();
      if (raw) {
        const lock = lockSchema.parse(raw);
        if (
          sameProcess({ pid: lock.pid, identity: lock.identity }) ||
          (lock.child !== null && processGroupAlive(lock.child))
        )
          throw new DeliveryError("Host build/browser slot is occupied", "capacity");
        db.prepare("DELETE FROM execution WHERE slot=1").run();
      }
      db.prepare("INSERT INTO execution(slot,token,pid,identity) VALUES(1,?,?,?)").run(
        token,
        process.pid,
        ensurePresent(processIdentity(process.pid), "Host process identity unavailable"),
      );
    }).immediate();
  } catch (error) {
    db.close();
    throw error;
  }
  return {
    started: (pid) => {
      const result = db
        .prepare("UPDATE execution SET child=? WHERE slot=1 AND token=?")
        .run(pid, token);
      if (result.changes !== 1) throw new DeliveryError("Host execution ownership changed");
    },
    release: () => {
      try {
        const raw = db.prepare("SELECT * FROM execution WHERE slot=1 AND token=?").get(token);
        if (raw) {
          const lock = lockSchema.parse(raw);
          if (lock.child !== null && processGroupAlive(lock.child))
            throw new DeliveryError("Host resource remains reserved until process termination");
          db.prepare("DELETE FROM execution WHERE slot=1 AND token=?").run(token);
        }
      } finally {
        db.close();
      }
    },
  };
}
