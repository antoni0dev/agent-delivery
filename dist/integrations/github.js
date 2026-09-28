import { z } from "zod";
import { credentialValue } from "../config.js";
import { DeliveryError } from "../domain.js";
import { parseJson, request } from "./transport.js";
const GITHUB_URL = "https://api.github.com";
const PAGE_SIZE = 100;
const MAX_PAGES = 10;
const MAX_CHECK_DETAILS = 20;
const MAX_DETAIL_SUMMARY_LENGTH = 500;
const githubIdentitySchema = z.object({ login: z.string().min(1) }).passthrough();
const marker = (operationKey) => `<!-- agent-delivery:${encodeURIComponent(operationKey)} -->`;
const rawPullSchema = z
    .object({
    number: z.number().int().positive(),
    html_url: z.string(),
    head: z.object({ sha: z.string(), ref: z.string() }).passthrough(),
    base: z.object({ sha: z.string(), ref: z.string() }).passthrough(),
    draft: z.boolean().nullable(),
    merged: z.boolean().optional(),
    merge_commit_sha: z.string().nullable(),
    body: z.string().nullable(),
    state: z.enum(["open", "closed"]),
    mergeable: z.boolean().nullable().optional(),
    mergeable_state: z.string().optional(),
})
    .passthrough();
function mapPull(value) {
    return {
        number: value.number,
        url: value.html_url,
        head: value.head.sha,
        base: value.base.sha,
        headBranch: value.head.ref,
        baseBranch: value.base.ref,
        draft: value.draft ?? false,
        merged: value.merged ?? false,
        mergeCommit: value.merge_commit_sha,
    };
}
function escapePattern(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function linearIssuePattern(issueUrl) {
    let parsed;
    try {
        parsed = new URL(issueUrl);
    }
    catch {
        throw new DeliveryError("Linear issue URL is invalid");
    }
    const segments = parsed.pathname.split("/").filter(Boolean);
    const issueIndex = segments.findIndex((segment, index) => index > 0 && segment === "issue" && /^[A-Za-z0-9]+-\d+$/.test(segments[index + 1] ?? ""));
    const identifier = segments[issueIndex + 1];
    if (parsed.protocol !== "https:" ||
        parsed.hostname !== "linear.app" ||
        parsed.username !== "" ||
        parsed.password !== "" ||
        issueIndex < 1 ||
        identifier === undefined ||
        !/^[A-Za-z0-9]+-\d+$/.test(identifier))
        throw new DeliveryError("Linear issue URL does not have a canonical issue identifier");
    const canonical = `${parsed.origin}/${segments.slice(0, issueIndex + 2).join("/")}`;
    return new RegExp(`${escapePattern(canonical)}(?=$|[\\s/?#)\\]}>,'".;:|])`, "i");
}
export function createGithubAdapter(input) {
    const fetchImplementation = input.fetch ?? globalThis.fetch;
    const repositoryPath = input.project.repository
        .split("/")
        .map((part) => encodeURIComponent(part))
        .join("/");
    const expectedLogin = githubIdentitySchema.parse(input.config.github).login;
    const credential = credentialValue({
        reference: input.config.github.credential,
        cwd: input.project.root,
    });
    let identityVerified = false;
    async function github(args) {
        const method = args.method ?? "GET";
        const init = {
            method,
            headers: {
                accept: "application/vnd.github+json",
                authorization: `Bearer ${credential}`,
                "content-type": "application/json",
                "x-github-api-version": "2022-11-28",
            },
        };
        if (args.body !== undefined)
            init.body = JSON.stringify(args.body);
        const requestInput = {
            provider: "GitHub",
            fetch: fetchImplementation,
            url: `${GITHUB_URL}${args.path}`,
            read: method === "GET",
            init,
        };
        if (args.acceptedStatuses !== undefined)
            requestInput.acceptedStatuses = args.acceptedStatuses;
        return request(requestInput);
    }
    async function githubJson(args) {
        const response = await github(args);
        try {
            return await parseJson({ provider: "GitHub", response });
        }
        catch {
            const read = (args.method ?? "GET") === "GET";
            throw new DeliveryError(`GitHub ${read ? "returned an invalid response" : "mutation response was invalid; remote outcome is uncertain"}`, read ? "provider" : "uncertain");
        }
    }
    function parseGithub({ schema, value, read, }) {
        try {
            return schema.parse(value);
        }
        catch {
            throw new DeliveryError(`GitHub ${read ? "returned an invalid response" : "mutation response was invalid; remote outcome is uncertain"}`, read ? "provider" : "uncertain");
        }
    }
    function assertAuthority(flag) {
        if (!input.config.authority[flag] ||
            input.project.environment.production ||
            input.project.environment.mainnet ||
            input.project.release.deploysProduction)
            throw new DeliveryError("Configured authority does not permit this GitHub mutation");
    }
    function assertPullScope(pull) {
        if (pull.baseBranch !== input.project.release.targetBranch)
            throw new DeliveryError("Pull request base branch is outside the configured release scope");
    }
    async function verifyIdentity() {
        if (identityVerified)
            return;
        const repositorySchema = z.object({ full_name: z.string() }).passthrough();
        const userSchema = z.object({ login: z.string() }).passthrough();
        const [repository, user] = await Promise.all([
            githubJson({ path: `/repos/${repositoryPath}` }).then((value) => repositorySchema.parse(value)),
            githubJson({ path: "/user" }).then((value) => userSchema.parse(value)),
        ]);
        if (repository.full_name.toLowerCase() !== input.project.repository.toLowerCase() ||
            user.login.toLowerCase() !== expectedLogin.toLowerCase())
            throw new DeliveryError("GitHub repository or authenticated user identity does not match");
        identityVerified = true;
    }
    async function gitAuthorization() {
        await verifyIdentity();
        return {
            repository: input.project.repository,
            login: expectedLogin,
            header: `AUTHORIZATION: basic ${Buffer.from(`${expectedLogin}:${credential}`).toString("base64")}`,
        };
    }
    async function pullDetails(number) {
        await verifyIdentity();
        return rawPullSchema.parse(await githubJson({ path: `/repos/${repositoryPath}/pulls/${number}` }));
    }
    async function readPullRequest(number) {
        const pull = mapPull(await pullDetails(number));
        assertPullScope(pull);
        return pull;
    }
    async function findPullDetails(headBranch) {
        await verifyIdentity();
        const owner = input.project.repository.split("/")[0];
        if (owner === undefined)
            throw new DeliveryError("Configured repository owner is invalid");
        const query = new URLSearchParams({
            state: "open",
            head: `${owner}:${headBranch}`,
            base: input.project.release.targetBranch,
            per_page: String(PAGE_SIZE),
        });
        const pulls = z
            .array(rawPullSchema)
            .parse(await githubJson({ path: `/repos/${repositoryPath}/pulls?${query}` }))
            .filter((pull) => pull.head.ref === headBranch && pull.base.ref === input.project.release.targetBranch);
        if (pulls.length === PAGE_SIZE)
            throw new DeliveryError("GitHub pull request lookup exceeded its bounded page");
        if (pulls.length > 1)
            throw new DeliveryError("GitHub returned multiple pull requests for one head and base");
        return pulls[0] ?? null;
    }
    async function findPullRequest(args) {
        const pull = await findPullDetails(args.headBranch);
        if (pull === null)
            return null;
        if (!pull.body?.includes(marker(args.operationKey)))
            throw new DeliveryError("A pull request already exists without this operation marker");
        return mapPull(pull);
    }
    async function relatedPullRequests(args) {
        await verifyIdentity();
        const pattern = linearIssuePattern(args.issueUrl);
        const found = [];
        for (let page = 1; page <= MAX_PAGES; page += 1) {
            const query = new URLSearchParams({
                state: "open",
                per_page: String(PAGE_SIZE),
                page: String(page),
            });
            const current = z
                .array(rawPullSchema)
                .parse(await githubJson({ path: `/repos/${repositoryPath}/pulls?${query}` }));
            found.push(...current.filter((pull) => pattern.test(pull.body ?? "")).map((pull) => mapPull(pull)));
            if (current.length < PAGE_SIZE)
                return found;
        }
        throw new DeliveryError("GitHub related pull request scan exceeded its bounded page limit");
    }
    async function createPullRequest(args) {
        assertAuthority("openPullRequests");
        await verifyIdentity();
        const existing = await findPullDetails(args.headBranch);
        if (existing) {
            if (!existing.body?.includes(marker(args.operationKey)))
                throw new DeliveryError("A pull request already exists without this operation marker");
            return mapPull(existing);
        }
        const created = parseGithub({
            schema: rawPullSchema,
            read: false,
            value: await githubJson({
                path: `/repos/${repositoryPath}/pulls`,
                method: "POST",
                body: {
                    head: args.headBranch,
                    base: input.project.release.targetBranch,
                    title: args.title,
                    body: `${args.body}\n\n${marker(args.operationKey)}`,
                    draft: true,
                },
            }),
        });
        const readBack = await findPullDetails(args.headBranch);
        if (readBack === null || readBack.number !== created.number)
            throw new DeliveryError("GitHub pull request mutation could not be confirmed", "uncertain");
        return mapPull(readBack);
    }
    const rulesSchema = z.array(z
        .object({
        type: z.string(),
        parameters: z
            .object({
            strict_required_status_checks_policy: z.boolean().optional(),
            required_status_checks: z
                .array(z
                .object({
                context: z.string(),
                integration_id: z.number().int().nullable().optional(),
            })
                .passthrough())
                .optional(),
            required_approving_review_count: z.number().int().nonnegative().optional(),
            require_code_owner_review: z.boolean().optional(),
            require_last_push_approval: z.boolean().optional(),
        })
            .passthrough()
            .optional(),
    })
        .passthrough());
    const protectionSchema = z
        .object({
        required_status_checks: z
            .object({
            strict: z.boolean().optional(),
            contexts: z.array(z.string()).optional(),
            checks: z
                .array(z.object({ context: z.string(), app_id: z.number().int().nullable() }).passthrough())
                .optional(),
        })
            .passthrough()
            .nullable()
            .optional(),
        required_pull_request_reviews: z
            .object({ required_approving_review_count: z.number().int().nonnegative() })
            .passthrough()
            .nullable()
            .optional(),
    })
        .passthrough();
    async function effectiveRules(baseBranch) {
        const encoded = encodeURIComponent(baseBranch);
        const rules = [];
        for (let page = 1; page <= MAX_PAGES; page += 1) {
            const current = rulesSchema.parse(await githubJson({
                path: `/repos/${repositoryPath}/rules/branches/${encoded}?per_page=${PAGE_SIZE}&page=${page}`,
            }));
            rules.push(...current);
            if (current.length < PAGE_SIZE)
                return rules;
        }
        throw new DeliveryError("GitHub effective rules exceeded the bounded page limit");
    }
    async function policies(baseBranch) {
        const encoded = encodeURIComponent(baseBranch);
        const [rules, protectionResponse] = await Promise.all([
            effectiveRules(baseBranch),
            github({
                path: `/repos/${repositoryPath}/branches/${encoded}/protection`,
                acceptedStatuses: [404],
            }),
        ]);
        const protection = protectionResponse.status === 404
            ? null
            : protectionSchema.parse(await parseJson({ provider: "GitHub", response: protectionResponse }));
        const statusRules = rules.filter(({ type }) => type === "required_status_checks");
        const reviewRules = rules.filter(({ type }) => type === "pull_request");
        const configuredChecks = input.project.release.requiredChecks.map((context) => ({ context, appId: null }));
        const ruleChecks = statusRules.flatMap(({ parameters }) => parameters?.required_status_checks?.map((check) => ({
            context: check.context,
            appId: check.integration_id ?? null,
        })) ?? []);
        const protectionChecks = [
            ...(protection?.required_status_checks?.contexts?.map((context) => ({
                context,
                appId: null,
            })) ?? []),
            ...(protection?.required_status_checks?.checks?.map((check) => ({
                context: check.context,
                appId: check.app_id,
            })) ?? []),
        ];
        const byIdentity = new Map();
        for (const check of [...configuredChecks, ...ruleChecks, ...protectionChecks])
            byIdentity.set(`${check.context}:${check.appId ?? "any"}`, check);
        const strictValues = [
            ...statusRules.map(({ parameters }) => parameters?.strict_required_status_checks_policy ?? false),
            ...(protection?.required_status_checks
                ? [protection.required_status_checks.strict ?? false]
                : []),
        ];
        const requiredReviews = Math.max(protection?.required_pull_request_reviews?.required_approving_review_count ?? 0, ...reviewRules.map(({ parameters }) => parameters?.required_approving_review_count ?? 0));
        return {
            checks: [...byIdentity.values()],
            strict: strictValues.some(Boolean),
            requiredReviews,
            mergeQueue: rules.some(({ type }) => type === "merge_queue"),
        };
    }
    async function mergePreview(args) {
        const refResponse = await github({
            path: `/repos/${repositoryPath}/git/ref/pulls/${args.number}/merge`,
            acceptedStatuses: [404, 409],
        });
        if (refResponse.status === 404 || refResponse.status === 409)
            return null;
        const ref = z
            .object({ object: z.object({ sha: z.string() }).passthrough() })
            .passthrough()
            .parse(await parseJson({ provider: "GitHub", response: refResponse }));
        const commit = z
            .object({ parents: z.array(z.object({ sha: z.string() }).passthrough()) })
            .passthrough()
            .parse(await githubJson({
            path: `/repos/${repositoryPath}/git/commits/${encodeURIComponent(ref.object.sha)}`,
        }));
        const parentShas = commit.parents.map(({ sha }) => sha);
        if (!parentShas.includes(args.head) || !parentShas.includes(args.base))
            return null;
        return ref.object.sha;
    }
    const checkRunsSchema = z
        .object({
        total_count: z.number().int().nonnegative(),
        check_runs: z.array(z
            .object({
            id: z.number().int().positive(),
            name: z.string(),
            head_sha: z.string(),
            status: z.string(),
            conclusion: z.string().nullable(),
            started_at: z.string(),
            completed_at: z.string().nullable(),
            app: z.object({ id: z.number().int() }).passthrough().nullable(),
            output: z.object({ summary: z.string() }).passthrough(),
        })
            .passthrough()),
    })
        .passthrough();
    const statusesSchema = z
        .object({
        statuses: z.array(z
            .object({
            id: z.number().int().positive(),
            context: z.string(),
            state: z.string(),
            updated_at: z.string(),
            description: z.string().nullable(),
        })
            .passthrough()),
    })
        .passthrough();
    async function checksForRef(ref) {
        const runs = checkRunsSchema.parse(await githubJson({
            path: `/repos/${repositoryPath}/commits/${encodeURIComponent(ref)}/check-runs?filter=latest&per_page=${PAGE_SIZE}`,
        }));
        if (runs.total_count > PAGE_SIZE)
            throw new DeliveryError("GitHub returned more check runs than the bounded check page");
        const statuses = statusesSchema.parse(await githubJson({
            path: `/repos/${repositoryPath}/commits/${encodeURIComponent(ref)}/status?per_page=${PAGE_SIZE}`,
        }));
        if (statuses.statuses.length === PAGE_SIZE)
            throw new DeliveryError("GitHub returned an ambiguous full page of commit statuses");
        return { runs: runs.check_runs, statuses: statuses.statuses };
    }
    function attemptTime(value) {
        const parsed = Date.parse(value);
        if (Number.isNaN(parsed))
            throw new DeliveryError("GitHub check timestamp is invalid");
        return parsed;
    }
    function latestAttempt(args) {
        const appMatches = (appId) => args.required.appId === null || args.required.appId === -1 || appId === args.required.appId;
        const attempts = args.checks.runs
            .filter((candidate) => (candidate.head_sha === args.ref ||
            (args.ref === args.preview && candidate.head_sha === args.head)) &&
            candidate.name === args.required.context &&
            appMatches(candidate.app?.id ?? null))
            .map((candidate) => ({
            id: candidate.id,
            at: attemptTime(candidate.completed_at ?? candidate.started_at),
            passed: candidate.status === "completed" && candidate.conclusion === "success",
            ref: args.ref,
            source: "check-run",
            status: candidate.status,
            conclusion: candidate.conclusion,
            summary: candidate.output.summary,
            terminalFailure: candidate.status === "completed" && candidate.conclusion !== "success",
        }));
        if (args.required.appId === null || args.required.appId === -1)
            attempts.push(...args.checks.statuses
                .filter((status) => status.context === args.required.context)
                .map((status) => ({
                id: status.id,
                at: attemptTime(status.updated_at),
                passed: status.state === "success",
                ref: args.ref,
                source: "commit-status",
                status: status.state,
                conclusion: status.state,
                summary: status.description,
                terminalFailure: ["error", "failure"].includes(status.state),
            })));
        attempts.sort((left, right) => right.at - left.at || Number(left.passed) - Number(right.passed) || right.id - left.id);
        return attempts[0] ?? null;
    }
    function boundedSummary(value) {
        if (value === null)
            return null;
        return value.slice(0, MAX_DETAIL_SUMMARY_LENGTH);
    }
    async function reviewsForPull(number) {
        const reviewSchema = z
            .object({ user: z.object({ id: z.number().int() }).passthrough(), state: z.string() })
            .passthrough();
        const reviews = [];
        for (let page = 1; page <= MAX_PAGES; page += 1) {
            const current = z.array(reviewSchema).parse(await githubJson({
                path: `/repos/${repositoryPath}/pulls/${number}/reviews?per_page=${PAGE_SIZE}&page=${page}`,
            }));
            reviews.push(...current);
            if (current.length < PAGE_SIZE)
                return reviews;
        }
        throw new DeliveryError("GitHub review lookup exceeded its bounded page limit");
    }
    async function requiredChecks(args) {
        const rawPull = await pullDetails(args.number);
        const pull = mapPull(rawPull);
        assertPullScope(pull);
        const failures = [];
        if (pull.head !== args.head)
            failures.push("pull request head changed");
        if (pull.base !== args.base)
            failures.push("pull request base changed");
        const branch = z
            .object({ commit: z.object({ sha: z.string() }).passthrough() })
            .passthrough()
            .parse(await githubJson({
            path: `/repos/${repositoryPath}/branches/${encodeURIComponent(pull.baseBranch)}`,
        }));
        if (branch.commit.sha !== args.base)
            failures.push("base branch changed");
        const policy = await policies(pull.baseBranch);
        const strictPolicyMissing = input.project.release.strictCurrentBase && !policy.strict;
        if (strictPolicyMissing)
            failures.push("required status checks are not strict");
        if (pull.draft)
            failures.push("pull request is still a draft");
        const mergeabilityAllowed = rawPull.mergeable === true &&
            (rawPull.mergeable_state === "clean" ||
                (rawPull.mergeable_state === "behind" &&
                    !input.project.release.strictCurrentBase &&
                    !policy.strict));
        if (!mergeabilityAllowed)
            failures.push("pull request is not mergeable");
        const reviews = await reviewsForPull(args.number);
        const latestReview = new Map();
        for (const review of reviews)
            latestReview.set(review.user.id, review.state);
        const approvals = [...latestReview.values()].filter((state) => state === "APPROVED").length;
        const reviewsMissing = approvals < policy.requiredReviews;
        if (reviewsMissing)
            failures.push(`required reviews missing (${approvals}/${policy.requiredReviews})`);
        const preview = pull.head === args.head && pull.base === args.base ? await mergePreview(args) : null;
        const testedRefs = [...new Set([args.head, ...(preview ? [preview] : [])])];
        const evidence = await Promise.all(testedRefs.map(async (ref) => ({ ref, checks: await checksForRef(ref) })));
        const details = [];
        let terminalCheckFailure = false;
        let waitingCheck = false;
        for (const required of policy.checks) {
            const attempts = evidence.map(({ ref, checks }) => ({
                ref,
                attempt: latestAttempt({ ref, preview, head: args.head, required, checks }),
            }));
            const previewAttempt = attempts.find(({ ref, attempt }) => ref === preview && attempt !== null);
            const selected = previewAttempt?.attempt ?? attempts.find(({ attempt }) => attempt !== null)?.attempt;
            if (selected?.passed !== true) {
                failures.push(`required check not successful: ${required.context}`);
                if (selected === null || selected === undefined)
                    waitingCheck = true;
                else if (selected.terminalFailure)
                    terminalCheckFailure = true;
                else
                    waitingCheck = true;
            }
            if (details.length < MAX_CHECK_DETAILS)
                details.push(selected
                    ? {
                        context: required.context,
                        ref: selected.ref,
                        source: selected.source,
                        status: selected.status,
                        conclusion: selected.conclusion,
                        summary: boundedSummary(selected.summary),
                    }
                    : {
                        context: required.context,
                        ref: preview ?? args.head,
                        source: "missing",
                        status: "missing",
                        conclusion: null,
                        summary: null,
                    });
        }
        if (policy.mergeQueue)
            failures.push("merge queue is not supported");
        const scopeChanged = pull.head !== args.head || pull.base !== args.base || branch.commit.sha !== args.base;
        const mergeabilityBlocksReview = reviewsMissing && rawPull.mergeable === true && rawPull.mergeable_state === "blocked";
        let nextAction;
        if (strictPolicyMissing || policy.mergeQueue)
            nextAction = "blocked-policy";
        else if (terminalCheckFailure)
            nextAction = "repair";
        else if (waitingCheck)
            nextAction = "wait";
        else if (reviewsMissing &&
            !scopeChanged &&
            !pull.draft &&
            (mergeabilityAllowed || mergeabilityBlocksReview))
            nextAction = "human-review";
        const result = {
            passed: failures.length === 0,
            failures,
            testedRefs,
            details,
        };
        if (nextAction !== undefined)
            result.nextAction = nextAction;
        return result;
    }
    async function merge(args) {
        assertAuthority("mergeDevelopment");
        await verifyIdentity();
        const initial = await readPullRequest(args.number);
        if (initial.head !== args.head)
            throw new DeliveryError("Pull request head changed before merge reconciliation");
        if (initial.merged) {
            if (initial.mergeCommit === null)
                throw new DeliveryError("Merged pull request has no confirmed merge commit", "uncertain");
            return { merged: true, commit: initial.mergeCommit };
        }
        if (initial.base !== args.base)
            throw new DeliveryError("Pull request base changed before merge reconciliation");
        const checks = await requiredChecks(args);
        if (!checks.passed)
            throw new DeliveryError(`Pull request is not ready to merge: ${checks.failures.join(", ")}`);
        const fresh = await readPullRequest(args.number);
        if (fresh.head !== args.head || fresh.base !== args.base)
            throw new DeliveryError("Pull request changed after required checks completed");
        const currentBase = z
            .object({ commit: z.object({ sha: z.string() }).passthrough() })
            .passthrough()
            .parse(await githubJson({
            path: `/repos/${repositoryPath}/branches/${encodeURIComponent(fresh.baseBranch)}`,
        }));
        if (currentBase.commit.sha !== args.base)
            throw new DeliveryError("Base branch changed after required checks completed");
        const responseSchema = z
            .object({ merged: z.boolean(), sha: z.string().nullable() })
            .passthrough();
        let result;
        try {
            result = parseGithub({
                schema: responseSchema,
                read: false,
                value: await githubJson({
                    path: `/repos/${repositoryPath}/pulls/${args.number}/merge`,
                    method: "PUT",
                    body: { sha: args.head, merge_method: input.project.release.method },
                }),
            });
        }
        catch (error) {
            if (!(error instanceof DeliveryError && error.code === "uncertain"))
                throw error;
            try {
                const confirmed = await readPullRequest(args.number);
                if (confirmed.head === args.head && confirmed.merged && confirmed.mergeCommit !== null)
                    return { merged: true, commit: confirmed.mergeCommit };
            }
            catch {
                // Preserve the mutation's uncertain outcome when reconciliation is unavailable.
            }
            throw error;
        }
        if (!result.merged)
            return { merged: false, commit: result.sha };
        let confirmed;
        try {
            confirmed = await readPullRequest(args.number);
        }
        catch {
            throw new DeliveryError("GitHub merge mutation could not be read back", "uncertain");
        }
        if (confirmed.head !== args.head || !confirmed.merged || confirmed.mergeCommit === null)
            throw new DeliveryError("GitHub merge mutation could not be confirmed", "uncertain");
        return { merged: true, commit: confirmed.mergeCommit };
    }
    async function disableAutoMerge(args) {
        assertAuthority("mergeDevelopment");
        await verifyIdentity();
        const raw = await pullDetails(args.number);
        assertPullScope(mapPull(raw));
        if (raw.auto_merge === null)
            return;
        const id = z.string().parse(raw.node_id);
        const response = z
            .object({
            data: z.object({
                disablePullRequestAutoMerge: z.object({
                    pullRequest: z.object({ autoMergeRequest: z.null() }),
                }),
            }),
        })
            .parse(await githubJson({
            path: "/graphql",
            method: "POST",
            body: {
                query: "mutation Disable($id: ID!) { disablePullRequestAutoMerge(input: {pullRequestId: $id}) { pullRequest { autoMergeRequest { enabledAt } } } }",
                variables: { id },
            },
        }));
        if (response.data.disablePullRequestAutoMerge.pullRequest.autoMergeRequest !== null)
            throw new DeliveryError("GitHub did not confirm auto-merge cancellation", "uncertain");
    }
    async function markReady(args) {
        assertAuthority("openPullRequests");
        await verifyIdentity();
        const raw = await pullDetails(args.number);
        const pull = mapPull(raw);
        assertPullScope(pull);
        if (pull.head !== args.head)
            throw new DeliveryError("Head changed before ready transition");
        if (!pull.draft)
            return;
        const id = z.string().parse(raw.node_id);
        z.object({
            data: z.object({
                markPullRequestReadyForReview: z.object({
                    pullRequest: z.object({ isDraft: z.literal(false) }),
                }),
            }),
        }).parse(await githubJson({
            path: "/graphql",
            method: "POST",
            body: {
                query: "mutation Ready($id: ID!) { markPullRequestReadyForReview(input: {pullRequestId: $id}) { pullRequest { isDraft } } }",
                variables: { id },
            },
        }));
        const readBack = await readPullRequest(args.number);
        if (readBack.draft || readBack.head !== args.head)
            throw new DeliveryError("Ready transition did not read back at the expected head", "uncertain");
    }
    async function markDraft(args) {
        assertAuthority("openPullRequests");
        await verifyIdentity();
        const raw = await pullDetails(args.number);
        const pull = mapPull(raw);
        assertPullScope(pull);
        if (pull.head !== args.head)
            throw new DeliveryError("Head changed before draft transition");
        if (pull.merged)
            throw new DeliveryError("Merged pull request cannot return to draft");
        if (pull.draft)
            return;
        const id = z.string().parse(raw.node_id);
        const responseSchema = z.object({
            data: z.object({
                convertPullRequestToDraft: z.object({
                    pullRequest: z.object({ isDraft: z.literal(true) }),
                }),
            }),
        });
        try {
            parseGithub({
                schema: responseSchema,
                read: false,
                value: await githubJson({
                    path: "/graphql",
                    method: "POST",
                    body: {
                        query: "mutation Draft($id: ID!) { convertPullRequestToDraft(input: {pullRequestId: $id}) { pullRequest { isDraft } } }",
                        variables: { id },
                    },
                }),
            });
        }
        catch (error) {
            if (!(error instanceof DeliveryError && error.code === "uncertain"))
                throw error;
            try {
                const reconciled = await readPullRequest(args.number);
                if (reconciled.head === args.head && reconciled.draft && !reconciled.merged)
                    return;
            }
            catch {
                // Preserve the mutation's uncertain outcome when reconciliation is unavailable.
            }
            throw error;
        }
        let readBack;
        try {
            readBack = await readPullRequest(args.number);
        }
        catch {
            throw new DeliveryError("Draft transition could not be read back", "uncertain");
        }
        if (!readBack.draft || readBack.merged || readBack.head !== args.head)
            throw new DeliveryError("Draft transition did not read back at the expected head", "uncertain");
    }
    return {
        verifyIdentity,
        gitAuthorization,
        findPullRequest,
        relatedPullRequests,
        createPullRequest,
        readPullRequest,
        requiredChecks,
        merge,
        disableAutoMerge,
        markReady,
        markDraft,
    };
}
