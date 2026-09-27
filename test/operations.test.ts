import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { reconcileOperation } from "../src/operations.js";
import { Store } from "../src/store.js";

test("lost create response is recovered by remote marker without creating twice", async () => {
  const store = new Store({
    path: join(mkdtempSync(join(tmpdir(), "delivery-operation-")), "state.sqlite"),
    workspaceId: "fixture",
  });
  let remote: { id: string } | null = null;
  let creates = 0;
  const invoke = () =>
    reconcileOperation({
      store,
      key: "key",
      payload: { title: "test" },
      lookup: async () => remote,
      create: async () => {
        creates++;
        remote = { id: "created" };
        throw new Error("response lost");
      },
      remoteId: (value: { id: string }) => value.id,
    });
  await assert.rejects(invoke(), /lost/);
  assert.equal(store.operation("key")?.status, "uncertain");
  assert.equal((await invoke()).id, "created");
  assert.equal(creates, 1);
  store.close();
});
test("unresolved outcome never replays an external create", async () => {
  const store = new Store({
    path: join(mkdtempSync(join(tmpdir(), "delivery-operation-")), "state.sqlite"),
    workspaceId: "fixture",
  });
  let creates = 0;
  const invoke = () =>
    reconcileOperation({
      store,
      key: "key",
      payload: { title: "test" },
      lookup: async () => null,
      create: async (): Promise<{ id: string }> => {
        creates++;
        throw new Error("unknown");
      },
      remoteId: (value: { id: string }) => value.id,
    });
  await assert.rejects(invoke());
  await assert.rejects(invoke(), /manual resolution/);
  assert.equal(creates, 1);
  store.close();
});
