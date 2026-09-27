export const runtimeStatusNames = [
    "completed",
    "failed",
    "blocked",
    "cancelled",
    "timed-out",
];
export const runtimeLifecycleStatusNames = ["probing", "running", ...runtimeStatusNames];
