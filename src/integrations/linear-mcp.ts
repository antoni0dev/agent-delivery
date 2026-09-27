import { z } from "zod";
import type { Project, WorkspaceConfig } from "../config.js";
import { DeliveryError, ensurePresent, type Issue } from "../domain.js";
import type { LinearAdapter } from "./linear.js";
import { createMcpCaller, type McpCall, withMcpSession } from "./mcp.js";

const PAGE_SIZE = 50;
const MAX_PAGES = 20;
const marker = (key: string) => `<!-- agent-delivery:${encodeURIComponent(key)} -->`;
const issueSchema = z.object({
  id: z.string(),
  uuid: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  url: z.string().url(),
  teamId: z.string(),
  projectId: z.string().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  createdById: z.string().nullable().optional(),
  labels: z.array(z.string()),
  status: z.string(),
  statusType: z.string(),
});
const pageSchema = z.object({
  hasNextPage: z.boolean(),
  cursor: z.string().nullable().optional(),
});
const commentSchema = z.object({ id: z.string(), body: z.string() });
const commentsSchema = pageSchema.extend({ comments: z.array(commentSchema) });
const issuesSchema = pageSchema.extend({ issues: z.array(issueSchema) });

export function createLinearMcpAdapter(input: {
  config: WorkspaceConfig;
  project: Project;
  call?: McpCall;
}): LinearAdapter {
  const call =
    input.call ??
    createMcpCaller({
      command: ensurePresent(input.config.linear.mcp, "Routed Linear command is missing"),
      cwd: input.project.root,
    });
  let verified = false;
  async function verifyIdentity(): Promise<void> {
    if (verified) return;
    const workspace = z
      .object({ id: z.string() })
      .parse(await call({ name: "get_workspace", arguments: {}, read: true }));
    const viewer = z
      .object({ id: z.string() })
      .parse(await call({ name: "get_user", arguments: { query: "me" }, read: true }));
    if (
      workspace.id !== input.config.linear.workspaceId ||
      viewer.id !== input.config.linear.assigneeId
    )
      throw new DeliveryError("Linear workspace or configured assignee identity does not match");
    verified = true;
  }
  async function rawIssue(id: string) {
    await verifyIdentity();
    return issueSchema.parse(await call({ name: "get_issue", arguments: { id }, read: true }));
  }
  function mapIssue(raw: z.infer<typeof issueSchema>): Issue {
    return {
      id: raw.uuid,
      identifier: raw.id,
      title: raw.title,
      description: raw.description ?? "",
      teamId: raw.teamId,
      projectId: raw.projectId ?? null,
      assigneeId: raw.assigneeId ?? null,
      creatorId: raw.createdById ?? null,
      labels: raw.labels,
      state: raw.status,
      stateType: raw.statusType,
      url: raw.url,
    };
  }
  async function getIssue(id: string): Promise<Issue> {
    return mapIssue(await rawIssue(id));
  }
  function inScope(issue: Issue): boolean {
    return (
      issue.assigneeId === input.config.linear.assigneeId &&
      input.project.teamIds.includes(issue.teamId) &&
      (input.project.projectIds.length === 0 ||
        (issue.projectId !== null && input.project.projectIds.includes(issue.projectId)))
    );
  }
  async function ownedIssue(id: string): Promise<Issue> {
    const issue = await getIssue(id);
    if (!inScope(issue))
      throw new DeliveryError("Linear issue is outside configured ownership scope");
    return issue;
  }
  function authority(flag: "updateOwnedIssues" | "createScopedChildren"): void {
    if (
      !input.config.authority[flag] ||
      input.project.environment.production ||
      input.project.environment.mainnet ||
      input.project.release.deploysProduction
    )
      throw new DeliveryError("Configured authority does not permit this Linear mutation");
  }
  async function issueList(filters: Record<string, unknown>): Promise<Issue[]> {
    await verifyIdentity();
    const found: Issue[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < MAX_PAGES; page++) {
      const result = issuesSchema.parse(
        await call({
          name: "list_issues",
          arguments: {
            ...filters,
            fields: [
              "id",
              "uuid",
              "title",
              "description",
              "url",
              "teamId",
              "projectId",
              "assigneeId",
              "createdById",
              "labels",
              "status",
              "statusType",
            ],
            limit: PAGE_SIZE,
            ...(cursor === undefined ? {} : { cursor }),
          },
          read: true,
        }),
      );
      for (const item of result.issues) found.push(mapIssue(item));
      if (!result.hasNextPage) return found;
      cursor = ensurePresent(result.cursor, "Linear pagination omitted its next cursor");
    }
    throw new DeliveryError("Linear issue scan exceeded its bounded page limit");
  }
  async function listEligible(): Promise<Issue[]> {
    if (input.call === undefined) {
      return withMcpSession({
        command: ensurePresent(input.config.linear.mcp, "Routed Linear command is missing"),
        cwd: input.project.root,
        run: (sessionCall) =>
          createLinearMcpAdapter({ ...input, call: sessionCall }).listEligible(),
      });
    }
    await verifyIdentity();
    const found = new Map<string, Issue>();
    for (const team of input.project.teamIds) {
      const states = z
        .array(z.object({ id: z.string(), type: z.string() }))
        .parse(await call({ name: "list_issue_statuses", arguments: { team }, read: true }))
        .filter((state) => !["completed", "canceled"].includes(state.type));
      const projects = input.project.projectIds.length === 0 ? [null] : input.project.projectIds;
      for (const state of states) {
        for (const project of projects) {
          const issues = await issueList({
            team,
            state: state.id,
            ...(project === null ? {} : { project }),
            assignee: input.config.linear.assigneeId,
            ...(input.config.linear.intake?.mode === "private"
              ? {}
              : { label: input.config.linear.readyLabel }),
          });
          for (const issue of issues) {
            if (
              inScope(issue) &&
              !["completed", "canceled"].includes(issue.stateType ?? issue.state) &&
              (input.config.linear.intake?.mode === "private" ||
                issue.labels.includes(input.config.linear.readyLabel))
            )
              found.set(issue.id, issue);
          }
        }
      }
    }
    return [...found.values()];
  }
  async function findComment(args: { issueId: string; operationKey: string }) {
    await ownedIssue(args.issueId);
    let cursor: string | undefined;
    for (let page = 0; page < MAX_PAGES; page++) {
      const result = commentsSchema.parse(
        await call({
          name: "list_comments",
          arguments: {
            issueId: args.issueId,
            limit: PAGE_SIZE,
            ...(cursor === undefined ? {} : { cursor }),
          },
          read: true,
        }),
      );
      const found = result.comments.find((comment) =>
        comment.body.includes(marker(args.operationKey)),
      );
      if (found !== undefined) return found;
      if (!result.hasNextPage) return null;
      cursor = ensurePresent(result.cursor, "Linear comment pagination omitted its next cursor");
    }
    throw new DeliveryError("Linear comment scan exceeded its bounded page limit");
  }
  async function createComment(args: { issueId: string; operationKey: string; body: string }) {
    authority("updateOwnedIssues");
    await ownedIssue(args.issueId);
    const existing = await findComment(args);
    if (existing !== null) return existing;
    const body = `${args.body}\n\n${marker(args.operationKey)}`;
    await call({ name: "save_comment", arguments: { issueId: args.issueId, body }, read: false });
    const confirmed = await findComment(args);
    if (confirmed === null || confirmed.body !== body)
      throw new DeliveryError("Linear comment mutation could not be confirmed", "uncertain");
    return confirmed;
  }
  async function findChild(args: {
    parentId: string;
    operationKey: string;
  }): Promise<Issue | null> {
    await ownedIssue(args.parentId);
    const children = await issueList({ parentId: args.parentId });
    return (
      children.find(
        (child) => inScope(child) && child.description.includes(marker(args.operationKey)),
      ) ?? null
    );
  }
  async function createChild(args: {
    parentId: string;
    title: string;
    description: string;
    operationKey: string;
  }) {
    authority("createScopedChildren");
    const parent = await ownedIssue(args.parentId);
    const existing = await findChild(args);
    if (existing !== null) return existing;
    await call({
      name: "save_issue",
      arguments: {
        parentId: parent.id,
        team: parent.teamId,
        project: parent.projectId,
        assignee: input.config.linear.assigneeId,
        title: args.title,
        description: `${args.description}\n\n${marker(args.operationKey)}`,
      },
      read: false,
    });
    const confirmed = await findChild(args);
    if (confirmed === null)
      throw new DeliveryError("Linear child mutation could not be confirmed", "uncertain");
    return confirmed;
  }
  async function completeIssue(args: { issueId: string }): Promise<void> {
    authority("updateOwnedIssues");
    const issue = await ownedIssue(args.issueId);
    const states = z
      .array(z.object({ id: z.string(), name: z.string(), type: z.string() }))
      .parse(
        await call({ name: "list_issue_statuses", arguments: { team: issue.teamId }, read: true }),
      )
      .filter((state) => state.type === "completed");
    if (states.length !== 1)
      throw new DeliveryError("Linear team must have exactly one completed workflow state");
    const state = ensurePresent(states[0], "Missing completed workflow state");
    if (issue.state === state.name) return;
    try {
      await call({ name: "save_issue", arguments: { id: issue.id, state: state.id }, read: false });
    } catch (error) {
      if ((await ownedIssue(issue.id)).state === state.name) return;
      throw error;
    }
    if ((await ownedIssue(issue.id)).state !== state.name)
      throw new DeliveryError("Linear completion mutation could not be confirmed", "uncertain");
  }
  return {
    verifyIdentity,
    getIssue,
    listEligible,
    findComment,
    findChild,
    createChild,
    completeIssue,
    publishPlan: (args) =>
      createComment({
        ...args,
        body: `## Delivery plan\n\nVersion: ${args.planDigest}\n\n${args.fullPlan}`,
      }),
    notify: createComment,
  };
}
