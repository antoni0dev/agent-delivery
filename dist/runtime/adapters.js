const documentedCapabilities = Object.freeze({
    freshContext: true,
    readOnly: true,
    structuredOutput: true,
    modelSelection: true,
});
const isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const stringProperty = ({ value, property, }) => {
    const propertyValue = value[property];
    return typeof propertyValue === "string" ? propertyValue : null;
};
const parseJsonObject = (stdout) => {
    const parsed = JSON.parse(stdout);
    if (!isObject(parsed)) {
        throw new Error("Runtime output was not a JSON object.");
    }
    return parsed;
};
const parseCodexOutput = (stdout) => {
    const lines = stdout
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    if (lines.length === 0) {
        throw new Error("Codex emitted no structured output.");
    }
    const events = lines.map((line) => parseJsonObject(line));
    let output = null;
    let actualModel = null;
    let nativeSessionId = null;
    for (const event of events) {
        const eventType = stringProperty({ value: event, property: "type" });
        if (eventType === "thread.started") {
            nativeSessionId = stringProperty({ value: event, property: "thread_id" });
            actualModel = stringProperty({ value: event, property: "model" });
        }
        if (eventType === "item.completed") {
            const item = event.item;
            if (isObject(item) && stringProperty({ value: item, property: "type" }) === "agent_message") {
                output = item.text ?? null;
            }
        }
        if (eventType === "result") {
            output = event.result ?? output;
            nativeSessionId = stringProperty({ value: event, property: "session_id" }) ?? nativeSessionId;
            actualModel = stringProperty({ value: event, property: "model" }) ?? actualModel;
        }
    }
    if (output === null) {
        throw new Error("Codex emitted no completed result.");
    }
    return Object.freeze({
        output,
        actualModel,
        nativeSessionId,
        nativePermissionMode: null,
        writeAttempted: null,
        writeDenied: null,
    });
};
const parseResultObject = (stdout) => {
    const result = parseJsonObject(stdout);
    if (stringProperty({ value: result, property: "type" }) !== "result") {
        throw new Error("Runtime output did not contain a result envelope.");
    }
    if (result.is_error === true ||
        stringProperty({ value: result, property: "subtype" }) === "error") {
        throw new Error("Runtime reported an unsuccessful result.");
    }
    if (!("result" in result)) {
        throw new Error("Runtime result envelope had no result value.");
    }
    return Object.freeze({
        output: result.result,
        actualModel: stringProperty({ value: result, property: "model" }),
        nativeSessionId: stringProperty({ value: result, property: "session_id" }) ??
            stringProperty({ value: result, property: "chat_id" }),
        nativePermissionMode: stringProperty({ value: result, property: "permissionMode" }),
        writeAttempted: null,
        writeDenied: null,
    });
};
const modelFromUsage = (result) => {
    const usage = result.modelUsage;
    if (!isObject(usage)) {
        return null;
    }
    const models = Object.keys(usage);
    return models.length === 1 ? (models[0] ?? null) : null;
};
const writeToolNames = new Set(["Edit", "MultiEdit", "NotebookEdit", "Write"]);
const permissionDenialToolName = (value) => {
    if (!isObject(value)) {
        return null;
    }
    return (stringProperty({ value, property: "tool_name" }) ??
        stringProperty({ value, property: "toolName" }) ??
        stringProperty({ value, property: "name" }));
};
const parseClaudeOutput = (stdout) => {
    const result = parseJsonObject(stdout);
    if (stringProperty({ value: result, property: "type" }) !== "result" ||
        stringProperty({ value: result, property: "subtype" }) !== "success" ||
        result.is_error !== false) {
        throw new Error("Claude did not emit a successful result envelope.");
    }
    const structuredOutput = result.structured_output;
    if (!isObject(structuredOutput)) {
        throw new Error("Claude result envelope had no structured output object.");
    }
    const nativeSessionId = stringProperty({ value: result, property: "session_id" });
    if (nativeSessionId === null) {
        throw new Error("Claude result envelope had no session identifier.");
    }
    const permissionDenials = result.permission_denials;
    const deniedWriteObserved = Array.isArray(permissionDenials)
        ? permissionDenials.some((denial) => {
            const toolName = permissionDenialToolName(denial);
            return toolName !== null && writeToolNames.has(toolName);
        })
        : null;
    return Object.freeze({
        output: structuredOutput,
        actualModel: stringProperty({ value: result, property: "model" }) ?? modelFromUsage(result),
        nativeSessionId,
        nativePermissionMode: stringProperty({ value: result, property: "permissionMode" }) ??
            stringProperty({ value: result, property: "permission_mode" }),
        writeAttempted: deniedWriteObserved,
        writeDenied: deniedWriteObserved,
    });
};
const codexOutput = ({ stdout }) => parseCodexOutput(stdout);
const claudeOutput = ({ stdout }) => parseClaudeOutput(stdout);
const resultObjectOutput = ({ stdout }) => parseResultObject(stdout);
const versionPattern = /\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?/;
const parseSemanticVersion = (stdout) => stdout.match(versionPattern)?.[0] ?? null;
const codexArguments = ({ model, effort, readOnly }) => [
    "exec",
    "--ignore-user-config",
    "--ephemeral",
    "--json",
    "--color",
    "never",
    "--model",
    model,
    "--sandbox",
    readOnly ? "read-only" : "workspace-write",
    "-c",
    `model_reasoning_effort="${effort}"`,
    "-c",
    "mcp_servers={}",
    "-",
];
const claudeArguments = ({ model, effort, readOnly, outputSchema, }) => [
    "--print",
    "--output-format",
    "json",
    "--verbose",
    "--json-schema",
    JSON.stringify(outputSchema ?? { type: "object" }),
    "--model",
    model,
    "--effort",
    effort,
    "--safe-mode",
    "--strict-mcp-config",
    "--mcp-config",
    '{"mcpServers":{}}',
    "--setting-sources",
    "",
    "--disable-slash-commands",
    "--no-chrome",
    "--permission-prompts",
    "none",
    ...(readOnly
        ? ["--restricted", "--permission-mode", "plan"]
        : ["--permission-mode", "acceptEdits"]),
];
const cursorArguments = ({ model, effort, readOnly }) => [
    "-p",
    "--output-format",
    "json",
    "--model",
    `${model}[effort=${effort}]`,
    "--sandbox",
    "enabled",
    ...(readOnly ? ["--mode=plan"] : []),
    ...(readOnly ? [] : ["--force"]),
];
export const runtimeAdapters = Object.freeze({
    codex: Object.freeze({
        capabilities: documentedCapabilities,
        minimumVersion: null,
        buildArguments: codexArguments,
        parseOutput: codexOutput,
        parseVersion: parseSemanticVersion,
    }),
    "claude-code": Object.freeze({
        capabilities: documentedCapabilities,
        minimumVersion: "2.1.280",
        buildArguments: claudeArguments,
        parseOutput: claudeOutput,
        parseVersion: parseSemanticVersion,
    }),
    cursor: Object.freeze({
        capabilities: documentedCapabilities,
        minimumVersion: null,
        buildArguments: cursorArguments,
        parseOutput: resultObjectOutput,
        parseVersion: parseSemanticVersion,
    }),
});
export const compareSemanticVersions = ({ left, right, }) => {
    const leftParts = left.split(".").map((part) => Number.parseInt(part, 10));
    const rightParts = right.split(".").map((part) => Number.parseInt(part, 10));
    for (let index = 0; index < 3; index += 1) {
        const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
        if (difference !== 0) {
            return difference;
        }
    }
    return 0;
};
export const modelsMatch = ({ requested, actual, }) => actual === requested || new RegExp(`^${requested}-\\d{4}-?\\d{2}-?\\d{2}$`).test(actual);
