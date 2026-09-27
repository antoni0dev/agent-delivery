import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { z } from "zod";
import { workspaceConfigSchema } from "../src/config.js";
import { DeliveryError, ensurePresent } from "../src/domain.js";
import { createLinearMcpAdapter } from "../src/integrations/linear-mcp.js";
import { createMcpCaller, type McpCall, withMcpSession } from "../src/integrations/mcp.js";
import { createControllerFixture } from "./controller-fixture.test.js";

function fixture() {
  const source = createControllerFixture();
  const config = source.config;
  delete config.linear.credential;
  config.linear.mcp = { executable: "routed-linear", args: [] };
  const project = ensurePresent(config.projects[0], "Missing test project");
  const comments: { id: string; body: string }[] = [];
  const calls: Parameters<McpCall>[0][] = [];
  let wrongWorkspace = false;
  let responseLost = false;
  let completed = false;
  const raw = {
    id: source.issue.identifier,
    uuid: source.issue.id,
    title: source.issue.title,
    description: "Original request",
    url: source.issue.url,
    teamId: project.teamIds[0],
    projectId: source.issue.projectId,
    assigneeId: config.linear.assigneeId,
    createdById: "creator",
    labels: [config.linear.readyLabel],
    status: "Todo",
    statusType: "unstarted",
  };
  const call: McpCall = async (input) => {
    calls.push(input);
    const handlers: Record<string, () => unknown> = {
      get_workspace: () => ({ id: wrongWorkspace ? "other-workspace" : config.linear.workspaceId }),
      get_user: () => ({ id: config.linear.assigneeId }),
      get_issue: () => ({
        ...raw,
        status: completed ? "Done" : "Todo",
        statusType: completed ? "completed" : "unstarted",
      }),
      list_issues: () => ({ issues: [{ ...raw }], hasNextPage: false }),
      list_comments: () => ({ comments, hasNextPage: false }),
      list_issue_statuses: () => [
        { id: "todo", name: "Todo", type: "unstarted" },
        { id: "done", name: "Done", type: "completed" },
      ],
      save_comment: () => {
        const body = z.string().parse(input.arguments.body);
        comments.push({ id: `comment-${comments.length}`, body });
        if (responseLost) throw new DeliveryError("Unknown remote outcome", "uncertain");
        return comments.at(-1);
      },
      save_issue: () => {
        completed = true;
        if (responseLost) throw new DeliveryError("Unknown remote outcome", "uncertain");
        return { id: raw.id };
      },
    };
    return ensurePresent(handlers[input.name], "Unexpected tool")();
  };
  return {
    ...source,
    config,
    project,
    calls,
    raw,
    comments,
    adapter: createLinearMcpAdapter({ config, project, call }),
    setWrongWorkspace: () => {
      wrongWorkspace = true;
    },
    loseResponse: () => {
      responseLost = true;
    },
  };
}

test("Linear configuration selects one connection without an implicit credential fallback", (context) => {
  const value = fixture();
  context.after(value.cleanup);
  assert.doesNotThrow(() => workspaceConfigSchema.parse(value.config));
  assert.throws(() =>
    workspaceConfigSchema.parse({
      ...value.config,
      linear: { ...value.config.linear, credential: { kind: "environment", name: "EXTRA_TOKEN" } },
    }),
  );
  const { mcp: _mcp, ...linear } = value.config.linear;
  assert.throws(() => workspaceConfigSchema.parse({ ...value.config, linear }));
});

test("MCP verifies workspace and viewer before any issue read or write", async (context) => {
  const value = fixture();
  context.after(value.cleanup);
  value.setWrongWorkspace();
  await assert.rejects(value.adapter.getIssue(value.raw.id), /identity does not match/);
  assert.deepEqual(
    value.calls.map((call) => call.name),
    ["get_workspace", "get_user"],
  );
});

test("MCP admission uses full issue identity and excludes issues outside repository scope", async (context) => {
  const value = fixture();
  context.after(value.cleanup);
  const issues = await value.adapter.listEligible();
  assert.equal(issues[0]?.id, value.raw.uuid);
  assert.equal(issues[0]?.identifier, value.raw.id);
  value.raw.assigneeId = "different-owner";
  assert.equal((await value.adapter.listEligible()).length, 0);
  await assert.rejects(
    value.adapter.notify({ issueId: value.raw.id, body: "message", operationKey: "op" }),
    /ownership scope/,
  );
  assert.equal(
    value.calls.some((call) => !call.read),
    false,
  );
});

test("lost MCP comment responses reconcile by marker without a duplicate mutation", async (context) => {
  const value = fixture();
  context.after(value.cleanup);
  value.loseResponse();
  const input = {
    issueId: value.raw.id,
    fullPlan: "Complete scoped plan",
    planDigest: "digest",
    operationKey: "plan-v1",
  };
  await assert.rejects(value.adapter.publishPlan(input), /Unknown remote outcome/);
  const confirmed = await value.adapter.publishPlan(input);
  assert.match(confirmed.body, /Complete scoped plan/);
  assert.equal(value.raw.description, "Original request");
  assert.equal(value.calls.filter((call) => call.name === "save_comment").length, 1);
});

