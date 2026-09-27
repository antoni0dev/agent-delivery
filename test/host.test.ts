import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  activateLaunchAgent,
  deactivateLaunchAgent,
  loadHostId,
  renderLaunchAgent,
  writeLaunchAgent,
} from "../src/host/index.js";

test("host identity is stable and stored outside a workspace", () => {
  const directory = mkdtempSync(join(tmpdir(), "delivery-host-"));
  try {
    const first = loadHostId({ applicationSupportDirectory: directory });
    const second = loadHostId({ applicationSupportDirectory: directory });
    assert.equal(second, first);
    assert.equal(readFileSync(join(directory, "host-id"), "utf8").trim(), first);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("launch agent runs a five minute tick with explicit absolute paths and no credentials", () => {
  const content = renderLaunchAgent({
    workspaceId: "portable-workspace",
    nodeBinary: "/opt/node/bin/node",
    cliFile: "/opt/agent-delivery/dist/cli.js",
    configPath: "/var/lib/agent-delivery/config.json",
    enabled: false,
    logDirectory: "/var/log/agent-delivery",
  });
  assert.match(content, /<key>StartInterval<\/key><integer>300<\/integer>/u);
  assert.match(content, /<string>tick<\/string>/u);
  assert.match(content, /<key>Disabled<\/key><true\/>/u);
  assert.doesNotMatch(content, /TOKEN|Authorization|credential/u);
});

test("launch agent file stays disabled until activation succeeds", () => {
  const directory = mkdtempSync(join(tmpdir(), "delivery-launchd-"));
  try {
    const logs = join(directory, "logs");
    mkdirSync(logs);
    const path = writeLaunchAgent({
      workspaceId: "workspace",
      nodeBinary: "/usr/local/bin/node",
      cliFile: "/usr/local/lib/agent-delivery/cli.js",
      configPath: "/tmp/workspace.json",
      enabled: false,
      logDirectory: logs,
      launchAgentsDirectory: join(directory, "agents"),
    });
    assert.match(readFileSync(path, "utf8"), /<key>Disabled<\/key><true\/>/u);
    writeFileSync(join(directory, "unrelated"), "preserved");
    assert.equal(readFileSync(join(directory, "unrelated"), "utf8"), "preserved");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("launchd ignores only a verified not-loaded response", () => {
  const calls: string[][] = [];
  deactivateLaunchAgent({
    workspaceId: "workspace",
    run: (args) => {
      calls.push(args);
      throw new Error("Could not find service in domain for user");
    },
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.[0], "print");
  assert.throws(
    () =>
      deactivateLaunchAgent({
        workspaceId: "workspace",
        run: () => {
          throw new Error("launchctl permission denied");
        },
      }),
    /permission denied/u,
  );
});

test("launchd propagates bootout failure for a loaded service", () => {
  const calls: string[][] = [];
  assert.throws(
    () =>
      activateLaunchAgent({
        workspaceId: "workspace",
        path: "/tmp/dev.agent-delivery.workspace.plist",
        run: (args) => {
          calls.push(args);
          if (args[0] === "bootout") throw new Error("bootout failed");
          return "loaded";
        },
      }),
    /bootout failed/u,
  );
  assert.deepEqual(
    calls.map((args) => args[0]),
    ["print", "bootout"],
  );
});

test("pausing disables future launchd runs without terminating the active controller", () => {
  const calls: string[][] = [];
  deactivateLaunchAgent({
    workspaceId: "workspace",
    run: (args) => {
      calls.push(args);
      return "loaded";
    },
  });
  assert.deepEqual(
    calls.map((args) => args[0]),
    ["print", "disable"],
  );
});
