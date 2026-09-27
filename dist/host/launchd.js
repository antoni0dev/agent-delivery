import { execFileSync } from "node:child_process";
import { chmodSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join } from "node:path";
import { DeliveryError } from "../domain.js";
const TICK_INTERVAL_SECONDS = 5 * 60;
const runLaunchctl = (args) => execFileSync("launchctl", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
});
const escapeXml = (value) => value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
const workspaceLabel = (workspaceId) => {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(workspaceId))
        throw new DeliveryError("Workspace identifier is not safe for launchd");
    return `dev.agent-delivery.${workspaceId}`;
};
const launchdDomain = () => {
    const getUid = process.getuid;
    if (getUid === undefined)
        throw new DeliveryError("launchd requires macOS host identity support");
    return `gui/${getUid()}`;
};
const isNotLoaded = (error) => {
    if (!(error instanceof Error))
        return false;
    const stderr = "stderr" in error ? String(error.stderr) : "";
    const message = `${error.message}\n${stderr}`.toLowerCase();
    return ["could not find service", "service not found", "no such process"].some((value) => message.includes(value));
};
function bootoutIfLoaded({ target, run }) {
    try {
        run(["print", target]);
    }
    catch (error) {
        if (isNotLoaded(error))
            return;
        throw error;
    }
    run(["bootout", target]);
}
export const launchAgentPath = ({ workspaceId, launchAgentsDirectory = join(homedir(), "Library", "LaunchAgents"), }) => join(launchAgentsDirectory, `${workspaceLabel(workspaceId)}.plist`);
export function renderLaunchAgent(input) {
    const paths = [input.nodeBinary, input.cliFile, input.configPath, input.logDirectory];
    if (paths.some((path) => !isAbsolute(path)))
        throw new DeliveryError("Launchd paths must be absolute");
    const disabled = input.enabled ? "false" : "true";
    const label = workspaceLabel(input.workspaceId);
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${escapeXml(label)}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${escapeXml(input.nodeBinary)}</string>
    <string>${escapeXml(input.cliFile)}</string>
    <string>tick</string>
    <string>--config</string>
    <string>${escapeXml(input.configPath)}</string>
  </array>
  <key>StartInterval</key><integer>${TICK_INTERVAL_SECONDS}</integer>
  <key>RunAtLoad</key><false/>
  <key>Disabled</key><${disabled}/>
  <key>StandardOutPath</key><string>${escapeXml(join(input.logDirectory, "tick.log"))}</string>
  <key>StandardErrorPath</key><string>${escapeXml(join(input.logDirectory, "tick.error.log"))}</string>
</dict>
</plist>
`;
}
export function writeLaunchAgent(input) {
    const path = launchAgentPath(input);
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    mkdirSync(input.logDirectory, { recursive: true, mode: 0o700 });
    const temporaryPath = `${path}.${process.pid}.tmp`;
    writeFileSync(temporaryPath, renderLaunchAgent(input), { mode: 0o600 });
    chmodSync(temporaryPath, 0o600);
    renameSync(temporaryPath, path);
    return path;
}
export function activateLaunchAgent({ workspaceId, path, run = runLaunchctl, }) {
    const domain = launchdDomain();
    const label = workspaceLabel(workspaceId);
    const target = `${domain}/${label}`;
    bootoutIfLoaded({ target, run });
    run(["bootstrap", domain, path]);
    run(["enable", target]);
}
export function deactivateLaunchAgent({ workspaceId, run = runLaunchctl, }) {
    const target = `${launchdDomain()}/${workspaceLabel(workspaceId)}`;
    try {
        run(["print", target]);
    }
    catch (error) {
        if (isNotLoaded(error))
            return;
        throw error;
    }
    run(["disable", target]);
}