test("MCP completion reads back a lost success and remains idempotent", async (context) => {
  const value = fixture();
  context.after(value.cleanup);
  value.loseResponse();
  await value.adapter.completeIssue({ issueId: value.raw.id });
  await value.adapter.completeIssue({ issueId: value.raw.id });
  assert.equal(value.calls.filter((call) => call.name === "save_issue").length, 1);
});

test("stdio MCP initializes and terminates its launcher plus descendant processes", async (context) => {
  const root = mkdtempSync(join(tmpdir(), "delivery-mcp-"));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, "bin"));
  const file = join(root, "bin", "server.mjs");
  writeFileSync(
    file,
    `import readline from 'node:readline';
import {spawn} from 'node:child_process';
const descendant=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});
const lines = readline.createInterface({input:process.stdin});
lines.on('line', line => {
 const request = JSON.parse(line);
 if (!('id' in request)) return;
 const result = request.method === 'initialize'
   ? {protocolVersion:'2024-11-05',capabilities:{tools:{}},serverInfo:{name:'fixture',version:'1'}}
   : {content:[{type:'text',text:JSON.stringify({id:'workspace',pid:process.pid,descendant:descendant.pid})}]};
 process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:request.id,result})+'\\n');
});

lines.on('close',()=>process.exit(0));
`,
  );
  const result = await withMcpSession({
    command: { executable: process.execPath, args: [file] },
    cwd: root,
    run: async (call) => {
      const schema = z.object({ id: z.string(), pid: z.number(), descendant: z.number() });
      const first = schema.parse(await call({ name: "get_workspace", arguments: {}, read: true }));
      const second = schema.parse(await call({ name: "get_user", arguments: {}, read: true }));
      assert.equal(first.pid, second.pid);
      return second;
    },
  });
  assert.equal(result.id, "workspace");
  assert.throws(() => process.kill(result.pid, 0));
  assert.throws(() => process.kill(result.descendant, 0));
});

test("stdio MCP terminates descendants after an abnormal launcher exit", async (context) => {
  const root = mkdtempSync(join(tmpdir(), "delivery-mcp-crash-"));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  const file = join(root, "server.mjs");
  writeFileSync(
    file,
    `import readline from 'node:readline';
import {spawn} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const lines=readline.createInterface({input:process.stdin});
lines.on('line', line=>{
 const request=JSON.parse(line);
 if(request.method==='initialize') process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:request.id,result:{protocolVersion:'2024-11-05',capabilities:{tools:{}},serverInfo:{name:'fixture',version:'1'}}})+'\\n');
 if(request.method==='tools/call') {
  const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});
  writeFileSync('descendant-pid',String(child.pid));
  process.exit(7);
 }
});
`,
  );
  const call = createMcpCaller({
    command: { executable: process.execPath, args: [file] },
    cwd: root,
  });
  await assert.rejects(
    call({ name: "get_workspace", arguments: {}, read: true }),
    /MCP read did not return/,
  );
  const pid = Number(readFileSync(join(root, "descendant-pid"), "utf8"));
  assert.throws(() => process.kill(pid, 0));
});

test("private MCP intake uses active state filters and maps actual creator metadata", async (context) => {
  const f = fixture();
  context.after(f.cleanup);
  f.config.linear.intake = { mode: "private", automaticOthers: true };
  f.raw.labels = [];
  const issues = await f.adapter.listEligible();
  assert.equal(issues[0]?.creatorId, "creator");
  assert.equal(f.calls.filter((call) => call.name === "get_issue").length, 0);
  const scans = f.calls.filter((call) => call.name === "list_issues");
  assert.ok(scans.length > 0);
  assert.ok(
    scans.every((call) => call.arguments.state === "todo" && call.arguments.label === undefined),
  );
});

test("MCP startup failure retains read and mutation outcome classification", async (context) => {
  const root = mkdtempSync(join(tmpdir(), "delivery-mcp-startup-"));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  const call = createMcpCaller({
    command: { executable: join(root, "missing-launcher"), args: [] },
    cwd: root,
  });
  await assert.rejects(
    call({ name: "get_workspace", arguments: {}, read: true }),
    (error: unknown) => error instanceof DeliveryError && error.code === "provider",
  );
  await assert.rejects(
    call({ name: "save_comment", arguments: {}, read: false }),
    (error: unknown) => error instanceof DeliveryError && error.code === "uncertain",
  );
  await assert.rejects(
    withMcpSession({
      command: { executable: join(root, "missing-launcher"), args: [] },
      cwd: root,
      run: async () => undefined,
    }),
    (error: unknown) => error instanceof DeliveryError && error.code === "provider",
  );
});
