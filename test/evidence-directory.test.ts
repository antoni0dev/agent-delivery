import assert from "node:assert/strict";
import {
  existsSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { evidenceDirectory } from "../src/host/evidence-directory.js";

for (const kind of ["behavior", "conformance"] as const) {
  test(`${kind} rejects linked shared directories without changing their contents`, (t) => {
    const root = mkdtempSync(join(tmpdir(), "delivery-evidence-"));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    const stateDirectory = join(root, "state");
    const shared = join(root, "shared");
    mkdirSync(stateDirectory);
    mkdirSync(shared);
    writeFileSync(join(shared, "codex.json"), "original");
    symlinkSync(shared, join(stateDirectory, kind));
    for (const access of ["read", "write"] as const)
      assert.throws(
        () => evidenceDirectory({ stateDirectory, kind, profile: "codex", access }),
        /workspace-local/,
      );
    assert.equal(readFileSync(join(shared, "codex.json"), "utf8"), "original");
  });

  test(`${kind} keeps workspace writes independent and reads do not create directories`, (t) => {
    const root = mkdtempSync(join(tmpdir(), "delivery-evidence-"));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    const firstState = join(root, "first");
    const secondState = join(root, "second");
    const missing = evidenceDirectory({ stateDirectory: firstState, kind, profile: "codex" });
    assert.equal(existsSync(firstState), false);
    const first = evidenceDirectory({
      stateDirectory: firstState,
      kind,
      profile: "codex",
      access: "write",
    });
    const second = evidenceDirectory({
      stateDirectory: secondState,
      kind,
      profile: "codex",
      access: "write",
    });
    assert.equal(first, missing);
    writeFileSync(join(first, "codex.json"), "first-proof");
    writeFileSync(join(second, "codex.json"), "second-proof");
    assert.equal(evidenceDirectory({ stateDirectory: firstState, kind, profile: "codex" }), first);
    assert.equal(readFileSync(join(first, "codex.json"), "utf8"), "first-proof");
  });

  for (const alias of ["symlink", "hardlink"] as const) {
    test(`${kind} rejects a ${alias} profile receipt`, (t) => {
      const root = mkdtempSync(join(tmpdir(), "delivery-evidence-"));
      t.after(() => rmSync(root, { recursive: true, force: true }));
      const directory = evidenceDirectory({
        stateDirectory: root,
        kind,
        profile: "codex",
        access: "write",
      });
      const original = join(root, "original.json");
      writeFileSync(original, "original");
      const createAlias = alias === "symlink" ? symlinkSync : linkSync;
      createAlias(original, join(directory, "codex.json"));
      for (const access of ["read", "write"] as const)
        assert.throws(
          () => evidenceDirectory({ stateDirectory: root, kind, profile: "codex", access }),
          /independent profile proof/,
        );
      assert.equal(readFileSync(original, "utf8"), "original");
    });
  }
}

test("behavior rejects a shared runs directory without modifying its artifacts", (t) => {
  const root = mkdtempSync(join(tmpdir(), "delivery-evidence-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const directory = evidenceDirectory({
    stateDirectory: root,
    kind: "behavior",
    profile: "codex",
    access: "write",
  });
  writeFileSync(join(directory, "codex.json"), "local-proof");
  const shared = join(root, "shared-runs");
  mkdirSync(shared);
  writeFileSync(join(shared, "artifact.json"), "original");
  symlinkSync(shared, join(directory, "runs"));
  for (const access of ["read", "write"] as const)
    assert.throws(
      () => evidenceDirectory({ stateDirectory: root, kind: "behavior", profile: "codex", access }),
      /workspace-local/,
    );
  assert.equal(readFileSync(join(shared, "artifact.json"), "utf8"), "original");
  assert.equal(readFileSync(join(directory, "codex.json"), "utf8"), "local-proof");
});
