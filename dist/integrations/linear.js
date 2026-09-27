import { z } from "zod";
import { credentialValue } from "../config.js";
import { DeliveryError, ensurePresent, issueSchema } from "../domain.js";
import { createLinearMcpAdapter } from "./linear-mcp.js";
import { parseJson, request } from "./transport.js";
const LINEAR_URL = "https://api.linear.app/graphql";
const PAGE_SIZE = 50;
const MAX_PAGES = 20;
const marker = (operationKey) => `<!-- agent-delivery:${encodeURIComponent(operationKey)} -->`;
const rawIssueSchema = z
    .object({
    id: z.string(),
    identifier: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    team: z.object({ id: z.string() }).strict(),
    project: z.object({ id: z.string() }).strict().nullable(),
    assignee: z.object({ id: z.string() }).strict().nullable(),
    creator: z.object({ id: z.string() }).strict().nullable().optional(),
    labels: z.object({ nodes: z.array(z.object({ name: z.string() }).strict()) }).strict(),
    state: z.object({ id: z.string(), name: z.string(), type: z.string().optional() }).strict(),
    url: z.string(),
})
    .strict();
const pageInfoSchema = z
    .object({ hasNextPage: z.boolean(), endCursor: z.string().nullable() })
    .strict();
const commentSchema = z.object({ id: z.string(), body: z.string() }).strict();
const commentPageSchema = z
    .object({ nodes: z.array(commentSchema), pageInfo: pageInfoSchema })
    .strict();
const childPageSchema = z
    .object({ nodes: z.array(rawIssueSchema), pageInfo: pageInfoSchema })
    .strict();
const graphErrorSchema = z.object({ message: z.string() }).passthrough();
const graphEnvelopeSchema = z
    .object({ data: z.unknown().optional(), errors: z.array(graphErrorSchema).optional() })
    .passthrough();
