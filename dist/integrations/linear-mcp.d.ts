import type { Project, WorkspaceConfig } from "../config.js";
import type { LinearAdapter } from "./linear.js";
import { type McpCall } from "./mcp.js";
export declare function createLinearMcpAdapter(input: {
    config: WorkspaceConfig;
    project: Project;
    call?: McpCall;
}): LinearAdapter;
