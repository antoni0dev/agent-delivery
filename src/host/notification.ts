import { execFileSync } from "node:child_process";

export function notifyDesktop({ message }: { message: string }): void {
  execFileSync(
    "/usr/bin/osascript",
    [
      "-e",
      'on run argv\n display notification (item 1 of argv) with title "Agent delivery"\nend run',
      message,
    ],
    { timeout: 10000, stdio: "ignore" },
  );
}