const issueFields = `
  id identifier title description url
  team { id }
  project { id }
  assignee { id }
  creator { id }
  labels { nodes { name } }
  state { id name type }
`;
function mapIssue(value) {
    return issueSchema.parse({
        id: value.id,
        identifier: value.identifier,
        title: value.title,
        description: value.description ?? "",
        teamId: value.team.id,
        projectId: value.project?.id ?? null,
        assigneeId: value.assignee?.id ?? null,
        creatorId: value.creator?.id ?? null,
        labels: value.labels.nodes.map(({ name }) => name),
        state: value.state.name,
        stateType: value.state.type,
        url: value.url,
    });
}
function isInProjectScope({ issue, project }) {
    return (project.teamIds.includes(issue.teamId) &&
        (project.projectIds.length === 0 ||
            (issue.projectId !== null && project.projectIds.includes(issue.projectId))));
}
export function createGraphqlLinearAdapter(input) {
    const fetchImplementation = input.fetch ?? globalThis.fetch;
    const credential = credentialValue({
        reference: ensurePresent(input.config.linear.credential, "Linear API credential is missing"),
        cwd: input.project.root,
    });
    let identityVerified = false;
    async function graph(query, variables, read) {
        const response = await request({
            provider: "Linear",
            fetch: fetchImplementation,
            url: LINEAR_URL,
            read,
            init: {
                method: "POST",
                headers: { "content-type": "application/json", authorization: credential },
                body: JSON.stringify({ query, variables }),
            },
        });
        let envelope;
        try {
            envelope = graphEnvelopeSchema.parse(await parseJson({ provider: "Linear", response }));
        }
        catch {
            throw new DeliveryError(`Linear ${read ? "returned an invalid response" : "mutation response was invalid; remote outcome is uncertain"}`, read ? "provider" : "uncertain");
        }
        if (envelope.errors && envelope.errors.length > 0)
            throw new DeliveryError("Linear rejected the request", read ? "provider" : "uncertain");
        if (envelope.data === undefined)
            throw new DeliveryError("Linear returned no response data", read ? "provider" : "uncertain");
        return envelope.data;
    }
    function assertAuthority(flag) {
        if (!input.config.authority[flag] ||
            input.project.environment.production ||
            input.project.environment.mainnet ||
            input.project.release.deploysProduction)
            throw new DeliveryError("Configured authority does not permit this Linear mutation");
    }
    function assertIssueScope(issue) {
        if (issue.assigneeId !== input.config.linear.assigneeId ||
            !isInProjectScope({ issue, project: input.project }))
            throw new DeliveryError("Linear issue is outside the configured owner, team or project scope");
    }
    async function verifyIdentity() {
        if (identityVerified)
            return;
        const schema = z
            .object({
            organization: z.object({ id: z.string() }).strict(),
            viewer: z.object({ id: z.string() }).strict(),
        })
            .strict();
        const data = schema.parse(await graph(`query Identity { organization { id } viewer { id } }`, {}, true));
        if (data.organization.id !== input.config.linear.workspaceId ||
            data.viewer.id !== input.config.linear.assigneeId)
            throw new DeliveryError("Linear workspace or configured assignee identity does not match");
        identityVerified = true;
    }
    async function getRawIssue(id) {
        await verifyIdentity();
        const schema = z.object({ issue: rawIssueSchema.nullable() }).strict();
        const data = schema.parse(await graph(`query Issue($id: String!) { issue(id: $id) { ${issueFields} } }`, { id }, true));
        if (data.issue === null)
            throw new DeliveryError("Linear issue was not found", "not-found");
        return data.issue;
    }
    async function getIssue(id) {
        return mapIssue(await getRawIssue(id));
    }
    async function listEligible() {
        await verifyIdentity();
        const schema = z
            .object({
            issues: z.object({ nodes: z.array(rawIssueSchema), pageInfo: pageInfoSchema }).strict(),
        })
            .strict();
        const found = [];
        let after = null;
        for (let page = 0; page < MAX_PAGES; page += 1) {
            const data = schema.parse(await graph(`query Eligible($first: Int!, $after: String, $filter: IssueFilter!) {
            issues(first: $first, after: $after, filter: $filter) { nodes { ${issueFields} } pageInfo { hasNextPage endCursor } }
          }`, {
                first: PAGE_SIZE,
                after,
                filter: {
                    assignee: { id: { eq: input.config.linear.assigneeId } },
                    team: { id: { in: input.project.teamIds } },
                    ...(input.project.projectIds.length === 0
                        ? {}
                        : { project: { id: { in: input.project.projectIds } } }),
                    state: { type: { nin: ["completed", "canceled"] } },
                    ...(input.config.linear.intake?.mode === "private"
                        ? {}
                        : { labels: { name: { eq: input.config.linear.readyLabel } } }),
                },
            }, true));
            found.push(...data.issues.nodes
                .map(mapIssue)
                .filter((issue) => isInProjectScope({ issue, project: input.project }))
                .filter((issue) => input.config.linear.intake?.mode === "private" ||
                issue.labels.includes(input.config.linear.readyLabel)));
            if (!data.issues.pageInfo.hasNextPage)
                return found;
            if (data.issues.pageInfo.endCursor === null)
                throw new DeliveryError("Linear pagination omitted its next cursor", "provider");
            after = data.issues.pageInfo.endCursor;
        }
        throw new DeliveryError("Linear eligible issue scan exceeded its bounded page limit");
    }
    async function findComment(args) {
        const schema = z.object({ issue: z.object({ comments: commentPageSchema }).strict() }).strict();
        let after = null;
        for (let page = 0; page < MAX_PAGES; page += 1) {
            const data = schema.parse(await graph(`query Comments($id: String!, $first: Int!, $after: String) {
            issue(id: $id) { comments(first: $first, after: $after) {
              nodes { id body } pageInfo { hasNextPage endCursor }
            } }
          }`, { id: args.issueId, first: PAGE_SIZE, after }, true));
            const existing = data.issue.comments.nodes.find(({ body }) => body.includes(marker(args.operationKey)));
            if (existing)
                return existing;
            if (!data.issue.comments.pageInfo.hasNextPage)
                return null;
            if (data.issue.comments.pageInfo.endCursor === null)
                throw new DeliveryError("Linear comment pagination omitted its next cursor", "provider");
            after = data.issue.comments.pageInfo.endCursor;
        }
        throw new DeliveryError("Linear comment scan exceeded its bounded page limit");
    }
    async function createComment(args) {
        assertAuthority("updateOwnedIssues");
        await verifyIdentity();
        const issue = await getIssue(args.issueId);
        assertIssueScope(issue);
        const existing = await findComment(args);
        if (existing)
            return existing;
        const schema = z
            .object({
            commentCreate: z.object({ success: z.literal(true), comment: commentSchema }).strict(),
        })
            .strict();
        const data = schema.parse(await graph(`mutation Comment($input: CommentCreateInput!) {
          commentCreate(input: $input) { success comment { id body } }
        }`, {
            input: {
                issueId: args.issueId,
                body: `${args.body}\n\n${marker(args.operationKey)}`,
            },
        }, false));
        const readBack = await findComment(args);
        if (readBack === null || readBack.id !== data.commentCreate.comment.id)
            throw new DeliveryError("Linear comment mutation could not be confirmed", "uncertain");
        return readBack;
    }
    async function publishPlan(args) {
        return createComment({
            issueId: args.issueId,
            operationKey: args.operationKey,
            body: `## Delivery plan\n\nVersion: ${args.planDigest}\n\n${args.fullPlan}`,
        });
    }
    async function findChild(args) {
        const schema = z.object({ issue: z.object({ children: childPageSchema }).strict() }).strict();
        let after = null;
        for (let page = 0; page < MAX_PAGES; page += 1) {
            const data = schema.parse(await graph(`query Children($id: String!, $first: Int!, $after: String) {
            issue(id: $id) { children(first: $first, after: $after) {
              nodes { ${issueFields} } pageInfo { hasNextPage endCursor }
            } }
          }`, { id: args.parentId, first: PAGE_SIZE, after }, true));
            const existing = data.issue.children.nodes.find(({ description }) => description?.includes(marker(args.operationKey)));
            if (existing)
                return mapIssue(existing);
            if (!data.issue.children.pageInfo.hasNextPage)
                return null;
            if (data.issue.children.pageInfo.endCursor === null)
                throw new DeliveryError("Linear child pagination omitted its next cursor", "provider");
            after = data.issue.children.pageInfo.endCursor;
        }
        throw new DeliveryError("Linear child scan exceeded its bounded page limit");
    }
    async function createChild(args) {
        assertAuthority("createScopedChildren");
        await verifyIdentity();
        const parent = await getIssue(args.parentId);
        assertIssueScope(parent);
        const existing = await findChild(args);
        if (existing)
            return existing;
        const schema = z
            .object({
            issueCreate: z.object({ success: z.literal(true), issue: rawIssueSchema }).strict(),
        })
            .strict();
        const data = schema.parse(await graph(`mutation Child($input: IssueCreateInput!) {
          issueCreate(input: $input) { success issue { ${issueFields} } }
        }`, {
            input: {
                parentId: parent.id,
                teamId: parent.teamId,
                projectId: parent.projectId,
                assigneeId: input.config.linear.assigneeId,
                title: args.title,
                description: `${args.description}\n\n${marker(args.operationKey)}`,
            },
        }, false));
        const readBack = await findChild(args);
        if (readBack === null || readBack.id !== data.issueCreate.issue.id)
            throw new DeliveryError("Linear child mutation could not be confirmed", "uncertain");
        return readBack;
    }
    async function completeIssue(args) {
        assertAuthority("updateOwnedIssues");
        await verifyIdentity();
        const rawIssue = await getRawIssue(args.issueId);
        const issue = mapIssue(rawIssue);
        assertIssueScope(issue);
        const stateSchema = z
            .object({
            team: z
                .object({
                states: z.object({ nodes: z.array(z.object({ id: z.string() }).strict()) }).strict(),
            })
                .strict(),
        })
            .strict();
        const states = stateSchema.parse(await graph(`query CompletedState($team: String!) {
          team(id: $team) { states(filter: { type: { eq: "completed" } }) { nodes { id } } }
        }`, { team: issue.teamId }, true)).team.states.nodes;
        if (states.length !== 1)
            throw new DeliveryError("Linear team must have exactly one completed workflow state");
        const completedStateId = states[0]?.id;
        if (rawIssue.state.id === completedStateId)
            return;
        const mutationSchema = z
            .object({ issueUpdate: z.object({ success: z.literal(true) }).strict() })
            .strict();
        try {
            mutationSchema.parse(await graph(`mutation Complete($id: String!, $input: IssueUpdateInput!) {
            issueUpdate(id: $id, input: $input) { success }
          }`, { id: issue.id, input: { stateId: completedStateId } }, false));
        }
        catch (error) {
            try {
                const reconciled = await getRawIssue(issue.id);
                assertIssueScope(mapIssue(reconciled));
                if (reconciled.state.id === completedStateId)
                    return;
            }
            catch {
                // Preserve the mutation failure when completion cannot be reconciled.
            }
            throw error;
        }
        let confirmed;
        try {
            confirmed = await getRawIssue(issue.id);
        }
        catch {
            throw new DeliveryError("Linear completion mutation could not be read back", "uncertain");
        }
        assertIssueScope(mapIssue(confirmed));
        if (confirmed.state.id !== completedStateId)
            throw new DeliveryError("Linear completion mutation could not be confirmed", "uncertain");
    }
    async function notify(args) {
        return createComment(args);
    }
    return {
        verifyIdentity,
        listEligible,
        getIssue,
        publishPlan,
        findComment,
        createChild,
        findChild,
        completeIssue,
        notify,
    };
}
export function createLinearAdapter(input) {
    return input.config.linear.mcp === undefined
        ? createGraphqlLinearAdapter(input)
        : createLinearMcpAdapter(input);
}
