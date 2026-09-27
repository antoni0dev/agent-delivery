import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import { Store } from "../src/store.js";

function legacyFixture() {
  const directory = mkdtempSync(join(tmpdir(), "delivery-migration-"));
  const path = join(directory, "state.sqlite");
  new Store({ path, workspaceId: "test" }).close();
  const db = new Database(path);
  db.exec(
    "DROP TABLE plan_approvals; PRAGMA user_version=2; CREATE TABLE legacy_marker(value TEXT); INSERT INTO legacy_marker VALUES('committed in WAL');",
  );
  return {
    directory,
    path,
    db,
    close: () => {
      db.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

test("migration saves a consistent original-format snapshot including committed WAL data", () => {
  const f = legacyFixture();
  try {
    assert.ok(existsSync(`${f.path}-wal`));
    new Store({ path: f.path, workspaceId: "test" }).close();
    assert.equal(f.db.pragma("user_version", { simple: true }), 3);
    const backupDirectory = join(f.directory, "migration-backups");
    const names = readdirSync(backupDirectory);
    assert.equal(names.length, 1);
    const name = names[0];
    assert.ok(name);
    const backupPath = join(backupDirectory, name);
    assert.equal(statSync(backupDirectory).mode & 0o777, 0o700);
    assert.equal(statSync(backupPath).mode & 0o777, 0o600);
    const backup = new Database(backupPath, { readonly: true });
    try {
      assert.equal(backup.pragma("user_version", { simple: true }), 2);
      assert.deepEqual(backup.prepare("SELECT value FROM legacy_marker").get(), {
        value: "committed in WAL",
      });
      assert.equal(
        backup.prepare("SELECT 1 FROM sqlite_master WHERE name='plan_approvals'").get(),
        undefined,
      );
      assert.equal(backup.pragma("integrity_check", { simple: true }), "ok");
    } finally {
      backup.close();
    }
    new Store({ path: f.path, workspaceId: "test" }).close();
    assert.equal(readdirSync(backupDirectory).length, 1);
  } finally {
    f.close();
  }
});

for (const [name, mutation] of [
  ["active workspace", "UPDATE settings SET active=1"],
  [
    "unconfirmed invocation",
    "INSERT INTO invocations(id,initiative_id,role,profile,worktree,status,requested_model,started_at) VALUES('run','task','implementer','codex','tree','running','model','now')",
  ],
  [
    "controller ownership",
    "INSERT INTO controller_lock(slot,host_id,pid,identity) VALUES(1,'host',1,'identity')",
  ],
]) {
  test(`migration refuses ${name} without changing the original schema`, () => {
    const f = legacyFixture();
    try {
      assert.ok(mutation);
      f.db.pragma("foreign_keys=OFF");
      f.db.exec(mutation);
      assert.throws(
        () => new Store({ path: f.path, workspaceId: "test" }),
        /previous release to pause intake/,
      );
      assert.equal(f.db.pragma("user_version", { simple: true }), 2);
      assert.equal(
        f.db.prepare("SELECT 1 FROM sqlite_master WHERE name='plan_approvals'").get(),
        undefined,
      );
      assert.equal(existsSync(join(f.directory, "migration-backups")), false);
    } finally {
      f.close();
    }
  });
}

test("wrong workspace cannot migrate a legacy database", () => {
  const f = legacyFixture();
  try {
    assert.throws(() => new Store({ path: f.path, workspaceId: "other" }), /another workspace/);
    assert.equal(f.db.pragma("user_version", { simple: true }), 2);
  } finally {
    f.close();
  }
});
